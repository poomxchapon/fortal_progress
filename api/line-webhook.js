import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // LINE sends GET for webhook verification
  if (req.method === 'GET') {
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!LINE_TOKEN || !GEMINI_API_KEY) {
    console.error('Missing credentials:', { LINE_TOKEN: !!LINE_TOKEN, GEMINI_API_KEY: !!GEMINI_API_KEY });
    return res.status(500).json({ error: 'Missing credentials' });
  }

  const { events } = req.body;
  if (!events || events.length === 0) {
    return res.status(200).json({ ok: true });
  }

  // Process only first text message event
  const event = events.find(e => e.type === 'message' && e.message.type === 'text');
  if (!event) {
    return res.status(200).json({ ok: true, reason: 'no text message' });
  }

  const userMessage = event.message.text;
  const replyToken = event.replyToken;
  const userId = event.source.userId;

  console.log(`[LINE] Message from ${userId}: ${userMessage}`);

  // Build system context from Supabase
  let contextData = 'ไม่มีข้อมูลเพิ่มเติม';
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const todayStr = now.toISOString().split('T')[0];
      const dateFormatted = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('th-TH');

      const [
        { data: profiles },
        { data: todayAttendance },
        { data: todayLeaves },
        { data: pendingLeaves }
      ] = await Promise.all([
        db.from('profiles').select('name, position, role'),
        db.from('attendance').select('user_name, check_in, check_out, status').eq('date', todayStr),
        db.from('leaves').select('user_name, type, date, end_date, reason, status').eq('status', 'Approved').lte('date', todayStr).gte('end_date', todayStr),
        db.from('leaves').select('user_name, type, date, reason').eq('status', 'Pending')
      ]);

      const { data: singleDayLeaves } = await db.from('leaves')
        .select('user_name, type, date, end_date, reason, status')
        .eq('status', 'Approved')
        .eq('date', todayStr)
        .is('end_date', null);

      const allTodayLeaves = [...(todayLeaves || []), ...(singleDayLeaves || [])];
      const seenLeaves = new Set();
      const uniqueLeaves = allTodayLeaves.filter(l => {
        const key = `${l.user_name}-${l.type}-${l.date}`;
        if (seenLeaves.has(key)) return false;
        seenLeaves.add(key);
        return true;
      });

      contextData = `
Current Date: ${dateFormatted}
Current Time: ${timeFormatted}
Team Members: ${(profiles || []).map(p => `${p.name} (${p.position || 'N/A'})`).join(', ')}
Today's Attendance: ${(todayAttendance || []).map(a => `${a.user_name} เข้า ${a.check_in}${a.check_out ? ' ออก ' + a.check_out : ''} [${a.status}]`).join(', ') || 'ยังไม่มีใครเช็คอิน'}
On Leave Today: ${uniqueLeaves.length > 0 ? uniqueLeaves.map(l => `${l.user_name} (${l.type})`).join(', ') : 'ไม่มี'}
Pending Leave Requests: ${(pendingLeaves || []).length > 0 ? (pendingLeaves || []).map(l => `${l.user_name} ขอ${l.type} วันที่ ${l.date}`).join(', ') : 'ไม่มี'}
      `.trim();
      console.log('[LINE] Context loaded OK');
    } catch (e) {
      console.error('[LINE] Context error:', e.message);
      contextData = 'ไม่สามารถดึงข้อมูลระบบได้';
    }
  }

  // Build Skynet prompt
  const prompt = `
You are 'Skynet', a friendly and witty AI Agent for 'Fortal Interactive'.
Your personality: Casual, concise, helpful, and fun. Like a smart colleague sitting next desk.
Language: Thai (ภาษาไทย).
Platform: LINE OA (messaging app)

INSTRUCTIONS:
1. Be Concise: Keep answers short and to the point. Perfect for LINE chat format.
2. General Chat: You can chat about ANYTHING (weather, food, jokes, life), not just work.
3. Work Knowledge: Use the provided [CONTEXT DATA] to answer work-related questions accurately.
4. No Greetings: Do not start with "Hello" or "Sawaddee" every time. Just answer.
5. No Markdown: Do not use markdown formatting (no **, no backticks, no #). Use plain text and emojis instead.
6. LINE Friendly: Keep messages under 2000 characters. Use line breaks for readability.

[CONTEXT DATA]
${contextData}

USER: ${userMessage}
SKYNET:
  `.trim();

  try {
    // Show typing animation
    try {
      const loadingRes = await fetch('https://api.line.me/v2/bot/chat/loading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_TOKEN}`
        },
        body: JSON.stringify({ chatId: userId, loadingSeconds: 20 })
      });
      console.log('[LINE] Loading animation status:', loadingRes.status, await loadingRes.text());
    } catch (loadErr) {
      console.error('[LINE] Loading animation error:', loadErr.message);
    }

    // Call Gemini API
    console.log('[LINE] Calling Gemini...');
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();
    console.log('[LINE] Gemini status:', geminiRes.status);

    let replyText = 'ขอโทษครับ ระบบขัดข้องชั่วคราว ลองใหม่อีกทีนะครับ 🤖❌';

    if (geminiData.error) {
      console.error('[LINE] Gemini error:', JSON.stringify(geminiData.error));
      replyText = `ขอโทษครับ AI ขัดข้อง: ${geminiData.error.message || 'Unknown error'} 🤖❌`;
    } else if (geminiData.candidates && geminiData.candidates[0]) {
      const aiRaw = geminiData.candidates[0].content.parts[0].text;
      console.log('[LINE] Gemini raw:', aiRaw.substring(0, 300));

      // Check for LEAVE command from Skynet
      const commandMatch = aiRaw.match(/```json\s*(\{.*?\})\s*```/s);
      if (commandMatch && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          const command = JSON.parse(commandMatch[1]);
          if (command.action === 'LEAVE') {
            console.log('[LINE] Leave command detected:', JSON.stringify(command.data));
            const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            const { type, date, reason } = command.data;

            // Get LINE user's display name for the leave record
            let userName = 'LINE User';
            try {
              const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
                headers: { 'Authorization': `Bearer ${LINE_TOKEN}` }
              });
              const profileData = await profileRes.json();
              userName = profileData.displayName || 'LINE User';
            } catch (e) {
              console.error('[LINE] Failed to get profile:', e.message);
            }

            const typeMap = {
              'Sick': 'ลาป่วย', 'Personal': 'ลากิจ', 'Vacation': 'ลาพักร้อน',
              'Marriage': 'ลาสมรส', 'Funeral': 'ลาจัดการงานศพ', 'Ordination': 'ลาอุปสมบท',
              'Maternity': 'ลาคลอด', 'Sterilization': 'ลาทำหมัน', 'Training': 'ลาฝึกอบรม'
            };
            const typeTh = typeMap[type] || type;
            const dateFormatted = new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

            // Insert leave into database
            const { data: insertedLeave, error: insertErr } = await db.from('leaves').insert({
              user_name: userName,
              type: type,
              date: date,
              reason: reason || '-',
              status: 'Pending'
            }).select().single();

            if (insertErr) {
              console.error('[LINE] Leave insert error:', insertErr.message);
              replyText = `ขอโทษครับ บันทึกใบลาไม่สำเร็จ: ${insertErr.message} 😥`;
            } else {
              console.log('[LINE] Leave inserted:', insertedLeave.id);
              replyText = `✅ บันทึกใบลาเรียบร้อยครับ!\n\n👤 ${userName}\n📋 ${typeTh}\n📅 ${dateFormatted}\n💬 ${reason || '-'}\n\nรออนุมัติจาก Admin นะครับ`;

              // Notify admin via LINE
              const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID;
              if (ADMIN_USER_ID) {
                const approveUrl = `https://fortal-progress.vercel.app/api/line-action?action=approve&leave_id=${insertedLeave.id}`;
                const rejectUrl = `https://fortal-progress.vercel.app/api/line-action?action=reject&leave_id=${insertedLeave.id}`;

                await fetch('https://api.line.me/v2/bot/message/push', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_TOKEN}`
                  },
                  body: JSON.stringify({
                    to: ADMIN_USER_ID,
                    messages: [{
                      type: 'flex',
                      altText: `📨 ใบลาใหม่ (LINE) — ${userName} ขอ${typeTh}`,
                      contents: {
                        type: 'bubble',
                        size: 'kilo',
                        header: {
                          type: 'box', layout: 'vertical',
                          contents: [{ type: 'text', text: '📨 ใบลาใหม่ (จาก LINE)', weight: 'bold', size: 'lg', color: '#4F46E5' }],
                          paddingBottom: '0px'
                        },
                        body: {
                          type: 'box', layout: 'vertical',
                          contents: [
                            { type: 'text', text: userName, weight: 'bold', size: 'xl', margin: 'md' },
                            { type: 'separator', margin: 'lg' },
                            {
                              type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm',
                              contents: [
                                { type: 'box', layout: 'horizontal', contents: [
                                  { type: 'text', text: 'ประเภท', size: 'sm', color: '#999999', flex: 2 },
                                  { type: 'text', text: typeTh, size: 'sm', weight: 'bold', flex: 3 }
                                ]},
                                { type: 'box', layout: 'horizontal', contents: [
                                  { type: 'text', text: 'วันที่', size: 'sm', color: '#999999', flex: 2 },
                                  { type: 'text', text: dateFormatted, size: 'sm', weight: 'bold', flex: 3 }
                                ]},
                                { type: 'box', layout: 'horizontal', contents: [
                                  { type: 'text', text: 'เหตุผล', size: 'sm', color: '#999999', flex: 2 },
                                  { type: 'text', text: reason || '-', size: 'sm', flex: 3, wrap: true }
                                ]}
                              ]
                            }
                          ]
                        },
                        footer: {
                          type: 'box', layout: 'horizontal', spacing: 'md',
                          contents: [
                            { type: 'button', action: { type: 'uri', label: '✅ อนุมัติ', uri: approveUrl }, style: 'primary', color: '#16A34A', height: 'sm' },
                            { type: 'button', action: { type: 'uri', label: '❌ ไม่อนุมัติ', uri: rejectUrl }, style: 'primary', color: '#DC2626', height: 'sm' }
                          ]
                        }
                      }
                    }]
                  })
                }).catch(e => console.error('[LINE] Admin notify error:', e.message));
                console.log('[LINE] Admin notified');
              }
            }
          }
        } catch (parseErr) {
          console.error('[LINE] Command parse error:', parseErr.message);
          // Fall through to normal text reply
          replyText = aiRaw.replace(/\*\*/g, '').replace(/```[\s\S]*?```/g, '').replace(/^#+\s/gm, '').trim();
        }
      } else {
        // Normal text reply
        replyText = aiRaw.replace(/\*\*/g, '').replace(/```[\s\S]*?```/g, '').replace(/^#+\s/gm, '').trim();
      }

      if (replyText.length > 4900) {
        replyText = replyText.substring(0, 4900) + '\n\n...ข้อความยาวเกินไป';
      }
      console.log('[LINE] Reply text length:', replyText.length);
    } else {
      console.error('[LINE] Gemini unexpected response:', JSON.stringify(geminiData).substring(0, 500));
    }

    // Reply via LINE
    console.log('[LINE] Sending reply via replyToken...');
    const lineRes = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text: replyText }]
      })
    });

    const lineData = await lineRes.text();
    console.log('[LINE] Reply status:', lineRes.status, lineData);

    // If reply token expired, try push message instead
    if (lineRes.status !== 200 && userId) {
      console.log('[LINE] Reply failed, trying push message...');
      const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_TOKEN}`
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: 'text', text: replyText }]
        })
      });
      console.log('[LINE] Push status:', pushRes.status);
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[LINE] Fatal error:', err.message, err.stack);

    // Try push message as last resort
    if (userId) {
      try {
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_TOKEN}`
          },
          body: JSON.stringify({
            to: userId,
            messages: [{ type: 'text', text: 'ขอโทษครับ เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะครับ 🤖' }]
          })
        });
      } catch (e) {
        console.error('[LINE] Push fallback also failed:', e.message);
      }
    }

    return res.status(200).json({ ok: false, error: err.message });
  }
}
