import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabaseAnonKey, supabaseUrl } from '@/lib/public-env';

const fromEnvUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const fromEnvKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const url = fromEnvUrl && !fromEnvUrl.includes('your_project_ref') ? fromEnvUrl : supabaseUrl;
const key = fromEnvKey && !fromEnvKey.includes('YOUR_') ? fromEnvKey : supabaseAnonKey;

if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const isPublishableKey = key.startsWith('sb_publishable_');

const webStorage = {
  getItem: (storageKey: string) => Promise.resolve(globalThis.localStorage?.getItem(storageKey) ?? null),
  setItem: (storageKey: string, value: string) => {
    globalThis.localStorage?.setItem(storageKey, value);
    return Promise.resolve();
  },
  removeItem: (storageKey: string) => {
    globalThis.localStorage?.removeItem(storageKey);
    return Promise.resolve();
  },
};

const fetchWithPublishableKey: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('apikey', key);
  // Publishable keys are not JWTs. Sending them as Bearer fails in the browser as "Failed to fetch".
  if (isPublishableKey && headers.get('Authorization') === `Bearer ${key}`) {
    headers.delete('Authorization');
  }
  return globalThis.fetch(input, { ...init, headers });
};

export const supabase = createClient(url, key, {
  global: {
    fetch: fetchWithPublishableKey,
  },
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
