/**
 * Macro Targets Display Component
 * Shows daily calorie and macro targets with visual progress
 */

import React from "react";
import { motion } from "framer-motion";
import { Flame, Zap, Activity } from "lucide-react";

interface MacroTargetsProps {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  targetFiber?: number;
  hydrationTarget?: number;
  rationale?: string;
  adjustments?: string[];
}

const MacroBar: React.FC<{
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, target, unit, color, icon }) => {
  const percentage = Math.min((value / target) * 100, 100);
  const isOver = value > target * 1.1;
  const isUnder = value < target * 0.9;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className={`text-${color}`}>{icon}</div>
          <span className="font-semibold text-gray-700">{label}</span>
        </div>
        <span className={`font-bold text-lg ${
          isUnder ? "text-orange-600" : isOver ? "text-red-600" : "text-green-600"
        }`}>
          {Math.round(value)}/{Math.round(target)}{unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-600 rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      {isUnder && (
        <p className="text-xs text-orange-600 mt-1">
          {Math.round(target - value)}g below target
        </p>
      )}
      {isOver && (
        <p className="text-xs text-red-600 mt-1">
          {Math.round(value - target)}g above target
        </p>
      )}
    </div>
  );
};

export const MacroTargetsCard: React.FC<MacroTargetsProps> = ({
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFats,
  targetFiber,
  hydrationTarget,
  rationale,
  adjustments,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Today's Nutrition Targets</h2>
        {rationale && <p className="text-sm text-gray-600">{rationale}</p>}
      </div>

      {/* Calorie Target - Large */}
      <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">Daily Calorie Target</p>
            <p className="text-5xl font-bold mt-2">{Math.round(targetCalories)}</p>
            <p className="text-sm text-white/70 mt-1">kcal</p>
          </div>
          <Flame size={48} className="text-white/80" />
        </div>
      </div>

      {/* Macro Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Macro Distribution</h3>

        <MacroBar
          label="Protein"
          value={0}
          target={targetProtein}
          unit="g"
          color="blue"
          icon={<Zap size={20} className="text-blue-500" />}
        />
        <MacroBar
          label="Carbs"
          value={0}
          target={targetCarbs}
          unit="g"
          color="green"
          icon={<Activity size={20} className="text-green-500" />}
        />
        <MacroBar
          label="Fats"
          value={0}
          target={targetFats}
          unit="g"
          color="yellow"
          icon={<Flame size={20} className="text-yellow-500" />}
        />

        {targetFiber && (
          <MacroBar
            label="Fiber"
            value={0}
            target={targetFiber}
            unit="g"
            color="purple"
            icon={<Activity size={20} className="text-purple-500" />}
          />
        )}
      </div>

      {/* Hydration Target */}
      {hydrationTarget && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border-l-4 border-blue-500">
          <p className="text-sm font-semibold text-gray-700">Hydration Target</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{hydrationTarget}L</p>
        </div>
      )}

      {/* Adjustments */}
      {adjustments && adjustments.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
          <p className="text-sm font-semibold text-gray-700 mb-2">Today's Adjustments</p>
          <ul className="space-y-1">
            {adjustments.map((adj, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex gap-2">
                <span className="text-yellow-600">•</span>
                {adj}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
