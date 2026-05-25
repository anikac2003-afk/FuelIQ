/**
 * Dashboard API Route
 * GET /api/dashboard
 * Returns complete dashboard data for authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { calculateRecoveryScores, calculateAdaptiveMacros, calculateFuelingQualityScore } from "@/lib/algorithms/nutrition";
import { InsightEngine } from "@/lib/algorithms/insights";

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        goals_rel: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's data
    const todayWearable = await prisma.wearableData.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const todayRecovery = await prisma.recoveryMetrics.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const todayDailyScore = await prisma.dailyScore.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const todayMacroTarget = await prisma.macroTarget.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const todayNutrition = await prisma.nutritionLog.findMany({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const todayWorkout = await prisma.workout.findMany({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    // Get last 30 days for trends
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const wearableData = await prisma.wearableData.findMany({
      where: {
        userId: user.id,
        date: { gte: last30Days },
      },
      orderBy: { date: "desc" },
    });

    const workouts = await prisma.workout.findMany({
      where: {
        userId: user.id,
        date: { gte: last30Days },
      },
      orderBy: { date: "desc" },
    });

    const nutritionLogs = await prisma.nutritionLog.findMany({
      where: {
        userId: user.id,
        date: { gte: last30Days },
      },
      orderBy: { date: "desc" },
    });

    const macroTargets = await prisma.macroTarget.findMany({
      where: {
        userId: user.id,
        date: { gte: last30Days },
      },
      orderBy: { date: "desc" },
    });

    // Calculate daily scores if not already calculated
    let dailyScore = todayDailyScore;
    if (!dailyScore && todayRecovery && todayWearable) {
      const recoveryScores = calculateRecoveryScores({
        sleepDuration: todayWearable.sleepDuration || undefined,
        sleepScore: todayWearable.sleepScore || undefined,
        hrv: todayWearable.hrv || undefined,
        restingHeartRate: todayWearable.restingHeartRate || undefined,
        stressLevel: todayWearable.stressLevel || undefined,
        bodyBattery: todayWearable.bodyBattery || undefined,
        previousDayTrainingLoad: workouts[0]?.trainingLoad || 0,
        activeCalories: todayWearable.activeCalories || undefined,
        nutritionAdherence: 50, // TODO: calculate from logs
      });

      dailyScore = await prisma.dailyScore.create({
        data: {
          userId: user.id,
          date: today,
          readinessScore: recoveryScores.readinessScore,
          recoveryScore: recoveryScores.recoveryScore,
          trainingQualityScore: 50, // TODO: calculate
          nutritionAdherence: 50, // TODO: calculate
          fuelingQualityScore: 50, // TODO: calculate
          overallScore: (recoveryScores.readinessScore + 50 + 50 + 50) / 4,
          sleepScore: recoveryScores.sleepRecovery,
          hrvScore: recoveryScores.hrvRecovery,
          stressScore: recoveryScores.stressRecovery,
          activityScore: 50, // TODO: calculate
          nutritionScore: 50, // TODO: calculate
          hydrationScore: 50, // TODO: calculate
          hrvTrend: "stable",
          recoveryTrend: "stable",
          performanceTrend: "stable",
          alerts: [],
          recommendations: recoveryScores.shouldTrain
            ? []
            : ["Take a recovery day today"],
        },
      });
    }

    // Calculate total nutrition intake for today
    const totalNutrition = {
      calories: todayNutrition.reduce((sum, log) => sum + log.calories, 0),
      protein: todayNutrition.reduce((sum, log) => sum + log.protein, 0),
      carbs: todayNutrition.reduce((sum, log) => sum + log.carbs, 0),
      fats: todayNutrition.reduce((sum, log) => sum + log.fats, 0),
    };

    // Calculate fueling quality
    const fuelingQuality = todayMacroTarget
      ? calculateFuelingQualityScore({
          intakeCalories: totalNutrition.calories,
          targetCalories: todayMacroTarget.targetCalories,
          intakeProtein: totalNutrition.protein,
          targetProtein: todayMacroTarget.targetProtein,
          intakeCarbs: totalNutrition.carbs,
          targetCarbs: todayMacroTarget.targetCarbs,
          intakeFats: totalNutrition.fats,
          targetFats: todayMacroTarget.targetFats,
          preWorkoutFueling: false, // TODO: detect from logs
          postWorkoutFueling: false, // TODO: detect from logs
        })
      : null;

    // Generate coaching insights
    const insights = await InsightEngine.generateDailyInsights({
      userId: user.id,
      date: today,
      recentWearableData: wearableData.slice(0, 30),
      recentWorkouts: workouts.slice(0, 30),
      recentNutritionLogs: nutritionLogs.slice(0, 7),
      recoveryMetrics: todayRecovery,
      dailyScore: dailyScore,
      macroTargets: macroTargets,
      userGoals: user.goals || [],
    });

    // Get weekly summary
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyWorkouts = await prisma.workout.findMany({
      where: {
        userId: user.id,
        date: { gte: last7Days },
      },
    });

    const weeklyDailyScores = await prisma.dailyScore.findMany({
      where: {
        userId: user.id,
        date: { gte: last7Days },
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
      },
      today: {
        date: today,
        wearable: todayWearable,
        recovery: todayRecovery,
        dailyScore: dailyScore,
        macroTargets: todayMacroTarget,
        nutrition: {
          logs: todayNutrition,
          totals: totalNutrition,
          fuelingQuality,
        },
        workouts: todayWorkout,
      },
      weekly: {
        workoutCount: weeklyWorkouts.length,
        avgTrainingLoad: weeklyWorkouts.length > 0
          ? Math.round(weeklyWorkouts.reduce((sum, w) => sum + (w.trainingLoad || 0), 0) / weeklyWorkouts.length)
          : 0,
        avgReadiness: weeklyDailyScores.length > 0
          ? Math.round(weeklyDailyScores.reduce((sum, s) => sum + s.readinessScore, 0) / weeklyDailyScores.length)
          : 0,
        avgRecovery: weeklyDailyScores.length > 0
          ? Math.round(weeklyDailyScores.reduce((sum, s) => sum + s.recoveryScore, 0) / weeklyDailyScores.length)
          : 0,
      },
      insights: insights.slice(0, 5), // Top 5 insights
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
