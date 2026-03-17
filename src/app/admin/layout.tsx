'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Layers,
    Grid3X3,
    Share2,
    Receipt,
    LogOut,
    DollarSign,
    Menu,
    X,
    ArrowDownToLine,
    ArrowUpFromLine,
    Package,
    Bell,
    Settings,
    AlertCircle,
} from 'lucide-react';
import AnimatePage from '@/components/AnimatePage';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: Users, label: 'Users', href: '/users' },
    { icon: ArrowDownToLine, label: 'Deposits', href: '/deposits' },
    { icon: ArrowUpFromLine, label: 'Withdrawals', href: '/withdrawals' },
    { icon: Package, label: 'Bundles', href: '/bundles' },
    { icon: Bell, label: 'Notify Users', href: '/notify' },
    { icon: Layers, label: 'Levels', href: '/levels' },
    { icon: Grid3X3, label: 'Task Items', href: '/tasks' },
    { icon: Share2, label: 'Referrals', href: '/referrals' },
    { icon: Receipt, label: 'Transactions', href: '/transactions' },
    { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [pendingCounts, setPendingCounts] = useState({ deposits: 0, withdrawals: 0 });
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

    const fetchPendingCounts = async () => {
        const { data: deposits } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'deposit')
            .eq('status', 'pending');

        const { data: withdrawals } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('type', 'withdrawal')
            .eq('status', 'pending');

        const { count: dCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'pending');
        const { count: wCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending');

        setPendingCounts({ deposits: dCount || 0, withdrawals: wCount || 0 });
    };

    useEffect(() => {
        fetchPendingCounts();

        const channel = supabase
            .channel('admin-sidebar-status')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transactions'
            }, () => {
                fetchPendingCounts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (!loading) {
            // Check if user is already on the login page
            if (pathname === '/admin/login' || pathname === '/login') {
                // If they are already authenticated as an admin, redirect them out of the login page
                if (user && profile?.role === 'admin') {
                    router.replace('/');
                }
                // Otherwise, stay on the login page safely (no redirect loop)
                return;
            }

            // Normal protection for /admin/* pages:
            if (!user) {
                router.replace('/login');
            } else if (profile && profile.role !== 'admin') {
                // Not an admin
                router.replace('/login');
            }
        }
    }, [user, profile, loading, router, pathname]);

    // Do not render layout shell on the login page
    if (pathname === '/admin/login' || pathname === '/login') {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin-slow" />
            </div>
        );
    }

    if (!user || !profile || profile.role !== 'admin') return null;

    return (
        <div className="min-h-screen flex bg-background text-text-primary relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] mix-blend-screen opacity-70"></div>
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface/50 backdrop-blur-2xl border-r border-white/5 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-6 border-b border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 -skew-x-12 -translate-x-full"></div>
                        <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black tracking-tight text-white text-xl">Simple Money</h1>
                        <p className="text-xs font-semibold text-primary-light uppercase tracking-widest mt-0.5">Control Center</p>
                    </div>
                    <button className="lg:hidden absolute top-7 right-4 p-2 rounded-full bg-white/5" onClick={() => setSidebarOpen(false)}>
                        <X size={20} className="text-text-secondary hover:text-white transition-colors" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    <div className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] mb-4 px-3 mt-2">Menu</div>
                    {navItems.map(({ icon: Icon, label, href }) => {
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium relative group overflow-hidden ${isActive
                                    ? 'bg-gradient-to-r from-primary/10 to-transparent text-primary-light shadow-sm'
                                    : 'text-text-secondary hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"></div>}
                                <Icon size={20} className={isActive ? 'text-primary-light' : 'opacity-70 group-hover:scale-110 transition-transform'} />
                                <span className="flex-1">{label}</span>

                                {label === 'Deposits' && pendingCounts.deposits > 0 && (
                                    <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]">
                                        {pendingCounts.deposits}
                                    </span>
                                )}
                                {label === 'Withdrawals' && pendingCounts.withdrawals > 0 && (
                                    <span className="bg-danger text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--color-danger),0.5)]">
                                        {pendingCounts.withdrawals}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 bg-black/10">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-white/5 flex items-center justify-center">
                            <span className="text-sm font-black text-white">{profile.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{profile.username}</p>
                            <p className="text-xs text-primary-light uppercase tracking-wider font-semibold">Administrator</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSignOutConfirm(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-error/80 hover:text-white hover:bg-error transition-all duration-500 text-sm font-black w-full group relative overflow-hidden shadow-lg shadow-error/10 hover:shadow-error/30 uppercase tracking-widest border border-error/20"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <LogOut size={18} className="relative z-10 group-hover:-translate-x-1 transition-transform group-hover:scale-110" />
                        <span className="relative z-10">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col relative z-10 w-full lg:w-[calc(100%-18rem)]">
                {/* Top bar */}
                <div className="sticky top-0 z-30 bg-surface/40 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10" onClick={() => setSidebarOpen(true)}>
                            <Menu size={22} className="text-white" />
                        </button>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {navItems.find(n => n.href === pathname)?.label || 'Control Center'}
                        </h2>
                    </div>
                    {/* Add notification or user setting shortcut here if needed later */}
                </div>

                <main className="p-6 md:p-8 flex-1 overflow-auto">
                    <div className="max-w-[1600px] mx-auto">
                        <AnimatePage key={pathname}>
                            {children}
                        </AnimatePage>
                    </div>
                </main>
            </div>

            {/* Sign Out Confirmation Modal */}
            {showSignOutConfirm && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowSignOutConfirm(false)} />
                    <div className="relative glass-card-strong w-full max-w-sm p-8 animate-scale-up border-danger/20">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center text-danger animate-pulse border border-danger/20 shadow-[0_0_20px_rgba(255,0,0,0.1)]">
                                <LogOut size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">System Termination</h3>
                                <p className="text-sm text-text-secondary font-medium">Are you sure you want to exit the administrator terminal?</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full pt-2">
                                <button 
                                    onClick={() => setShowSignOutConfirm(false)}
                                    className="p-4 rounded-xl bg-white/5 text-text-secondary font-bold hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest border border-white/5"
                                >
                                    Abort
                                </button>
                                <button 
                                    onClick={() => { setShowSignOutConfirm(false); signOut(); }}
                                    className="p-4 rounded-xl bg-danger text-white font-black hover:bg-danger/80 transition-all shadow-lg shadow-danger/20 uppercase text-[10px] tracking-widest"
                                >
                                    Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

