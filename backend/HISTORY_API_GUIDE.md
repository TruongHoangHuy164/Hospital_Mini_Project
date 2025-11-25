# Backend API Guide - Patient Medical History

## Overview
New endpoints to support viewing patient medical history with complete examination records, lab orders, and prescriptions.

---

## Endpoints Added

### 1. **Search Patients by Name/Phone**
```
GET /api/patients?q=name_or_phone
```

**Description:** Public endpoint to search patients by name or phone number (used by doctor to find patients for history view)

**Query Parameters:**
- `q` (string, required): Search query (name or phone)
- `limit` (number, optional): Max results (default: 20, max: 50)

**Response:**
```json
[
  {
    "_id": "64xyz123...",
    "hoTen": "Nguyễn Văn A",
    "soDienThoai": "0901234567",
    "ngaySinh": "1990-01-01",
    "gioiTinh": "Nam",
    "diaChi": "123 Đường ABC"
  }
]
```

**Frontend Usage:**
```javascript
const res = await fetch(`${API_URL}/api/patients?q=${encodeURIComponent(query)}`);
const patients = await res.json();
```

---

### 2. **Get Complete Patient Medical History**
```
GET /api/doctor/patients/:benhNhanId/history
```

**Description:** Get all medical examination records for a specific patient with complete details including clinical info, lab orders, and prescriptions

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `limit` (number, optional): Results per page (default: 100, max: 100)
- `page` (number, optional): Page number (default: 1)

**Response:**
```json
[
  {
    "_id": "65abc123...",
    "hoSoKhamId": "65abc123...",
    "benhNhanId": {
      "_id": "64xyz123...",
      "hoTen": "Nguyễn Văn A",
      "soDienThoai": "0901234567",
      "ngaySinh": "1990-01-01"
    },
    "bacSiId": {
      "_id": "63doc456...",
      "hoTen": "Bác sĩ B",
      "chuyenKhoa": "Tim mạch"
    },
    "trieuChung": "Đau ngực, khó thở",
    "khamLamSang": "Phổi trong lành",
    "sinhHieu": {
      "huyetAp": "120/80",
      "nhipTim": 72,
      "nhietDo": 37,
      "canNang": 70,
      "chieuCao": 175
    },
    "trangThai": "hoan_tat",
    "ngayKham": "2025-11-20T10:30:00Z",
    "chiDinh": [
      {
        "_id": "65lab789...",
        "loaiChiDinh": "Xét nghiệm máu",
        "dichVuId": {
          "_id": "65dv123...",
          "ten": "Xét nghiệm công thức máu",
          "gia": 150000,
          "chuyenKhoaId": {...}
        },
        "ketQua": "Hb: 14g/dl, WBC: 7.5...",
        "trangThai": "da_xong",
        "ghiChu": "Bình thường"
      }
    ],
    "donThuoc": [
      {
        "thuocId": {
          "_id": "65thuoc123...",
          "tenThuoc": "Aspirin",
          "donViTinh": "viên",
          "loaiThuoc": "Chống cảm",
          "gia": 5000
        },
        "soLuong": 30,
        "cachDung": "1 viên x 3 lần/ngày",
        "soNgay": 7,
        "ghi": "Uống sau ăn"
      }
    ]
  }
]
```

**Frontend Usage:**
```javascript
async function loadPatientHistory(benhNhanId){
  const res = await fetch(
    `${API_URL}/api/doctor/patients/${benhNhanId}/history`, 
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const history = await res.json();
  return history;
}
```

---

### 3. **Additional Search Endpoints (for future use)**

#### Get Patients by Date
```
GET /api/doctor/cases?date=YYYY-MM-DD
```

#### Get Patients by Month
```
GET /api/doctor/cases?year=2025&month=11
```

---

## Backend Files Modified

### `/backend/src/routes/doctorSelf.js`
- ✅ Added `GET /api/doctor/patients/:id/history` endpoint
- Enhanced to fetch complete history with lab orders and prescriptions
- Includes enrichment with related documents (chiDinh, donThuoc)

### `/backend/src/routes/patients.js`
- ✅ Added `GET /api/patients?q=...` public search endpoint
- Supports searching by name or phone number
- Used by frontend for patient discovery

---

## Database Models Used

- **HoSoKham** - Medical examination records
- **BenhNhan** - Patient info
- **BacSi** - Doctor info
- **CanLamSang** - Lab orders
- **DonThuoc** - Prescriptions

---

## Error Handling

All endpoints return errors in this format:
```json
{
  "message": "Error description"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error

---

## Authentication

- Endpoints under `/api/doctor/` require doctor authentication
- Public endpoints under `/api/patients/` are open but can be rate-limited if needed

---

## Testing

Use these curl commands to test:

```bash
# Search patients
curl "http://localhost:5000/api/patients?q=Nguyễn"

# Get patient history (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/doctor/patients/64xyz123.../history"
```

---

## Integration with Frontend

The frontend Dashboard.jsx now uses these endpoints:

1. **Search patients**: `GET /api/patients?q={query}`
2. **Load history**: `GET /api/doctor/patients/{benhNhanId}/history`

Both work seamlessly with the new "Xem lịch sử" (View History) tab.
