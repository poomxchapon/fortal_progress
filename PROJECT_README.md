# WorkSpace v3.0

### Employee Management System by Fortal Interactive

ระบบจัดการพนักงานครบวงจร — ลงเวลา, ขอลา, อนุมัติ, ปฏิทินทีม, AI Chatbot, LINE OA Integration

**Production**: https://fortal-progress.vercel.app

---

## Overview

WorkSpace เป็นระบบ HR สำหรับทีมขนาดเล็ก-กลาง ครอบคลุมตั้งแต่การลงเวลาเข้า-ออกงาน, ระบบลางาน 9 ประเภท, ปฏิทินทีม, จัดการโปรเจค/งาน/ประชุม, AI Chatbot ที่สั่งลาผ่านแชทได้ และเชื่อมต่อ LINE OA เพื่อแจ้งเตือนอัตโนมัติ

ทั้งระบบเป็น **Single Page Application** อยู่ในไฟล์ `index.html` เดียว (3,334 บรรทัด) ทำให้ deploy ง่าย ไม่ต้อง build

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 + Vanilla JavaScript |
| Styling | Tailwind CSS (CDN) |
| Icons | Lucide Icons |
| Font | Google Fonts — Prompt (ภาษาไทย) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email/Password) |
| AI Chatbot | Google Gemini 2.5 Flash |
| Messaging | LINE Messaging API |
| Hosting | Vercel (Serverless + Cron) |
| Language | ภาษาไทยทั้งระบบ |

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│   Vercel     │────▶│  Supabase   │
│  index.html │     │  Functions   │     │  PostgreSQL │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
              ┌─────▼─────┐  ┌────▼─────┐
              │  Gemini   │  │  LINE    │
              │  AI API   │  │  OA API  │
              └───────────┘  └──────────┘
