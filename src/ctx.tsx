import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';

import { supabase } from '@/client/supabase';

export type UserRole = 'student' | 'school_staff' | 'clinician' | 'admin' | null;

type SessionContextType = {
  session: Session | null;
  role: UserRole;
  isLoading: boolean;
  isLoadingRole: boolean;
};

const SessionContext = createContext<SessionContextType>({
  session: null,
  role: null,
  isLoading: true,
  isLoadingRole: true,
});

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return 'student';
  }

  return data.role as UserRole;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const appState = useRef(AppState.currentState);

  const loadRole = async (userId: string) => {
    setIsLoadingRole(true);
    const userRole = await fetchUserRole(userId);
    setRole(userRole);
    setIsLoadingRole(false);
  };

  const clearRole = () => {
    setRole(null);
    setIsLoadingRole(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadRole(session.user.id);
      } else {
        clearRole();
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (session?.user) {
        loadRole(session.user.id);
      } else {
        clearRole();
      }
    });

    // iOS/Android 后台时 JS 线程挂起，autoRefreshToken 定时器停止，回前台需手动续期
    // Web 端定时器不受影响，autoRefreshToken 自动处理，无需额外触发
    const appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      if (Platform.OS !== 'web' && appState.current.match(/inactive|background/) && nextState === 'active') {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          await supabase.auth.signOut();
        }
      }
      appState.current = nextState;
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, role, isLoading, isLoadingRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
