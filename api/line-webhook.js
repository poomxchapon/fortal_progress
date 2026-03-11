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
    // Show typing animation (lasts up to 60 seconds, stops when message is sent)
    await fetch('https://api.line.me/v2/bot/chat/loading', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({ chatId: userId, loadingSeconds: 30 })
    }).catch(() => {});

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
      replyText = geminiData.candidates[0].content.parts[0].text;
      // Strip markdown
      replyText = replyText.replace(/\*\*/g, '').replace(/```[\s\S]*?```/g, '').replace(/^#+\s/gm, '').trim();
      if (replyText.length > 4900) {
        replyText = replyText.substring(0, 4900) + '\n\n...ข้อความยาวเกินไป';
      }
      console.log('[LINE] Gemini replied OK, length:', replyText.length);
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
