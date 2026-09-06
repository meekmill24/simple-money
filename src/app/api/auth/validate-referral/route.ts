import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const rawCode = body?.referralCode || body?.code;

        if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
            return NextResponse.json(
                { valid: false, error: 'A valid referral code is required.' },
                { status: 400 }
            );
        }

        const trimmedCode = rawCode.trim();

        // System fallback / master codes
        if (trimmedCode.toUpperCase() === 'VIP1') {
            return NextResponse.json({
                valid: true,
                code: 'VIP1',
                referrerUsername: 'System VIP1 Node',
            });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { valid: false, error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // 1. Check referral_codes table (case-insensitive)
        const { data: refData, error: refError } = await supabaseAdmin
            .from('referral_codes')
            .select('id, code, owner_id, is_active')
            .ilike('code', trimmedCode)
            .maybeSingle();

        if (refData && refData.is_active) {
            // Fetch referrer username
            let referrerUsername = 'Verified Sponsor';
            if (refData.owner_id) {
                const { data: ownerProf } = await supabaseAdmin
                    .from('profiles')
                    .select('username')
                    .eq('id', refData.owner_id)
                    .maybeSingle();
                if (ownerProf?.username) {
                    referrerUsername = ownerProf.username;
                }
            }

            return NextResponse.json({
                valid: true,
                code: refData.code,
                referrerUsername,
            });
        }

        // 2. Fallback: check profiles table directly for custom referral codes
        const { data: profileData, error: profError } = await supabaseAdmin
            .from('profiles')
            .select('id, username, referral_code')
            .ilike('referral_code', trimmedCode)
            .maybeSingle();

        if (profileData && profileData.referral_code) {
            // Auto-sync into referral_codes table if missing (fire-and-forget)
            void (async () => {
                try {
                    await supabaseAdmin.from('referral_codes').upsert({
                        code: profileData.referral_code,
                        owner_id: profileData.id,
                        is_active: true,
                    }, { onConflict: 'code' });
                } catch { /* ignore */ }
            })();

            return NextResponse.json({
                valid: true,
                code: profileData.referral_code,
                referrerUsername: profileData.username || 'Verified Sponsor',
            });
        }

        return NextResponse.json(
            { valid: false, error: 'Invalid or inactive referral code. Please verify and try again.' },
            { status: 404 }
        );

    } catch (err: unknown) {
        console.error('Referral Code Validation Error:', err);
        return NextResponse.json(
            { valid: false, error: 'Failed to validate referral code.' },
            { status: 500 }
        );
    }
}
