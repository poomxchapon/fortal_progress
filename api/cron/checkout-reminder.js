import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!LINE_TOKEN) {
    return res.status(500).json({ error: 'LINE token not configured' });
  }

  // Skip weekends
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const day = now.getDay();
  if (day === 0 || day === 6) {
    return res.status(200).json({ skipped: true, reason: 'Weekend' });
  }

  const checkoutUrl = 'https://fortal-progress.vercel.app/api/quick-checkout';
  const dateFormatted = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Check how many people haven't checked out yet
  let notCheckedOut = [];
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const todayStr = now.toISOString().split('T')[0];

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data } = await db.from('attendance')
        .select('user_name')
        .eq('date', todayStr)
        .is('check_out', null);
      notCheckedOut = data || [];
    } catch (e) {
      console.error('Error fetching attendance:', e);
    }
  }

  const pendingNames = notCheckedOut.map(a => a.user_name).join(', ');
  const pendingText = notCheckedOut.length > 0
    ? `ยังไม่ลงเวลาออก: ${pendingNames}`
    : 'ทุกคนลงเวลาออกแล้ว';

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        messages: [{
          type: 'flex',
          altText: `🌙 อย่าลืมลงเวลาออกงาน! — ${dateFormatted}`,
          contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#EF4444',
              paddingAll: '20px',
              contents: [
                {
                  type: 'text',
                  text: '🌙 เลิกงานแล้ว!',
                  color: '#FFFFFF',
                  weight: 'bold',
                  size: 'lg'
                },
                {
                  type: 'text',
                  text: dateFormatted,
                  color: '#FECACA',
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
                  text: 'อย่าลืมลงเวลาออกงานนะครับ',
                  size: 'sm',
                  color: '#64748B',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: pendingText,
                  size: 'xs',
                  color: notCheckedOut.length > 0 ? '#F59E0B' : '#10B981',
                  align: 'center',
                  margin: 'md',
                  wrap: true
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
                    label: '🌙 ลงเวลาออกงาน',
                    uri: checkoutUrl
                  },
                  style: 'primary',
                  color: '#EF4444',
                  height: 'md'
                }
              ]
            }
          }
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.message || 'LINE API error', details: data });
    }

    return res.status(200).json({
      success: true,
      date: dateFormatted,
      not_checked_out: notCheckedOut.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
