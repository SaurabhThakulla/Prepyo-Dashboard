import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import '@/lib/google';
import { ExamType, NotificationItem, UserProfile } from '@/lib/types';

interface AppContextType {
  user: UserProfile | null;
  /** True until the first session check finishes. Guards render as "unknown", not "logged out". */
  loading: boolean;
  /** Resolved session state: false means the session check ran and found nobody. */
  isAuthenticated: boolean;

  signInWithGoogle: (credential: string, referralCode?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  activeExam: ExamType;
  setActiveExam: (exam: ExamType) => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'targetExam' | 'targetScore' | 'examDate' | 'nepalRegion'>>) => Promise<void>;

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
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeExam, setActiveExamState] = useState<ExamType>('PTE');
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorContextPrompt, setTutorContextPrompt] = useState('');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  // Theme is the one piece of state that legitimately lives in the browser: it
  // is a display preference, not account data.
  useEffect(() => {
    const saved = localStorage.getItem('prepyo-theme') as 'light' | 'dark' | null;
    const initial = saved ?? 'light';
    setThemeState(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const setTheme = useCallback((next: 'light' | 'dark') => {
    setThemeState(next);
    localStorage.setItem('prepyo-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const applyUser = useCallback((next: UserProfile) => {
    setUser(next);
    setActiveExamState(next.targetExam);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api.get<{ notifications: NotificationItem[] }>('/notifications');
      setNotifications(data.notifications ?? []);
    } catch (err) {
      // A signed-out visitor has no notifications; that is not an error worth
      // logging on every sign-in page view.
      if (!(err instanceof ApiError && err.isUnauthorized)) {
        console.error('Failed to load notifications:', err);
      }
      setNotifications([]);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      // /profile carries the score estimate and subscription state that
      // /auth/session omits, so the whole app can rely on one shape.
      const data = await api.get<{ user: UserProfile }>('/profile');
      applyUser(data.user);
      await refreshNotifications();
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setUser(null);
        setNotifications([]);
      } else {
        console.error('Failed to load profile:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [applyUser, refreshNotifications]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signInWithGoogle = useCallback(async (credential: string, referralCode?: string) => {
    const data = await api.post<{ user: UserProfile }>('/auth/google', {
      credential,
      referralCode: referralCode ?? '',
    });
    applyUser(data.user);
    setLoading(false);
    // Pull the full profile in the background; the caller can navigate now.
    refreshUser();
    return data.user;
  }, [applyUser, refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      window.google?.accounts?.id?.disableAutoSelect();
      // Clear locally even if the call failed, so the UI cannot show a session
      // the learner has asked to end.
      setUser(null);
      setNotifications([]);
      setActiveExamState('PTE');
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Pick<UserProfile, 'name' | 'targetExam' | 'targetScore' | 'examDate' | 'nepalRegion'>>) => {
      const data = await api.patch<{ user: UserProfile }>('/profile', updates);
      applyUser(data.user);
    },
    [applyUser],
  );

  const setActiveExam = useCallback(
    async (exam: ExamType) => {
      setActiveExamState(exam);
      if (!user) return;
      try {
        await updateProfile({ targetExam: exam });
      } catch (err) {
        // Put the switch back where it was rather than showing a preference
        // that was never saved.
        setActiveExamState(user.targetExam);
        console.error('Failed to change target exam:', err);
      }
    },
    [user, updateProfile],
  );

  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.post(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        signInWithGoogle,
        logout,
        refreshUser,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        activeExam,
        setActiveExam,
        updateProfile,
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
