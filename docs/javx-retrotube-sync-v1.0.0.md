# JAVX RetroTube Sync v1.0.0

เอกสารนี้สรุปสิ่งที่ถูกสร้างจริงในเวอร์ชัน `1.0.0` สำหรับใช้งานร่วมกับ WordPress + RetroTube

## ไฟล์สำคัญ

- source plugin: `wordpress-plugin/javx-retrotube-sync`
- zip สำหรับติดตั้ง: `dist/javx-retrotube-sync-1.0.0.zip`

## ความสามารถหลัก

- เชื่อมต่อ API ด้วย `Bearer token`
- sync incremental อัตโนมัติผ่าน WP-Cron
- full import ครั้งแรกแบบ batch พร้อม progress bar, percent, counts และ logs
- upsert แบบ idempotent ด้วย source video id + source updated_at
- ตั้งค่า mapping meta key ให้สอดคล้องกับ RetroTube ได้
- รองรับทั้ง `playback_url` และ `embed_url`
- sideload รูป thumbnail เป็น featured image ได้
- สร้างหรือผูก taxonomy `pornstar` ได้

## Endpoint ฝั่ง source ที่ปลั๊กอินใช้

- `GET /api/plugin/videos`
- `GET /api/plugin/videos/:id`
- `GET /api/plugin/videos/sync`
- `POST /api/plugin/videos/sync`

route เหล่านี้ถูกทำให้เป็น plugin-facing contract โดยตรงแล้ว:

- บังคับ auth
- รับ API token จาก `Authorization: Bearer <token>`
- กรองเฉพาะ `status=READY`
- กรองเฉพาะ `visibility=PUBLIC`
- กรองเฉพาะไฟล์ MP4
- ปิด cache ฝั่ง response
- รองรับ `page`, `per_page`, `since`, `order`, `search`, `categorySlug`, `pornstarSlug`, `tagSlug`

## ค่าตั้งต้นที่แนะนำกับ RetroTube

- Batch size: `20`
- Sync interval: `10 นาที`
- Import mode: `Playback URL`
- Target post type: `post`
- Category taxonomy: `category`
- Tag taxonomy: `post_tag`
- Pornstar taxonomy: `pornstar`
- Playback meta key: `video_url`
- Embed meta key: `embed_url`
- Duration meta key: `duration`

หมายเหตุ: ใน repo นี้ไม่มี source ของ theme RetroTube จริง จึงยังไม่สามารถยืนยัน meta key เฉพาะของ theme ได้ 100% ปลั๊กอินจึงทำเป็น configurable adapter

## วิธีใช้งานจริง

1. สร้าง API token จากหลังบ้าน JAVX
2. ติดตั้งไฟล์ zip ใน WordPress
3. เปิดเมนู `JAVX Sync`
4. ใส่ `API Base URL` และ `API Token`
5. ตั้งค่า mapping ให้ตรงกับ RetroTube site ปลายทาง
6. กด `Test Connection`
7. กด `Start Full Import` ครั้งแรก
8. หลัง import แรกเสร็จ ปลั๊กอินจะใช้ WP-Cron ทำ incremental sync ตาม interval ที่ตั้งไว้

## การตรวจสอบก่อนเผยแพร่

ตรวจแล้ว:

- PHP lint ผ่านทุกไฟล์ในปลั๊กอิน
- JavaScript syntax ของ admin UI ผ่าน
- TypeScript ของ route ใหม่ไม่เพิ่ม error ใหม่ใน repo

ยังไม่ได้ตรวจในรอบนี้:

- ติดตั้งลง WordPress instance จริงพร้อม theme RetroTube จริง
- ยืนยัน meta key เฉพาะของ RetroTube แต่ละเวอร์ชัน

## สิ่งที่ควรทดสอบบนเว็บปลายทางก่อน production จริง

- theme ใช้ post type อะไรสำหรับวิดีโอ
- theme อ่านค่าจาก meta key ใดสำหรับ playback หรือ embed
- ถ้าใช้ remote MP4, player ของ theme รองรับ CORS/remote source หรือไม่
- thumbnail sideload ทำงานบน hosting ปลายทางหรือไม่
- cron ของเว็บปลายทางถูกเรียกจริงหรือควรใช้ real cron trigger
