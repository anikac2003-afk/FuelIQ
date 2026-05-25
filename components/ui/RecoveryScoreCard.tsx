/**
 * Recovery Score Card Component
 * Displays readiness, recovery, and fatigue scores
 */

import React from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";

interface RecoveryScoreCardProps {
  readinessScore: number;
  recoveryScore: number;
  fatigueScore: number;
  recommendedIntensity: string;
  trend?: "improving" | "stable" | "declining";
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return "from-green-500 to-emerald-600";
  if (score >= 60) return "from-blue-500 to-blue-600";
  if (score >= 40) return "from-yellow-500 to-orange-600";
  return "from-red-500 to-red-600";
};

const getIntensityColor = (intensity: string): string => {
  const colors: Record<string, string> = {
    rest: "bg-gray-200 text-gray-800",
    recovery: "bg-blue-200 text-blue-800",
    moderate: "bg-yellow-200 text-yellow-800",
    high: "bg-orange-200 text-orange-800",
    maximum: "bg-red-200 text-red-800",
  };
  return colors[intensity] || "bg-gray-200 text-gray-800";
};

export const RecoveryScoreCard: React.FC<RecoveryScoreCardProps> = ({
  readinessScore,
  recoveryScore,
  fatigueScore,
  recommendedIntensity,
  trend = "stable",
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Recovery Status</h2>
          <p className="text-gray-500 text-sm mt-1">How ready are you to train today?</p>
        </div>
        {trend === "improving" && (
          <div className="flex items-center gap-1 text-green-500">
            <TrendingUp size={20} />
            <span className="text-sm font-semibold">Improving</span>
          </div>
        )}
        {trend === "declining" && (
          <div className="flex items-center gap-1 text-red-500">
            <ArrowDown size={20} />
            <span className="text-sm font-semibold">Declining</span>
          </div>
        )}
      </div>

      {/* Main Score Display */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          className={`bg-gradient-to-br ${getScoreColor(readinessScore)} rounded-lg p-4 text-white`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs font-semibold text-white/80 mb-2">Readiness</p>
          <p className="text-4xl font-bold">{readinessScore}</p>
          <p className="text-xs text-white/70 mt-1">How ready to train</p>
        </motion.div>

        <motion.div
          className={`bg-gradient-to-br ${getScoreColor(recoveryScore)} rounded-lg p-4 text-white`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs font-semibold text-white/80 mb-2">Recovery</p>
          <p className="text-4xl font-bold">{recoveryScore}</p>
          <p className="text-xs text-white/70 mt-1">Recovery state</p>
        </motion.div>

        <motion.div
          className={`bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-4 text-white`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs font-semibold text-white/80 mb-2">Fatigue</p>
          <p className="text-4xl font-bold">{fatigueScore}</p>
          <p className="text-xs text-white/70 mt-1">Fatigue level</p>
        </motion.div>
      </div>

      {/* Recommended Intensity */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">Recommended Training Intensity</p>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getIntensityColor(recommendedIntensity)}`}>
            {recommendedIntensity.replace("_", " ").toUpperCase()}
          </span>
          <p className="text-sm text-gray-600">
            {recommendedIntensity === "maximum"
              ? "Green light for max effort"
              : recommendedIntensity === "high"
              ? "Good conditions for hard training"
              : recommendedIntensity === "moderate"
              ? "Moderate intensity appropriate"
              : recommendedIntensity === "recovery"
              ? "Focus on easy movement"
              : "Complete rest recommended"}
          </p>
        </div>
      </div>
    </div>
  );
};
