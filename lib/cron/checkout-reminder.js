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
                  text: 'กดปุ่มด้านล่างเพื่อลงเวลาออก',
                  size: 'xs',
                  color: '#94A3B8',
                  align: 'center',
                  margin: 'md'
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

    return res.status(200).json({ success: true, date: dateFormatted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
