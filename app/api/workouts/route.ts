/**
 * Workout Management API
 * POST /api/workouts - Log workout
 * GET /api/workouts - Get user's workouts
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const WorkoutSchema = z.object({
  date: z.string(),
  type: z.enum(["strength", "cardio", "endurance", "mixed", "recovery"]),
  name: z.string().optional(),
  description: z.string().optional(),
  durationMinutes: z.number(),
  intensity: z.enum(["low", "moderate", "high", "very_high"]),
  trainingLoad: z.number().optional(),
  rpe: z.number().optional(), // Rate of Perceived Exertion
  caloriesBurned: z.number().optional(),
  averageHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  muscleFocus: z.array(z.string()).optional(),
  distanceKm: z.number().optional(),
  averagePaceMinPerKm: z.number().optional(),
  elevationGainM: z.number().optional(),
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
    const validated = WorkoutSchema.parse(body);

    // Calculate training load if not provided
    let trainingLoad = validated.trainingLoad;
    if (!trainingLoad && validated.averageHeartRate && validated.maxHeartRate) {
      const intensity = (validated.averageHeartRate / validated.maxHeartRate) * 100;
      const durationFactor = Math.min(validated.durationMinutes / 60, 2); // Cap at 2 hours
      trainingLoad = (intensity * durationFactor) / 2;
    }

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        date: new Date(validated.date),
        type: validated.type,
        name: validated.name,
        description: validated.description,
        durationMinutes: validated.durationMinutes,
        intensity: validated.intensity,
        trainingLoad,
        rpe: validated.rpe,
        caloriesBurned: validated.caloriesBurned,
        averageHeartRate: validated.averageHeartRate,
        maxHeartRate: validated.maxHeartRate,
        muscleFocus: validated.muscleFocus,
        distanceKm: validated.distanceKm,
        averagePaceMinPerKm: validated.averagePaceMinPerKm,
        elevationGainM: validated.elevationGainM,
      },
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Workout creation error:", error);
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

    const workouts = await prisma.workout.findMany({
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

    // Calculate statistics
    const stats = {
      totalWorkouts: workouts.length,
      totalDuration: workouts.reduce((sum, w) => sum + w.durationMinutes, 0),
      totalCalories: workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
      avgTrainingLoad:
        workouts.length > 0
          ? Math.round(
              workouts.reduce((sum, w) => sum + (w.trainingLoad || 0), 0) / workouts.length
            )
          : 0,
      workoutsByType: workouts.reduce(
        (acc, w) => {
          acc[w.type] = (acc[w.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return NextResponse.json({
      workouts,
      stats,
    });
  } catch (error) {
    console.error("Get workouts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
