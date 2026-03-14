'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Zap,
    ShieldCheck,
    TrendingUp,
    Users,
    ArrowRight,
    Globe,
    Cpu,
    Lock,
    CheckCircle2,
    DollarSign,
    Sparkles,
    Github,
    Twitter,
    BadgeCheck
} from 'lucide-react';
import gsap from 'gsap';
import AnimatePage from '@/components/AnimatePage';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && user) {
            router.push('/home');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (loading || !containerRef.current) return;

        const ctx = gsap.context(() => {
            gsap.set(['.reveal-up', '.reveal-scale'], { opacity: 0 });
            gsap.set('.reveal-up', { y: 60 });
            gsap.set('.reveal-scale', { scale: 0.8 });

            const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

            tl.to('.reveal-up', {
                y: 0,
                opacity: 1,
                duration: 1.2,
                stagger: 0.1
            })
            .to('.reveal-scale', {
                scale: 1,
                opacity: 1,
                duration: 1,
                stagger: 0.1
            }, "-=0.8");

            // Generative Neural Mesh Logic
            const canvas = document.getElementById('neural-mesh') as HTMLCanvasElement;
            if (canvas) {
                const ctx2d = canvas.getContext('2d');
                if (ctx2d) {
                    let w = canvas.width = window.innerWidth;
                    let h = canvas.height = window.innerHeight;
                    const particles: any[] = [];
                    const particleCount = 60;

                    for (let i = 0; i < particleCount; i++) {
                        particles.push({
                            x: Math.random() * w,
                            y: Math.random() * h,
                            vx: (Math.random() - 0.5) * 0.4,
                            vy: (Math.random() - 0.5) * 0.4,
                            size: Math.random() * 2 + 1
                        });
                    }

                    function animateMesh() {
                        if (!ctx2d) return;
                        ctx2d.clearRect(0, 0, w, h);
                        ctx2d.strokeStyle = 'rgba(157, 80, 187, 0.15)';
                        ctx2d.fillStyle = 'rgba(157, 80, 187, 0.4)';

                        particles.forEach((p, i) => {
                            p.x += p.vx;
                            p.y += p.vy;

                            if (p.x < 0 || p.x > w) p.vx *= -1;
                            if (p.y < 0 || p.y > h) p.vy *= -1;

                            ctx2d.beginPath();
                            ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                            ctx2d.fill();

                            for (let j = i + 1; j < particles.length; j++) {
                                const p2 = particles[j];
                                const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                                if (dist < 150) {
                                    ctx2d.lineWidth = 1 - dist / 150;
                                    ctx2d.beginPath();
                                    ctx2d.moveTo(p.x, p.y);
                                    ctx2d.lineTo(p2.x, p2.y);
                                    ctx2d.stroke();
                                }
                            }
                        });
                        requestAnimationFrame(animateMesh);
                    }
                    animateMesh();

                    window.addEventListener('resize', () => {
                        w = canvas.width = window.innerWidth;
                        h = canvas.height = window.innerHeight;
                    });
                }
            }

            // Floating animations for background blobs... (rest of the code)
            gsap.to('.blob-1', {
                x: 100,
                y: 50,
                duration: 8,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
            gsap.to('.blob-2', {
                x: -80,
                y: -40,
                duration: 10,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        }, containerRef);

        return () => ctx.revert();
    }, [loading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050510]">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (user) return null; // Avoid flicker while redirecting

    return (
        <AnimatePage>
            <div ref={containerRef} className="min-h-screen bg-[#050510] text-white selection:bg-primary/30 selection:text-primary-light overflow-x-hidden">
                {/* Background Atmosphere */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#050510]">
                    {/* Premium Image Base */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-110 animate-pulse-slow"
                        style={{ backgroundImage: "url('/premium_background.png')" }}
                    />
                    
                    {/* Generative Neural Mesh Canvas */}
                    <canvas id="neural-mesh" className="absolute inset-0 w-full h-full opacity-30 mix-blend-screen" />

                    <div className="blob-1 absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
                    <div className="blob-2 absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[140px]" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050510]/60 to-[#050510]" />
                </div>

                {/* Navigation */}
                <nav className="fixed top-0 w-full z-[100] px-6 py-5">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                                <DollarSign className="text-white" size={20} />
                            </div>
                            <span className="text-xl font-black uppercase tracking-tighter">Simple Money</span>
                        </div>

                        <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
                            <Link href="#how-it-works" className="hover:text-primary transition-colors">Workflow</Link>
                            <Link href="#vip" className="hover:text-primary transition-colors">VIP map</Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest px-6 py-3 hover:text-white transition-colors">Login</Link>
                            <Link href="/signup" className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="relative pt-44 pb-32 px-6">
                    <div className="max-w-5xl mx-auto text-center relative">
                        <div className="reveal-up inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
                            <Sparkles size={14} className="text-warning animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/60">Next-Gen Fintech Platform</span>
                        </div>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] pointer-events-none opacity-40 reveal-scale -z-10">
                            <img
                                src="/hero_image.png"
                                alt="Background"
                                className="w-full h-full object-contain animate-float"
                            />
                        </div>

                        <h1 className="reveal-up text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 relative z-10">
                            The world's most <br />
                            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer italic">Refined</span> platform.
                        </h1>

                        <p className="reveal-up text-text-secondary text-lg md:text-xl font-medium max-w-2xl mx-auto mb-12 leading-relaxed opacity-70">
                            Maximize your commission potential with our industry-leading optimization engine. Secure, audited, and built for speed.
                        </p>

                        <div className="reveal-up flex flex-col md:flex-row items-center justify-center gap-6">
                            <Link href="/signup" className="btn-primary px-12 py-5 rounded-2xl flex items-center gap-3 text-sm tracking-widest group shadow-[0_0_30px_rgba(157,80,187,0.3)] hover:shadow-[0_0_50px_rgba(157,80,187,0.5)] transition-all">
                                START EARNING <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                            </Link>
                            <div className="flex items-center gap-4 text-white/40">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050510] bg-surface-light" />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">124K+ Active Earners</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="px-6 py-20 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Active Users', value: '124K+', icon: Users, color: 'text-primary' },
                                { label: 'Total Payouts', value: '$840M+', icon: DollarSign, color: 'text-success' },
                                { label: 'Global Rank', value: '#1', icon: Globe, color: 'text-accent' },
                                { label: 'Uptime', value: '99.9%', icon: BadgeCheck, color: 'text-warning' },
                            ].map((stat, i) => (
                                <div key={i} className="reveal-scale glass-card-strong p-8 flex flex-col items-center text-center gap-4 border border-white/5 group hover:border-white/20 transition-all duration-500">
                                    <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                                        <stat.icon size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-black tracking-tighter">{stat.value}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-40">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="px-6 py-32 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20 space-y-4">
                            <h2 className="reveal-up text-xs font-black uppercase tracking-[0.4em] text-primary">Core Infrastructure</h2>
                            <h3 className="reveal-up text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Engineered for Results</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {[
                                {
                                    title: 'AI Optimization',
                                    desc: 'Proprietary algorithms match you with the highest yielding tasks in real-time.',
                                    icon: Cpu,
                                    color: 'bg-primary/20 text-primary-light'
                                },
                                {
                                    title: 'Secure Escrow',
                                    desc: 'Every transaction is locked in a secure TLS 1.3 container until audit clearance.',
                                    icon: Lock,
                                    color: 'bg-accent/20 text-accent'
                                },
                                {
                                    title: 'Tiered Payouts',
                                    desc: 'Access up to 30 sets of optimized tasks per day with instant settlement.',
                                    icon: Zap,
                                    color: 'bg-success/20 text-success'
                                }
                            ].map((feat, i) => (
                                <div key={i} className="reveal-up glass-card-strong p-10 hover:bg-white/5 transition-all duration-700 rounded-[40px] border border-white/5 group hover:border-primary/20 shadow-2xl">
                                    <div className={`w-16 h-16 rounded-[24px] ${feat.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-2xl`}>
                                        <feat.icon size={32} />
                                    </div>
                                    <h4 className="text-2xl font-black uppercase tracking-tighter mb-4">{feat.title}</h4>
                                    <p className="text-text-secondary leading-relaxed font-medium opacity-60">
                                        {feat.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Levels Section */}
                <section id="vip" className="px-6 py-32 relative bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20 space-y-4">
                            <h2 className="reveal-up text-xs font-black uppercase tracking-[0.4em] text-accent">VIP Tier Ecosystem</h2>
                            <h3 className="reveal-up text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Institutional Grade Access</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { id: 1, name: 'LV1', price: 100, rate: '0.45%', tasks: 40, color: 'from-cyan-500 to-blue-600' },
                                { id: 2, name: 'LV2', price: 500, rate: '0.50%', tasks: 50, color: 'from-violet-500 to-purple-600' },
                                { id: 3, name: 'LV3', price: 2000, rate: '0.80%', tasks: 60, color: 'from-amber-400 to-orange-500' },
                                { id: 4, name: 'LV4', price: 5000, rate: '1.00%', tasks: 70, color: 'from-rose-500 to-red-600' },
                                { id: 5, name: 'LV5', price: 10000, rate: '1.20%', tasks: 80, color: 'from-emerald-500 to-teal-600' },
                                { id: 6, name: 'LV6', price: 30000, rate: '1.50%', tasks: 100, color: 'from-blue-600 to-indigo-700' },
                            ].map((level, i) => (
                                <div key={i} className="reveal-up glass-card-strong p-8 flex flex-col border border-white/5 hover:border-white/20 transition-all duration-500 group">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                            <BadgeCheck size={24} className="text-white" />
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/40">Verified Tier</div>
                                    </div>
                                    <h4 className="text-3xl font-black uppercase tracking-tighter mb-1">{level.name}</h4>
                                    <div className="flex items-baseline gap-2 mb-8">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cost</span>
                                        <span className="text-2xl font-black">${level.price.toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-4 pt-6 border-t border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Comm. Rate</span>
                                            <span className="text-xs font-black text-success">{level.rate}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Task Limit</span>
                                            <span className="text-xs font-black">{level.tasks} Tasks</span>
                                        </div>
                                    </div>
                                    <Link href="/signup" className="mt-8 w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-center transition-all group-hover:border-primary/50">
                                        Activate Tier
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="px-6 pt-32 pb-12 relative border-t border-white/5 bg-black/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
                            <div className="col-span-1 md:col-span-1 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                        <DollarSign className="text-white" size={16} />
                                    </div>
                                    <span className="text-lg font-black uppercase tracking-tighter">Simple Money</span>
                                </div>
                                <p className="text-text-secondary text-xs font-medium leading-relaxed opacity-60 max-w-xs">
                                    The industry standard for task optimization and commission settlement. Trusted by over 100,000 users globally.
                                </p>
                            </div>

                            {[
                                {
                                    title: 'Company',
                                    links: ['About Us', 'Careers', 'Contact'],
                                    color: 'bg-primary'
                                },
                                {
                                    title: 'Legal',
                                    links: ['Terms of Use', 'Privacy Policy', 'Audit Logs'],
                                    color: 'bg-success'
                                },
                                {
                                    title: 'Connect',
                                    links: ['Twitter / X', 'Telegram', 'Support'],
                                    color: 'bg-accent'
                                }
                            ].map((col, i) => (
                                <div key={i} className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${col.color} animate-pulse`} />
                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em]">{col.title}</h5>
                                    </div>
                                    <ul className="space-y-4">
                                        {col.links.map((link, j) => (
                                            <li key={j}>
                                                <Link href="#" className="text-sm text-text-secondary hover:text-white transition-colors opacity-60 hover:opacity-100 flex items-center gap-2 group">
                                                    {link} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Systems Operational</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-30">
                                &copy; 2026 Simple Money. All rights reserved.
                            </p>
                            <div className="flex items-center gap-6 text-white/20">
                                <Github size={18} className="hover:text-white transition-colors" />
                                <Twitter size={18} className="hover:text-white transition-colors" />
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </AnimatePage>
    );
}