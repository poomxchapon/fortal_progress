import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify cron or allow manual trigger
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !req.headers['x-vercel-cron']) {
    if (req.method !== 'GET') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now = new Date().toISOString();

  // Find scheduled announcements that are due
  const { data: pending, error } = await db.from('announcements')
    .select('*')
    .eq('published', false)
    .eq('publish_now', false)
    .lte('scheduled_at', now);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!pending || pending.length === 0) {
    return res.status(200).json({ published: 0 });
  }

  const results = [];

  for (const ann of pending) {
    // Mark as published
    await db.from('announcements').update({
      published: true,
      published_at: now
    }).eq('id', ann.id);

    // Send LINE if requested
    if (ann.send_line && LINE_TOKEN && !ann.line_sent) {
      const isUrgent = ann.priority === 'urgent';
      const headerColor = isUrgent ? '#DC2626' : '#4F46E5';
      const icon = isUrgent ? '🚨' : '📢';
      const priorityText = isUrgent ? 'ด่วน!' : 'ประกาศ';

      const timeStr = new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'long',
        timeStyle: 'short'
      });

      const flexMessage = {
        type: 'flex',
        altText: `${icon} ${priorityText}: ${ann.title}`,
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: headerColor,
            paddingAll: '20px',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: icon, size: 'xl', flex: 0 },
                  { type: 'text', text: priorityText, color: '#FFFFFF', weight: 'bold', size: 'lg', margin: 'md', flex: 1 }
                ]
              },
              {
                type: 'text',
                text: ann.title,
                color: '#FFFFFF',
                weight: 'bold',
                size: 'md',
                margin: 'md',
                wrap: true
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '20px',
            contents: [
              { type: 'text', text: ann.body, size: 'sm', color: '#334155', wrap: true },
              { type: 'separator', margin: 'lg' },
              { type: 'text', text: `📅 ${timeStr}`, size: 'xs', color: '#94A3B8', margin: 'lg' }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '16px',
            contents: [{
              type: 'button',
              action: { type: 'uri', label: '🔗 เปิด WorkSpace', uri: 'https://fortal-progress.vercel.app' },
              style: 'primary',
              color: headerColor,
              height: 'sm'
            }]
          }
        }
      };

      try {
        const lineRes = await fetch('https://api.line.me/v2/bot/message/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_TOKEN}`
          },
          body: JSON.stringify({ messages: [flexMessage] })
        });

        if (lineRes.ok) {
          await db.from('announcements').update({ line_sent: true }).eq('id', ann.id);
        }
      } catch (e) {
        console.error('LINE send failed for announcement:', ann.id, e);
      }
    }

    results.push({ id: ann.id, title: ann.title });
  }

  return res.status(200).json({ published: results.length, items: results });
}
