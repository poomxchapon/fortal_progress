export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_name, type, date, reason } = req.body;
  if (!user_name || !type || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;

  if (!LINE_TOKEN || !ADMIN_USER_ID) {
    return res.status(500).json({ error: 'LINE credentials not configured' });
  }

  const typeMap = {
    'Sick': 'ลาป่วย',
    'Personal': 'ลากิจ',
    'Vacation': 'ลาพักร้อน',
    'Marriage': 'ลาสมรส',
    'Funeral': 'ลาจัดการงานศพ',
    'Ordination': 'ลาอุปสมบท',
    'Maternity': 'ลาคลอด',
    'Sterilization': 'ลาทำหมัน',
    'Training': 'ลาฝึกอบรม'
  };

  const typeTh = typeMap[type] || type;
  const dateFormatted = new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        to: ADMIN_USER_ID,
        messages: [{
          type: 'flex',
          altText: `📨 ใบลาใหม่ — ${user_name} ขอ${typeTh}`,
          contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
              type: 'box',
              layout: 'vertical',
              contents: [{
                type: 'text',
                text: '📨 ใบลาใหม่',
                weight: 'bold',
                size: 'lg',
                color: '#4F46E5'
              }],
              paddingBottom: '0px'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: user_name,
                  weight: 'bold',
                  size: 'xl',
                  margin: 'md'
                },
                {
                  type: 'separator',
                  margin: 'lg'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'lg',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'ประเภท', size: 'sm', color: '#999999', flex: 2 },
                        { type: 'text', text: typeTh, size: 'sm', weight: 'bold', flex: 3 }
                      ]
                    },
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'วันที่', size: 'sm', color: '#999999', flex: 2 },
                        { type: 'text', text: dateFormatted, size: 'sm', weight: 'bold', flex: 3 }
                      ]
                    },
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        { type: 'text', text: 'เหตุผล', size: 'sm', color: '#999999', flex: 2 },
                        { type: 'text', text: reason || '-', size: 'sm', flex: 3, wrap: true }
                      ]
                    }
                  ]
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [{
                type: 'button',
                action: {
                  type: 'uri',
                  label: 'เปิด WorkSpace',
                  uri: 'https://fortal-progress.vercel.app/'
                },
                style: 'primary',
                color: '#4F46E5'
              }]
            }
          }
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.message || 'LINE API error' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
