/**
 * Garmin Integration Service
 * Handles OAuth flow, data sync, and metric extraction
 */

import axios, { AxiosInstance } from "axios";

// ============================================================================
// GARMIN API CONFIG
// ============================================================================

const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";
const GARMIN_OAUTH_BASE = "https://auth.garmin.com/oauth-service-3.0";

export interface GarminOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GarminTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface GarminUser {
  userId: string;
  username: string;
  displayName: string;
  profilePhotoUrl?: string;
}

// ============================================================================
// GARMIN OAUTH SERVICE
// ============================================================================

export class GarminOAuthService {
  private config: GarminOAuthConfig;

  constructor(config: GarminOAuthConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "wellness",
      state,
    });

    return `${GARMIN_OAUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GarminTokens> {
    try {
      const response = await axios.post(
        `${GARMIN_OAUTH_BASE}/token`,
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GarminTokens> {
    try {
      const response = await axios.post(
        `${GARMIN_OAUTH_BASE}/token`,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }
}

// ============================================================================
// GARMIN DATA SYNC SERVICE
// ============================================================================

export interface GarminSleepData {
  sleepStartTimestampGMT: number;
  sleepEndTimestampGMT: number;
  durationInSeconds: number;
  sleepScoreId?: number;
  awakeCount?: number;
  deepsleepCount?: number;
  deepSleepDurationInSeconds?: number;
  remSleepCount?: number;
  remSleepDurationInSeconds?: number;
  lightSleepCount?: number;
  lightSleepDurationInSeconds?: number;
  restlessMoments?: number;
  stressPercentHigh?: number;
  stressPercentMedium?: number;
  stressPercentLow?: number;
  qualityScore?: number;
  bodyBatteryAtStart?: number;
  bodyBatteryAtEnd?: number;
}

export interface GarminHeartRateVariability {
  lastNightFiveMinuteValue?: number;
  lastNightTwentyMinuteValue?: number;
  createTimeStamp?: number;
  lastModifiedTimeStamp?: number;
}

export interface GarminRestingHeartRate {
  userId: number;
  recordDate: string;
  restingHeartRateValue: number;
  createTimeStamp: number;
  lastModifiedTimeStamp: number;
}

export interface GarminBodyBattery {
  recordDate: string;
  bodyBatteryValues?: Array<{
    timestamp: number;
    value: number;
  }>;
  lastModifiedTimeStamp: number;
}

export interface GarminStressDetails {
  recordDate: string;
  stressValuesArray?: Array<{
    timestamp: number;
    stressValue: number;
  }>;
  lastModifiedTimeStamp: number;
}

export interface GarminActivitySummary {
  id: number;
  userId: number;
  activityName: string;
  activityType?: number;
  startTimeInSeconds: number;
  durationInSeconds: number;
  distance?: number;
  distanceUnit?: string;
  calories?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  stressScore?: number;
  trainingEffect?: number;
  aerobicTrainingEffect?: number;
  anaerobicTrainingEffect?: number;
  vo2MaxValue?: number;
  vitalityScore?: number;
  cadenceInRpm?: number;
  avgCadence?: number;
  maxCadence?: number;
  pace?: number;
  avgPace?: number;
  maxPace?: number;
  elevation?: number;
  elevationGain?: number;
  elevationLoss?: number;
  monostructureActivityRpe?: number;
  rpeScale?: number;
}

export interface GarminUserMetrics {
  userId: number;
  recordDate: string;
  weight?: number;
  bodyMassIndex?: number;
  bodyFatPercentage?: number;
  boneMass?: number;
  muscleMass?: number;
  physiqueRating?: number;
  metabolicAge?: number;
  visceralFatRating?: number;
  waterPercentage?: number;
}

export class GarminDataService {
  private client: AxiosInstance;

  constructor(accessToken: string) {
    this.client = axios.create({
      baseURL: GARMIN_API_BASE,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<GarminUser> {
    try {
      const response = await this.client.get("/user/id");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error}`);
    }
  }

  /**
   * Fetch sleep data for a date range
   */
  async getSleepData(startDate: string, endDate: string): Promise<GarminSleepData[]> {
    try {
      const response = await this.client.get(
        `/sleep/startTimeInSeconds/${Math.floor(new Date(startDate).getTime() / 1000)}/endTimeInSeconds/${Math.floor(new Date(endDate).getTime() / 1000)}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch sleep data: ${error}`);
      return [];
    }
  }

  /**
   * Get latest HRV data
   */
  async getHeartRateVariability(): Promise<GarminHeartRateVariability | null> {
    try {
      const response = await this.client.get("/hrv/latest");
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch HRV data: ${error}`);
      return null;
    }
  }

  /**
   * Get resting heart rate for date range
   */
  async getRestingHeartRate(startDate: string, endDate: string): Promise<GarminRestingHeartRate[]> {
    try {
      const response = await this.client.get(
        `/rhr/startDate/${startDate}/endDate/${endDate}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch resting heart rate: ${error}`);
      return [];
    }
  }

  /**
   * Get body battery data for date range
   */
  async getBodyBattery(startDate: string, endDate: string): Promise<GarminBodyBattery[]> {
    try {
      const response = await this.client.get(
        `/bodyBattery/startDate/${startDate}/endDate/${endDate}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch body battery: ${error}`);
      return [];
    }
  }

  /**
   * Get stress data for date range
   */
  async getStressData(startDate: string, endDate: string): Promise<GarminStressDetails[]> {
    try {
      const response = await this.client.get(
        `/stress/startDate/${startDate}/endDate/${endDate}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch stress data: ${error}`);
      return [];
    }
  }

  /**
   * Get activity summaries for date range
   */
  async getActivities(startDate: string, endDate: string): Promise<GarminActivitySummary[]> {
    try {
      const response = await this.client.get(
        `/activities/startDate/${startDate}/endDate/${endDate}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch activities: ${error}`);
      return [];
    }
  }

  /**
   * Get user body metrics (weight, body composition)
   */
  async getUserMetrics(startDate: string, endDate: string): Promise<GarminUserMetrics[]> {
    try {
      const response = await this.client.get(
        `/userMetrics/startDate/${startDate}/endDate/${endDate}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch user metrics: ${error}`);
      return [];
    }
  }

  /**
   * Get step count data
   */
  async getSteps(startDate: string, endDate: string): Promise<Array<{ date: string; steps: number }>> {
    try {
      const response = await this.client.get(
        `/steps/startDate/${startDate}/endDate/${endDate}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch step data: ${error}`);
      return [];
    }
  }

  /**
   * Get VO2 Max data
   */
  async getVO2Max(startDate: string, endDate: string): Promise<Array<{ date: string; vo2Max: number }>> {
    try {
      const response = await this.client.get(
        `/vo2Max/startDate/${startDate}/endDate/${endDate}`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch VO2 max data: ${error}`);
      return [];
    }
  }
}

