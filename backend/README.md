# Hospital Backend (Node.js, no MVC)

Simple Express server with minimal structure.

## Scripts

- `npm run dev` – start with nodemon on `http://localhost:5000`
- `npm start` – start with Node

## Setup

1. Copy `.env.example` to `.env` and adjust as needed
2. Install dependencies

```
npm install
```

3. Run

```
npm run dev
```

## MongoDB

Set `MONGODB_URI` in `.env`, e.g.:

```
MONGODB_URI=mongodb://127.0.0.1:27017/hospital_demo
```

Start local MongoDB (example, if you have MongoDB installed):

```
mongod --dbpath "C:\\data\\db"
```

Health check will include DB status at `GET /health`:

```
{
	"status": "up",
	"db": "connected"
}
```

## Endpoints

- `GET /` – base info
- `GET /health` – health check
- Patients CRUD under `/api/patients`
	- `POST /api/patients`
	- `GET /api/patients`
	- `GET /api/patients/:id`
	- `PUT /api/patients/:id`
	- `DELETE /api/patients/:id`

### Auth

- `POST /api/auth/register`
	- body: `{ "name": "User Name", "email": "user@example.com", "password": "secret123" }`
	- response: `{ user: { id, name, email, role }, accessToken, refreshToken }`

- `POST /api/auth/login`
	- body: `{ "email": "user@example.com", "password": "secret123" }`
	- response: `{ user: { id, name, email, role }, accessToken, refreshToken }`

- `GET /api/profile` (requires header `Authorization: Bearer <token>`)
	- response: `{ user: { id, email, name, iat, exp } }`

- `POST /api/auth/refresh`
	- body: `{ "refreshToken": "..." }`
	- response: `{ accessToken, refreshToken }` (rotation)

- `POST /api/auth/logout`
	- body: `{ "refreshToken": "..." }`
	- response: `{ message }` (revokes the provided refresh token)

- `POST /api/auth/forgot-password`
	- body: `{ "email": "user@example.com" }`
	- response: `{ message, resetToken }` (token returned for testing; normally emailed)

- `POST /api/auth/reset-password`
	- body: `{ "token": "...", "password": "newpass" }`
	- response: `{ message }`

Environment variables for auth:

```
JWT_SECRET=change_this_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=change_this_refresh_secret
REFRESH_TOKEN_EXPIRES_IN=30d
```

## Mini Clinic Database (7-step workflow)

Collections and relations:

- `BenhNhan` (patient)
	- Fields: `hoTen, ngaySinh, gioiTinh(nam|nu|khac), diaChi, soDienThoai`
	- Relations: 1–n with `SoThuTu`, 1–1 or 1–n with `BHYT`, 1–n with `HoSoKham`

- `SoThuTu` (queue ticket)
	- Fields: `benhNhanId -> BenhNhan, soThuTu, thoiGianDangKy, trangThai(dang_cho|da_goi|da_kham)`

- `BHYT` (health insurance)
	- Fields: `benhNhanId -> BenhNhan, maTheBHYT(unique), ngayBatDau, ngayHetHan, giayChuyenVien(boolean)`

- `PhongKham` (clinic room)
	- Fields: `tenPhong, chuyenKhoa`
	- Relations: 1–n with `BacSi`

- `BacSi` (doctor)
	- Fields: `hoTen, chuyenKhoa, phongKhamId -> PhongKham`

- `HoSoKham` (visit/encounter)
	- Fields: `benhNhanId -> BenhNhan, bacSiId -> BacSi, ngayKham, chanDoan, huongDieuTri(ngoai_tru|noi_tru|chuyen_vien|ke_don)`
	- Relations: 1–n with `CanLamSang`, `DonThuoc`, `ThanhToan`

- `CanLamSang` (para-clinical order)
	- Fields: `hoSoKhamId -> HoSoKham, loaiChiDinh(xet_nghiem|sieu_am|x_quang|ct|mri|dien_tim|noi_soi), ketQua, ngayThucHien`

- `ThanhToan` (payment)
	- Fields: `hoSoKhamId -> HoSoKham, soTien, hinhThuc(BHYT|tien_mat), ngayThanhToan`

- `DonThuoc` (prescription)
	- Fields: `hoSoKhamId -> HoSoKham, ngayKeDon`
	- Relations: 1–n with `CapThuoc`

- `Thuoc` (drug)
	- Fields: `tenThuoc, donViTinh, huongDanSuDung`

- `CapThuoc` (dispense)
	- Fields: `donThuocId -> DonThuoc, thuocId -> Thuoc, soLuong`

All schemas are defined under `src/models` with Mongoose refs and helpful indexes.

## Work Schedules (Lịch làm việc theo tháng cho mọi role)

Model: `WorkSchedule` (`src/models/WorkSchedule.js`)

Fields:
- `userId` -> `User`
- `role`: `doctor|reception|lab|cashier|nurse`
- `day`: Date (normalized 00:00)
 - `day`: String `YYYY-MM-DD` (date-only, tránh lệch timezone)
- `shift`: `sang|chieu|toi`
- `shiftType`: `lam_viec|truc|nghi` (default `lam_viec`)
- `clinicId` (optional)
- `reason`, `note`, `meta`

Indexes / constraints:
- Unique: `(userId, day, shift)`
- Compound: `(role, day)` for fast monthly queries

### Endpoints

All endpoints require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/work-schedules?month=YYYY-MM&role=&userId=` | admin + role users | Danh sách lịch trong tháng (lọc theo role hoặc user) |
| POST | `/api/work-schedules` | admin | Tạo lịch 1 ca |
| PUT | `/api/work-schedules/:id` | admin | Cập nhật lịch |
| DELETE | `/api/work-schedules/:id` | admin | Xóa lịch |
| POST | `/api/work-schedules/bulk` | admin | Bulk upsert nhiều lịch |
| GET | `/api/work-schedules/stats/summary?month=YYYY-MM&role=doctor` | admin | Thống kê số ca theo `shiftType` |
| GET | `/api/work-schedules/me/self?month=YYYY-MM` | doctor/reception/lab/cashier/nurse | Xem lịch cá nhân trong 1 tháng |

### Tạo 1 lịch

Request:
```
POST /api/work-schedules
{
	"userId": "...",
	"role": "doctor",
	"day": "2025-10-01",
	"shift": "sang",
	"shiftType": "lam_viec",
	"note": "Khám ngoại trú"
}
```

### Bulk upsert

```
POST /api/work-schedules/bulk
{
	"items": [
		{ "userId": "...", "role": "doctor", "day": "2025-10-01", "shift": "sang", "shiftType": "lam_viec" },
		{ "userId": "...", "role": "doctor", "day": "2025-10-01", "shift": "chieu", "shiftType": "truc" }
	],
	"upsert": true
}
```

Response: `{ ok: true, upserted: <n>, modified: <n> }`

### Lấy lịch tháng cá nhân

```
GET /api/work-schedules/me/self?month=2025-10
```

### Ghi chú
- Trường `day` lưu dạng chuỗi `YYYY-MM-DD` để loại bỏ sai lệch timezone.
- Tránh gửi trùng ca vì unique index sẽ trả 409.
- Có thể mở rộng thêm shift khác bằng cách cập nhật enum trong model và validations.
- Migration cũ sang string: chạy script `node src/scripts/migrateWorkScheduleDayToString.js`.
- Hệ thống hiện tại CHỈ cho phép tạo/cập nhật lịch cho THÁNG KẾ TIẾP (next month) so với thời điểm hiện tại. Các yêu cầu ngoài tháng này sẽ bị từ chối (HTTP 400).
