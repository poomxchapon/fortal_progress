export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!LINE_TOKEN) {
    return res.status(500).json({ error: 'LINE token not configured' });
  }

  const { id, title, body, priority } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Missing title or body' });
  }

  const isUrgent = priority === 'urgent';
  const headerColor = isUrgent ? '#DC2626' : '#4F46E5';
  const icon = isUrgent ? '🚨' : '📢';
  const priorityText = isUrgent ? 'ด่วน!' : 'ประกาศ';

  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'long',
    timeStyle: 'short'
  });

  const flexMessage = {
    type: 'flex',
    altText: `${icon} ${priorityText}: ${title}`,
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
              {
                type: 'text',
                text: icon,
                size: 'xl',
                flex: 0
              },
              {
                type: 'text',
                text: priorityText,
                color: '#FFFFFF',
                weight: 'bold',
                size: 'lg',
                margin: 'md',
                flex: 1
              }
            ]
          },
          {
            type: 'text',
            text: title,
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
          {
            type: 'text',
            text: body,
            size: 'sm',
            color: '#334155',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: `📅 ${now}`,
            size: 'xs',
            color: '#94A3B8',
            margin: 'lg'
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
              label: '🔗 เปิด WorkSpace',
              uri: 'https://fortal-progress.vercel.app'
            },
            style: 'primary',
            color: headerColor,
            height: 'sm'
          }
        ]
      }
    }
  };

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({ messages: [flexMessage] })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.message || 'LINE API error', details: data });
    }

    // Update line_sent in Supabase if id provided
    if (id) {
      const { createClient } = await import('@supabase/supabase-js');
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_KEY) {
        const db = createClient(SUPABASE_URL, SUPABASE_KEY);
        await db.from('announcements').update({ line_sent: true }).eq('id', id);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