```

**Data Flow:**
- Browser ↔ Supabase: Auth + Realtime Database (direct)
- Browser → Vercel API → Gemini: AI Chatbot
- Vercel Cron → LINE Broadcast: แจ้งเตือนอัตโนมัติ
- LINE User → Vercel Webhook → Gemini → LINE Reply: LINE Bot

---

## Project Structure

```
fortal_progress/
│
├── index.html                          # SPA หลัก (3,334 lines)
├── logo.png                            # Logo บริษัท
├── package.json                        # Dependencies
├── vercel.json                         # Cron + Function config
│
├── api/
│   ├── chat.js                         # POST — Gemini chatbot proxy
│   ├── quick-checkin.js                # GET  — หน้าเช็คอินจาก LINE
│   ├── quick-checkout.js               # GET  — หน้าเช็คเอาท์จาก LINE
│   ├── line-webhook.js                 # POST — LINE OA webhook (Skynet bot)
│   ├── line-action.js                  # GET  — Approve/Reject leave จาก LINE
│   ├── notify-leave.js                 # POST — Push ใบลาแจ้ง admin
│   │
│   └── cron/
│       ├── checkin-reminder.js         # 09:00 จ-ศ — เตือนเช็คอิน
│       ├── auto-absent.js              # 13:00 จ-ศ — ตัดขาดงานอัตโนมัติ
│       └── checkout-reminder.js        # 18:30 จ-ศ — เตือนเช็คเอาท์
```

---

## Features

### Employee (พนักงานทั่วไป)

| Feature | Description |
|---------|-------------|
| Dashboard | สรุปข้อมูลวันนี้ — ใครมาแล้ว, ใครลา, quick check-in/out |
| Check-in/out | ลงเวลาเข้า-ออกงาน (หลัง 09:40 = สาย) |
| Leave Request | ขอลา 9 ประเภท + ดูโควตาคงเหลือ + ติดตามสถานะ |
| Calendar | ปฏิทินรายเดือน + วันหยุดราชการ + event ทีม |
| Team | ดูสมาชิกทีม + ตำแหน่ง + สถานะ |
| Projects | ดู/สร้าง/แก้ไข โปรเจค |
| Tasks | จัดการงาน (To Do → In Progress → Done) |
| Meetings | บันทึกการประชุม |
| AI Chatbot | คุยกับ Skynet ได้ทุกเรื่อง + สั่งลาผ่านแชท |
| Report | ดูประวัติลงเวลา + export CSV |
| Late Excuse | ส่งคำชี้แจงกรณีมาสาย + แนบรูป |

### Admin (ผู้ดูแลระบบ)

| Feature | Description |
|---------|-------------|
| Employee Management | เพิ่ม/ลบพนักงาน, ตั้ง role, ตั้ง leave quota |
| Leave Approval | ดูใบลาทุกสถานะ, อนุมัติ/ปฏิเสธ, ลบได้ |
| Request Approval | อนุมัติคำชี้แจงการมาสาย |
| Attendance Report | สรุป สาย/ขาด/ลา ของทุกคน |
| Realtime Notification | Toast popup เมื่อมีใบลาใหม่ |

### LINE OA Integration

| Feature | Description |
|---------|-------------|
| Skynet Chatbot | AI ตอบทุกข้อความ + มี context ข้อมูลงานจริง |
| แจ้งลาผ่าน LINE | พิมพ์ "ขอลาป่วย" → บันทึกลง DB + แจ้ง admin |
| Approve/Reject | Admin กดปุ่มใน LINE Flex Message ได้เลย |
| Quick Check-in | 09:00 จ-ศ ส่งลิ้งค์เช็คอิน (login ครั้งเดียว จำไว้) |
| Quick Check-out | 18:30 จ-ศ ส่งลิ้งค์เช็คเอาท์ |
| วันนี้ใครลา | แจ้งพร้อมเตือนเช็คอิน (เฉพาะวันที่มีคนลา) |
| Auto-Absent | 13:00 ไม่เช็คอิน = ขาดงานอัตโนมัติ |
| Typing Animation | แสดง "กำลังพิมพ์..." ระหว่างรอ AI |

---

## Leave Types (ประเภทการลา)

| Type | Thai | Quota/Year |
|------|------|-----------|
| Sick | ลาป่วย | 30 วัน |
| Personal | ลากิจ | 6 วัน |
| Vacation | ลาพักร้อน | ตาม quota (default 6) |
| Marriage | ลาสมรส | ไม่จำกัด |
| Funeral | ลาจัดการงานศพ | ไม่จำกัด |
| Ordination | ลาอุปสมบท | ไม่จำกัด |
| Maternity | ลาคลอด | ไม่จำกัด |
| Sterilization | ลาทำหมัน | ไม่จำกัด |
| Training | ลาฝึกอบรม | ไม่จำกัด |

---

## Cron Jobs (Automated Tasks)

| เวลา (ICT) | วัน | Endpoint | ทำอะไร |
|-----------|-----|----------|--------|
| 09:00 | จ-ศ | `/api/cron/checkin-reminder` | Broadcast เตือนเช็คอิน + แจ้งคนลาวันนี้ |
| 13:00 | จ-ศ | `/api/cron/auto-absent` | ตัดขาดงานอัตโนมัติ (ยกเว้น CEO + คนลา) |
| 18:30 | จ-ศ | `/api/cron/checkout-reminder` | Broadcast เตือนเช็คเอาท์ |

ทุก cron job:
- ข้าม วันเสาร์-อาทิตย์ อัตโนมัติ
- รันบน Vercel Cloud ไม่ต้องเปิดเครื่อง
- ส่งผ่าน LINE Broadcast API (ถึงทุกคนที่ follow OA)

---

## Attendance Logic

```
เวลา         สถานะ
─────────────────────────
< 09:40      Present (ตรงเวลา)
> 09:40      Late (สาย)
ไม่เช็คอินก่อน 13:00  Absent (ขาดงาน) — auto
```

**ยกเว้น Auto-Absent:**
- CEO (ตั้งชื่อใน exemptNames)
- คนที่ลาอนุมัติแล้ววันนั้น

---

## Database Schema (Supabase)

### Tables

| Table | Records | Purpose |
|-------|---------|---------|
| profiles | พนักงาน | ข้อมูลพนักงาน, role, leave quota |
| attendance | ลงเวลา | เช็คอิน/เอาท์ รายวัน |
| leaves | ใบลา | คำขอลา + สถานะอนุมัติ |
| attendance_requests | คำชี้แจง | ชี้แจงมาสาย + แนบหลักฐาน |
| projects | โปรเจค | รายการโปรเจค |
| tasks | งาน | task board |
| meetings | ประชุม | บันทึกการประชุม |
| calendar_events | ปฏิทิน | วันหยุด + event |

### Key Relationships

```
profiles.id ──┬──▶ attendance.user_id
              ├──▶ leaves.user_id
              ├──▶ attendance_requests.user_id
              └──▶ tasks.assignee (by name)
