/**
 * Coaching Insights Card Component
 * Displays AI-generated insights with priority levels
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, TrendingUp, AlertTriangle, CheckCircle, ChevronDown } from "lucide-react";

interface CoachingInsightProps {
  type: "recovery" | "nutrition" | "training" | "trend" | "alert" | "performance";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  actionItems?: string[];
  dataPoints?: Record<string, any>;
  confidence?: number;
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case "critical":
      return <AlertCircle className="text-red-600" size={24} />;
    case "high":
      return <AlertTriangle className="text-orange-600" size={24} />;
    case "medium":
      return <TrendingUp className="text-blue-600" size={24} />;
    default:
      return <CheckCircle className="text-green-600" size={24} />;
  }
};

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    critical: "border-red-500 bg-red-50",
    high: "border-orange-500 bg-orange-50",
    medium: "border-blue-500 bg-blue-50",
    low: "border-green-500 bg-green-50",
  };
  return colors[priority] || "border-gray-500 bg-gray-50";
};

const getPriorityBadge = (priority: string): string => {
  const badges: Record<string, string> = {
    critical: "bg-red-200 text-red-800",
    high: "bg-orange-200 text-orange-800",
    medium: "bg-blue-200 text-blue-800",
    low: "bg-green-200 text-green-800",
  };
  return badges[priority] || "bg-gray-200 text-gray-800";
};

export const CoachingInsightCard: React.FC<CoachingInsightProps> = ({
  type,
  priority,
  title,
  message,
  actionItems,
  dataPoints,
  confidence,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className={`rounded-lg border-l-4 p-4 mb-4 ${getPriorityColor(priority)}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getPriorityIcon(priority)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${getPriorityBadge(
                  priority
                )}`}
              >
                {priority.toUpperCase()}
              </span>
              {confidence && (
                <span className="text-xs text-gray-600 ml-auto">
                  {confidence}% confidence
                </span>
              )}
            </div>
            <p className="text-gray-700 text-sm mb-3">{message}</p>
          </div>
        </div>

        {(actionItems || dataPoints) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-4 text-gray-500 hover:text-gray-700 transition"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={20} />
            </motion.div>
          </button>
        )}
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (actionItems || dataPoints) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 pt-4 border-t border-gray-300/50"
          >
            {actionItems && actionItems.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold text-gray-700 text-sm mb-2">Recommended Actions</p>
                <ul className="space-y-1">
                  {actionItems.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-blue-600 font-bold">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dataPoints && Object.keys(dataPoints).length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 text-sm mb-2">Supporting Data</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(dataPoints).map(([key, value]) => (
                    <div key={key} className="bg-white/50 rounded p-2">
                      <p className="text-xs text-gray-600">
                        {key.replace(/_/g, " ").toUpperCase()}
                      </p>
                      <p className="font-semibold text-gray-800">
                        {typeof value === "number" ? (
                          <>
                            {Math.round(value * 10) / 10}
                            {key.includes("score") ? "/100" : key.includes("days") ? " days" : ""}
                          </>
                        ) : (
                          String(value)
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
