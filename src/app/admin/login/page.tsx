'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in using the global Auth configuration
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data?.user) {
        // Enforce admin-only login constraint
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError || profile?.role !== 'admin') {
          // Immediately sign out if non-admin tries to login here
          await supabase.auth.signOut();
          throw new Error('Access Denied. Administrator privileges required.');
        }

        router.push('/');
        router.refresh(); // Refresh to trigger layout state
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09090b', color: '#ededed', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, background: '#111113', padding: '48px', borderRadius: '24px', width: '100%', maxWidth: '440px', border: '1px solid #27272a', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ width: '56px', height: '56px', background: '#18181b', borderRadius: '16px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #27272a' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
            </div>
            <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>Terminal Access</h1>
            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '14px', fontWeight: '500' }}>Restricted area. Authorised personnel only.</p>
        </div>
        
        {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: '500', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>⚠️</span> {error}
            </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Admin ID / Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@sys.local" 
              required
              style={{ width: '100%', padding: '16px', background: '#09090b', border: '1px solid #27272a', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all 0.2s', fontSize: '15px' }} 
              onFocus={(e) => { e.target.style.borderColor = '#52525b'; e.target.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.05)' }}
              onBlur={(e) => { e.target.style.borderColor = '#27272a'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Passcode</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              style={{ width: '100%', padding: '16px', background: '#09090b', border: '1px solid #27272a', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all 0.2s', fontSize: '15px' }} 
              onFocus={(e) => { e.target.style.borderColor = '#52525b'; e.target.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.05)' }}
              onBlur={(e) => { e.target.style.borderColor = '#27272a'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
                width: '100%', 
                padding: '16px', 
                background: '#fff', 
                color: '#000', 
                border: 'none', 
                borderRadius: '12px', 
                fontWeight: '800', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                marginTop: '12px', 
                opacity: loading ? 0.7 : 1,
                fontSize: '15px',
                transition: 'all 0.2s',
                letterSpacing: '0.5px'
            }}
            onMouseOver={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.2)' }}
            onMouseOut={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
          </button>
        </form>
      </div>
    </div>
  );
}
