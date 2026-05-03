import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !req.headers['x-vercel-cron']) {
    if (req.method !== 'GET') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;

  if (!SUPABASE_URL || !SUPABASE_KEY || !LINE_TOKEN || !ADMIN_USER_ID) {
    return res.status(500).json({ error: 'Missing config' });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Calculate last month's date range
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const startDate = lastMonth.toISOString().split('T')[0];
  const endDate = lastMonthEnd.toISOString().split('T')[0];
  const monthName = lastMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  try {
    // Get all employees
    const { data: profiles } = await db.from('profiles').select('id, name');
    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ skipped: true, reason: 'No profiles' });
    }

    // Get attendance for last month
    const { data: attendance } = await db.from('attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    // Get approved leaves for last month
    const { data: leaves } = await db.from('leaves')
      .select('*')
      .eq('status', 'Approved')
      .gte('date', startDate)
      .lte('date', endDate);

    // Get WFH for last month
    const { data: wfhRecords } = await db.from('wfh')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    const att = attendance || [];
    const lvs = leaves || [];
    const wfh = wfhRecords || [];

    // Calculate per-person stats
    const stats = profiles.map(p => {
      const myAtt = att.filter(a => a.user_id === p.id || a.user_name === p.name);
      const lateCount = myAtt.filter(a => a.status === 'Late').length;
      const absentCount = myAtt.filter(a => a.status === 'Absent').length;
      const presentCount = myAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const leaveCount = lvs.filter(l => l.user_id === p.id || l.user_name === p.name).length;
      const wfhCount = wfh.filter(w => w.user_id === p.id || w.user_name === p.name).length;

      return { name: p.name, present: presentCount, late: lateCount, absent: absentCount, leave: leaveCount, wfh: wfhCount };
    });

    // Summary totals
    const totalLate = stats.reduce((s, p) => s + p.late, 0);
    const totalAbsent = stats.reduce((s, p) => s + p.absent, 0);
    const totalLeave = stats.reduce((s, p) => s + p.leave, 0);
    const totalWfh = stats.reduce((s, p) => s + p.wfh, 0);

    // Build Flex Message — push to admin only
    const employeeRows = stats
      .sort((a, b) => (b.late + b.absent) - (a.late + a.absent))
      .map(p => ({
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        contents: [
          { type: 'text', text: p.name, size: 'xs', color: '#334155', flex: 3 },
          { type: 'text', text: `${p.present}`, size: 'xs', color: '#10B981', align: 'center', flex: 1 },
          { type: 'text', text: `${p.late}`, size: 'xs', color: p.late > 0 ? '#F59E0B' : '#94A3B8', align: 'center', flex: 1 },
          { type: 'text', text: `${p.absent}`, size: 'xs', color: p.absent > 0 ? '#EF4444' : '#94A3B8', align: 'center', flex: 1 },
          { type: 'text', text: `${p.leave}`, size: 'xs', color: '#6366F1', align: 'center', flex: 1 },
          { type: 'text', text: `${p.wfh}`, size: 'xs', color: '#0EA5E9', align: 'center', flex: 1 }
        ]
      }));

    const flexMessage = {
      type: 'flex',
      altText: `📊 สรุปรายเดือน — ${monthName}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#4F46E5',
          paddingAll: '20px',
          contents: [
            { type: 'text', text: '📊 สรุปรายเดือน', color: '#FFFFFF', weight: 'bold', size: 'lg' },
            { type: 'text', text: monthName, color: '#C7D2FE', size: 'sm', margin: 'sm' }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            // Overview stats
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'none',
              contents: [
                {
                  type: 'box', layout: 'vertical', flex: 1, contents: [
                    { type: 'text', text: `${totalLate}`, size: 'xl', weight: 'bold', color: '#F59E0B', align: 'center' },
                    { type: 'text', text: 'สาย', size: 'xxs', color: '#94A3B8', align: 'center' }
                  ]
                },
                {
                  type: 'box', layout: 'vertical', flex: 1, contents: [
                    { type: 'text', text: `${totalAbsent}`, size: 'xl', weight: 'bold', color: '#EF4444', align: 'center' },
                    { type: 'text', text: 'ขาด', size: 'xxs', color: '#94A3B8', align: 'center' }
                  ]
                },
                {
                  type: 'box', layout: 'vertical', flex: 1, contents: [
                    { type: 'text', text: `${totalLeave}`, size: 'xl', weight: 'bold', color: '#6366F1', align: 'center' },
                    { type: 'text', text: 'ลา', size: 'xxs', color: '#94A3B8', align: 'center' }
                  ]
                },
                {
                  type: 'box', layout: 'vertical', flex: 1, contents: [
                    { type: 'text', text: `${totalWfh}`, size: 'xl', weight: 'bold', color: '#0EA5E9', align: 'center' },
                    { type: 'text', text: 'WFH', size: 'xxs', color: '#94A3B8', align: 'center' }
                  ]
                }
              ]
            },
            { type: 'separator', margin: 'lg' },
            // Table header
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'lg',
              contents: [
                { type: 'text', text: 'ชื่อ', size: 'xxs', color: '#94A3B8', weight: 'bold', flex: 3 },
                { type: 'text', text: 'มา', size: 'xxs', color: '#94A3B8', weight: 'bold', align: 'center', flex: 1 },
                { type: 'text', text: 'สาย', size: 'xxs', color: '#94A3B8', weight: 'bold', align: 'center', flex: 1 },
                { type: 'text', text: 'ขาด', size: 'xxs', color: '#94A3B8', weight: 'bold', align: 'center', flex: 1 },
                { type: 'text', text: 'ลา', size: 'xxs', color: '#94A3B8', weight: 'bold', align: 'center', flex: 1 },
                { type: 'text', text: 'WFH', size: 'xxs', color: '#94A3B8', weight: 'bold', align: 'center', flex: 1 }
              ]
            },
            // Employee rows
            ...employeeRows
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '16px',
          contents: [
            {
              type: 'button',
              action: { type: 'uri', label: '📄 ดูรายงานเต็ม', uri: 'https://fortal-progress.vercel.app' },
              style: 'primary',
              color: '#4F46E5',
              height: 'sm'
            }
          ]
        }
      }
    };

    // Push to admin only (not broadcast)
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        to: ADMIN_USER_ID,
        messages: [flexMessage]
      })
    });

    const lineData = await lineRes.json();

    return res.status(200).json({
      success: true,
      month: monthName,
      employees: stats.length,
      summary: { totalLate, totalAbsent, totalLeave, totalWfh },
      line: lineRes.ok ? 'sent' : lineData
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
