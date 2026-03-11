import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return createClient(url, key);
};

export async function POST(req: NextRequest) {
    try {
        const { email, password, username, phone, role, wallet_balance, level_id, referral_code: customCode, referred_by_code } = await req.json();

        if (!email || !password || !username) {
            return NextResponse.json({ error: 'Email, password and username are required.' }, { status: 400 });
        }

        const supabaseAdmin = getAdminClient();
        // Step 1: Create the auth user via admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError || !authData?.user) {
            console.error("Auth Creation Error:", authError);
            return NextResponse.json({ error: authError?.message || 'Failed to create auth user.' }, { status: 500 });
        }

        const userId = authData.user.id;

        // Step 2: Use custom code or generate one
        const referral_code = (customCode && customCode.trim())
            ? customCode.trim().toUpperCase()
            : `SM${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Step 2b: Process optional referrer
        let referred_by_id = null;
        if (referred_by_code && referred_by_code.trim()) {
            const codeToFind = referred_by_code.trim().toUpperCase();
            const { data: refData } = await supabaseAdmin
                .from('referral_codes')
                .select('owner_id, code, uses_count')
                .eq('code', codeToFind)
                .eq('is_active', true)
                .single();

            if (refData) {
                referred_by_id = refData.owner_id;

                // Increment owner's referral count
                await supabaseAdmin.from('referral_codes')
                    .update({ uses_count: (refData.uses_count || 0) + 1 })
                    .eq('code', codeToFind);
            }
        }

        // Step 3: Create/update the profile row
        // Using upsert because a Supabase DB trigger may auto-create a profile on auth user creation
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: userId,
            email,         // ← stored so username login can resolve the email
            username,
            phone: phone || null,
            role: role || 'user',
            wallet_balance: wallet_balance || 0,
            profit: 0,
            frozen_amount: 0,
            level_id: level_id || 1,
            referral_code,
            referred_by: referred_by_id,
        }, { onConflict: 'id' });

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        // Step 4: Create referral code entry
        await supabaseAdmin.from('referral_codes').insert({
            code: referral_code,
            owner_id: userId,
            is_active: true,
        });

        // Step 5: Add welcome bonus transaction if balance > 0
        if ((wallet_balance || 0) > 0) {
            const isWelcomeBonus = wallet_balance === 45 || wallet_balance === 25;

            await supabaseAdmin.from('transactions').insert({
                user_id: userId,
                type: 'deposit',
                amount: wallet_balance,
                description: isWelcomeBonus ? `Welcome bonus - New member ($${wallet_balance})` : 'Initial balance set by admin',
                status: 'approved'
            });
        }

        return NextResponse.json({ success: true, userId });
    } catch (err: unknown) {
        console.error("Create User API Exception:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
