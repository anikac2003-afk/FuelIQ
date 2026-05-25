import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  activeTab: 'overview' | 'nutrition' | 'training' | 'insights';
  setActiveTab: (tab: 'overview' | 'nutrition' | 'training' | 'insights') => void;
  showNutritionModal: boolean;
  setShowNutritionModal: (show: boolean) => void;
  showWorkoutModal: boolean;
  setShowWorkoutModal: (show: boolean) => void;
}

export const useDashboardStore = create<DashboardState>(
  persist(
    (set) => ({
      selectedDate: new Date(),
      setSelectedDate: (date) => set({ selectedDate: date }),
      activeTab: 'overview',
      setActiveTab: (tab) => set({ activeTab: tab }),
      showNutritionModal: false,
      setShowNutritionModal: (show) => set({ showNutritionModal: show }),
      showWorkoutModal: false,
      setShowWorkoutModal: (show) => set({ showWorkoutModal: show }),
    }),
    {
      name: 'dashboard-store',
    }
  )
);

interface UserState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  preferences: Record<string, any>;
  setPreferences: (prefs: Record<string, any>) => void;
}

export const useUserStore = create<UserState>(
  persist(
    (set) => ({
      userId: null,
      setUserId: (id) => set({ userId: id }),
      preferences: {},
      setPreferences: (prefs) => set({ preferences: prefs }),
    }),
    {
      name: 'user-store',
    }
  )
);
