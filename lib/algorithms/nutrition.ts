/**
 * FuelIQ Core Algorithms
 * Recovery Scoring, Macro Calculation, Fueling Intelligence
 */

import { WearableData, RecoveryMetrics, Workout, MacroTarget } from "@prisma/client";

// ============================================================================
// RECOVERY & READINESS SCORING ENGINE
// ============================================================================

export interface RecoveryInputs {
  sleepDuration?: number; // minutes
  sleepScore?: number; // 0-100
  hrv?: number; // ms
  hrvTrend?: "improving" | "stable" | "declining"; // trend over 7 days
  restingHeartRate?: number; // bpm
  stressLevel?: number; // 0-100
  bodyBattery?: number; // 0-100
  previousDayTrainingLoad?: number; // 0-100
  activeCalories?: number;
  nutritionAdherence?: number; // 0-100 from previous day
  menstrualPhase?: string;
  chronotype?: "morning_person" | "night_owl" | "neutral";
}

export interface RecoveryScores {
  readinessScore: number; // 0-100, how ready to train
  recoveryScore: number; // 0-100, how recovered
  fatigueScore: number; // 0-100, how fatigued
  sleepRecovery: number;
  hrvRecovery: number;
  stressRecovery: number;
  nutritionRecovery: number;
  recommendedIntensity: "rest" | "recovery" | "moderate" | "high" | "maximum";
  shouldTrain: boolean;
  trainingModification?: string;
  summary: string;
}

/**
 * Calculate comprehensive recovery and readiness scores
 * Mimics WHOOP, Oura, Fitbod logic
 */
export function calculateRecoveryScores(inputs: RecoveryInputs): RecoveryScores {
  // Component Scores (0-100)
  const sleepRecovery = calculateSleepRecovery(inputs.sleepDuration, inputs.sleepScore);
  const hrvRecovery = calculateHRVRecovery(inputs.hrv, inputs.hrvTrend);
  const stressRecovery = calculateStressRecovery(inputs.stressLevel);
  const nutritionRecovery = inputs.nutritionAdherence ?? 50;

  // Weighted composite scores
  const recoveryScore = Math.round(
    sleepRecovery * 0.35 + hrvRecovery * 0.3 + stressRecovery * 0.2 + nutritionRecovery * 0.15
  );

  // Readiness accounts for recent training load
  const trainingFatigue = Math.min(inputs.previousDayTrainingLoad ?? 0, 100);
  const readinessScore = Math.round(recoveryScore * 0.7 - trainingFatigue * 0.3);

  const fatigueScore = 100 - recoveryScore;

  // Determine recommended intensity & modifications
  const { recommendedIntensity, shouldTrain, trainingModification, summary } =
    determineTrainingRecommendation(
      readinessScore,
      hrvRecovery,
      sleepRecovery,
      inputs.hrv,
      inputs.sleepDuration
    );

  return {
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    recoveryScore: Math.max(0, Math.min(100, recoveryScore)),
    fatigueScore: Math.max(0, Math.min(100, fatigueScore)),
    sleepRecovery,
    hrvRecovery,
    stressRecovery,
    nutritionRecovery,
    recommendedIntensity,
    shouldTrain,
    trainingModification,
    summary,
  };
}

function calculateSleepRecovery(duration?: number, quality?: number): number {
  if (!duration && !quality) return 50;

  let score = 0;
  let weights = 0;

  // Sleep Duration Component (optimal 7-9 hours)
  if (duration) {
    const hours = duration / 60;
    let durationScore = 100;

    if (hours < 5) durationScore = 20;
    else if (hours < 6) durationScore = 40;
    else if (hours < 7) durationScore = 70;
    else if (hours <= 9) durationScore = 100;
    else if (hours < 10) durationScore = 90;
    else durationScore = 75; // too much sleep

    score += durationScore * 0.6;
    weights += 0.6;
  }

  // Sleep Quality Component
  if (quality) {
    score += quality * 0.4;
    weights += 0.4;
  }

  return weights > 0 ? Math.round(score / weights) : 50;
}

