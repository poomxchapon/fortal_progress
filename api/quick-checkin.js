export default async function handler(req, res) {
  const SUPABASE_URL = 'https://panomchvlqjimwgsxevz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbm9tY2h2bHFqaW13Z3N4ZXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Njk3OTgsImV4cCI6MjA4MjE0NTc5OH0.YdXBlUOlLape0jBdbGgt01wZL-1Es9hQDiGkmZI2zxI';

  return res.status(200).send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkSpace — Quick Check-in</title>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Prompt', -apple-system, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 24px; padding: 32px; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.15); text-align: center; }
    .logo { font-size: 40px; margin-bottom: 8px; }
    h1 { font-size: 22px; color: #1E293B; margin-bottom: 4px; }
    .subtitle { color: #94A3B8; font-size: 13px; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; text-align: left; }
    .form-group label { display: block; font-size: 13px; color: #64748B; margin-bottom: 4px; font-weight: 500; }
    .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #E2E8F0; border-radius: 12px; font-size: 15px; font-family: 'Prompt', sans-serif; outline: none; transition: border-color 0.2s; }
    .form-group input:focus { border-color: #818CF8; }
    .btn { width: 100%; padding: 14px; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; font-family: 'Prompt', sans-serif; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79,70,229,0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-checkin { background: linear-gradient(135deg, #10B981, #059669); color: white; font-size: 20px; padding: 20px; }
    .btn-checkin:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16,185,129,0.4); }
    .btn-checkin:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    .user-info { background: #F1F5F9; border-radius: 16px; padding: 16px; margin-bottom: 20px; }
    .user-name { font-size: 18px; font-weight: 600; color: #1E293B; }
    .user-email { font-size: 12px; color: #94A3B8; }
    .time-display { font-size: 48px; font-weight: 700; color: #4F46E5; margin: 16px 0; font-variant-numeric: tabular-nums; }
    .date-display { color: #64748B; font-size: 14px; margin-bottom: 20px; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 8px; }
    .status-present { background: #D1FAE5; color: #065F46; }
    .status-late { background: #FEF3C7; color: #92400E; }
    .success-icon { font-size: 64px; margin-bottom: 12px; }
    .error-msg { color: #DC2626; font-size: 13px; margin-top: 8px; text-align: center; }
    .link-btn { color: #6366F1; font-size: 13px; cursor: pointer; margin-top: 12px; display: inline-block; text-decoration: underline; background: none; border: none; font-family: 'Prompt', sans-serif; }
    .hidden { display: none; }
    .already-info { color: #64748B; font-size: 14px; margin-top: 12px; }
    .already-time { font-size: 24px; font-weight: 600; color: #10B981; }
  </style>
</head>
<body>
  <div class="card">
    <!-- LOGIN VIEW -->
    <div id="view-login">
      <div class="logo">⏰</div>
      <h1>Quick Check-in</h1>
      <p class="subtitle">เข้าสู่ระบบเพื่อลงเวลา</p>
      <form id="login-form">
        <div class="form-group">
          <label>อีเมล</label>
          <input type="email" id="input-email" placeholder="email@company.com" required>
        </div>
        <div class="form-group">
          <label>รหัสผ่าน</label>
          <input type="password" id="input-password" placeholder="••••••••" required>
        </div>
        <div id="login-error" class="error-msg hidden"></div>
        <button type="submit" class="btn btn-primary" id="btn-login">เข้าสู่ระบบ</button>
      </form>
    </div>

    <!-- CHECKIN VIEW -->
    <div id="view-checkin" class="hidden">
      <div class="logo">👋</div>
      <h1>สวัสดีตอนเช้า!</h1>
      <div class="user-info">
        <div class="user-name" id="display-name">—</div>
        <div class="user-email" id="display-email">—</div>
      </div>
      <div class="time-display" id="display-time">--:--:--</div>
      <div class="date-display" id="display-date">—</div>
      <button class="btn btn-checkin" id="btn-checkin" onclick="doCheckin()">☀️ เช็คอินเข้างาน</button>
      <div id="already-checked" class="hidden">
        <div class="already-info">เช็คอินแล้ววันนี้</div>
        <div class="already-time" id="already-time">—</div>
      </div>
      <button class="link-btn" onclick="logout()">เปลี่ยนบัญชี</button>
    </div>

    <!-- SUCCESS VIEW -->
    <div id="view-success" class="hidden">
      <div class="success-icon">✅</div>
      <h1>เช็คอินสำเร็จ!</h1>
      <div class="user-info" style="margin-top: 16px;">
        <div class="user-name" id="success-name">—</div>
        <div id="success-time" style="font-size: 28px; font-weight: 700; color: #10B981; margin-top: 8px;">—</div>
        <div id="success-status"></div>
      </div>
      <p class="subtitle">บันทึกเวลาเข้างานเรียบร้อย</p>
      <a href="https://fortal-progress.vercel.app/" class="btn btn-primary" style="display: block; text-decoration: none; margin-top: 16px;">เปิด WorkSpace</a>
    </div>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    let currentUser = null;
    let currentProfile = null;

    // Clock
    function updateClock() {
      const now = new Date();
      const el = document.getElementById('display-time');
      if (el) el.textContent = now.toLocaleTimeString('th-TH');
      const dateEl = document.getElementById('display-date');
      if (dateEl) dateEl.textContent = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Init — check existing session
    async function init() {
      const { data: { session } } = await db.auth.getSession();
      if (session) {
        currentUser = session.user;
        await loadProfileAndShow();
      } else {
        show('view-login');
      }
    }

    async function loadProfileAndShow() {
      const { data } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
      currentProfile = data || { name: currentUser.email.split('@')[0] };

      document.getElementById('display-name').textContent = currentProfile.name;
      document.getElementById('display-email').textContent = currentUser.email;

      // Check if already checked in today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: existing } = await db.from('attendance').select('*').eq('user_id', currentUser.id).eq('date', todayStr);

      hide('view-login');
      show('view-checkin');

      if (existing && existing.length > 0) {
        document.getElementById('btn-checkin').classList.add('hidden');
        document.getElementById('already-checked').classList.remove('hidden');
        document.getElementById('already-time').textContent = '⏰ ' + existing[0].check_in;
      } else {
        document.getElementById('btn-checkin').classList.remove('hidden');
        document.getElementById('already-checked').classList.add('hidden');
      }
    }

    // Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('input-email').value;
      const password = document.getElementById('input-password').value;
      const btn = document.getElementById('btn-login');
      const errEl = document.getElementById('login-error');

      btn.disabled = true;
      btn.textContent = 'กำลังเข้าสู่ระบบ...';
      errEl.classList.add('hidden');

      try {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.session.user;
        await loadProfileAndShow();
      } catch (err) {
        errEl.textContent = err.message.includes('Invalid login') ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : err.message;
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'เข้าสู่ระบบ';
      }
    });

    // Check-in
    async function doCheckin() {
      const btn = document.getElementById('btn-checkin');
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('th-TH');

      // Late threshold: 09:40
      const lateThreshold = new Date();
      lateThreshold.setHours(9, 40, 0, 0);
      const status = now > lateThreshold ? 'Late' : 'Present';

      const { error } = await db.from('attendance').insert({
        user_id: currentUser.id,
        user_name: currentProfile.name,
        date: todayStr,
        check_in: timeStr,
        status: status,
        location: { lat: 0, lng: 0, note: 'LINE Quick Check-in' }
      });

      if (error) {
        btn.disabled = false;
        btn.textContent = '☀️ เช็คอินเข้างาน';
        alert('เกิดข้อผิดพลาด: ' + error.message);
        return;
      }

      hide('view-checkin');
      show('view-success');
      document.getElementById('success-name').textContent = currentProfile.name;
      document.getElementById('success-time').textContent = timeStr;
      document.getElementById('success-status').innerHTML =
        '<span class="status-badge ' + (status === 'Late' ? 'status-late' : 'status-present') + '">' +
        (status === 'Late' ? '⚠️ สาย' : '✅ ตรงเวลา') + '</span>';
    }

    // Logout
    async function logout() {
      await db.auth.signOut();
      currentUser = null;
      currentProfile = null;
      hide('view-checkin');
      hide('view-success');
      show('view-login');
      document.getElementById('input-email').value = '';
      document.getElementById('input-password').value = '';
    }

    function show(id) { document.getElementById(id).classList.remove('hidden'); }
    function hide(id) { document.getElementById(id).classList.add('hidden'); }

    // Hide all first, then init
    hide('view-login');
    hide('view-checkin');
    hide('view-success');
    init();
  </script>
</body>
</html>`);
}