// ============================================================================
// GARMIN DATA TRANSFORMER
// ============================================================================

export interface TransformedWearableData {
  date: string;
  source: "garmin";
  
  sleepDuration?: number; // minutes
  sleepScore?: number; // 0-100
  sleepQuality?: string;
  deepSleep?: number; // minutes
  remSleep?: number; // minutes
  lightSleep?: number; // minutes
  
  hrv?: number; // ms
  restingHeartRate?: number; // bpm
  averageHeartRate?: number;
  maxHeartRate?: number;
  
  bodyBattery?: number; // 0-100
  stressLevel?: number; // 0-100
  
  activeCalories?: number;
  totalCalories?: number;
  steps?: number;
  distance?: number; // km
  trainingLoad?: number;
  vo2Max?: number;
  
  cyclePhase?: string;
  weight?: number;
  bodyFatPercentage?: number;
}

export class GarminDataTransformer {
  /**
   * Transform Garmin sleep data to FuelIQ format
   */
  static transformSleepData(garminSleep: GarminSleepData): {
    sleepDuration: number;
    sleepScore: number;
    sleepQuality: string;
    deepSleep: number;
    remSleep: number;
    lightSleep: number;
  } {
    const durationMinutes = garminSleep.durationInSeconds / 60;

    // Calculate sleep quality based on Garmin metrics
    let sleepScore = garminSleep.qualityScore || 50;

    // Stress-based adjustment
    const stressHigh = garminSleep.stressPercentHigh || 0;
    if (stressHigh > 30) {
      sleepScore = Math.max(0, sleepScore - 20);
    }

    // Determine quality
    let sleepQuality = "fair";
    if (sleepScore >= 80) sleepQuality = "excellent";
    else if (sleepScore >= 60) sleepQuality = "good";
    else if (sleepScore >= 40) sleepQuality = "fair";
    else sleepQuality = "poor";

    return {
      sleepDuration: durationMinutes,
      sleepScore: Math.min(100, Math.max(0, sleepScore)),
      sleepQuality,
      deepSleep: (garminSleep.deepSleepDurationInSeconds || 0) / 60,
      remSleep: (garminSleep.remSleepDurationInSeconds || 0) / 60,
      lightSleep: (garminSleep.lightSleepDurationInSeconds || 0) / 60,
    };
  }

