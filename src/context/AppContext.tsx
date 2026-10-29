import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import '@/lib/google';
import { ExamType, isExamType, NotificationItem, UserProfile } from '@/lib/types';
import { PteExamVariant } from '@/lib/pteExamConfig';
import { TutorialVideo } from '@/data/tutorials';

export type TutorialViewMode = 'standard' | 'theater' | 'mini';

export interface ActiveTestSession {
  isActive: boolean;
  title?: string;
  skill?: string;
  /** A mock test: the app hides its navigation and refuses to leave until the test is exited from its own controls. */
  locked?: boolean;
  onStop?: () => Promise<void> | void;
}

export type OnboardingAnswers = Partial<
  Pick<
    UserProfile,
    | 'targetExam'
    | 'targetModule'
    | 'targetScore'
    | 'examDate'
    | 'nepalRegion'
    | 'studyGoal'
    | 'destination'
    | 'priorAttempt'
    | 'previousScore'
    | 'focusSkill'
    | 'dailyMinutes'
  >
>;

interface AppContextType {
  user: UserProfile | null;
  /** True until the first session check finishes. Guards render as "unknown", not "logged out". */
  loading: boolean;
  /** Resolved session state: false means the session check ran and found nobody. */
  isAuthenticated: boolean;

  signInWithGoogle: (credential: string, referralCode?: string) => Promise<UserProfile>;
  signInAsAdmin: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  notifications: NotificationItem[];
  /** Unread across the whole inbox, from the server, not just the loaded page. */
  unreadCount: number;
  /** More notifications exist beyond the ones loaded so far. */
  hasMoreNotifications: boolean;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  activeExam: ExamType;
  setActiveExam: (exam: ExamType) => Promise<void>;
  pteVariant: PteExamVariant;
  setPteVariant: (variant: PteExamVariant) => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'targetExam' | 'targetModule' | 'targetScore' | 'examDate' | 'nepalRegion'>>) => Promise<void>;
  completeOnboarding: (answers?: OnboardingAnswers) => Promise<void>;
  /** Records on the account that the app tour has been shown, so it opens by itself only once. */
  markTourSeen: () => Promise<void>;

  isTutorOpen: boolean;
  setIsTutorOpen: (open: boolean) => void;
  tutorContextPrompt: string;
  setTutorContextPrompt: (prompt: string) => void;
  /** A question the coach drawer sends by itself as soon as it opens. */
  tutorQuestion: string | null;
  /** Opens the coach on a fresh conversation about `context` and asks `question`. */
  askTutor: (context: string, question: string) => void;
  clearTutorQuestion: () => void;

  activeTestSession: ActiveTestSession | null;
  setActiveTestSession: (session: ActiveTestSession | null) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  activeTutorialVideo: TutorialVideo | null;
  setActiveTutorialVideo: (video: TutorialVideo | null) => void;
  tutorialViewMode: TutorialViewMode;
  setTutorialViewMode: (mode: TutorialViewMode) => void;
  closeTutorialVideo: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** The panel shows this many at a time; "Show more" loads the next batch. */
const NOTIFICATION_PAGE = 5;
const NOTIFICATION_POLL_MS = 60_000;

