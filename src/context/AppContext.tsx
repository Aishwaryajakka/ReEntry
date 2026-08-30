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
  updateActivityLog as modifyActivityLog,
  updateLowStimulation,
} from '@/db/api';
import {
  CHALLENGE_TAGS,
  DEMO_USER,
  TODAY,
} from '../data/mayaDataset';
import type {
  AccommodationRecord,
  ActivityLog,
  ChallengeTag,
  DailyCheckIn,
  DemoUser,
  InsightEvidence,
} from '../data/types';
import type {
  AccommodationRecordRow,
  ActivityLogRow,
  ChallengeTagRow,
  DailyCheckInRow,
} from '../types/types';

interface NewActivityInput {
  date: string;
  activityCategory: ActivityLog['activityCategory'];
  customLabel?: string;
  durationMinutes: number;
  toleranceRating: ActivityLog['toleranceRating'];
  notes: string;
  challengeTagIds: string[];
}

interface AppState {
  user: DemoUser;
  activityLogs: ActivityLog[];
  challengeTags: ChallengeTag[];
  dailyCheckIns: DailyCheckIn[];
  accommodationRecords: AccommodationRecord[];
  insightEvidence: InsightEvidence[];
  today: string;
  lowStimulationMode: boolean;
  toggleLowStimulation: () => Promise<void>;
  addActivityLog: (input: NewActivityInput) => Promise<void>;
  updateActivityLog: (logId: string, input: NewActivityInput) => Promise<void>;
  deleteActivityLog: (logId: string) => Promise<void>;
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
    date: row.occurred_at ? row.occurred_at.slice(0, 10) : TODAY,
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
    energyLevel: 3 as DailyCheckIn['energyLevel'],
    headachePresent: false,
    headacheIntensity: null,
    activeChallengeTagIds: [],
    freeNote: row.note ?? '',
  };
}

function toAccommodationRecord(row: AccommodationRecordRow): AccommodationRecord {
  const status = row.status === 'active' ? 'active' : 'inactive';
  const fallbackDate = row.updated_at ? row.updated_at.slice(0, 10) : TODAY;
  return {
    id: row.id,
    dateIssued: row.issued_date ?? fallbackDate,
    accommodationType: row.title,
    issuedBy: row.source_name || row.source_type,
    activeUntil: row.valid_until ?? fallbackDate,
    visibleToSchool: status === 'active',
    status,
    sourceName: row.source_name ?? undefined,
  };
}

function deriveUser(sessionUser: { id: string; email?: string } | undefined): DemoUser {
  if (!sessionUser) return DEMO_USER;
  const email = sessionUser.email ?? '';
  const firstName = email.split('@')[0] || 'Student';
  return {
    id: sessionUser.id,
    firstName,
    age: 16,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, role } = useSession();
  const userId = session?.user?.id;
  const isStudent = role === 'student';

  const [lowStimulationMode, setLowStimulationMode] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [accommodationRecords, setAccommodationRecords] = useState<AccommodationRecord[]>([]);
  const [insights, setInsights] = useState<InsightEvidence[]>([]);

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

  // Load student-owned data. New accounts start with empty arrays; demo data is never attached.
  useEffect(() => {
    if (!userId || !isStudent) {
      setActivityLogs([]);
      setDailyCheckIns([]);
      setAccommodationRecords([]);
      setInsights([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const [logs, dbTags, checkIns, accommodations] = await Promise.all([
          fetchActivityLogs(userId),
          fetchChallengeTags(userId),
          fetchDailyCheckIns(userId),
          fetchAccommodationRecords(userId),
        ]);
        if (cancelled) return;
        setActivityLogs(logs.map((l) => toActivityLog(l, dbTags)));
        setDailyCheckIns(checkIns.map((c) => toDailyCheckIn(c)));
        setAccommodationRecords(accommodations.map((a) => toAccommodationRecord(a)));
        setInsights([]);
      } catch (e) {
        console.error('AppProvider load student data failed', e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, isStudent]);

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

  const user = useMemo(() => deriveUser(session?.user), [session?.user]);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const value = useMemo<AppState>(
    () => ({
      user,
      activityLogs,
      challengeTags: CHALLENGE_TAGS,
      dailyCheckIns,
      accommodationRecords,
      insightEvidence: insights,
      today,
      lowStimulationMode: exposedLowStimulationMode,
      toggleLowStimulation,
      addActivityLog,
      updateActivityLog,
      deleteActivityLog,
    }),
    [
      user,
      activityLogs,
      dailyCheckIns,
      accommodationRecords,
      insights,
      today,
      exposedLowStimulationMode,
      toggleLowStimulation,
      addActivityLog,
      updateActivityLog,
      deleteActivityLog,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
};
