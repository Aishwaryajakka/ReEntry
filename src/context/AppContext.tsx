/**
 * ReEntry global app state
 * Provides user-scoped data, demo data isolation, and Low-Stimulation Mode.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from '@/ctx';
import {
  addActivityLog as insertActivityLog,
  deleteActivityLog as removeActivityLog,
  fetchAccommodationRecords,
  fetchActivityLogs,
  fetchChallengeTags,
  fetchDailyCheckIns,
  fetchUserPreferences,
  fetchStudentScheduleItems,
  insertStudentScheduleItem,
  updateStudentScheduleItem,
  deleteStudentScheduleItem,
  updateActivityLog as modifyActivityLog,
  updateLowStimulation,
} from '@/db/api';
import {
  CHALLENGE_TAGS,
} from '../data/activityCatalog';
import type {
  AccommodationRecord,
  ActivityLog,
  ChallengeTag,
  DailyCheckIn,
  DemoUser,
  InsightEvidence,
  StudentScheduleItem,
} from '../data/types';
import type {
  AccommodationRecordRow,
  ActivityLogRow,
  ChallengeTagRow,
  DailyCheckInRow,
  StudentScheduleItemRow,
} from '../types/types';
import type { NewActivityInput, ScheduleItemInput } from '@/db/api';

interface AppState {
  user: DemoUser;
  activityLogs: ActivityLog[];
  challengeTags: ChallengeTag[];
  dailyCheckIns: DailyCheckIn[];
  accommodationRecords: AccommodationRecord[];
  scheduleItems: StudentScheduleItem[];
  studentDataLoaded: boolean;
  insightEvidence: InsightEvidence[];
  today: string;
  lowStimulationMode: boolean;
  toggleLowStimulation: () => Promise<void>;
  addActivityLog: (input: NewActivityInput) => Promise<void>;
  updateActivityLog: (logId: string, input: NewActivityInput) => Promise<void>;
  deleteActivityLog: (logId: string) => Promise<void>;
  addScheduleItem: (input: ScheduleItemInput) => Promise<StudentScheduleItem>;
  updateScheduleItem: (itemId: string, input: ScheduleItemInput) => Promise<StudentScheduleItem>;
  deleteScheduleItem: (itemId: string) => Promise<void>;
  refreshStudentData: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

function toActivityLog(row: ActivityLogRow, dbTags: ChallengeTagRow[]): ActivityLog {
  const customLabel = row.activity_name !== row.activity_category ? row.activity_name : undefined;
  const tagIds = dbTags
    .filter((t) => t.activity_log_id === row.id)
    .map((t) => {
      const master = CHALLENGE_TAGS.find((tag) => tag.label === t.tag);
      return master?.id ?? t.id;
    });

  return {
    id: row.id,
    date: row.occurred_at.slice(0, 10),
    activityCategory: row.activity_category as ActivityLog['activityCategory'],
    customLabel,
    durationMinutes: row.duration_minutes,
    toleranceRating: row.manageability as ActivityLog['toleranceRating'],
    notes: row.note ?? '',
    challengeTagIds: tagIds,
  };
}

function toDailyCheckIn(row: DailyCheckInRow): DailyCheckIn {
  return {
    id: row.id,
    date: row.checkin_date,
    overallFeeling: row.overall_manageability as DailyCheckIn['overallFeeling'],
    freeNote: row.note ?? '',
  };
}

function toAccommodationRecord(row: AccommodationRecordRow): AccommodationRecord {
  const status = row.status === 'active' ? 'active' : 'inactive';
  return {
    id: row.id,
    dateIssued: row.issued_date,
    accommodationType: row.title,
    issuedBy: row.source_name || row.source_type,
    activeUntil: row.valid_until,
    visibleToSchool: status === 'active',
    status,
    sourceName: row.source_name ?? undefined,
  };
}

function toScheduleItem(row: StudentScheduleItemRow): StudentScheduleItem {
  return {
    id: row.id,
    activityName: row.activity_name,
    activityCategory: row.activity_category as StudentScheduleItem['activityCategory'],
    daysOfWeek: row.days_of_week,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    remindersEnabled: row.reminders_enabled,
    active: row.active,
  };
}

function deriveUser(sessionUser: { id: string; email?: string } | undefined): DemoUser {
  if (!sessionUser) {
    return { id: '', firstName: 'Student', age: 16 };
  }
  const email = sessionUser.email ?? '';
  const firstName = email.split('@')[0] || 'Student';
  return {
    id: sessionUser.id,
    firstName,
    age: 16,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, role, isLoading, isLoadingRole } = useSession();
  const userId = session?.user?.id;
  const isStudent = role === 'student';
  const authReady = !isLoading && !isLoadingRole;

  const [lowStimulationMode, setLowStimulationMode] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [accommodationRecords, setAccommodationRecords] = useState<AccommodationRecord[]>([]);
  const [scheduleItems, setScheduleItems] = useState<StudentScheduleItem[]>([]);
  const [insights, setInsights] = useState<InsightEvidence[]>([]);
  const [studentDataLoaded, setStudentDataLoaded] = useState(false);
  const studentDataRequestRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  const activeStudentIdRef = useRef<string | null>(null);
  activeStudentIdRef.current = authReady && userId && isStudent ? userId : null;

  // Low-Stimulation is only meaningful for an authenticated user; auth shell is always normal.
  const exposedLowStimulationMode = userId ? lowStimulationMode : false;
  const lowStimOverrideRef = useRef(false);

  // Load the current user's Low-Stimulation preference exactly once when they sign in.
  // If the user toggles before the fetch completes, the fetch result is ignored.
  useEffect(() => {
    if (!userId) {
      lowStimOverrideRef.current = false;
      return;
    }

    let cancelled = false;
    lowStimOverrideRef.current = false;
    const load = async () => {
      try {
        const prefs = await fetchUserPreferences(userId);
        if (cancelled || lowStimOverrideRef.current) return;
        setLowStimulationMode(prefs?.low_stimulation_enabled ?? false);
      } catch (e) {
        console.error('AppProvider load preferences failed', e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshStudentData = useCallback(async () => {
    if (!authReady || !userId || !isStudent) return;
    if (studentDataRequestRef.current?.userId === userId) {
      return studentDataRequestRef.current.promise;
    }

    const requestedUserId = userId;
    const promise = (async () => {
      try {
        const [logs, dbTags, checkIns, accommodations, schedule] = await Promise.all([
          fetchActivityLogs(requestedUserId),
          fetchChallengeTags(requestedUserId),
          fetchDailyCheckIns(requestedUserId),
          fetchAccommodationRecords(requestedUserId),
          fetchStudentScheduleItems(requestedUserId),
        ]);
        if (activeStudentIdRef.current !== requestedUserId) return;
        setActivityLogs(logs.map((l) => toActivityLog(l, dbTags)));
        setDailyCheckIns(checkIns.map((c) => toDailyCheckIn(c)));
        setAccommodationRecords(accommodations.map((a) => toAccommodationRecord(a)));
        setScheduleItems(schedule.map(toScheduleItem));
        setInsights([]);
        setStudentDataLoaded(true);
      } catch (e) {
        console.error('AppProvider load student data failed', e);
      }
    })();
    studentDataRequestRef.current = { userId: requestedUserId, promise };
    await promise;
    if (studentDataRequestRef.current?.promise === promise) studentDataRequestRef.current = null;
  }, [authReady, isStudent, userId]);

  // Load student-owned data when native session and role hydration identifies the
  // authenticated student. Pre-auth state is cleared but is never marked loaded.
  useEffect(() => {
    if (!authReady || !userId || !isStudent) {
      studentDataRequestRef.current = null;
      setActivityLogs([]);
      setDailyCheckIns([]);
      setAccommodationRecords([]);
      setScheduleItems([]);
      setInsights([]);
      setStudentDataLoaded(false);
      return;
    }

    void refreshStudentData();
  }, [authReady, isStudent, refreshStudentData, userId]);

  const toggleLowStimulation = useCallback(async () => {
    if (!userId) {
      setLowStimulationMode(false);
      return;
    }

    lowStimOverrideRef.current = true;
    const previous = lowStimulationMode;
    const next = !previous;
    setLowStimulationMode(next);

    try {
      await updateLowStimulation(userId, next);
    } catch (e) {
      // Revert only on confirmed failure so the toggle matches the persisted state.
      setLowStimulationMode(previous);
      console.error('toggleLowStimulation failed', e);
      throw new Error('Failed to save Low-Stimulation Mode. Please try again.');
    }
  }, [lowStimulationMode, userId]);

  const addActivityLog = useCallback(
    async (input: NewActivityInput) => {
      if (!userId) return;
      const result = await insertActivityLog(userId, input);
      if (result) {
        setActivityLogs((prev) => {
          const mapped = toActivityLog(result.row, result.tags);
          return [...prev, mapped].sort(
            (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
          );
        });
      }
    },
    [userId],
  );

  const updateActivityLog = useCallback(
    async (logId: string, input: NewActivityInput) => {
      if (!userId) return;
      const result = await modifyActivityLog(userId, logId, input);
      if (result) {
        const updated = toActivityLog(result.row, result.tags);
        setActivityLogs((prev) =>
          prev
            .map((l) => (l.id === logId ? updated : l))
            .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
        );
      }
    },
    [userId],
  );

  const deleteActivityLog = useCallback(
    async (logId: string) => {
      if (!userId) return;
      const ok = await removeActivityLog(userId, logId);
      if (ok) {
        setActivityLogs((prev) => prev.filter((l) => l.id !== logId));
      }
    },
    [userId],
  );

  const addScheduleItem = useCallback(async (input: ScheduleItemInput) => {
    if (!userId) throw new Error('Sign in to add a schedule item.');
    const item = toScheduleItem(await insertStudentScheduleItem(userId, input));
    setScheduleItems((previous) => [...previous, item].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return item;
  }, [userId]);

  const updateScheduleItem = useCallback(async (itemId: string, input: ScheduleItemInput) => {
    if (!userId) throw new Error('Sign in to update a schedule item.');
    const item = toScheduleItem(await updateStudentScheduleItem(userId, itemId, input));
    setScheduleItems((previous) => previous.map((entry) => entry.id === itemId ? item : entry).sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return item;
  }, [userId]);

  const deleteScheduleItem = useCallback(async (itemId: string) => {
    if (!userId) return;
    await deleteStudentScheduleItem(userId, itemId);
    setScheduleItems((previous) => previous.filter((entry) => entry.id !== itemId));
  }, [userId]);

  const user = useMemo(() => deriveUser(session?.user), [session?.user]);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const value = useMemo<AppState>(
    () => ({
      user,
      activityLogs,
      challengeTags: CHALLENGE_TAGS,
      dailyCheckIns,
      accommodationRecords,
      scheduleItems,
      studentDataLoaded,
      insightEvidence: insights,
      today,
      lowStimulationMode: exposedLowStimulationMode,
      toggleLowStimulation,
      addActivityLog,
      updateActivityLog,
      deleteActivityLog,
      addScheduleItem,
      updateScheduleItem,
      deleteScheduleItem,
      refreshStudentData,
    }),
    [
      user,
      activityLogs,
      dailyCheckIns,
      accommodationRecords,
      scheduleItems,
      studentDataLoaded,
      insights,
      today,
      exposedLowStimulationMode,
      toggleLowStimulation,
      addActivityLog,
      updateActivityLog,
      deleteActivityLog,
      addScheduleItem,
      updateScheduleItem,
      deleteScheduleItem,
      refreshStudentData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
};