interface NotificationPage {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination?: { total: number };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationTotal, setNotificationTotal] = useState(0);
  // How many the panel is showing, so a refresh keeps "Show more" pages open.
  const loadedNotifications = useRef(NOTIFICATION_PAGE);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const [activeExam, setActiveExamState] = useState<ExamType>(() => {
    try {
      const saved = localStorage.getItem('prepyo-active-exam');
      if (isExamType(saved)) return saved;
    } catch {
      // ignore
    }
    return 'PTE';
  });
  const [pteVariant, setPteVariantState] = useState<PteExamVariant>(() => {
    try {
      const saved = localStorage.getItem('prepyo-pte-variant');
      if (saved === 'core' || saved === 'academic') return saved;
    } catch {
      // ignore
    }
    return 'academic';
  });

  const setPteVariant = useCallback((variant: PteExamVariant) => {
    setPteVariantState(variant);
    try {
      localStorage.setItem('prepyo-pte-variant', variant);
    } catch {
      // ignore
    }
  }, []);

  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorContextPrompt, setTutorContextPrompt] = useState('');
  const [tutorQuestion, setTutorQuestion] = useState<string | null>(null);
  const askTutor = useCallback((context: string, question: string) => {
    setTutorContextPrompt(context);
    setTutorQuestion(question);
    setIsTutorOpen(true);
  }, []);
  const clearTutorQuestion = useCallback(() => setTutorQuestion(null), []);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [activeTestSession, setActiveTestSession] = useState<ActiveTestSession | null>(null);

  const [activeTutorialVideo, setActiveTutorialVideo] = useState<TutorialVideo | null>(null);
  const [tutorialViewMode, setTutorialViewMode] = useState<TutorialViewMode>('standard');
  const closeTutorialVideo = useCallback(() => {
    setActiveTutorialVideo(null);
    setTutorialViewMode('standard');
  }, []);

  // Warn user if closing tab / refreshing during an ongoing test
  useEffect(() => {
    if (!activeTestSession?.isActive) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTestSession?.isActive]);


  const themeSwitchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (themeSwitchTimer.current !== null) clearTimeout(themeSwitchTimer.current);
  }, []);

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

    // Roughly 180 elements animate their own colours, each with its own
    // duration, so switching theme used to sweep across the page component by
    // component. Suspending those transitions for the swap makes the whole
    // page change at once; they are restored on the next frame.
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.classList.toggle('dark', next === 'dark');

    if (themeSwitchTimer.current !== null) clearTimeout(themeSwitchTimer.current);
    const release = () => {
      themeSwitchTimer.current = null;
      root.classList.remove('theme-switching');
    };
    // A frame for the new colours to paint, and a timer in case frames are
    // throttled (a background tab never gets one).
    requestAnimationFrame(() => requestAnimationFrame(release));
    themeSwitchTimer.current = setTimeout(release, 120);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const applyUser = useCallback((next: UserProfile) => {
    setUser(next);
    if (isExamType(next.targetExam)) {
      setActiveExamState(next.targetExam);
      try {
        localStorage.setItem('prepyo-active-exam', next.targetExam);
      } catch {
        // ignore
      }
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api.get<NotificationPage>('/notifications', {
        limit: loadedNotifications.current,
        offset: 0,
      });
      // This runs every minute. Keeping the old list when nothing changed
      // keeps the context value the same, so the app does not re-render.
      const next = data.notifications ?? [];
      setNotifications(prev => (sameNotifications(prev, next) ? prev : next));
      setUnreadCount(data.unreadCount ?? 0);
      setNotificationTotal(data.pagination?.total ?? 0);
    } catch (err) {
      // A signed-out visitor has no notifications; that is not an error worth
      // logging on every sign-in page view.
      if (!(err instanceof ApiError && err.isUnauthorized)) {
        console.error('Failed to load notifications:', err);
      }
      setNotifications(prev => (prev.length === 0 ? prev : []));
      setUnreadCount(0);
      setNotificationTotal(0);
    }
  }, []);

  const loadMoreNotifications = useCallback(async () => {
    try {
      const data = await api.get<NotificationPage>('/notifications', {
        limit: NOTIFICATION_PAGE,
        offset: loadedNotifications.current,
      });
      const next = data.notifications ?? [];
      loadedNotifications.current += next.length;
      // A notice that arrived since the last load shifts the pages by one, so
      // ids already on screen are skipped rather than shown twice.
      setNotifications(prev => {
        const seen = new Set(prev.map(n => n.id));
        return [...prev, ...next.filter(n => !seen.has(n.id))];
      });
      setUnreadCount(data.unreadCount ?? 0);
      setNotificationTotal(data.pagination?.total ?? 0);
    } catch (err) {
      console.error('Failed to load more notifications:', err);
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

  const signInAsAdmin = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: UserProfile }>('/auth/admin-login', { email, password });
    applyUser(data.user);
    setLoading(false);
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
    async (updates: Partial<Pick<UserProfile, 'name' | 'targetExam' | 'targetModule' | 'targetScore' | 'examDate' | 'nepalRegion'>>) => {
      const data = await api.patch<{ user: UserProfile }>('/profile', updates);
      applyUser(data.user);
    },
    [applyUser],
  );

  const completeOnboarding = useCallback(
    async (answers: OnboardingAnswers = {}) => {
      const data = await api.patch<{ user: UserProfile }>('/profile', { ...answers, completeOnboarding: true });
      applyUser(data.user);
    },
    [applyUser],
  );

  const markTourSeen = useCallback(async () => {
    const data = await api.patch<{ user: UserProfile }>('/profile', { tourSeen: true });
    applyUser(data.user);
  }, [applyUser]);

  const setActiveExam = useCallback(
    async (exam: ExamType) => {
      setActiveExamState(exam);
      try {
        localStorage.setItem('prepyo-active-exam', exam);
      } catch {
        // ignore
      }
      if (!user) return;
      try {
        await updateProfile({ targetExam: exam });
      } catch (err) {
        // Put the switch back where it was rather than showing a preference
        // that was never saved.
        setActiveExamState(user.targetExam);
        try {
          localStorage.setItem('prepyo-active-exam', user.targetExam);
        } catch {
          // ignore
        }
        console.error('Failed to change target exam:', err);
      }
    },
    [user, updateProfile],
  );

  // New notices arrive without a reload: once a minute while the tab is in
  // view, and straight away when the learner comes back to it.
  useEffect(() => {
    if (!user) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void refreshNotifications();
    };
    const timer = window.setInterval(refreshIfVisible, NOTIFICATION_POLL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [user?.id, refreshNotifications]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    if (notificationsRef.current.some(n => n.id === id && !n.read)) {
      setUnreadCount(count => Math.max(0, count - 1));
    }
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
    setUnreadCount(0);
    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  // Deletes update the panel at once; the refresh afterwards pulls in the next
  // notice so the page stays full, and repairs the list if the call failed.
  const deleteNotification = useCallback(async (id: string) => {
    const target = notificationsRef.current.find(n => n.id === id);
    if (!target) return;
    setNotifications(prev => prev.filter(n => n.id !== id));
    setNotificationTotal(total => Math.max(0, total - 1));
    if (!target.read) setUnreadCount(count => Math.max(0, count - 1));
    loadedNotifications.current = Math.max(NOTIFICATION_PAGE, loadedNotifications.current - 1);
    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
    await refreshNotifications();
  }, [refreshNotifications]);

  const clearAllNotifications = useCallback(async () => {
    setNotifications([]);
    setNotificationTotal(0);
    setUnreadCount(0);
    loadedNotifications.current = NOTIFICATION_PAGE;
    try {
      await api.delete('/notifications');
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      await refreshNotifications();
    }
  }, [refreshNotifications]);

  const hasMoreNotifications = notifications.length < notificationTotal;

  // Built once per change rather than on every render: 40-odd components read
  // this context, and a new object each render re-rendered them all.
  const value = useMemo<AppContextType>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      signInWithGoogle,
      signInAsAdmin,
      logout,
      refreshUser,
      notifications,
      unreadCount,
      hasMoreNotifications,
      refreshNotifications,
      loadMoreNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      clearAllNotifications,
      activeExam,
      setActiveExam,
      pteVariant,
      setPteVariant,
      updateProfile,
      completeOnboarding,
      markTourSeen,
      isTutorOpen,
      setIsTutorOpen,
      tutorContextPrompt,
      setTutorContextPrompt,
      tutorQuestion,
      askTutor,
      clearTutorQuestion,
      theme,
      setTheme,
      toggleTheme,
      activeTestSession,
      setActiveTestSession,
      activeTutorialVideo,
      setActiveTutorialVideo,
      tutorialViewMode,
      setTutorialViewMode,
      closeTutorialVideo,
    }),
    [
      user, loading, signInWithGoogle, signInAsAdmin, logout, refreshUser,
      notifications, unreadCount, hasMoreNotifications, refreshNotifications, loadMoreNotifications,
      markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearAllNotifications,
      activeExam, setActiveExam, pteVariant, setPteVariant, updateProfile, completeOnboarding, markTourSeen,
      isTutorOpen, tutorContextPrompt, tutorQuestion, askTutor, clearTutorQuestion,
      theme, setTheme, toggleTheme,
      activeTestSession, activeTutorialVideo, tutorialViewMode, closeTutorialVideo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Whether two notification lists would render the same. */
function sameNotifications(a: NotificationItem[], b: NotificationItem[]): boolean {
  return a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
