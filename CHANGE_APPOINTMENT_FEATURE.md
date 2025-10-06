# Chức năng Thay đổi Lịch hẹn Khám

## Tổng quan

Hệ thống quản lý yêu cầu thay đổi lịch hẹn khám cho phép bệnh nhân gửi yêu cầu và lễ tân xử lý phê duyệt theo quy trình kiểm soát chặt chẽ.

## Quy trình Hoạt động

### 1. Bệnh nhân (User) - Gửi yêu cầu

**Điều kiện gửi yêu cầu:**

- Lịch hẹn chưa quá hạn (phải trong tương lai)
- Báo trước ít nhất 2 giờ
- Không vượt quá 3 lần đổi lịch/tháng
- Lịch hẹn chưa có trạng thái "đã khám"

**Form yêu cầu bao gồm:**

- Thông tin bệnh nhân (tự động điền từ hệ thống)
  - Mã hồ sơ
  - Tên bệnh nhân
  - Tuổi
  - Địa chỉ
  - CCCD
- Thông tin lịch hẹn hiện tại
- Lịch hẹn mới mong muốn:
  - Ngày khám mới
  - Giờ khám mới
  - Bác sĩ (mặc định giữ nguyên)
  - Chuyên khoa (mặc định giữ nguyên)
- Lý do thay đổi:
  - Bận việc đột xuất
  - Thay đổi lịch làm việc
  - Vấn đề sức khỏe khẩn cấp
  - Điều kiện thời tiết xấu
  - Vấn đề gia đình
  - Khác (yêu cầu nhập chi tiết)

### 2. Lễ tân - Xử lý yêu cầu

**Quy trình kiểm duyệt:**

1. **Kiểm tra hồ sơ bệnh nhân:**

   - Xác minh thông tin bệnh nhân
   - Kiểm tra lịch sử khám bệnh
   - Xác nhận tình trạng lịch cũ

2. **Kiểm tra tính khả thi:**

   - Kiểm tra lịch bác sĩ có trống không
   - Xác minh chuyên khoa phù hợp
   - Kiểm tra quy định đổi lịch:
     - Số lần đổi lịch trong tháng
     - Thời gian báo trước
     - Lịch làm việc của bác sĩ

3. **Quyết định:**
   - **Duyệt:** Cập nhật lịch hẹn trong hệ thống
   - **Từ chối:** Ghi rõ lý do từ chối

## Database Schema

### Model: YeuCauThayDoiLichHen

```javascript
{
  // Thông tin bệnh nhân
  userId: ObjectId,           // Người gửi yêu cầu
  benhNhanId: ObjectId,       // Bệnh nhân
  maHoSo: String,
  tenBenhNhan: String,
  tuoi: Number,
  diaChi: String,
  cccd: String,

  // Lịch hẹn cũ
  lichHenCuId: ObjectId,
  ngayHenCu: Date,
  gioHenCu: String,
  bacSiCu: ObjectId,
  chuyenKhoaCu: ObjectId,

  // Lịch hẹn mới
  ngayHenMoi: Date,
  gioHenMoi: String,
  bacSiMoi: ObjectId,
  chuyenKhoaMoi: ObjectId,

  // Lý do và trạng thái
  lyDoThayDoi: String,
  lyDoKhac: String,
  trangThai: String,          // cho_duyet, da_duyet, tu_choi, huy

  // Thông tin xử lý
  nguoiXuLy: ObjectId,
  ngayXuLy: Date,
  ghiChuXuLy: String,
  lyDoTuChoi: String,

  // Kiểm tra tính khả thi
  kiemTraKhaThi: {
    lichBacSiTrong: Boolean,
    chuyenKhoaPhuHop: Boolean,
    quiDinhDoiLich: Boolean,
    soLanDoiLich: Number,
    thoiGianBaoTruoc: Number
  }
}
```

## API Endpoints

### For Patients (Users)

- `GET /api/change-appointment/my-requests` - Lấy danh sách yêu cầu của mình
- `POST /api/change-appointment/create` - Tạo yêu cầu mới
- `GET /api/change-appointment/appointment/:id` - Lấy thông tin lịch hẹn
- `DELETE /api/change-appointment/:id` - Hủy yêu cầu chờ duyệt

### For Reception Staff

- `GET /api/change-appointment/pending` - Lấy danh sách yêu cầu chờ duyệt
- `PUT /api/change-appointment/process/:id` - Duyệt/từ chối yêu cầu

## Frontend Components

### User Interface

1. **ChangeAppointmentRequest.jsx** - Form gửi yêu cầu thay đổi
2. **ChangeAppointmentRequests.jsx** - Danh sách yêu cầu của bệnh nhân

### Reception Interface

3. **ChangeAppointmentManagement.jsx** - Quản lý yêu cầu cho lễ tân

### Updated Components

4. **History.jsx** - Thêm nút "Yêu cầu thay đổi" cho mỗi lịch hẹn
5. **ReceptionLayout.jsx** - Thêm menu "Yêu cầu đổi lịch"

## Routes Configuration

### App.jsx Routes

```javascript
// User routes
<Route path="/user/change-appointment/:appointmentId" element={<ChangeAppointmentRequest />} />
<Route path="/user/change-appointment-requests" element={<ChangeAppointmentRequests />} />

// Reception routes
<Route path="change-appointments" element={<ChangeAppointmentManagement />} />
```

## Quy định và Ràng buộc

### Quy tắc nghiệp vụ:

1. **Thời gian:** Phải báo trước ít nhất 2 giờ
2. **Số lần:** Tối đa 3 lần đổi lịch/tháng/bệnh nhân
3. **Trạng thái:** Chỉ đổi được lịch hẹn chưa "đã khám"
4. **Thời hạn:** Chỉ đổi được lịch hẹn trong tương lai

### Kiểm tra tự động:

- Lịch bác sĩ có trống không
- Bác sĩ có làm việc ngày đó không
- Chuyên khoa có phù hợp không
- Đủ điều kiện theo quy định không

## Thông báo và Trạng thái

### Trạng thái yêu cầu:

- 🟡 **cho_duyet** - Chờ lễ tân xử lý
- 🟢 **da_duyet** - Đã được duyệt và cập nhật lịch
- 🔴 **tu_choi** - Bị từ chối với lý do cụ thể
- ⚫ **huy** - Bệnh nhân tự hủy yêu cầu

### Thông báo:

- Email/SMS thông báo kết quả xử lý
- Hiển thị trạng thái real-time trong hệ thống
- Lưu trữ lịch sử cho việc tra cứu sau này

## Bảo mật và Phân quyền

- **Bệnh nhân:** Chỉ xem/tạo/hủy yêu cầu của mình
- **Lễ tân:** Xem tất cả yêu cầu, có quyền duyệt/từ chối
- **Admin:** Toàn quyền quản lý hệ thống
- **Audit log:** Ghi lại mọi thay đổi quan trọng

Hệ thống đảm bảo tính minh bạch, truy xuất được và tuân thủ quy trình y tế.
