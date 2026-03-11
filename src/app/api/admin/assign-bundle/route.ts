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
        const { userId, bundle } = await req.json();
        const supabaseAdmin = getAdminClient();

        // 1. Update the profile with bundle data
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ pending_bundle: bundle })
            .eq('id', userId);

        if (profileError) {
            console.error("Assign Bundle DB Error:", profileError);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        // 2. Create a 'pending' record in user_tasks so it shows in the record tab
        // Use the first task ID from taskItemIds if available
        const primaryTaskId = bundle.taskItemIds?.[0];
        if (primaryTaskId) {
            await supabaseAdmin.from('user_tasks').insert({
                user_id: userId,
                task_item_id: primaryTaskId,
                status: 'pending',
                earned_amount: bundle.bonusAmount || 0
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("Assign Bundle Exception:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await req.json();
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        const supabaseAdmin = getAdminClient();

        // Clear bundle and remove any pending tasks for this user
        await supabaseAdmin
            .from('profiles')
            .update({ pending_bundle: null })
            .eq('id', userId);

        await supabaseAdmin
            .from('user_tasks')
            .delete()
            .eq('user_id', userId)
            .eq('status', 'pending');

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("Clear Bundle Exception:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
    }
}
