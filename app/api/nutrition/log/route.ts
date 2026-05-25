/**
 * Nutrition Logging API
 * POST /api/nutrition/log - Create nutrition log
 * GET /api/nutrition/log - Get user's nutrition logs
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const NutritionLogSchema = z.object({
  date: z.string(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"]),
  mealTime: z.string().optional(),
  foodItems: z.array(
    z.object({
      foodName: z.string(),
      quantity: z.number(),
      unit: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fats: z.number(),
      fiber: z.number().optional(),
    })
  ),
  notes: z.string().optional(),
  source: z.enum(["manual", "barcode", "photo", "recipe"]).optional(),
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
    const validated = NutritionLogSchema.parse(body);

    // Calculate totals
    const totals = validated.foodItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories * (item.quantity / 100),
        protein: acc.protein + item.protein * (item.quantity / 100),
        carbs: acc.carbs + item.carbs * (item.quantity / 100),
        fats: acc.fats + item.fats * (item.quantity / 100),
        fiber: acc.fiber + (item.fiber || 0) * (item.quantity / 100),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );

    // Create nutrition log
    const nutritionLog = await prisma.nutritionLog.create({
      data: {
        userId: user.id,
        date: new Date(validated.date),
        mealType: validated.mealType,
        mealTime: validated.mealTime ? new Date(validated.mealTime) : null,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fats: totals.fats,
        fiber: totals.fiber,
        notes: validated.notes,
        source: validated.source,
        foodItems: {
          createMany: {
            data: validated.foodItems.map((item) => ({
              foodName: item.foodName,
              quantity: item.quantity,
              unit: item.unit,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fats: item.fats,
              fiber: item.fiber || 0,
            })),
          },
        },
      },
      include: {
        foodItems: true,
      },
    });

    return NextResponse.json(nutritionLog, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Nutrition log error:", error);
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
    const dateStr = searchParams.get("date");
    const days = parseInt(searchParams.get("days") || "7");

    const startDate = dateStr
      ? new Date(dateStr)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const nutritionLogs = await prisma.nutritionLog.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        foodItems: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Group by date
    const grouped = nutritionLogs.reduce(
      (acc, log) => {
        const dateKey = new Date(log.date).toISOString().split("T")[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(log);
        return acc;
      },
      {} as Record<string, typeof nutritionLogs>
    );

    // Calculate daily totals
    const dailyTotals = Object.entries(grouped).map(([date, logs]) => {
      const totals = logs.reduce(
        (acc, log) => ({
          calories: acc.calories + log.calories,
          protein: acc.protein + log.protein,
          carbs: acc.carbs + log.carbs,
          fats: acc.fats + log.fats,
          fiber: acc.fiber + log.fiber,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
      );

      return {
        date,
        logs,
        totals,
      };
    });

    return NextResponse.json(dailyTotals);
  } catch (error) {
    console.error("Get nutrition logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