function calculateHRVRecovery(hrv?: number, trend?: string): number {
  if (!hrv) return 50;

  // HRV baseline varies by person; using general thresholds
  let baseScore = 50;

  // Higher HRV is better
  if (hrv < 20) baseScore = 30;
  else if (hrv < 30) baseScore = 50;
  else if (hrv < 50) baseScore = 70;
  else if (hrv < 100) baseScore = 85;
  else baseScore = 95;

  // Trend adjustment (larger weight than absolute value)
  let trendBonus = 0;
  if (trend === "improving") trendBonus = 10;
  else if (trend === "declining") trendBonus = -15;

  return Math.max(0, Math.min(100, baseScore + trendBonus));
}

function calculateStressRecovery(stressLevel?: number): number {
  if (!stressLevel) return 50;

  // Lower stress is better
  return Math.max(0, 100 - stressLevel);
}

function determineTrainingRecommendation(
  readiness: number,
  hrvScore: number,
  sleepScore: number,
  hrv?: number,
  sleepDuration?: number
): {
  recommendedIntensity: "rest" | "recovery" | "moderate" | "high" | "maximum";
  shouldTrain: boolean;
  trainingModification?: string;
  summary: string;
} {
  const messages: string[] = [];

  if (readiness < 30) {
    const issues: string[] = [];
    if (sleepScore < 40) issues.push("Poor sleep");
    if (hrvScore < 40) issues.push("Low HRV");
    if (sleepDuration && sleepDuration < 300) issues.push("Insufficient sleep duration");

    return {
      recommendedIntensity: "rest",
      shouldTrain: false,
      trainingModification: "complete_rest",
      summary: `Complete rest day recommended. ${issues.join(", ")} indicates recovery deficit.`,
    };
  }

  if (readiness < 50) {
    messages.push("Recovering from recent training load");
    return {
      recommendedIntensity: "recovery",
      shouldTrain: true,
      trainingModification: "reduce_volume_and_intensity",
      summary: `Light recovery session recommended. Focus on mobility, low-intensity work. ${messages.join(" ")}`,
    };
  }

  if (readiness < 65) {
    return {
      recommendedIntensity: "moderate",
      shouldTrain: true,
      trainingModification: "none",
      summary: `Moderate training session appropriate. Avoid max effort work.`,
    };
  }

  if (readiness < 80) {
    return {
      recommendedIntensity: "high",
      shouldTrain: true,
      trainingModification: "none",
      summary: `Good readiness for challenging session. Conditions support quality training.`,
    };
  }

  return {
    recommendedIntensity: "maximum",
    shouldTrain: true,
    trainingModification: "none",
    summary: `Excellent readiness. Green light for max effort, PRs, or high-volume training.`,
  };
}

// ============================================================================
// ADAPTIVE MACRO CALCULATION ENGINE
// ============================================================================

export interface MacroCalculationInputs {
  userId: string;
  date: Date;
  
  // User Baseline
  weight: number; // kg
  age: number;
  gender: "male" | "female" | "other";
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active";
  goals: string[]; // ["muscle_gain", "fat_loss", "performance", "body_recomposition"]
  
  // Today's Training
  workoutType?: "strength" | "cardio" | "endurance" | "mixed" | "recovery";
  trainingLoadScore?: number; // 0-100
  durationMinutes?: number;
  intensity?: "low" | "moderate" | "high" | "very_high";
  caloriesBurned?: number;
  muscleGroupsFocused?: string[];
  
  // Recovery State
  readinessScore?: number; // 0-100
  recoveryStatus?: "poor" | "fair" | "good" | "excellent";
  sleepScore?: number;
  hrvTrend?: "improving" | "stable" | "declining";
  
