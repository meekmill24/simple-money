'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error(`Error fetching profile (${error.code}):`, error.message, error.details);
            }

            setProfile(data || null);
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setProfile(null);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            await fetchProfile(currentUser.id);
        }
    }, [fetchProfile]);

    useEffect(() => {
        let mounted = true;
        let initialized = false;

        const initialize = async () => {
            try {
                // Initialize session - lock bypass in supabase.ts prevents hangs here
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!mounted) return;

                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    setUser(null);
                    setProfile(null);
                }
                initialized = true;
            } catch (err: any) {
                console.error('Auth initialization error:', err);
                
                if (mounted) {
                    // Fallback to direct user check if session lookup failed
                    const { data: { user: fallbackUser } } = await supabase.auth.getUser();
                    if (fallbackUser) {
                        setUser(fallbackUser);
                        await fetchProfile(fallbackUser.id);
                    } else {
                        setUser(null);
                        setProfile(null);
                    }
                    initialized = true;
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;
                
                // Skip INITIAL_SESSION event since we handle it in initialize()
                // This prevents double-processing that can cause flickering
                if (event === 'INITIAL_SESSION' && !initialized) return;

                if (session?.user) {
                    setLoading(true); // Ensure loading is true while we fetch the profile
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    // Only clear state on explicit sign out
                    setUser(null);
                    setProfile(null);
                }
                
                // Final safety check to ensure we don't clear loading state 
                // if we're in the middle of a transition that should be loading
                if (mounted) setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        router.push('/login');
    }, [router]);

    useEffect(() => {
        if (!loading && user && !profile) {
            // User is authenticated but profile is missing (deleted)
            signOut();
        }
    }, [loading, user, profile, signOut]);

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}
