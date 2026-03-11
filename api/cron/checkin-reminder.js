import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (optional security)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !req.headers['x-vercel-cron']) {
    // Allow manual trigger for testing
    if (req.method !== 'GET') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!LINE_TOKEN) {
    return res.status(500).json({ error: 'LINE token not configured' });
  }

  // Skip weekends (check in Asia/Bangkok timezone)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) {
    return res.status(200).json({ skipped: true, reason: 'Weekend' });
  }

  const checkinUrl = 'https://fortal-progress.vercel.app/api/quick-checkin';
  const todayStr = now.toISOString().split('T')[0];
  const dateFormatted = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Query today's approved leaves from Supabase
  let todayLeaves = [];
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      // Find leaves where today falls between date and end_date (or single-day leave)
      const { data } = await db.from('leaves')
        .select('*')
        .eq('status', 'Approved')
        .lte('date', todayStr)
        .gte('end_date', todayStr);

      // Also get single-day leaves (end_date might be null)
      const { data: singleDay } = await db.from('leaves')
        .select('*')
        .eq('status', 'Approved')
        .eq('date', todayStr)
        .is('end_date', null);

      const allLeaves = [...(data || []), ...(singleDay || [])];
      // Deduplicate by id
      const seen = new Set();
      todayLeaves = allLeaves.filter(l => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
    } catch (e) {
      console.error('Error fetching leaves:', e);
    }
  }

  const typeMap = {
    'Sick': 'ลาป่วย', 'Personal': 'ลากิจ', 'Vacation': 'ลาพักร้อน',
    'Marriage': 'ลาสมรส', 'Funeral': 'ลาจัดการงานศพ', 'Ordination': 'ลาอุปสมบท',
    'Maternity': 'ลาคลอด', 'Sterilization': 'ลาทำหมัน', 'Training': 'ลาฝึกอบรม'
  };

  // Build messages array
  const messages = [];

  // Message 1: Check-in reminder
  messages.push({
    type: 'flex',
    altText: `☀️ เช็คอินเข้างาน — ${dateFormatted}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4F46E5',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '☀️ สวัสดีตอนเช้า!',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg'
          },
          {
            type: 'text',
            text: dateFormatted,
            color: '#C7D2FE',
            size: 'xs',
            margin: 'sm'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'ได้เวลาลงเวลาเข้างานแล้ว',
            size: 'sm',
            color: '#64748B',
            align: 'center'
          },
          {
            type: 'text',
            text: '09:00 - 09:40 น.',
            size: 'md',
            weight: 'bold',
            color: '#1E293B',
            align: 'center',
            margin: 'sm'
          },
          {
            type: 'text',
            text: '(หลัง 09:40 น. = สาย)',
            size: 'xs',
            color: '#F59E0B',
            align: 'center',
            margin: 'sm'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '☀️ เช็คอินเข้างาน',
              uri: checkinUrl
            },
            style: 'primary',
            color: '#10B981',
            height: 'md'
          }
        ]
      }
    }
  });

  // Message 2: Today's leaves (only if someone is on leave)
  if (todayLeaves.length > 0) {
    const leaveRows = todayLeaves.map(l => ({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: l.user_name,
          size: 'sm',
          weight: 'bold',
          color: '#1E293B',
          flex: 3
        },
        {
          type: 'text',
          text: typeMap[l.type] || l.type,
          size: 'xs',
          color: '#64748B',
          align: 'end',
          flex: 2
        }
      ]
    }));

    messages.push({
      type: 'flex',
      altText: `📋 วันนี้มีคนลา ${todayLeaves.length} คน`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F59E0B',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: `📋 วันนี้มีคนลา ${todayLeaves.length} คน`,
              color: '#FFFFFF',
              weight: 'bold',
              size: 'md'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: leaveRows
        }
      }
    });
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.message || 'LINE API error', details: data });
    }

    return res.status(200).json({
      success: true,
      date: dateFormatted,
      leaves_today: todayLeaves.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
