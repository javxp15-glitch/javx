# WP Plugin Integration Audit for RetroTube

เอกสารนี้สรุป endpoint ที่มีอยู่จริงในโปรเจค `javx-main`, ช่องโหว่/ข้อจำกัดที่มีผลกับ WordPress sync และแนวทางออกแบบปลั๊กอินสำหรับธีม RetroTube

## 1. Endpoint ที่มีอยู่จริง

จากโค้ดใน `app/api` ปัจจุบันมี route หลักดังนี้

### ชุดที่เกี่ยวข้องกับ WordPress มากที่สุด

- `GET /api/videos/feed`
  ใช้ดึงรายการวิดีโอแบบ paginated และรองรับ `page`, `limit`, `per_page`, `since`, `sort`, `search`, `categorySlug`, `pornstarSlug`, `tagSlug`
- `GET /api/videos/:id`
  ใช้ดึงรายละเอียดวิดีโอรายตัว
- `GET /api/categories`
  ใช้ดึงหมวดหมู่ทั้งหมด
- `GET /api/tags`
  ใช้ดึง tag ทั้งหมด แต่ต้อง auth
- `GET /api/pornstars`
  ใช้ดึง pornstar ทั้งหมด แต่ต้อง auth
- `POST /api/admin/tokens`
  ใช้สร้าง API token สำหรับเชื่อมต่อ
- `GET /api/admin/tokens`
  ใช้ดูรายการ token
- `PATCH /api/admin/tokens/:id`
  ใช้แก้ชื่อ token / วันหมดอายุ
- `POST /api/plugin/videos/sync`
  ตอนนี้เป็นแค่ endpoint ตอบรับว่า “sync acknowledged” ยังไม่ทำ sync จริง

### ชุดหลังบ้านอื่น ๆ