  /**
   * Transform Garmin activity data to workout format
   */
  static transformActivity(garminActivity: GarminActivitySummary): {
    type: string;
    durationMinutes: number;
    intensity: string;
    caloriesBurned: number;
    averageHeartRate: number;
    maxHeartRate: number;
    trainingLoad: number;
    vo2Max?: number;
  } {
    const durationMinutes = garminActivity.durationInSeconds / 60;
    const activityType = this.mapGarminActivityType(garminActivity.activityType || 0);
    
    // Calculate intensity based on training effect
    let intensity = "moderate";
    const trainingEffect = garminActivity.trainingEffect || 0;
    if (trainingEffect >= 4) intensity = "very_high";
    else if (trainingEffect >= 3) intensity = "high";
    else if (trainingEffect >= 1.5) intensity = "moderate";
    else intensity = "low";

    // Estimate training load (0-100 scale)
    // Based on HR intensity, duration, and training effect
    const avgHR = garminActivity.averageHeartRate || 100;
    const maxHR = garminActivity.maxHeartRate || 180;
    const hrIntensity = Math.min(100, (avgHR / maxHR) * 100);
    const trainingLoad = Math.round((hrIntensity + trainingEffect * 15) / 2);

    return {
      type: activityType,
      durationMinutes,
      intensity,
      caloriesBurned: garminActivity.calories || 0,
      averageHeartRate: avgHR,
      maxHeartRate: maxHR,
      trainingLoad: Math.min(100, trainingLoad),
      vo2Max: garminActivity.vo2MaxValue,
    };
  }

  /**
   * Map Garmin activity type IDs to FuelIQ types
   */
  private static mapGarminActivityType(
    garminType: number
  ): "strength" | "cardio" | "endurance" | "mixed" | "recovery" {
    // Common Garmin activity type IDs
    const typeMap: Record<number, string> = {
      1: "cardio", // cycling
      2: "endurance", // running
      3: "strength", // strength training
      4: "cardio", // swimming
      5: "mixed", // multisport
      9: "cardio", // walking
      10: "recovery", // yoga
      12: "strength", // weight training
      19: "cardio", // rowing
      28: "strength", // pilates
      71: "mixed", // hiit
    };

    return (typeMap[garminType] || "mixed") as any;
  }

  /**
   * Transform all Garmin data for a day
   */
  static transformDailyData(
    date: string,
    sleepData?: GarminSleepData,
    restingHR?: number,
    bodyBattery?: number,
    stressLevel?: number,
    activities?: GarminActivitySummary[],
    metrics?: GarminUserMetrics,
    hrv?: number
  ): TransformedWearableData {
    const transformed: TransformedWearableData = {
      date,
      source: "garmin",
    };

    // Sleep
    if (sleepData) {
      const sleepTransformed = this.transformSleepData(sleepData);
      Object.assign(transformed, sleepTransformed);
    }

    // Heart metrics
    if (restingHR) transformed.restingHeartRate = restingHR;
    if (bodyBattery) transformed.bodyBattery = bodyBattery;
    if (stressLevel) transformed.stressLevel = stressLevel;
    if (hrv) transformed.hrv = hrv;

    // Activity aggregation
    if (activities && activities.length > 0) {
      let totalCalories = 0;
      let maxTrainingLoad = 0;
      let totalDuration = 0;
      let maxHR = 0;
      let avgHR = 0;
      let hrCount = 0;

      activities.forEach((activity) => {
        const transformed = this.transformActivity(activity);
        totalCalories += transformed.caloriesBurned;
        maxTrainingLoad = Math.max(maxTrainingLoad, transformed.trainingLoad);
        totalDuration += transformed.durationMinutes;
        maxHR = Math.max(maxHR, transformed.maxHeartRate);
        if (transformed.averageHeartRate) {
          avgHR += transformed.averageHeartRate;
          hrCount++;
        }
      });

      transformed.activeCalories = totalCalories;
      transformed.trainingLoad = maxTrainingLoad;
      if (hrCount > 0) transformed.averageHeartRate = Math.round(avgHR / hrCount);
      transformed.maxHeartRate = maxHR;
    }

    // Body composition
    if (metrics) {
      if (metrics.weight) transformed.weight = metrics.weight;
      if (metrics.bodyFatPercentage) transformed.bodyFatPercentage = metrics.bodyFatPercentage;
    }

    return transformed;
  }
}

export default {
  GarminOAuthService,
  GarminDataService,
  GarminDataTransformer,
};
