/**
 * Coaching Insights API
 * GET /api/insights - Get user's coaching insights
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { InsightEngine } from "@/lib/algorithms/insights";

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");
    const priority = searchParams.get("priority"); // Filter by priority
    const type = searchParams.get("type"); // Filter by type

    // Get existing insights from database
    const insights = await prisma.coachingInsight.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
        ...(priority && { priority }),
        ...(type && { type: type as any }),
      },
      orderBy: [
        { date: "desc" },
        { priority: "asc" }, // critical first
      ],
    });

    // If no insights exist for today, generate them
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayInsights = insights.filter(
      (i) => i.date >= today && i.date < new Date(today.getTime() + 24 * 60 * 60 * 1000)
    );

    if (todayInsights.length === 0) {
      // Fetch data for insight generation
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const wearableData = await prisma.wearableData.findMany({
        where: {
          userId: user.id,
          date: { gte: last30Days },
        },
      });

      const workouts = await prisma.workout.findMany({
        where: {
          userId: user.id,
          date: { gte: last30Days },
        },
      });

      const nutritionLogs = await prisma.nutritionLog.findMany({
        where: {
          userId: user.id,
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const recoveryMetrics = await prisma.recoveryMetrics.findFirst({
        where: {
          userId: user.id,
          date: { gte: today },
        },
      });

      const dailyScore = await prisma.dailyScore.findFirst({
        where: {
          userId: user.id,
          date: { gte: today },
        },
      });

      const macroTargets = await prisma.macroTarget.findMany({
        where: {
          userId: user.id,
          date: { gte: last30Days },
        },
      });

      // Generate insights
      const generatedInsights = await InsightEngine.generateDailyInsights({
        userId: user.id,
        date: today,
        recentWearableData: wearableData,
        recentWorkouts: workouts,
        recentNutritionLogs: nutritionLogs,
        recoveryMetrics,
        dailyScore,
        macroTargets,
        userGoals: user.goals || [],
      });

      // Save to database
      for (const insight of generatedInsights) {
        await prisma.coachingInsight.create({
          data: {
            userId: user.id,
            date: today,
            type: insight.type,
            priority: insight.priority,
            category: insight.category,
            title: insight.title,
            message: insight.message,
            actionItems: insight.actionItems,
            dataPoints: insight.dataPoints,
            confidence: insight.confidence,
            isRead: false,
          },
        });
      }

      // Return generated insights
      return NextResponse.json({
        insights: generatedInsights,
        generated: true,
      });
    }

    return NextResponse.json({
      insights: todayInsights,
      generated: false,
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
