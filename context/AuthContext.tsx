import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type Role = 'trial' | 'subscriber' | 'admin';
export type Attachment = 'anxious' | 'avoidant' | 'secure';
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  attachment: Attachment;
  trialDays: number;
};

type Value = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (first: string, last: string, email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  logout: () => Promise<void>;
  upgrade: (interval: 'monthly' | 'annual') => Promise<string | null>;
  setAttachment: (attachment: Attachment) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Value | null>(null);

function trialDaysFrom(endsAt: string | null) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000));
}

async function loadProfile(userId: string, email: string): Promise<User | null> {
  let { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, attachment, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();
  if (!data) {
    const created = await supabase.from('profiles').insert({
      id: userId,
      first_name: 'New',
      last_name: 'Member',
    }).select('id, first_name, last_name, role, attachment, trial_ends_at').single();
    data = created.data;
    error = created.error;
  }
  if (error || !data) return null;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email,
    role: data.role,
    attachment: data.attachment,
    trialDays: trialDaysFrom(data.trial_ends_at),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      setUser(null);
      return;
    }
    setUser(await loadProfile(session.user.id, session.user.email ?? ''));
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        setUser(await loadProfile(data.session.user.id, data.session.user.email ?? ''));
      }
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      loadProfile(session.user.id, session.user.email ?? '').then((profile) => {
        if (active) setUser(profile);
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? error.message : null;
  };

  const signup = async (first: string, last: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { first_name: first.trim() || 'New', last_name: last.trim() || 'Member' } },
    });
    if (error) return error.message;
    if (!data.session) return 'Check your email to confirm your account, then log in.';
    return null;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return error ? error.message : null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const upgrade = async (interval: 'monthly' | 'annual') => {
    const { error } = await supabase.rpc('start_membership', { plan_interval: interval });
    if (error) return error.message;
    await refresh();
    return null;
  };

  const setAttachment = async (attachment: Attachment) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ attachment }).eq('id', user.id);
    if (!error) setUser({ ...user, attachment });
  };

  const value = useMemo(
    () => ({ user, ready, login, signup, resetPassword, logout, upgrade, setAttachment, refresh }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
