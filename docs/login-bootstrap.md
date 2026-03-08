# Login Bootstrap

ถ้า login ไม่ได้ ให้ตรวจ 2 เรื่องก่อน:

## 1. ต้องมี environment

สร้าง `.env` หรือ `.env.local` จาก `env.example`

ค่าขั้นต่ำที่ต้องมี:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mediadb"
JWT_SECRET="change-this-secret"
```

## 2. ต้องมี user ในฐานข้อมูล

สร้าง admin user ด้วยคำสั่ง:

```bash
npm run user:create-admin -- --email admin@example.com --password 'admin123' --name 'Admin'
```

จากนั้น login ด้วย:

- email: `admin@example.com`
- password: `admin123`

ควรเปลี่ยนรหัสผ่านทันทีหลังเข้าได้แล้ว

## หมายเหตุ

- ถ้า DB ยังไม่ถูกสร้าง schema ให้รัน `npm run db:push` หรือ `npm run db:migrate` ก่อน
- route `POST /api/auth/register` ตอนนี้จะสร้าง `ADMIN` ได้เฉพาะ user คนแรกเท่านั้น
- ถ้า env หรือ DB ใช้งานไม่ได้ `POST /api/auth/login` จะตอบ `500` พร้อมข้อความชัดเจนขึ้น
