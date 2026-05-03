# WorkSpace — Employee Management System

## AI Prompt สำหรับ Duplicate โปรเจคนี้

Copy prompt ด้านล่างนี้ทั้งก้อน แล้วส่งให้ AI (Claude / ChatGPT) เพื่อสร้างโปรเจคใหม่สำหรับบริษัทของคุณ

---

### Prompt

```
สร้างระบบ Employee Management System ชื่อ "WorkSpace" เป็น Single Page Application
ใช้ HTML + Vanilla JS + Tailwind CSS + Supabase + Vercel Serverless Functions

---

## Tech Stack

- Frontend: HTML + Vanilla JS (ไม่ใช้ Framework)
- CSS: Tailwind CSS (CDN)
- Icons: Lucide Icons
- Font: Google Fonts — Prompt (รองรับภาษาไทย)
- Database + Auth: Supabase (PostgreSQL + Auth email/password)
- AI Chatbot: Google Gemini API (gemini-2.5-flash)
- LINE Integration: LINE Messaging API (Webhook + Push + Broadcast)
- Hosting: Vercel (Serverless Functions + Cron Jobs)
- ภาษา: ภาษาไทยทั้งหมด

---

## Supabase Database — 8 Tables

### 1. profiles
| Column | Type | Note |
|--------|------|------|
| id | UUID (pk) | = auth.users.id |
| name | text | ชื่อพนักงาน |
| position | text | ตำแหน่ง |
| role | text | 'employee' หรือ 'admin' |
| leave_quota | integer | โควตาลาพักร้อน (default 6) |
| created_at | timestamptz | |

### 2. attendance
| Column | Type | Note |
|--------|------|------|
| id | UUID (pk) | |
| user_id | UUID (fk → profiles) | |
| user_name | text | |
| date | date | |
| check_in | text | เวลาเข้า เช่น "09:15:30" |
| check_out | text (nullable) | เวลาออก |
| status | text | 'Present', 'Late', 'Absent' |
| location | jsonb | { lat, lng, note } |
| created_at | timestamptz | |

### 3. leaves
| Column | Type | Note |
|--------|------|------|
| id | UUID (pk) | |
| user_id | UUID (nullable) | null ถ้ามาจาก LINE |
| user_name | text | |
| type | text | 'Sick','Personal','Vacation','Marriage','Funeral','Ordination','Maternity','Sterilization','Training' |
| date | date | วันเริ่มลา |
| end_date | date (nullable) | null = ลาวันเดียว |
| start_time | text (nullable) | |
| end_time | text (nullable) | |
| reason | text | |
| status | text | 'Pending', 'Approved', 'Rejected' |
| created_at | timestamptz | |

### 4. attendance_requests
| Column | Type | Note |
|--------|------|------|
| id | UUID (pk) | |
| user_id | UUID | |
| user_name | text | |
| date | date | วันที่ขอชี้แจง |
| reason | text | |
| image_url | text (nullable) | |
| status | text | 'Pending', 'Approved', 'Rejected' |
| created_at | timestamptz | |

### 5. projects
| Column | Type | Note |
|--------|------|------|
| id | serial (pk) | |
| name | text | |
| description | text | |
| status | text | |
| created_at | timestamptz | |

### 6. tasks
| Column | Type | Note |
|--------|------|------|
| id | serial (pk) | |
| title | text | |
| description | text | |
| assignee | text | |
| status | text | 'To Do', 'In Progress', 'Done' |
| priority | text | 'Low', 'Medium', 'High' |
| due_date | date (nullable) | |
| project_id | integer (nullable) | |
| created_at | timestamptz | |

### 7. meetings
| Column | Type | Note |
|--------|------|------|
| id | serial (pk) | |
| title | text | |
| description | text | |
| date | date | |
| start_time | text | |
| end_time | text | |
| location | text | |
| created_at | timestamptz | |

### 8. calendar_events
| Column | Type | Note |
|--------|------|------|
| id | serial (pk) | |
| title | text | |
| date | date | |
| type | text | 'holiday', 'event', 'reminder' |
| description | text (nullable) | |
| created_at | timestamptz | |

---

## Project Structure

```
project/
├── index.html                    # Main SPA (ทุกอย่างอยู่ในไฟล์เดียว)
├── package.json                  # { "type": "module", "dependencies": { "@supabase/supabase-js": "^2" } }
├── vercel.json                   # Cron jobs + function config
├── logo.png                      # Logo บริษัท
├── api/
│   ├── chat.js                   # Gemini chatbot endpoint
│   ├── quick-checkin.js          # Quick check-in page (เปิดจาก LINE)
│   ├── quick-checkout.js         # Quick check-out page (เปิดจาก LINE)
│   ├── line-webhook.js           # LINE OA webhook (Skynet chatbot)
│   ├── line-action.js            # Approve/reject leave จาก LINE
│   ├── notify-leave.js           # Push ใบลาแจ้ง admin ผ่าน LINE
│   └── cron/
│       ├── checkin-reminder.js   # Broadcast เตือนเช็คอิน (09:00 จ-ศ)
│       ├── checkout-reminder.js  # Broadcast เตือนเช็คเอาท์ (18:30 จ-ศ)
│       └── auto-absent.js        # ตัดขาดงานอัตโนมัติ (13:00 จ-ศ)
```

---

## Features — Employee

1. **Dashboard**: สรุปข้อมูลวันนี้ — ใครมาแล้ว, ใครลา, สถิติ
2. **Check-in/out**: ลงเวลาเข้า-ออกงาน
   - หลัง 09:40 = สถานะ "สาย"
   - มี location tracking (Honor System)
3. **Leave Request**: ขอลา 9 ประเภท + ดูโควตาคงเหลือ
   - Sick (30 วัน), Personal (6 วัน), Vacation (ตาม quota)
4. **Calendar**: ปฏิทินรายเดือน + วันหยุด + event
5. **Team**: ดูสมาชิกทีม + ตำแหน่ง
6. **Projects**: จัดการโปรเจค
7. **Tasks**: จัดการงาน (To Do / In Progress / Done)
8. **Meetings**: บันทึกการประชุม
9. **AI Chatbot (Skynet)**: คุยได้ทุกเรื่อง + สั่งลาผ่านแชทได้
10. **Attendance Report**: ดูประวัติการลงเวลา + export CSV

## Features — Admin

1. **Employee Management**: เพิ่ม/ลบ/แก้ไข + ตั้ง role + ตั้ง leave quota
2. **Leave Approval**: อนุมัติ/ปฏิเสธใบลา + ดูทุกสถานะ + ลบได้
3. **Attendance Requests**: อนุมัติคำชี้แจง
4. **Attendance Report**: ดูรายงานทุกคน สรุป สาย/ขาด/ลา

## Features — LINE OA

1. **Skynet Chatbot**: ตอบทุกข้อความ ใช้ Gemini AI + ข้อมูลงานจริง
2. **แจ้งลาผ่าน LINE**: พิมพ์ "ขอลาป่วยพรุ่งนี้" → บันทึกลง DB + แจ้ง admin
3. **Admin อนุมัติ/ปฏิเสธ**: กดปุ่มใน LINE Flex Message ได้เลย
4. **Quick Check-in**: ลิ้งค์เช็คอินจาก LINE (login ครั้งแรก จำไว้ครั้งต่อไป)
5. **Quick Check-out**: ลิ้งค์เช็คเอาท์จาก LINE
6. **เตือนเช็คอิน 09:00**: Broadcast ทุกวันจันทร์-ศุกร์ + แจ้งคนลาวันนี้
7. **เตือนเช็คเอาท์ 18:30**: Broadcast ทุกวันจันทร์-ศุกร์
8. **Auto-Absent 13:00**: ไม่เช็คอินก่อนบ่ายโมง = ขาดงานอัตโนมัติ
9. **Typing Animation**: แสดง "กำลังพิมพ์..." ระหว่างรอ AI ตอบ

---

## Vercel Cron Jobs (vercel.json)

| Path | Schedule (UTC) | เวลาไทย | ทำอะไร |
|------|---------------|---------|--------|
| /api/cron/checkin-reminder | 0 2 * * 1-5 | 09:00 จ-ศ | ส่งลิ้งค์เช็คอิน + แจ้งคนลา |
| /api/cron/auto-absent | 0 6 * * 1-5 | 13:00 จ-ศ | ตัดขาดงานอัตโนมัติ |
| /api/cron/checkout-reminder | 30 11 * * 1-5 | 18:30 จ-ศ | ส่งลิ้งค์เช็คเอาท์ |

---

## Environment Variables (ตั้งใน Vercel Dashboard)

| Variable | ค่าตัวอย่าง | คำอธิบาย |
|----------|------------|----------|
| SUPABASE_URL | https://xxxxx.supabase.co | URL ของ Supabase project |
| SUPABASE_SERVICE_ROLE_KEY | eyJxxx... | Service Role Key (ไม่ใช่ Anon Key) |
| LINE_CHANNEL_ACCESS_TOKEN | xxxxx | Token จาก LINE Developers Console |
| LINE_ADMIN_USER_ID | Uxxxxx | LINE User ID ของ Admin ที่จะรับแจ้งเตือน |
| GEMINI_API_KEY | AIzaxxxxx | Google Gemini API Key |

---

## สิ่งที่ต้องแก้ไขเมื่อ Duplicate

เมื่อ duplicate โปรเจคนี้ไปใช้กับบริษัทอื่น ต้องแก้ค่าเหล่านี้ใน index.html:

1. **SUPABASE_URL** — URL ของ Supabase project ใหม่
2. **SUPABASE_KEY** — Anon Key ของ Supabase project ใหม่
3. **ADMIN_EMAIL** — อีเมลของ Admin คนใหม่
4. **OFFICE_LOCATION** — พิกัด lat/lng ของออฟฟิศ
5. **MAX_DIST** — ระยะทาง geofence (เมตร)
6. **ชื่อ CEO ที่ยกเว้น** ใน api/cron/auto-absent.js — exemptNames array
7. **ชื่อบริษัท** — เปลี่ยน "Fortal Interactive" เป็นชื่อบริษัทใหม่
8. **Logo** — เปลี่ยน logo.png
9. **วันหยุดประจำปี** — อัพเดทใน calendar section ของ index.html
10. **Chatbot ชื่อ/บุคลิก** — แก้ system prompt ใน sendChatMessage และ line-webhook.js

---

## LINE OA Setup

1. สร้าง LINE OA ที่ LINE Official Account Manager
2. เปิด Messaging API ที่ LINE Developers Console
3. ตั้ง Webhook URL: `https://[your-domain].vercel.app/api/line-webhook`
4. เปิด "Use webhook" = ON
5. ปิด "Auto-reply messages" = OFF
6. ปิด "Greeting messages" = OFF (ถ้าต้องการให้ bot ตอบเอง)
7. Copy Channel Access Token → ใส่ใน Vercel env `LINE_CHANNEL_ACCESS_TOKEN`
8. หา Admin LINE User ID → ใส่ใน Vercel env `LINE_ADMIN_USER_ID`

---

## Quick Deploy Steps

1. Fork/Clone repo
2. สร้าง Supabase project ใหม่ → สร้าง 8 tables ตาม schema ด้านบน
3. สร้าง LINE OA + เปิด Messaging API
4. สร้าง Gemini API Key
5. Deploy ไป Vercel → ตั้ง Environment Variables
6. แก้ค่า hardcoded ใน index.html (Supabase URL/Key, Admin Email, Office Location)
7. แก้ค่า hardcoded ใน api/quick-checkin.js และ api/quick-checkout.js (Supabase URL/Key)
8. ตั้ง LINE Webhook URL → เปิด Use webhook
9. ทดสอบ: เช็คอิน, ขอลา, LINE bot, cron jobs
```

---

## License

MIT — ใช้ได้อิสระ เอาไป duplicate ได้เลย
