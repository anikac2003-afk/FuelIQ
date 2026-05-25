/**
 * FuelIQ AI Coaching Insights Engine
 * Generates intelligent, evidence-based coaching recommendations
 */

import { WearableData, Workout, NutritionLog, RecoveryMetrics, DailyScore } from "@prisma/client";

// ============================================================================
// INSIGHT TYPES & INTERFACES
// ============================================================================

export type InsightType = "recovery" | "nutrition" | "training" | "trend" | "alert" | "performance";
export type InsightPriority = "low" | "medium" | "high" | "critical";

export interface CoachingInsightInput {
  userId: string;
  date: Date;
  recentWearableData: WearableData[]; // last 7-30 days
  recentWorkouts: Workout[]; // last 7-30 days
  recentNutritionLogs: NutritionLog[]; // last 7 days
  recoveryMetrics: RecoveryMetrics | null; // today
  dailyScore: DailyScore | null; // today
  macroTargets?: any; // today
  userGoals: string[]; // muscle_gain, fat_loss, etc
}

export interface GeneratedInsight {
  type: InsightType;
  priority: InsightPriority;
  category: string;
  title: string;
  message: string;
  actionItems?: string[];
  dataPoints?: Record<string, any>;
  confidence: number; // 0-100
}

// ============================================================================
// RECOVERY INSIGHTS
// ============================================================================

