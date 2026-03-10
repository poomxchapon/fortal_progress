import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { action, leave_id } = req.query;

  if (!action || !leave_id) {
    return res.status(400).send(page('❌ ข้อมูลไม่ครบ', 'ไม่พบ action หรือ leave_id'));
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).send(page('❌ ระบบขัดข้อง', 'ไม่พบการตั้งค่า Supabase'));
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get current leave status first
  const { data: leave, error: fetchErr } = await db.from('leaves').select('*').eq('id', leave_id).single();

  if (fetchErr || !leave) {
    return res.status(404).send(page('❌ ไม่พบใบลา', 'ใบลานี้อาจถูกลบไปแล้ว'));
  }

  if (leave.status !== 'Pending') {
    const statusTh = leave.status === 'Approved' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว';
    return res.status(200).send(page('⚠️ ดำเนินการไปแล้ว', `ใบลานี้${statusTh}ก่อนหน้านี้`));
  }

  const status = action === 'approve' ? 'Approved' : 'Rejected';
  const { error } = await db.from('leaves').update({ status }).eq('id', leave_id);

  if (error) {
    return res.status(500).send(page('❌ เกิดข้อผิดพลาด', error.message));
  }

  const icon = action === 'approve' ? '✅' : '❌';
  const label = action === 'approve' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ';
  const color = action === 'approve' ? '#16A34A' : '#DC2626';

  const typeMap = {
    'Sick': 'ลาป่วย', 'Personal': 'ลากิจ', 'Vacation': 'ลาพักร้อน',
    'Marriage': 'ลาสมรส', 'Funeral': 'ลาจัดการงานศพ', 'Ordination': 'ลาอุปสมบท',
    'Maternity': 'ลาคลอด', 'Sterilization': 'ลาทำหมัน', 'Training': 'ลาฝึกอบรม'
  };
  const typeTh = typeMap[leave.type] || leave.type;
  const dateFormatted = new Date(leave.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  return res.status(200).send(page(
    `${icon} ${label}`,
    `<strong>${leave.user_name}</strong> — ${typeTh}<br>วันที่ ${dateFormatted}`,
    color
  ));
}

function page(title, message, color = '#4F46E5') {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkSpace — ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Prompt', -apple-system, sans-serif; background: #F8FAFC; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: ${color}; margin-bottom: 12px; }
    p { color: #64748B; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #4F46E5; color: white; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 600; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://fortal-progress.vercel.app/" class="btn">กลับ WorkSpace</a>
  </div>
</body>
</html>`;
}