```

---

## API Endpoints

### Public Pages (GET → HTML)

| Endpoint | Description |
|----------|-------------|
| `/api/quick-checkin` | หน้าเช็คอิน (login + one-tap) |
| `/api/quick-checkout` | หน้าเช็คเอาท์ (login + one-tap) |
| `/api/line-action?action=approve&leave_id=xxx` | อนุมัติใบลา (redirect page) |

### API (POST → JSON)

| Endpoint | Body | Description |
|----------|------|-------------|
| `/api/chat` | `{ prompt }` | Gemini chatbot proxy |
| `/api/notify-leave` | `{ leave_id, user_id, user_name, type, date, reason }` | Push ใบลาแจ้ง admin |
| `/api/line-webhook` | LINE event payload | LINE OA webhook handler |

---

## AI Chatbot — Skynet

Skynet เป็น AI Agent ของบริษัท ทำงานทั้งบนเว็บและ LINE OA

**บุคลิก:**
- ภาษาไทย, เป็นกันเอง, ตอบสั้นกระชับ
- เหมือนเพื่อนร่วมงานที่นั่งโต๊ะข้างๆ
- คุยได้ทุกเรื่อง (อาหาร, สภาพอากาศ, มุกตลก, งาน)

**ความสามารถพิเศษ:**
- มี context ข้อมูลจริง: ใครมาแล้ว, ใครลา, ใบลารออนุมัติ
- สั่งลาผ่านแชทได้ (เช่น "ขอลาป่วยพรุ่งนี้" → บันทึกลง DB อัตโนมัติ)
- ส่ง Flex Message แจ้ง admin พร้อมปุ่ม approve/reject

**Model:** Google Gemini 2.5 Flash

---

## Environment Variables

ตั้งค่าใน **Vercel Dashboard → Settings → Environment Variables**

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service Role Key (server-side admin access) |
| `LINE_CHANNEL_ACCESS_TOKEN` | Yes | LINE Messaging API token |
| `LINE_ADMIN_USER_ID` | Yes | Admin's LINE user ID (รับแจ้งเตือนใบลา) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `CRON_SECRET` | No | Security token for cron verification |

**Hardcoded ใน index.html** (ต้องแก้เมื่อ duplicate):
- `SUPABASE_URL` — URL ของ Supabase
- `SUPABASE_KEY` — Anon Key
- `ADMIN_EMAIL` — อีเมล super admin
- `OFFICE_LOCATION` — พิกัด lat/lng ของออฟฟิศ

---

## Security

| Aspect | Implementation |
|--------|---------------|
| Authentication | Supabase Auth (email/password + JWT) |
| Admin Access | Hardcoded admin email + role check in profiles table |
| API Protection | Supabase Service Role Key (server-side only) |
| LINE Webhook | Reply token validation + user ID verification |
| Cron Jobs | Optional CRON_SECRET header check |
| Client Keys | Supabase Anon Key (read-only by RLS policy) |

---

## Deployment

**Auto-deploy:** Push to `main` branch → Vercel deploys automatically

**Manual deploy:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Vercel Project:**
- Project: `fortal-progress`
- Domain: `fortal-progress.vercel.app`
- Framework: None (static + serverless)
- Build: No build step needed

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v1.0 | 2026-03-10 | Initial release — attendance, leaves, team |
| v1.7 | 2026-03-10 | Realtime leave notifications |
| v1.8 | 2026-03-10 | LINE OA — leave notifications to admin |
| v2.0 | 2026-03-10 | Check-in/out UX overhaul |
| v2.2 | 2026-03-10 | Forgot password + reset flow |
| v2.8 | 2026-03-10 | LINE approve/reject with quota display |
| v3.0 | 2026-03-11 | LINE Bot (Skynet), Quick Check-in/out, Cron jobs, Auto-absent |

---

## Credits

- **Developer:** Fortal Interactive
- **AI Assistant:** Claude Opus 4.6 (Co-Authored)
- **AI Chatbot:** Google Gemini 2.5 Flash
- **Icons:** [Lucide](https://lucide.dev)
- **CSS:** [Tailwind CSS](https://tailwindcss.com)
- **Database:** [Supabase](https://supabase.com)
- **Hosting:** [Vercel](https://vercel.com)

---

*WorkSpace v3.0 — Built with simplicity in mind. One HTML file, zero build steps, full HR system.*
