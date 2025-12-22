import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = async (userId: string): Promise<boolean> => {
    try {
      // Prefer the SECURITY DEFINER function to avoid depending on RLS SELECT access to user_roles
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });

      if (!error) return !!data;

      // Fallback: direct check
      const { data: roleRow, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('Error checking admin role:', roleError);
        return false;
      }

      return !!roleRow;
    } catch (err) {
      console.error('Error checking admin role:', err);
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      return await new Promise<T>((resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error('timeout')), ms);
        promise
          .then((val) => {
            window.clearTimeout(t);
            resolve(val);
          })
          .catch((err) => {
            window.clearTimeout(t);
            reject(err);
          });
      });
    };

    const setAuthState = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const resolveAdmin = async (nextSession: Session | null) => {
      if (!nextSession?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      let adminStatus = false;
      try {
        adminStatus = await withTimeout(checkAdminRole(nextSession.user.id), 8000);
      } catch (err) {
        console.error('Error checking admin role:', err);
        adminStatus = false;
      }

      if (cancelled) return;
      setIsAdmin(adminStatus);
      setLoading(false);
    };

    const refreshFromSession = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        setAuthState(session);
        await resolveAdmin(session);
      } catch (err) {
        console.error('Error refreshing session:', err);
        if (!cancelled) {
          setAuthState(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    void refreshFromSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;
      // Set loading TRUE terlebih dahulu agar consumer tahu kita sedang memproses
      setLoading(true);
      setAuthState(nextSession);
      window.setTimeout(() => {
        if (cancelled) return;
        void resolveAdmin(nextSession);
      }, 0);
    });

    const handleFocus = () => {
      void refreshFromSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshFromSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
