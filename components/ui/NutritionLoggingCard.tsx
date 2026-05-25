/**
 * Nutrition Logging Card Component
 * Interface for logging meals and tracking daily nutrition
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";

interface FoodItemInput {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface NutritionLoggingCardProps {
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export const NutritionLoggingCard: React.FC<NutritionLoggingCardProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [mealType, setMealType] = useState<string>("breakfast");
  const [notes, setNotes] = useState<string>("");
  const [foodItems, setFoodItems] = useState<FoodItemInput[]>([]);
  const [currentItem, setCurrentItem] = useState<FoodItemInput>({
    foodName: "",
    quantity: 100,
    unit: "g",
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  const handleAddItem = () => {
    if (currentItem.foodName && currentItem.calories > 0) {
      setFoodItems([...foodItems, currentItem]);
      setCurrentItem({
        foodName: "",
        quantity: 100,
        unit: "g",
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    setFoodItems(foodItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (foodItems.length === 0) return;
    await onSubmit({
      date: new Date().toISOString().split("T")[0],
      mealType,
      foodItems,
      notes,
    });
  };

  // Calculate totals
  const totals = foodItems.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories * (item.quantity / 100),
      protein: acc.protein + item.protein * (item.quantity / 100),
      carbs: acc.carbs + item.carbs * (item.quantity / 100),
      fats: acc.fats + item.fats * (item.quantity / 100),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Meal</h2>

      {/* Meal Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Meal Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "breakfast", label: "Breakfast" },
            { value: "lunch", label: "Lunch" },
            { value: "dinner", label: "Dinner" },
            { value: "snack", label: "Snack" },
            { value: "pre_workout", label: "Pre-Workout" },
            { value: "post_workout", label: "Post-Workout" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setMealType(option.value)}
              className={`py-2 px-3 rounded-lg font-semibold text-sm transition ${
                mealType === option.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Food Item Input */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Add Food</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Food name"
            value={currentItem.foodName}
            onChange={(e) => setCurrentItem({ ...currentItem, foodName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Qty"
              value={currentItem.quantity}
              onChange={(e) =>
                setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={currentItem.unit}
              onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="g">grams</option>
              <option value="oz">ounces</option>
              <option value="cup">cups</option>
              <option value="ml">ml</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Calories"
              value={currentItem.calories || ""}
              onChange={(e) =>
                setCurrentItem({ ...currentItem, calories: parseFloat(e.target.value) || 0 })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Protein (g)"
              value={currentItem.protein || ""}
              onChange={(e) =>
                setCurrentItem({ ...currentItem, protein: parseFloat(e.target.value) || 0 })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Carbs (g)"
              value={currentItem.carbs || ""}
              onChange={(e) =>
                setCurrentItem({ ...currentItem, carbs: parseFloat(e.target.value) || 0 })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Fats (g)"
              value={currentItem.fats || ""}
              onChange={(e) =>
                setCurrentItem({ ...currentItem, fats: parseFloat(e.target.value) || 0 })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAddItem}
            disabled={!currentItem.foodName || currentItem.calories === 0}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Food Item
          </button>
        </div>
      </div>

      {/* Food Items List */}
      {foodItems.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Foods Added</h3>
          <div className="space-y-2">
            {foodItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-between items-center bg-blue-50 p-3 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {item.foodName} ({item.quantity}{item.unit})
                  </p>
                  <p className="text-sm text-gray-600">
                    {Math.round(item.calories * (item.quantity / 100))} cal · P: {Math.round(item.protein * (item.quantity / 100))}g
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="text-red-500 hover:text-red-700 transition"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Meal Totals */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Meal Totals</h4>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">CALORIES</p>
                <p className="text-lg font-bold text-gray-800">
                  {Math.round(totals.calories)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">PROTEIN</p>
                <p className="text-lg font-bold text-blue-600">
                  {Math.round(totals.protein)}g
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">CARBS</p>
                <p className="text-lg font-bold text-green-600">
                  {Math.round(totals.carbs)}g
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">FATS</p>
                <p className="text-lg font-bold text-yellow-600">
                  {Math.round(totals.fats)}g
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did this meal feel? Any notes?"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={foodItems.length === 0 || isLoading}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition"
      >
        {isLoading ? "Saving..." : "Save Meal"}
      </button>
    </div>
  );
};