  // Body Metrics
  menstrualPhase?: "menstruation" | "follicular" | "ovulation" | "luteal";
  bodyFatPercentage?: number;
  
  // Historical Data
  recentNutritionAdherence?: number; // 0-100, last 3-5 days average
  recentWeightTrend?: "stable" | "gaining" | "losing"; // last 7 days
  underFuelingRisk?: boolean; // RED FLAG
  
  // Preference
  dietaryRestrictions?: string[];
}

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
  fiber: number; // grams
  hydration: number; // liters
  
  // Rationale
  calculationMethod: string;
  rationale: string;
  adjustments: string[];
}

/**
 * Calculate personalized daily macro targets
 * Adapts based on training load, recovery, goals, menstrual cycle
 */
export function calculateAdaptiveMacros(inputs: MacroCalculationInputs): MacroTargets {
  // Step 1: Calculate baseline metabolic rate
  const bmr = calculateBMR(inputs.weight, inputs.age, inputs.gender);

  // Step 2: Calculate total daily energy expenditure
  const tdee = calculateTDEE(bmr, inputs.activityLevel, inputs.trainingLoadScore);

  // Step 3: Apply goal-based calorie adjustment
  const goalAdjustment = getGoalCalorieAdjustment(inputs.goals, inputs.recentWeightTrend);
  const adjustedCalories = tdee + goalAdjustment;

  // Step 4: Apply recovery-based modulation
  const recoveryModulation = getRecoveryCalorieModulation(
    inputs.readinessScore,
    inputs.recoveryStatus,
    inputs.underFuelingRisk
  );
  const finalCalories = adjustedCalories * (1 + recoveryModulation);

  // Step 5: Calculate macro distribution based on training & goals
  const macros = calculateMacroDistribution(
    finalCalories,
    inputs.weight,
    inputs.goals,
    inputs.workoutType,
    inputs.trainingLoadScore,
    inputs.menstrualPhase,
    inputs.intensity
  );

  // Step 6: Generate adjustments array
  const adjustments = generateMacroAdjustments(inputs, finalCalories, recoveryModulation);

  return {
    calories: Math.round(finalCalories),
    protein: Math.round(macros.protein),
    carbs: Math.round(macros.carbs),
    fats: Math.round(macros.fats),
    fiber: Math.round(macros.fiber),
    hydration: calculateHydrationTarget(
      inputs.weight,
      inputs.trainingLoadScore,
      inputs.workoutType
    ),
    calculationMethod: "adaptive",
    rationale: generateMacroRationale(inputs, finalCalories, macros),
    adjustments,
  };
}

function calculateBMR(weight: number, age: number, gender: "male" | "female" | "other"): number {
  // Mifflin-St Jeor equation
  if (gender === "male") {
    return 10 * weight + 6.25 * 170 - 5 * age + 5; // assuming 170cm height
  } else {
    return 10 * weight + 6.25 * 165 - 5 * age - 161; // assuming 165cm height
  }
}

function calculateTDEE(
  bmr: number,
  activityLevel: string,
  trainingLoadScore?: number
): number {
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };

  const baseMultiplier = activityMultipliers[activityLevel] || 1.55;
  const baseTDEE = bmr * baseMultiplier;

  // Add training load bonus
  if (trainingLoadScore) {
    const trainingCalories = (trainingLoadScore / 100) * 300; // up to 300 extra calories for high load
    return baseTDEE + trainingCalories;
  }

  return baseTDEE;
}

function getGoalCalorieAdjustment(
  goals: string[],
  recentWeightTrend?: string
): number {
  let adjustment = 0;

  if (goals.includes("muscle_gain")) {
    adjustment += 250; // lean bulk
  } else if (goals.includes("fat_loss")) {
    adjustment -= 300; // conservative deficit
  } else if (goals.includes("body_recomposition")) {
    adjustment += 0; // maintenance with proper macros
  }

  // Trend-based fine-tuning
  if (recentWeightTrend === "losing" && goals.includes("muscle_gain")) {
    adjustment += 100; // increase if losing weight during bulk
  } else if (recentWeightTrend === "gaining" && goals.includes("fat_loss")) {
    adjustment -= 100; // decrease if not losing weight during cut
  }

  return adjustment;
}

