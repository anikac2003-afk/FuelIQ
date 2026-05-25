/**
 * Macro Targets API
 * POST /api/macros/targets - Calculate adaptive macro targets
 * GET /api/macros/targets - Get user's macro targets
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { calculateAdaptiveMacros } from "@/lib/algorithms/nutrition";
import { z } from "zod";

const MacroTargetRequestSchema = z.object({
  date: z.string(),
  workoutType: z.enum(["strength", "cardio", "endurance", "mixed", "recovery"]).optional(),
  trainingLoadScore: z.number().optional(),
  readinessScore: z.number().optional(),
  menstrualPhase: z.enum(["menstruation", "follicular", "ovulation", "luteal"]).optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validated = MacroTargetRequestSchema.parse(body);

    // Get required user data
    const userProfile = {
      weight: user.weight || 65,
      age: user.age || 25,
      gender: (user.gender as "male" | "female" | "other") || "female",
      activityLevel: (user.activityLevel as any) || "very_active",
      goals: user.goals || [],
    };

    // Get today's wearable data
    const today = new Date(validated.date);
    today.setHours(0, 0, 0, 0);

    const wearableData = await prisma.wearableData.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    // Calculate adaptive macros
    const macros = calculateAdaptiveMacros({
      userId: user.id,
      date: today,
      ...userProfile,
      workoutType: validated.workoutType,
      trainingLoadScore: validated.trainingLoadScore || wearableData?.trainingLoad,
      readinessScore: validated.readinessScore,
      menstrualPhase: validated.menstrualPhase,
      sleepScore: wearableData?.sleepScore || undefined,
      recoveryStatus: "fair",
    });

    // Save to database
    const savedTargets = await prisma.macroTarget.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
      update: {
        targetCalories: macros.calories,
        targetProtein: macros.protein,
        targetCarbs: macros.carbs,
        targetFats: macros.fats,
        targetFiber: macros.fiber,
        hydrationTarget: macros.hydration,
        calculationMethod: "adaptive",
        notes: macros.rationale,
      },
      create: {
        userId: user.id,
        date: today,
        targetCalories: macros.calories,
        targetProtein: macros.protein,
        targetCarbs: macros.carbs,
        targetFats: macros.fats,
        targetFiber: macros.fiber,
        hydrationTarget: macros.hydration,
        calculationMethod: "adaptive",
        notes: macros.rationale,
      },
    });

    return NextResponse.json({
      ...savedTargets,
      rationale: macros.rationale,
      adjustments: macros.adjustments,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Macro targets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const days = parseInt(searchParams.get("days") || "30");
    const dateStr = searchParams.get("date");

    const startDate = dateStr
      ? new Date(dateStr)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const targets = await prisma.macroTarget.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(targets);
  } catch (error) {
    console.error("Get macro targets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
