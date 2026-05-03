// Dispatcher — รวม cron handlers ทั้งหมดเป็น 1 function
// (Vercel Hobby plan limit: 12 functions/project — เลย consolidate)
//
// URL ยังเหมือนเดิม:
//   /api/cron/checkin-reminder
//   /api/cron/checkout-reminder
//   /api/cron/auto-absent
//   /api/cron/announcements
//   /api/cron/monthly-summary
//
// Logic จริงอยู่ใน lib/cron/<action>.js — import แบบ dynamic เพื่อ tree-shake / lazy load

const ALLOWED = new Set([
  'checkin-reminder',
  'checkout-reminder',
  'auto-absent',
  'announcements',
  'monthly-summary',
]);

export default async function handler(req, res) {
  const { action } = req.query;

  if (!ALLOWED.has(action)) {
    return res.status(404).json({ error: 'Unknown cron action', action });
  }

  try {
    const mod = await import(`../../lib/cron/${action}.js`);
    return mod.default(req, res);
  } catch (err) {
    console.error(`[cron/${action}] dispatch error:`, err);
    return res.status(500).json({ error: err.message, action });
  }
}
