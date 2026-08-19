'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, NotificationItem, ExamType } from '@/lib/types';

interface AppContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  loading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  activeExam: ExamType;
  setActiveExam: (exam: ExamType) => void;
  updateUserGoal: (targetExam: ExamType, targetScore: number, examDate?: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  awardLocalXP: (amount: number, reason: string) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  isTutorOpen: boolean;
  setIsTutorOpen: (open: boolean) => void;
  tutorContextPrompt: string;
  setTutorContextPrompt: (prompt: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeExam, setActiveExamState] = useState<ExamType>('PTE');
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [tutorContextPrompt, setTutorContextPrompt] = useState<string>('');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  // Load and apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('prepyo-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setThemeState(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('prepyo-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  const refreshUserData = async () => {
    try {
      const res = await fetch('/api/v1/auth');
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setActiveExamState(data.user.targetExam || 'PTE');
      }

      const notifRes = await fetch('/api/v1/notifications');
      const notifData = await notifRes.json();
      if (notifData.success) {
        setNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch user state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const setActiveExam = async (exam: ExamType) => {
    setActiveExamState(exam);
    if (user) {
      setUser(prev => prev ? { ...prev, targetExam: exam } : null);
      try {
        await fetch('/api/v1/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetExam: exam }),
        });
      } catch (err) {
        console.error('Failed to sync exam state:', err);
      }
    }
  };

  const updateUserGoal = async (targetExam: ExamType, targetScore: number, examDate?: string) => {
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetExam, targetScore, examDate }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to update user goal:', err);
    }
  };

  const awardLocalXP = (amount: number, reason: string) => {
    if (user) {
      const newXP = user.xp + amount;
      const newLevel = Math.floor(newXP / 400) + 1;
      setUser({ ...user, xp: newXP, level: newLevel });
    }
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', id }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        loading,
        notifications,
        unreadCount,
        activeExam,
        setActiveExam,
        updateUserGoal,
        refreshUserData,
        awardLocalXP,
        markNotificationAsRead,
        isTutorOpen,
        setIsTutorOpen,
        tutorContextPrompt,
        setTutorContextPrompt,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
