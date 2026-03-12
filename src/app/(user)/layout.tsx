'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import ActivityFeed from '@/components/ActivityFeed';
import { useState } from 'react';
import AnimatePage from '@/components/AnimatePage';

export default function UserLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-surface">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin-slow shadow-[0_0_20px_var(--color-primary)]" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <>
            <ActivityFeed />
            <div className="h-screen flex overflow-hidden transition-colors duration-300 bg-transparent">
                {/* Desktop Sidebar */}
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex-1 flex flex-col md:pl-72 min-w-0 h-full relative">
                    <div className="absolute top-0 left-0 right-0 z-40">
                        <Header onMenuClick={() => setSidebarOpen(true)} />
                    </div>
                    <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-32 px-4 md:px-8 w-full relative z-10 pt-16 md:pt-20">
                        <div className="max-w-7xl mx-auto relative">
                                <AnimatePage key={pathname}>
                                    {children}
                                    <Footer />
                                </AnimatePage>
                        </div>
                    </main>
                </div>
            </div>

            <BottomNav />
        </>
    );
}
