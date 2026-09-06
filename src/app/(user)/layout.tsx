'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import ActivityFeed from '@/components/ActivityFeed';
import { useState, useRef, useEffect } from 'react';
import AnimatePage from '@/components/AnimatePage';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';

export default function UserLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null); // Declare useRef for the main container

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    // Effect to reset scroll position on pathname change
    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
        }
    }, [pathname]);

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

                <div className="flex-1 md:pl-72 h-screen flex flex-col relative bg-transparent overflow-hidden">
                    <EmailVerificationBanner />
                    <Header onMenuClick={() => setSidebarOpen(true)} />
                    <main id="main-content" ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10 pb-20 px-4 md:px-8">
                        <div className="max-w-7xl mx-auto relative pt-4 md:pt-6">
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
