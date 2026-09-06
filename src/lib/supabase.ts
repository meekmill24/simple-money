import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use globalThis to maintain singleton in Next.js dev mode/hot reloads
const globalForSupabase = globalThis as unknown as {
    supabase?: SupabaseClient;
};

export const supabase: SupabaseClient = globalForSupabase.supabase || (() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

    const authOptions = {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token-money',
        // bypass the often-buggy Navigator LockManager
        lock: (name: string, acquireTimeout: number, fn: () => Promise<any>) => fn(),
    };

    const client = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseAnonKey || 'placeholder-key',
        { auth: authOptions }
    );

    globalForSupabase.supabase = client;

    return client;
})();
