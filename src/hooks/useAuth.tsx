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

  const checkAdminRole = async (userId: string) => {
    // Prefer the SECURITY DEFINER function to avoid depending on RLS SELECT access to user_roles
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });

    if (!error) return !!data;

    // Fallback: direct check (helps if RPC execute permission is restricted in some environments)
    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Error checking admin role:', error ?? roleError);
      return false;
    }

    return !!roleRow;
  };

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Keep loading=true until role verification finishes (avoids "Akses Ditolak" race)
      setIsAdmin(false);
      setLoading(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setIsAdmin(false);
        setLoading(false);
      } else {
        setIsAdmin(false);
        setLoading(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const adminStatus = await checkAdminRole(userId);
      if (cancelled) return;
      setIsAdmin(adminStatus);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
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
