export default async function handler(req, res) {
  const SUPABASE_URL = 'https://panomchvlqjimwgsxevz.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbm9tY2h2bHFqaW13Z3N4ZXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Njk3OTgsImV4cCI6MjA4MjE0NTc5OH0.YdXBlUOlLape0jBdbGgt01wZL-1Es9hQDiGkmZI2zxI';

  return res.status(200).send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkSpace — Quick Check-out</title>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Prompt', -apple-system, sans-serif; background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 24px; padding: 32px; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.15); text-align: center; }
    .logo { font-size: 40px; margin-bottom: 8px; }
    h1 { font-size: 22px; color: #1E293B; margin-bottom: 4px; }
    .subtitle { color: #94A3B8; font-size: 13px; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; text-align: left; }
    .form-group label { display: block; font-size: 13px; color: #64748B; margin-bottom: 4px; font-weight: 500; }
    .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #E2E8F0; border-radius: 12px; font-size: 15px; font-family: 'Prompt', sans-serif; outline: none; transition: border-color 0.2s; }
    .form-group input:focus { border-color: #F59E0B; }
    .btn { width: 100%; padding: 14px; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; font-family: 'Prompt', sans-serif; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79,70,229,0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-checkout { background: linear-gradient(135deg, #F59E0B, #EF4444); color: white; font-size: 20px; padding: 20px; }
    .btn-checkout:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(245,158,11,0.4); }
    .btn-checkout:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    .user-info { background: #F1F5F9; border-radius: 16px; padding: 16px; margin-bottom: 20px; }
    .user-name { font-size: 18px; font-weight: 600; color: #1E293B; }
    .user-email { font-size: 12px; color: #94A3B8; }
    .time-display { font-size: 48px; font-weight: 700; color: #F59E0B; margin: 16px 0; font-variant-numeric: tabular-nums; }
    .date-display { color: #64748B; font-size: 14px; margin-bottom: 20px; }
    .checkin-info { background: #ECFDF5; border-radius: 12px; padding: 12px; margin-bottom: 16px; color: #065F46; font-size: 14px; }
    .success-icon { font-size: 64px; margin-bottom: 12px; }
    .error-msg { color: #DC2626; font-size: 13px; margin-top: 8px; text-align: center; }
    .link-btn { color: #6366F1; font-size: 13px; cursor: pointer; margin-top: 12px; display: inline-block; text-decoration: underline; background: none; border: none; font-family: 'Prompt', sans-serif; }
    .hidden { display: none; }
    .warning-msg { background: #FEF3C7; border-radius: 12px; padding: 12px; margin-bottom: 16px; color: #92400E; font-size: 13px; }
    .already-info { color: #64748B; font-size: 14px; margin-top: 12px; }
    .already-time { font-size: 24px; font-weight: 600; color: #EF4444; }
    .work-duration { font-size: 16px; color: #64748B; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <!-- LOGIN VIEW -->
    <div id="view-login">
      <div class="logo">🌙</div>
      <h1>Quick Check-out</h1>
      <p class="subtitle">เข้าสู่ระบบเพื่อลงเวลาออก</p>
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

    <!-- CHECKOUT VIEW -->
    <div id="view-checkout" class="hidden">
      <div class="logo">🌙</div>
      <h1>ลงเวลาออกงาน</h1>
      <div class="user-info">
        <div class="user-name" id="display-name">—</div>
        <div class="user-email" id="display-email">—</div>
      </div>
      <div id="checkin-info" class="checkin-info hidden"></div>
      <div id="early-warning" class="warning-msg hidden">⚠️ ยังไม่ถึงเวลาเลิกงาน (17:30 น.)</div>
      <div class="time-display" id="display-time">--:--:--</div>
      <div class="date-display" id="display-date">—</div>
      <button class="btn btn-checkout" id="btn-checkout" onclick="doCheckout()">🌙 ลงเวลาออกงาน</button>
      <div id="no-checkin" class="hidden">
        <div class="error-msg">❌ ยังไม่ได้เช็คอินวันนี้ ไม่สามารถลงเวลาออกได้</div>
      </div>
      <div id="already-checked-out" class="hidden">
        <div class="already-info">ลงเวลาออกแล้ววันนี้</div>
        <div class="already-time" id="already-out-time">—</div>
      </div>
      <button class="link-btn" onclick="logout()">เปลี่ยนบัญชี</button>
    </div>

    <!-- SUCCESS VIEW -->
    <div id="view-success" class="hidden">
      <div class="success-icon">✅</div>
      <h1>ลงเวลาออกสำเร็จ!</h1>
      <div class="user-info" style="margin-top: 16px;">
        <div class="user-name" id="success-name">—</div>
        <div id="success-time" style="font-size: 28px; font-weight: 700; color: #EF4444; margin-top: 8px;">—</div>
        <div class="work-duration" id="success-duration"></div>
      </div>
      <p class="subtitle">พักผ่อนให้เต็มที่นะครับ 🎉</p>
      <a href="https://fortal-progress.vercel.app/" class="btn btn-primary" style="display: block; text-decoration: none; margin-top: 16px;">เปิด WorkSpace</a>
    </div>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    let currentUser = null;
    let currentProfile = null;
    let todayRecord = null;

    function updateClock() {
      const now = new Date();
      const el = document.getElementById('display-time');
      if (el) el.textContent = now.toLocaleTimeString('th-TH');
      const dateEl = document.getElementById('display-date');
      if (dateEl) dateEl.textContent = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    setInterval(updateClock, 1000);
    updateClock();

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

      const todayStr = new Date().toISOString().split('T')[0];
      const { data: existing } = await db.from('attendance').select('*').eq('user_id', currentUser.id).eq('date', todayStr);

      hide('view-login');
      show('view-checkout');

      if (!existing || existing.length === 0) {
        // No check-in today
        document.getElementById('btn-checkout').classList.add('hidden');
        document.getElementById('no-checkin').classList.remove('hidden');
        return;
      }

      todayRecord = existing[0];
      document.getElementById('checkin-info').textContent = '☀️ เข้างานเวลา: ' + todayRecord.check_in;
      document.getElementById('checkin-info').classList.remove('hidden');

      if (todayRecord.check_out) {
        // Already checked out
        document.getElementById('btn-checkout').classList.add('hidden');
        document.getElementById('already-checked-out').classList.remove('hidden');
        document.getElementById('already-out-time').textContent = '🌙 ' + todayRecord.check_out;
      } else {
        document.getElementById('btn-checkout').classList.remove('hidden');
        // Show early warning if before 17:30
        const now = new Date();
        const threshold = new Date();
        threshold.setHours(17, 30, 0, 0);
        if (now < threshold) {
          document.getElementById('early-warning').classList.remove('hidden');
        }
      }
    }

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

    async function doCheckout() {
      const btn = document.getElementById('btn-checkout');
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';

      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH');

      const { error } = await db.from('attendance').update({ check_out: timeStr }).eq('id', todayRecord.id);

      if (error) {
        btn.disabled = false;
        btn.textContent = '🌙 ลงเวลาออกงาน';
        alert('เกิดข้อผิดพลาด: ' + error.message);
        return;
      }

      hide('view-checkout');
      show('view-success');
      document.getElementById('success-name').textContent = currentProfile.name;
      document.getElementById('success-time').textContent = timeStr;

      // Calculate work duration
      try {
        const checkinParts = todayRecord.check_in.split(':');
        const checkinDate = new Date();
        checkinDate.setHours(parseInt(checkinParts[0]), parseInt(checkinParts[1]), parseInt(checkinParts[2] || 0));
        const diffMs = now - checkinDate;
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        document.getElementById('success-duration').textContent = 'ทำงานวันนี้: ' + hours + ' ชม. ' + mins + ' นาที';
      } catch (e) {}
    }

    async function logout() {
      await db.auth.signOut();
      currentUser = null;
      currentProfile = null;
      todayRecord = null;
      hide('view-checkout');
      hide('view-success');
      show('view-login');
      document.getElementById('input-email').value = '';
      document.getElementById('input-password').value = '';
    }

    function show(id) { document.getElementById(id).classList.remove('hidden'); }
    function hide(id) { document.getElementById(id).classList.add('hidden'); }

    hide('view-login');
    hide('view-checkout');
    hide('view-success');
    init();
  </script>
</body>
</html>`);
}