function getRecoveryCalorieModulation(
  readinessScore?: number,
  recoveryStatus?: string,
  underFuelingRisk?: boolean
): number {
  // Recovery-based modulation: prioritize not under-fueling
  if (underFuelingRisk) {
    return 0.1; // +10% calories to recover
  }

  if (!readinessScore) return 0;

  if (readinessScore < 40) {
    return -0.05; // -5% for very low recovery (rest day, light training)
  } else if (readinessScore < 60) {
    return 0.0; // no adjustment
  } else if (readinessScore < 80) {
    return 0.05; // +5% for good recovery
  } else {
    return 0.1; // +10% for excellent recovery (can afford higher volume)
  }
}

interface MacroRatios {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

function calculateMacroDistribution(
  calories: number,
  weight: number,
  goals: string[],
  workoutType?: string,
  trainingLoadScore?: number,
  menstrualPhase?: string,
  intensity?: string
): MacroRatios {
  let proteinGPerKg = 1.6; // base for active individuals
  let carbsPercentage = 0.45; // base
  let fatsPercentage = 0.25; // base

  // Goal-based adjustment
  if (goals.includes("muscle_gain")) {
    proteinGPerKg = 2.0; // higher protein for muscle building
    carbsPercentage = 0.48;
    fatsPercentage = 0.22;
  } else if (goals.includes("fat_loss")) {
    proteinGPerKg = 2.2; // higher protein to preserve muscle during deficit
    carbsPercentage = 0.38;
    fatsPercentage = 0.27;
  } else if (goals.includes("body_recomposition")) {
    proteinGPerKm = 1.8;
    carbsPercentage = 0.46;
    fatsPercentage = 0.24;
  }

  // Training type adjustment
  if (workoutType === "strength") {
    carbsPercentage = Math.min(0.5, carbsPercentage + 0.05); // more carbs for strength
  } else if (workoutType === "endurance") {
    carbsPercentage = Math.min(0.55, carbsPercentage + 0.1); // significantly more carbs
  } else if (workoutType === "recovery") {
    carbsPercentage = Math.max(0.3, carbsPercentage - 0.1); // less carbs on rest day
  }

  // Training load boost
  if (trainingLoadScore && trainingLoadScore > 70) {
    carbsPercentage = Math.min(0.55, carbsPercentage + 0.05); // high-load day needs carbs
  }

  // Menstrual cycle phase (follicular phase = higher carb tolerance)
  if (menstrualPhase === "follicular" || menstrualPhase === "ovulation") {
    carbsPercentage = Math.min(0.55, carbsPercentage + 0.03);
    fatsPercentage = Math.max(0.2, fatsPercentage - 0.02);
  } else if (menstrualPhase === "luteal") {
    // luteal phase: slightly higher fats, lower carbs
    carbsPercentage = Math.max(0.35, carbsPercentage - 0.03);
    fatsPercentage = Math.min(0.3, fatsPercentage + 0.03);
  }

  // Intensity-based adjustments
  if (intensity === "very_high") {
    carbsPercentage = Math.min(0.55, carbsPercentage + 0.05);
  }

  // Recalculate percentages to 100%
  const total = proteinGPerKg + carbsPercentage + fatsPercentage;
  carbsPercentage = carbsPercentage / total;
  fatsPercentage = fatsPercentage / total;

  // Calculate grams
  const protein = proteinGPerKg * weight;
  const carbs = (calories * carbsPercentage) / 4; // 4 cal/g
  const fats = (calories * fatsPercentage) / 9; // 9 cal/g
  const fiber = Math.round(weight * 0.15); // ~15g per kg of body weight

  return {
    protein,
    carbs,
    fats,
    fiber,
  };
}

function calculateHydrationTarget(
  weight: number,
  trainingLoadScore?: number,
  workoutType?: string
): number {
  // Base: 30-35 ml per kg
  let liters = weight * 0.033;

  // Training load bonus
  if (trainingLoadScore && trainingLoadScore > 50) {
    liters += (trainingLoadScore / 100) * 0.5; // up to 0.5L extra
  }

  // Workout type bonus
  if (workoutType === "cardio" || workoutType === "endurance") {
    liters += 0.5;
  }

  return Math.round(liters * 10) / 10; // round to nearest 0.1L
}

function generateMacroAdjustments(
  inputs: MacroCalculationInputs,
  finalCalories: number,
  recoveryModulation: number
): string[] {
  const adjustments: string[] = [];

  if (inputs.trainingLoadScore && inputs.trainingLoadScore > 70) {
    adjustments.push("High training load: increased carbs for recovery");
  }

  if (inputs.workoutType === "strength") {
    adjustments.push("Strength training day: prioritized carbs and protein timing");
  }

  if (inputs.readinessScore && inputs.readinessScore < 50) {
    adjustments.push("Low readiness: calorie target slightly reduced to support recovery");
  } else if (inputs.readinessScore && inputs.readinessScore > 80) {
    adjustments.push("Excellent recovery: increased calorie availability supports volume");
  }

  if (inputs.menstrualPhase === "luteal") {
    adjustments.push("Luteal phase: adjusted macro distribution (higher fat, slightly lower carbs)");
  }

  if (inputs.underFuelingRisk) {
    adjustments.push("⚠️ RED FLAG: Recent under-fueling detected. Increased calories to support recovery.");
  }

  return adjustments;
}

function generateMacroRationale(
  inputs: MacroCalculationInputs,
  finalCalories: number,
  macros: MacroRatios
): string {
  const parts: string[] = [];

  parts.push(`Base TDEE: ${Math.round(calculateTDEE(calculateBMR(inputs.weight, inputs.age, inputs.gender), inputs.activityLevel, inputs.trainingLoadScore))} cal`);

  if (inputs.goals.includes("muscle_gain")) {
    parts.push("Goal: Lean muscle gain (+250 cal surplus)");
  } else if (inputs.goals.includes("fat_loss")) {
    parts.push("Goal: Fat loss with muscle preservation (-300 cal deficit)");
  }

  if (inputs.trainingLoadScore && inputs.trainingLoadScore > 70) {
    parts.push(`High training load (${inputs.trainingLoadScore}/100) requires elevated carbs`);
  }

  if (inputs.menstrualPhase) {
    parts.push(`${inputs.menstrualPhase} phase: adjusted macro ratio`);
  }

  return parts.join(" • ");
}

// ============================================================================
// FUELING QUALITY SCORING
// ============================================================================

export interface FuelingQualityInputs {
  intakeCalories: number;
  targetCalories: number;
  intakeProtein: number;
  targetProtein: number;
  intakeCarbs: number;
  targetCarbs: number;
  intakeFats: number;
  targetFats: number;
  mealTiming?: string[]; // when meals were eaten
  preWorkoutFueling?: boolean;
  postWorkoutFueling?: boolean;
  hydration?: number; // liters
}

export function calculateFuelingQualityScore(inputs: FuelingQualityInputs): {
  score: number;
  componentScores: Record<string, number>;
  feedback: string[];
} {
  const componentScores: Record<string, number> = {};

  // Calorie adherence (±10% is ideal)
  const calorieAccuracy = getAccuracyScore(inputs.intakeCalories, inputs.targetCalories, 0.1);
  componentScores["calorie_accuracy"] = calorieAccuracy;

  // Protein adequacy (at least 90% of target)
  const proteinScore = Math.min(100, (inputs.intakeProtein / inputs.targetProtein) * 100);
  componentScores["protein_adequacy"] = proteinScore;

  // Carb distribution (±15% acceptable)
  const carbAccuracy = getAccuracyScore(inputs.intakeCarbs, inputs.targetCarbs, 0.15);
  componentScores["carb_distribution"] = carbAccuracy;

  // Fat balance (±15% acceptable)
  const fatAccuracy = getAccuracyScore(inputs.intakeFats, inputs.targetFats, 0.15);
  componentScores["fat_balance"] = fatAccuracy;

  // Meal timing bonus
  let timingScore = 50;
  if (inputs.preWorkoutFueling) timingScore += 15;
  if (inputs.postWorkoutFueling) timingScore += 15;
  if (inputs.mealTiming && inputs.mealTiming.length >= 3) timingScore += 10;
  componentScores["meal_timing"] = Math.min(100, timingScore);

  // Hydration bonus
  let hydrationScore = 50;
  if (inputs.hydration) {
    const targetLiters = 2.5; // example
    hydrationScore = Math.min(100, (inputs.hydration / targetLiters) * 100);
  }
  componentScores["hydration"] = hydrationScore;

  // Composite score
  const score = Math.round(
    calorieAccuracy * 0.3 +
      proteinScore * 0.25 +
      carbAccuracy * 0.2 +
      fatAccuracy * 0.15 +
      componentScores["meal_timing"] * 0.05 +
      hydrationScore * 0.05
  );

  // Generate feedback
  const feedback = generateFuelingFeedback(inputs, componentScores);

  return { score: Math.max(0, Math.min(100, score)), componentScores, feedback };
}

function getAccuracyScore(actual: number, target: number, tolerance: number): number {
  const deviation = Math.abs(actual - target) / target;
  if (deviation <= tolerance) return 100;
  if (deviation <= tolerance * 1.5) return 80;
  if (deviation <= tolerance * 2) return 60;
  return Math.max(20, 100 - deviation * 50);
}

function generateFuelingFeedback(
  inputs: FuelingQualityInputs,
  scores: Record<string, number>
): string[] {
  const feedback: string[] = [];

  // Calorie feedback
  const calorieDiff = inputs.intakeCalories - inputs.targetCalories;
  if (Math.abs(calorieDiff) > inputs.targetCalories * 0.1) {
    if (calorieDiff > 0) {
      feedback.push(
        `Over target by ~${Math.round(calorieDiff)} calories. Monitor for consistent surplus.`
      );
    } else {
      feedback.push(
        `Under target by ~${Math.round(Math.abs(calorieDiff))} calories. Risk of chronic under-fueling.`
      );
    }
  } else {
    feedback.push("✓ Calorie target hit accurately");
  }

  // Protein feedback
  if (inputs.intakeProtein < inputs.targetProtein * 0.9) {
    feedback.push(
      `⚠️ Protein ${Math.round(inputs.intakeProtein)}g vs target ${Math.round(inputs.targetProtein)}g. May impact recovery.`
    );
  } else {
    feedback.push("✓ Protein intake adequate for muscle recovery");
  }

  // Carb feedback
  if (inputs.intakeCarbs < inputs.targetCarbs * 0.85) {
    feedback.push(
      `Carbs below target. May compromise training performance and recovery.`
    );
  } else if (inputs.intakeCarbs > inputs.targetCarbs * 1.15) {
    feedback.push(`Carbs elevated. Monitor if exceeds training demand.`);
  } else {
    feedback.push("✓ Carb distribution appropriate");
  }

  // Meal timing feedback
  if (!inputs.preWorkoutFueling || !inputs.postWorkoutFueling) {
    feedback.push("Consider strategic meal timing around workouts");
  }

  return feedback;
}

export default {
  calculateRecoveryScores,
  calculateAdaptiveMacros,
  calculateFuelingQualityScore,
};
