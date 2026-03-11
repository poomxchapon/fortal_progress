import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // Skip weekends
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const day = now.getDay();
  if (day === 0 || day === 6) {
    return res.status(200).json({ skipped: true, reason: 'Weekend' });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const todayStr = now.toISOString().split('T')[0];

  try {
    // Get all employees
    const { data: profiles } = await db.from('profiles').select('id, name, role');
    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ skipped: true, reason: 'No profiles' });
    }

    // CEO names — exempt from auto-absent
    const exemptNames = ['ต้น', 'pinyo'];

    // Filter out exempt people (CEO) by checking if name contains exempt keywords
    const nonExempt = profiles.filter(p => {
      const nameLower = p.name.toLowerCase();
      return !exemptNames.some(ex => nameLower.includes(ex.toLowerCase()));
    });

    // Get today's attendance records
    const { data: attendance } = await db.from('attendance')
      .select('user_id')
      .eq('date', todayStr);
    const checkedInIds = new Set((attendance || []).map(a => a.user_id));

    // Get today's approved leaves
    const { data: leavesRange } = await db.from('leaves')
      .select('user_id, user_name')
      .eq('status', 'Approved')
      .lte('date', todayStr)
      .gte('end_date', todayStr);

    const { data: leavesSingle } = await db.from('leaves')
      .select('user_id, user_name')
      .eq('status', 'Approved')
      .eq('date', todayStr)
      .is('end_date', null);

    const allLeaves = [...(leavesRange || []), ...(leavesSingle || [])];
    const onLeaveIds = new Set(allLeaves.map(l => l.user_id).filter(Boolean));
    const onLeaveNames = new Set(allLeaves.map(l => l.user_name).filter(Boolean));

    // Find employees who haven't checked in and aren't on leave
    const absentees = nonExempt.filter(p => {
      if (checkedInIds.has(p.id)) return false;
      if (onLeaveIds.has(p.id)) return false;
      if (onLeaveNames.has(p.name)) return false;
      return true;
    });

    if (absentees.length === 0) {
      return res.status(200).json({ success: true, absent: 0, message: 'Everyone accounted for' });
    }

    // Insert absent records
    const absentRecords = absentees.map(p => ({
      user_id: p.id,
      user_name: p.name,
      date: todayStr,
      check_in: '-',
      status: 'Absent',
      location: { lat: 0, lng: 0, note: 'Auto-Absent (ไม่ได้เช็คอินก่อน 13:00)' }
    }));

    const { error } = await db.from('attendance').insert(absentRecords);
    if (error) {
      console.error('Insert absent error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Auto-Absent] Marked ${absentees.length} employees as absent:`, absentees.map(p => p.name).join(', '));

    return res.status(200).json({
      success: true,
      date: todayStr,
      absent: absentees.length,
      names: absentees.map(p => p.name)
    });
  } catch (err) {
    console.error('Auto-absent error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
