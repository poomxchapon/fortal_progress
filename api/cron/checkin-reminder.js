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
  const dateFormatted = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  try {
    // Broadcast to ALL followers of the LINE OA
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        messages: [{
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
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.message || 'LINE API error', details: data });
    }

    return res.status(200).json({ success: true, date: dateFormatted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