export class RecoveryInsightGenerator {
  /**
   * Detect overtraining risk
   */
  static detectOvertrainingRisk(
    recentWorkouts: Workout[],
    recentWearableData: WearableData[]
  ): GeneratedInsight | null {
    if (recentWorkouts.length < 3) return null;

    // Calculate average training load (last 7 days)
    const last7Days = recentWorkouts.filter(
      (w) => new Date(w.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const avgTrainingLoad = last7Days.reduce((sum, w) => sum + (w.trainingLoad || 0), 0) / last7Days.length;

    // Get HRV trend (declining = overtraining risk)
    const hrvValues = recentWearableData
      .filter((w) => w.hrv)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7)
      .map((w) => w.hrv!);

    const hrvTrend = calculateTrend(hrvValues);
    const hrvDecline = hrvTrend === "declining";

    // Get elevated resting HR
    const restingHRValues = recentWearableData
      .filter((w) => w.restingHeartRate)
      .slice(-7)
      .map((w) => w.restingHeartRate!);
    const avgRestingHR = restingHRValues.reduce((a, b) => a + b, 0) / restingHRValues.length;
    const elevatedRHR = avgRestingHR > 65;

    // Check for high training load + declining recovery metrics
    if (avgTrainingLoad > 70 && hrvDecline && elevatedRHR) {
      return {
        type: "alert",
        priority: "critical",
        category: "overtraining",
        title: "⚠️ Overtraining Risk Detected",
        message: `Your training load has been high (avg ${Math.round(avgTrainingLoad)}/100) for 7 days with declining HRV and elevated resting heart rate. This combination suggests inadequate recovery and increased injury risk.`,
        actionItems: [
          "Consider a deload week: reduce volume by 40-50%",
          "Prioritize sleep: aim for 8-9 hours",
          "Implement active recovery days (walking, stretching, mobility)",
          "Monitor HRV daily—it should trend upward with recovery",
          "Review nutrition: ensure adequate calorie and carb intake",
        ],
        dataPoints: {
          avgTrainingLoad: Math.round(avgTrainingLoad),
          hrvTrend,
          avgRestingHR: Math.round(avgRestingHR * 10) / 10,
          daysOfHighLoad: last7Days.length,
        },
        confidence: 85,
      };
    }

    // Moderate overtraining risk
    if (avgTrainingLoad > 65 && (hrvDecline || elevatedRHR)) {
      return {
        type: "alert",
        priority: "high",
        category: "overtraining",
        title: "Elevated Overtraining Risk",
        message: `Training load is moderately high (${Math.round(avgTrainingLoad)}/100) with ${hrvDecline ? "declining HRV" : "elevated resting HR"}. Consider scaling back slightly.`,
        actionItems: [
          "Reduce next week's training volume by 20%",
          "Add an extra rest day",
          "Focus on sleep quality",
        ],
        dataPoints: {
          avgTrainingLoad: Math.round(avgTrainingLoad),
          hrvTrend,
        },
        confidence: 70,
      };
    }

    return null;
  }

  /**
   * Detect under-recovery
   */
  static detectUnderRecovery(
    recentWearableData: WearableData[],
    recoveryMetrics: RecoveryMetrics | null
  ): GeneratedInsight | null {
    if (!recoveryMetrics || recoveryMetrics.recoveryScore > 50) return null;

    const recent5Days = recentWearableData.slice(-5);
    const avgSleep = recent5Days.reduce((sum, w) => sum + (w.sleepDuration || 0), 0) / recent5Days.length;
    const avgSleepScore = recent5Days.reduce((sum, w) => sum + (w.sleepScore || 0), 0) / recent5Days.length;

    const issues: string[] = [];
    if (avgSleep < 360) issues.push("Insufficient sleep duration");
    if (avgSleepScore < 50) issues.push("Poor sleep quality");
    if (recoveryMetrics.stressRecovery < 40) issues.push("Elevated stress levels");

    if (issues.length >= 2) {
      return {
        type: "recovery",
        priority: "high",
        category: "under_recovery",
        title: "Recovery Window: Prioritize Rest",
        message: `Multiple recovery indicators are low: ${issues.join(", ")}. Your body needs focused recovery time.`,
        actionItems: [
          "Schedule lighter training for next 2-3 days",
          "Establish consistent sleep schedule (same bedtime/wake time)",
          "Try relaxation techniques: meditation, breathing exercises",
          "Consider massage or foam rolling",
          "Ensure adequate protein and carbs for repair",
        ],
        dataPoints: {
          recoveryScore: recoveryMetrics.recoveryScore,
          avgSleepDuration: Math.round(avgSleep),
          avgSleepScore: Math.round(avgSleepScore),
          issues,
        },
        confidence: 80,
      };
    }

    return null;
  }

  /**
   * Detect excellent recovery opportunity
   */
  static detectRecoveryOpportunity(
    recoveryMetrics: RecoveryMetrics | null
  ): GeneratedInsight | null {
    if (!recoveryMetrics || recoveryMetrics.readinessScore < 75) return null;

    return {
      type: "performance",
      priority: "medium",
      category: "optimal_readiness",
      title: "🟢 Peak Readiness: Optimal Training Window",
      message: `Excellent recovery state (${recoveryMetrics.readinessScore}/100). Your readiness score indicates you're primed for high-intensity or high-volume training.`,
      actionItems: [
        "Consider a challenging strength session or high-intensity interval training",
        "Test a new 1-rep max or push volume slightly higher",
        "This is an ideal day for quality over quantity",
        "Still maintain proper warm-up and mobility work",
      ],
      dataPoints: {
        readinessScore: recoveryMetrics.readinessScore,
        recommendedIntensity: recoveryMetrics.recommendedIntensity,
      },
      confidence: 90,
    };
  }
}

// ============================================================================
// NUTRITION INSIGHTS
// ============================================================================

export class NutritionInsightGenerator {
  /**
   * Detect chronic under-fueling
   */
  static detectUnderFueling(
    recentNutritionLogs: NutritionLog[],
    macroTargets: any[],
    recentWearableData: WearableData[],
    recentWorkouts: Workout[]
  ): GeneratedInsight | null {
    if (recentNutritionLogs.length < 3 || macroTargets.length < 3) return null;

    // Calculate adherence over last 5 days
    const last5Days = recentNutritionLogs.slice(-5);
    const daysUnderTarget = last5Days.filter((log) => {
      const target = macroTargets.find((t) => new Date(t.date).toDateString() === new Date(log.date).toDateString());
      if (!target) return false;
      return log.calories < target.targetCalories * 0.9; // 10% under
    }).length;

    if (daysUnderTarget < 3) return null;

    // Check for declining recovery and weight loss
    const weightData = recentWearableData.filter((w) => w.date && new Date(w.date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
    const weightTrend = calculateWeightTrend(weightData);

    const avgCalorieDeficit = last5Days.reduce((sum, log) => {
      const target = macroTargets.find((t) => new Date(t.date).toDateString() === new Date(log.date).toDateString());
      return sum + Math.max(0, (target?.targetCalories || 0) - log.calories);
    }, 0) / last5Days.length;

    return {
      type: "alert",
      priority: "critical",
      category: "under_fueling",
      title: "🚨 Critical: Chronic Under-Fueling Detected",
      message: `You've been eating ${Math.round(avgCalorieDeficit)} calories below target for ${daysUnderTarget} consecutive days. Combined with ${weightTrend === "losing" ? "weight loss" : "declining recovery"}, this increases injury risk and undermines performance/body composition goals.`,
      actionItems: [
        `Increase daily intake by ${Math.round(avgCalorieDeficit)} calories starting immediately`,
        "Prioritize carbs (especially post-workout)",
        "Aim for 3 main meals + 2 snacks minimum",
        "Track consistently for next 7 days to verify adherence",
        "If struggling to eat enough, use liquid calories: smoothies, protein shakes, sports drinks",
      ],
      dataPoints: {
        daysUnderTarget,
        avgCalorieDeficit: Math.round(avgCalorieDeficit),
        weightTrend,
        daysAnalyzed: last5Days.length,
      },
      confidence: 90,
    };
  }

  /**
   * Detect insufficient protein
   */
  static detectInsufficientProtein(
    recentNutritionLogs: NutritionLog[],
    macroTargets: any[],
    userGoals: string[]
  ): GeneratedInsight | null {
    if (recentNutritionLogs.length < 3 || !userGoals.includes("muscle_gain")) return null;

    const last5Days = recentNutritionLogs.slice(-5);
    const daysUnderProtein = last5Days.filter((log) => {
      const target = macroTargets.find((t) => new Date(t.date).toDateString() === new Date(log.date).toDateString());
      if (!target) return false;
      return log.protein < target.targetProtein * 0.9;
    }).length;

    if (daysUnderProtein < 3) return null;

    const avgProteinShortfall = last5Days.reduce((sum, log) => {
      const target = macroTargets.find((t) => new Date(t.date).toDateString() === new Date(log.date).toDateString());
      return sum + Math.max(0, (target?.targetProtein || 0) - log.protein);
    }, 0) / last5Days.length;

    return {
      type: "nutrition",
      priority: "high",
      category: "insufficient_protein",
      title: "Protein Target Missed",
      message: `You're averaging ${Math.round(avgProteinShortfall)}g below daily protein target. With your muscle-building goal, consistent protein intake is critical for recovery and adaptation.`,
      actionItems: [
        `Add ${Math.round(avgProteinShortfall)}g protein daily—about 1-2 palm-sized portions of meat/eggs`,
        "Post-workout: 20-40g protein within 2 hours of training",
        "Spread protein across meals: aim for 30-40g per meal",
        "Easy additions: Greek yogurt, cottage cheese, protein shakes",
      ],
      dataPoints: {
        avgShortfall: Math.round(avgProteinShortfall),
        daysUnderTarget: daysUnderProtein,
      },
      confidence: 85,
    };
  }

  /**
   * Detect inconsistent macro distribution
   */
  static detectInconsistentMacros(
    recentNutritionLogs: NutritionLog[],
    macroTargets: any[]
  ): GeneratedInsight | null {
    if (recentNutritionLogs.length < 5) return null;

    const last7Days = recentNutritionLogs.slice(-7);
    
    // Calculate variance in macro adherence
    const proteinVariance = calculateVariance(
      last7Days.map((log) => {
        const target = macroTargets.find((t) => new Date(t.date).toDateString() === new Date(log.date).toDateString());
        return target ? log.protein - target.targetProtein : 0;
      })
    );

    if (proteinVariance > 50) {
      return {
        type: "nutrition",
        priority: "medium",
        category: "inconsistent_macros",
        title: "Macro Consistency: Stabilize Your Nutrition",
        message: `Your macro intake is varying significantly day-to-day. This inconsistency makes it harder to see true progress and adapt fueling optimally.`,
        actionItems: [
          "Use meal prep to standardize portions",
          "Plan meals 3-4 days ahead",
          "Log meals at the time you eat them (not from memory)",
          "Use a tracking app for accountability",
          "Aim for ±5-10g variance on macros daily",
        ],
        dataPoints: {
          proteinVariance: Math.round(proteinVariance),
          daysAnalyzed: last7Days.length,
        },
        confidence: 70,
      };
    }

    return null;
  }
}

// ============================================================================
// TRAINING INSIGHTS
// ============================================================================

export class TrainingInsightGenerator {
  /**
   * Detect training plateau
   */
  static detectPlateau(
    recentWorkouts: Workout[],
    recentWearableData: WearableData[],
    progressMetrics: any[]
  ): GeneratedInsight | null {
    if (recentWorkouts.length < 10) return null;

    // Check if training load hasn't increased in 14 days
    const last14Days = recentWorkouts.filter(
      (w) => new Date(w.date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    const avgLoad = last14Days.reduce((sum, w) => sum + (w.trainingLoad || 0), 0) / last14Days.length;
    const maxLoad = Math.max(...last14Days.map((w) => w.trainingLoad || 0));

    // Check performance metrics (weight, strength, etc)
    const performanceFlat = progressMetrics.slice(-7).every((m) => {
      if (m.value && m.weeklyAverage) {
        return Math.abs(m.value - m.weeklyAverage) < 2;
      }
      return true;
    });

    if (performanceFlat && avgLoad > 50) {
      return {
        type: "training",
        priority: "medium",
        category: "plateau",
        title: "Training Plateau: Time to Adapt",
        message: `You've maintained consistent training load (${Math.round(avgLoad)}/100) for 14+ days with minimal performance progression. Your body has adapted—time to change stimulus.`,
        actionItems: [
          "Increase training volume by 10-15% (add 1-2 more sets/reps)",
          "Change exercise selection or rep ranges",
          "Reduce rest periods between sets by 15-30 seconds",
          "Add explosive/speed-focused work",
          "Ensure progressive overload in tracked metric (weight, reps, speed)",
        ],
        dataPoints: {
          avgTrainingLoad: Math.round(avgLoad),
          maxLoad,
          plateauDays: 14,
        },
        confidence: 75,
      };
    }

    return null;
  }

  /**
   * Detect inconsistent training
   */
  static detectInconsistentTraining(
    recentWorkouts: Workout[],
    userGoals: string[]
  ): GeneratedInsight | null {
    if (recentWorkouts.length < 7) return null;

    const last14Days = recentWorkouts.filter(
      (w) => new Date(w.date) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    );

    // Check for irregular training frequency
    const workoutsPerWeek = last14Days.length / 2;
    
    if (userGoals.includes("muscle_gain") && workoutsPerWeek < 3.5) {
      return {
        type: "training",
        priority: "medium",
        category: "consistency",
        title: "Training Frequency: Increase Volume",
        message: `You've logged only ${Math.round(workoutsPerWeek)} workouts/week. For muscle gain, 4-5 sessions/week is optimal for stimulus and recovery balance.`,
        actionItems: [
          "Schedule 4-5 training days per week",
          "Distribute muscle groups across week (upper/lower or push/pull/legs)",
          "Keep sessions 45-90 minutes",
          "Include at least one full rest day",
        ],
        dataPoints: {
          workoutsPerWeek: Math.round(workoutsPerWeek * 10) / 10,
          recommendedFrequency: "4-5",
        },
        confidence: 70,
      };
    }

    return null;
  }
}

// ============================================================================
// TREND INSIGHTS
// ============================================================================

export class TrendInsightGenerator {
  /**
   * Detect body composition progress
   */
  static detectBodyCompositionProgress(
    progressMetrics: any[],
    recentNutritionAdherence: number,
    recentWorkouts: Workout[]
  ): GeneratedInsight | null {
    const last30Days = progressMetrics.filter(
      (m) => new Date(m.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (last30Days.length < 4) return null;

    const weightMetrics = last30Days.filter((m) => m.metricType === "weight");
    const bodyFatMetrics = last30Days.filter((m) => m.metricType === "body_fat");

    if (weightMetrics.length < 2 || bodyFatMetrics.length < 2) return null;

    const weightTrend = calculateTrend(weightMetrics.map((m) => m.value));
    const bodyFatTrend = calculateTrend(bodyFatMetrics.map((m) => m.value));

    // Body recomposition: weight stable/up, body fat down = ideal
    if (weightTrend === "stable" && bodyFatTrend === "declining") {
      return {
        type: "performance",
        priority: "low",
        category: "progress",
        title: "✅ Body Recomposition Progressing",
        message: `Excellent progress! Weight stable while body fat declining indicates you're gaining muscle while losing fat—the ideal scenario.`,
        actionItems: [
          "Maintain current nutrition and training approach",
          "Consider increasing training volume slightly",
          "Continue prioritizing protein intake",
        ],
        dataPoints: {
          weightTrend,
          bodyFatTrend,
          nutritionAdherence: Math.round(recentNutritionAdherence),
        },
        confidence: 85,
      };
    }

    return null;
  }

  /**
   * HRV trend analysis
   */
  static detectHRVTrend(
    recentWearableData: WearableData[]
  ): GeneratedInsight | null {
    const hrvValues = recentWearableData
      .filter((w) => w.hrv)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14)
      .map((w) => w.hrv!);

    if (hrvValues.length < 7) return null;

    const trend = calculateTrend(hrvValues);
    const trendDirection = trend === "improving" ? "📈 Improving" : trend === "declining" ? "📉 Declining" : "➡️ Stable";

    if (trend === "improving") {
      return {
        type: "recovery",
        priority: "low",
        category: "positive_trend",
        title: `${trendDirection}: Recovery Trending Positive`,
        message: `Your HRV has improved over the last 14 days, indicating better parasympathetic activity and recovery. Your body is adapting well to current training/nutrition.`,
        actionItems: [
          "Continue current training approach—it's working",
          "Maintain sleep and nutrition consistency",
          "Monitor HRV as leading indicator of over-reaching",
        ],
        dataPoints: {
          trend,
          latest7DayAvg: Math.round((hrvValues.slice(-7).reduce((a, b) => a + b) / 7) * 10) / 10,
        },
        confidence: 80,
      };
    }

    if (trend === "declining") {
      return {
        type: "alert",
        priority: "medium",
        category: "recovery_concern",
        title: `${trendDirection}: HRV Declining—Monitor Closely`,
        message: `Your HRV has declined over 14 days, a potential sign of inadequate recovery, stress, or impending illness. Increased monitoring recommended.`,
        actionItems: [
          "Check sleep quality and duration—prioritize 8+ hours",
          "Reduce training volume by 20% for next 3-5 days",
          "Monitor for signs of illness",
          "Manage stress with meditation, breathwork",
        ],
        dataPoints: {
          trend,
          daysDeclined: 14,
          latest7DayAvg: Math.round((hrvValues.slice(-7).reduce((a, b) => a + b) / 7) * 10) / 10,
        },
        confidence: 75,
      };
    }

    return null;
  }
}

// ============================================================================
// INSIGHT GENERATOR (ORCHESTRATOR)
// ============================================================================

export class InsightEngine {
  /**
   * Generate all relevant insights for a user on a given day
   */
  static async generateDailyInsights(inputs: CoachingInsightInput): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    // Recovery Insights
    const overtrainingRisk = RecoveryInsightGenerator.detectOvertrainingRisk(
      inputs.recentWorkouts,
      inputs.recentWearableData
    );
    if (overtrainingRisk) insights.push(overtrainingRisk);

    const underRecovery = RecoveryInsightGenerator.detectUnderRecovery(
      inputs.recentWearableData,
      inputs.recoveryMetrics
    );
    if (underRecovery) insights.push(underRecovery);

    const recoveryOpportunity = RecoveryInsightGenerator.detectRecoveryOpportunity(
      inputs.recoveryMetrics
    );
    if (recoveryOpportunity) insights.push(recoveryOpportunity);

    // Nutrition Insights
    const underFueling = NutritionInsightGenerator.detectUnderFueling(
      inputs.recentNutritionLogs,
      inputs.macroTargets || [],
      inputs.recentWearableData,
      inputs.recentWorkouts
    );
    if (underFueling) insights.push(underFueling);

    const insufficientProtein = NutritionInsightGenerator.detectInsufficientProtein(
      inputs.recentNutritionLogs,
      inputs.macroTargets || [],
      inputs.userGoals
    );
    if (insufficientProtein) insights.push(insufficientProtein);

    const inconsistentMacros = NutritionInsightGenerator.detectInconsistentMacros(
      inputs.recentNutritionLogs,
      inputs.macroTargets || []
    );
    if (inconsistentMacros) insights.push(inconsistentMacros);

    // Training Insights
    const plateau = TrainingInsightGenerator.detectPlateau(
      inputs.recentWorkouts,
      inputs.recentWearableData,
      []
    );
    if (plateau) insights.push(plateau);

    const inconsistentTraining = TrainingInsightGenerator.detectInconsistentTraining(
      inputs.recentWorkouts,
      inputs.userGoals
    );
    if (inconsistentTraining) insights.push(inconsistentTraining);

    // Trend Insights
    const hrvTrend = TrendInsightGenerator.detectHRVTrend(inputs.recentWearableData);
    if (hrvTrend) insights.push(hrvTrend);

    // Sort by priority (critical > high > medium > low)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return insights;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateTrend(
  values: number[]
): "improving" | "declining" | "stable" {
  if (values.length < 3) return "stable";

  const recent = values.slice(-3);
  const older = values.slice(0, 3);

  const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b) / older.length;
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (change > 5) return "improving";
  if (change < -5) return "declining";
  return "stable";
}

function calculateWeightTrend(wearableData: WearableData[]): "stable" | "gaining" | "losing" {
  if (wearableData.length < 2) return "stable";

  const weights = wearableData
    .filter((w) => w.activeCalories) // Using calories as proxy, would use actual weight
    .map((w) => w.activeCalories || 0);

  if (weights.length < 2) return "stable";

  const trend = calculateTrend(weights);
  return trend as any;
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b) / squareDiffs.length);
}

export default {
  RecoveryInsightGenerator,
  NutritionInsightGenerator,
  TrainingInsightGenerator,
  TrendInsightGenerator,
  InsightEngine,
};