- `POST /api/videos`
- `POST /api/videos/bulk`
- `PUT /api/videos/:id`
- `DELETE /api/videos/:id`
- `POST /api/upload`
- `GET/POST/PUT/DELETE` สำหรับ categories, tags, pornstars, domains
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET/PUT /api/users/me`
- `PUT /api/users/me/password`
- `GET /api/embed/:id`
- `GET /api/proxy/video/:id`

## 2. Endpoint ที่ควรใช้กับปลั๊กอิน

ถ้าจะทำ WordPress sync ตอนนี้ endpoint ที่ใกล้เคียงที่สุดคือ:

### 2.1 `GET /api/videos/feed`

เหมาะสำหรับ:

- incremental sync
- full import แบบแบ่งหน้า
- ดึงข้อมูลเป็น batch ละ 20 รายการ

payload ที่ route นี้คืนตอนถูกมองว่าเป็น plugin request:

```json
{
  "data": [
    {
      "id": "cuid",
      "title": "Video title",
      "slug": "video-slug",
      "description": "",
      "video_url": "https://cdn.example.com/media-storage/x.mp4",
      "embed_url": "/embed/cuid",
      "playback_url": "https://cdn.example.com/media-storage/x.mp4",
      "thumbnail_url": "https://cdn.example.com/media-storage/x.jpg",
      "duration": 1234,
      "categories": ["Category A"],
      "pornstars": [{ "name": "Name", "slug": "name" }],
      "tags": ["Tag A", "Tag B"],
      "created_at": "2026-03-07T00:00:00.000Z",
      "updated_at": "2026-03-07T00:00:00.000Z",
      "views": 100,
      "uploader": "System",
      "rating": "99%"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5,
    "next_page": 2,
    "has_more": true
  }
}
```

query ที่แนะนำให้ปลั๊กอินเรียก:

```text
GET /api/videos/feed?per_page=20&page=1&since=2026-03-01T00:00:00.000Z
Authorization: Bearer <api_token>
User-Agent: WP-RetroTube-Sync/1.0
```

### 2.2 `GET /api/videos/:id`

เหมาะสำหรับ:

- ดึงรายละเอียดรายตัวเมื่ออยากรีเช็ควิดีโอที่ผิดพลาด
- fallback ถ้ารายการใน feed มีข้อมูลไม่พอ

แต่ไม่ควรใช้เป็นวิธีหลักสำหรับ sync จำนวนมาก เพราะ route นี้เพิ่ม view count ทุกครั้งที่ถูกเรียก

## 3. สิ่งที่ตรวจพบว่าต้องแก้ก่อนใช้จริง

### 3.1 requirement เรื่อง token auth ยังไม่ผ่าน

`GET /api/videos/feed` ใช้ `verifyAuthEdge()` แบบ optional และรองรับเฉพาะ JWT ไม่รองรับ API token โดยตรง

ผลคือ:

- route นี้ยังไม่บังคับ token
- ถ้าส่ง query อย่าง `per_page`, `project_id`, `since` ก็จะได้รูปแบบ response สำหรับ plugin
- requirement ข้อ 3 ที่ต้องใช้ token key ยังไม่ครบ

### 3.2 visibility และ status filter ถูกปลดไว้ชั่วคราว

ใน route feed มี comment ว่าเดิมจะกรอง `status: "READY"` และ visibility logic แต่ตอนนี้ถูกปิดไว้

ผลคือ:

- plugin อาจเห็นวิดีโอเกินสิทธิ์
- plugin อาจได้วิดีโอที่ยังไม่พร้อมจริง

### 3.3 เอกสาร API ปัจจุบันไม่ตรงกับโค้ด

ไฟล์ `docs/API.md` และ `README.md` ระบุว่ามี `GET /api/videos` แต่โค้ดจริงใน `app/api/videos/route.ts` มีแค่ `POST`

endpoint list สำหรับ plugin ตอนนี้จึงต้องยึดจากโค้ด ไม่ใช่เอกสารเก่า

### 3.4 feed ถูก cache ไว้ 600 วินาที

ใน `GET /api/videos/feed` ใช้ Prisma Accelerate cache `ttl: 600, swr: 600`

ผลคือ:

- sync อัตโนมัติอาจเห็นข้อมูลช้ากว่าของจริงได้ประมาณ 10 นาที
- ถ้าต้องการ “เห็นคลิปล่าสุดเร็ว” ควรลด cache หรือ bypass cache สำหรับ plugin request

### 3.5 incremental sync ใช้ `since=updatedAt` แต่ sort ตาม `createdAt`

ตอนส่ง `since` route จะกรอง `updatedAt > since` แต่ยัง sort ตาม `createdAt`

ผลคือ:

- ถ้าวิดีโอเก่าถูกแก้ไขใหม่ จะยังถูกดึงมาได้ แต่ลำดับไม่ stable สำหรับการเลื่อน cursor แบบง่าย
- ปลั๊กอินต้องอัปเดต cursor หลังจบทุกหน้า ไม่ใช่หลังหน้าแรก
- ทางที่ถูกกว่าคือ backend ควร sort ด้วย `updatedAt ASC, id ASC` หรือ `updatedAt DESC, id DESC`

### 3.6 `GET /api/videos/:id` เพิ่ม view count ตอน sync

ถ้าปลั๊กอินใช้ endpoint รายตัวจำนวนมาก สถิติ view จะเพี้ยน เพราะ route นี้ increment view ก่อนคืนข้อมูล

### 3.7 `POST /api/plugin/videos/sync` ยังเป็น placeholder

route นี้ยังไม่มีระบบ queue, job, status, หรือ batch sync จริง จึงยังใช้ทำ progress-based import ไม่ได้

### 3.8 ยังไม่มีแนวทาง sync deletion

ระบบ source เป็น hard delete และไม่มี `deleted_at` หรือ `deleted_since`

ผลคือ:

- ถ้าต้นทางลบวิดีโอ WP จะไม่รู้ว่าต้องลบ/ร่าง/ซ่อนโพสต์ไหน
- ถ้าต้องการ sync การลบ ควรมี soft delete หรือ endpoint สำหรับ deleted items

### 3.9 ยังไม่มี revoke endpoint สำหรับ token

schema มี `revokedAt` แต่ route admin token ปัจจุบันยังไม่มี action สำหรับ revoke โดยตรง

## 4. Endpoint ที่แนะนำสำหรับ production sync

ถ้าจะให้สอดคล้องกับ requirement ทั้ง 3 ข้อ ควรมี contract แบบนี้

### 4.1 `GET /api/plugin/videos`

ใช้สำหรับ list/sync โดยเฉพาะ

query:

- `page`
- `per_page` ควร clamp ไม่เกิน `20` หรือ `50`
- `since`
- `order=updated_asc`

กฎ:

- บังคับ `Authorization: Bearer <api_token>`
- รองรับ API token แบบเดียวกับ `getUserFromRequest()`
- กรองเฉพาะ `status=READY`
- กรองเฉพาะ `visibility=PUBLIC` หรือเปิดให้กำหนด policy ชัดเจน
- ปิด cache หรือใช้ cache ต่ำมากสำหรับ plugin request
- คืน `source_cursor` กลับมาด้วย เช่นค่าของ `updated_at` ล่าสุดใน batch

response ที่แนะนำ:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "has_more": true,
    "next_page": 2
  },
  "cursor": {
    "next_since": "2026-03-07T12:34:56.000Z"
  }
}
```

### 4.2 `GET /api/plugin/videos/:id`

ใช้ดึงรายตัวแบบไม่ increment views และไม่คืน signed URL

### 4.3 `POST /api/plugin/sync/session`

ถ้าต้องการให้ backend เป็นคนสร้าง session สำหรับ progress UI

แต่ถ้าจะทำให้เรียบง่าย ปลั๊กอินสามารถจัดการ progress เองโดยไม่ต้องมี endpoint นี้ก็ได้

### 4.4 `PATCH /api/admin/tokens/:id`

ควรขยายให้รองรับ revoke token เช่น

```json
{ "revokedAt": "2026-03-07T00:00:00.000Z" }
```

หรือเพิ่ม `DELETE /api/admin/tokens/:id`

## 5. แนวทางออกแบบปลั๊กอิน WordPress สำหรับ RetroTube

## 5.1 เป้าหมาย

ปลั๊กอินต้องทำ 2 งานหลัก

- sync วิดีโอใหม่/อัปเดตอัตโนมัติจาก source API
- full import ครั้งแรกแบบ batch พร้อม progress bar

## 5.2 สถาปัตยกรรมฝั่งปลั๊กอิน

แนะนำแยกเป็น 6 ส่วน

### A. Settings

ตั้งค่าผ่านหน้า admin:

- Source API base URL
- API token
- Batch size ค่า default `20`
- Sync interval เช่นทุก `5` หรือ `10` นาที
- โหมดการ map วิดีโอ
  - `playback_url` mode
  - `embed_url` mode
- target post type ค่า default ควรตั้งได้
- mapping ของ meta key ฝั่ง RetroTube

### B. Sync State

เก็บใน `wp_options`

- `javx_sync_last_since`
- `javx_sync_last_page`
- `javx_sync_lock`
- `javx_sync_last_status`
- `javx_sync_last_error`
- `javx_sync_last_summary`

### C. Importer Service

หน้าที่:

- เรียก endpoint feed แบบแบ่งหน้า
- map วิดีโอเป็น post/taxonomy/meta
- upsert อย่าง idempotent

หลักการ match:

- ใช้ source `video.id` เป็น key หลัก
- เก็บใน post meta เช่น `_javx_source_video_id`
- เก็บ `_javx_source_updated_at`
- เก็บ `_javx_source_slug`

### D. WP Admin UI

มี 2 หน้าหลัก

- Settings
- Manual Sync / Full Import

หน้า Full Import ควรมี:

- ปุ่ม `Start Full Import`
- popup modal หรือ panel แสดง progress
- progress bar %
- ตัวเลข `processed / total`
- current page
- success count
- updated count
- skipped count
- error count
- log ล่าสุด 10-20 รายการ

### E. AJAX/REST Layer ใน WP

เช่น

- `wp_ajax_javx_test_connection`
- `wp_ajax_javx_start_full_sync`
- `wp_ajax_javx_run_sync_batch`
- `wp_ajax_javx_run_incremental_sync`
- `wp_ajax_javx_cancel_sync`

### F. Cron Worker

ใช้ WP-Cron สำหรับ incremental sync

- ทุก 5 หรือ 10 นาที
- ล็อกกันรันซ้อน
- ดึงเฉพาะ `since=last_since`

## 5.3 วิธี map ข้อมูลเข้า RetroTube

เนื่องจากใน repo นี้ไม่มีไฟล์ theme RetroTube จึงยังระบุ meta key ของ theme ไม่ได้แบบชัวร์ 100%

ดังนั้นปลั๊กอินควรออกแบบเป็น adapter ที่ configurable ได้

field mapping กลาง:

- post title <= `title`
- post content <= `description`
- post name/slug <= `slug`
- featured image <= `thumbnail_url`
- categories <= `categories`
- post tags <= `tags`
- custom taxonomy `pornstar` หรือ post meta <= `pornstars`
- source id <= `_javx_source_video_id`
- source updated_at <= `_javx_source_updated_at`
- source playback_url <= `_javx_source_playback_url`
- source embed_url <= `_javx_source_embed_url`

โหมดที่แนะนำ:

### โหมด A: `playback_url`

ใช้เมื่อ RetroTube รองรับ self-hosted หรือ remote MP4 URL

ข้อดี:

- เล่นไฟล์ตรง
- render เร็ว
- ไม่พึ่ง iframe

ข้อควรระวัง:

- ต้องรู้ meta key ของ theme ให้ถูก
- ถ้า theme บังคับ local upload อาจต้องมี adapter เพิ่ม

### โหมด B: `embed_url`

ใช้หน้า `https://source-domain.com/embed/<id>` เป็น embed player

ข้อดี:

- integration ง่าย
- ปล่อยให้ระบบต้นทางดูแล player/domain restrictions

ข้อควรระวัง:

- ต้องประกอบเป็น absolute URL เอง เพราะ feed คืน `embed_url` เป็น relative path
- ต้องตรวจว่า RetroTube ฟิลด์ embed รองรับ URL/iframe แบบใด

สำหรับ requirement ปัจจุบัน แนะนำเริ่มที่ `playback_url` ก่อน ถ้า theme รับ remote MP4 ได้

## 5.4 Workflow ที่ตอบโจทย์ requirement

### Incremental sync อัตโนมัติ

1. WP Cron อ่าน `javx_sync_last_since`
2. เรียก `GET /api/videos/feed?per_page=20&page=1&since=<cursor>`
3. วนทุกหน้าให้ครบ
4. แต่ละรายการ:
   - หา post จาก `_javx_source_video_id`
   - ถ้าไม่เจอ ให้ create
   - ถ้าเจอและ `updated_at` ใหม่กว่า `_javx_source_updated_at` ให้ update
   - ถ้าเท่ากัน ให้ skip
5. หลังจบทุกหน้า ค่อยอัปเดต `javx_sync_last_since` เป็นค่าสูงสุดของ `updated_at` ที่ประมวลผลสำเร็จ

### Full import ครั้งแรก

1. Admin กด `Start Full Import`
2. WP เปิด session sync และคำนวณ progress state
3. Frontend ยิง AJAX batch ละ 1 หน้า
4. แต่ละ batch ดึง `per_page=20`
5. UI อัปเดต progress bar ตาม `processed / total`
6. ถ้า error ให้ retry ได้เฉพาะ batch ที่พลาด

## 5.5 ขนาด batch ที่แนะนำ

ค่าที่เหมาะกับ requirement นี้คือ `20`

เหตุผล:

- ปลอดภัยกับ shared hosting / PHP memory limit
- ลด timeout ของทั้งฝั่ง WP และ source API
- progress bar เดินลื่นและ retry ง่าย

ถ้าโฮสต์แรงพอ ค่อยขยับเป็น `30-50`

## 5.6 Idempotency และความเสถียร

ปลั๊กอินต้องมี:

- lock ไม่ให้กด full import ซ้อน
- retry 1-3 ครั้งเมื่อ network timeout
- exponential backoff สั้น ๆ
- log รายการที่ fail
- manual re-run เฉพาะ failed items

## 6. ข้อเสนอ implementation order

ลำดับที่แนะนำ

1. แก้ backend feed ให้บังคับ API token และกรอง `READY + visibility`
2. ลด/ปิด cache สำหรับ plugin request
3. เพิ่ม dedicated plugin feed endpoint หรืออย่างน้อย harden `GET /api/videos/feed`
4. ทำ WP plugin settings + connection test
5. ทำ incremental sync
6. ทำ full import + progress modal
7. เพิ่ม delete/revoke support ภายหลัง

## 7. สรุปสั้น

สิ่งที่ใช้ได้แล้ว:

- สร้าง API token ได้
- ดึงรายการวิดีโอแบบแบ่งหน้าได้
- มี field `updated_at` สำหรับทำ incremental sync

สิ่งที่ยังไม่พร้อมสำหรับ production:

- feed ยังไม่ enforce token แบบที่ requirement ต้องการ
- docs API ยังไม่ตรงกับโค้ด
- plugin sync endpoint ยังเป็น placeholder
- ยังไม่มี strategy สำหรับ deletion และ token revoke

ถ้าจะเชื่อมกับ RetroTube ให้เสถียร แนะนำออกแบบปลั๊กอินเป็น “sync adapter” ที่เก็บ source video id ไว้ใน post meta และรองรับการ map meta key ของ theme ได้จากหน้า settings
