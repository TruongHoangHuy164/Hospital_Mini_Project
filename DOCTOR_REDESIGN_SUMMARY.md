# 🧑‍⚕️ BÁC SĨ (Doctor) - Redesign Summary

## Redesign Overview
Toàn bộ giao diện Doctor Dashboard đã được thiết kế lại theo workflow có tổ chức và trực quan hơn, tuân theo quy trình khám bệnh chuẩn.

---

## 📋 Workflow Chính (Main Workflow)

```
1. GỌI BỆNH NHÂN (Call Patient)
   ↓
2. KHÁM (Examination)
   ↓
3. TẠO CHỈ ĐỊNH (Create Referral/Lab Orders)
   ↓
4. XEM KẾT QUẢ (View Results)
   ↓
5. KÊ ĐƠN THUỐC (Prescription)
   ↓
6. WAITING_FOR_MEDICINE (Chờ lấy thuốc)
```

---

## 🎨 5 Tab Chính

### 1️⃣ **GỌI BỆNH NHÂN (Call Patient)**
- **Mục đích:** Quản lý hàng đợi bệnh nhân hôm nay
- **Chức năng:**
  - Hiển thị danh sách hàng đợi với STT, tên, năm sinh
  - Nút "Gọi tiếp" để tự động mở bệnh nhân tiếp theo
  - Thao tác cho từng bệnh nhân:
    - ✓ Tiếp nhận (Intake)
    - 🔔 Thông báo (Notify)
    - ⏭️ Bỏ qua (Skip)
  - Hiển thị trạng thái hiện tại của bệnh nhân

### 2️⃣ **KHÁM (Examination)**
- **Mục đích:** Ghi nhận thông tin lâm sàng
- **Chức năng:**
  - Nhập triệu chứng
  - Nhập kết quả khám lâm sàng
  - Ghi sinh hiệu:
    - Huyết áp
    - Nhịp tim
    - Nhiệt độ
    - Cân nặng
    - Chiều cao
  - Nút "Lưu thông tin" để lưu
  - Nút "Tạo chỉ định" để chuyển sang tab tiếp theo

### 3️⃣ **TẠO CHỈ ĐỊNH (Create Referral)**
- **Mục đích:** Tạo chỉ định cận lâm sàng (Lab, Siêu âm, etc.)
- **Chức năng:**
  - Tìm dịch vụ theo chuyên khoa
  - Tìm kiếm tên dịch vụ
  - Hiển thị danh sách dịch vụ với giá
  - Danh sách chỉ định đã tạo:
    - Tên dịch vụ
    - Trạng thái (Chờ thực hiện / Có kết quả)
    - Ghi chú
    - Nút xóa nếu chưa thực hiện
  - Tính tổng chi phí

### 4️⃣ **XEM KẾT QUẢ (View Results)**
- **Mục đích:** Xem kết quả từ LAB/Siêu âm
- **Chức năng:**
  - Hiển thị kết quả từ các chỉ định
  - Xem kết quả chi tiết và ghi chú
  - Lịch sử khám gần đây (5 lần gần nhất)
  - Read-only view

### 5️⃣ **KÊ ĐƠN THUỐC (Prescription)**
- **Mục đích:** Kê đơn thuốc và chuyển sang chờ lấy thuốc
- **Chức năng:**
  - Tìm thuốc theo tên
  - Lọc theo nhóm thuốc
  - Sắp xếp theo giá (↑ ↓)
  - Bảng kê đơn với các cột:
    - Tên thuốc
    - Số lượng (SL)
    - Liều lượng sáng/trưa/tối
    - Số ngày dùng
    - Ghi chú sử dụng (HDSD)
  - Hiển thị đơn đã kê trước đó (Accordion)
  - Nút "Lưu đơn → Chờ lấy thuốc" 
    - **Bệnh nhân tự động chuyển sang trạng thái WAITING_FOR_MEDICINE**

---

## 🎯 Trạng Thái Bệnh Nhân (Patient Status)

| Trạng thái | Icon | Ý nghĩa |
|-----------|------|--------|
| 🔴 Đang khám | Red | Đang được khám |
| 🟡 Chờ chỉ định | Yellow | Chờ tạo chỉ định |
| 🟠 Chờ kết quả | Orange | Chờ kết quả LAB/Siêu âm |
| ✓ Đã có kết quả | Green | Bác sĩ đã xem được kết quả |
| 💊 Chờ kê đơn | Blue | Chờ bác sĩ kê đơn |
| ⏳ Chờ lấy thuốc | Waiting | **WAITING_FOR_MEDICINE** - Đơn đã kê, chờ lấy thuốc |
| ✅ Hoàn tất | Green Check | Ca khám hoàn tất |

---

## 🎯 Tính Năng Chính

### ✨ Giao diện
- **Tab-based:** Dễ dàng chuyển giữa các bước
- **Responsive:** Tương thích trên desktop, tablet, mobile
- **Icon hóa:** Sử dụng Bootstrap Icons để dễ nhận diện
- **Status Bar:** Hiển thị trạng thái hiện tại của bệnh nhân
- **Kết thúc ca:** Nút "Kết thúc ca" luôn ở đầu giao diện

### 🔄 Tự động chuyển Tab
- Khi tiếp nhận bệnh nhân → Tự động chuyển sang tab "Khám"
- Giúp luồng công việc mượt hơn

### 💾 Lưu trữ
- Lưu thông tin lâm sàng
- Lưu chỉ định
- Lưu đơn thuốc
- Tự động cập nhật hàng đợi

### 📊 Hiển thị Dữ Liệu
- Danh sách hàng đợi (STT, tên, năm sinh)
- Chỉ định với giá và trạng thái
- Lịch sử khám gần đây
- Đơn thuốc đã kê (Accordion)

---

## 📁 File Thay Đổi

### Frontend (`frontend/src/pages/doctor/`)
1. **Dashboard.jsx** - ✅ Hoàn toàn được thiết kế lại
   - 900+ dòng code
   - 5 tab riêng biệt
   - Đầy đủ chức năng theo yêu cầu

2. **Layout.jsx** - ✅ Cải thiện
   - Sidebar đẹp hơn
   - Thêm alert "Chế độ: Bác sĩ"
   - Icons tuyệt đẹp
   - Style mới

---

## 🚀 Cách Sử Dụng

### Luồng Công Việc Bình Thường
1. **Bác sĩ đăng nhập** → Dashboard
2. **Tab "Gọi bệnh nhân"** → Nút "Gọi tiếp" hoặc click vào bệnh nhân
3. **Tự động → Tab "Khám"** → Nhập triệu chứng, khám lâm sàng, sinh hiệu → Lưu
4. **→ Tab "Chỉ định"** → Tìm dịch vụ, tạo chỉ định → Lưu
5. **→ Tab "Kết quả"** → Xem kết quả từ LAB/Siêu âm khi có
6. **→ Tab "Kê đơn"** → Tìm thuốc, thêm vào bảng, điền liều lượng → Lưu đơn
   - ✅ **Bệnh nhân chuyển sang WAITING_FOR_MEDICINE**
7. **Nút "Kết thúc ca"** → Hoàn tất ca khám

---

## 📝 Lưu Ý

- ✅ Giao diện hoàn toàn responsive
- ✅ Tuân theo Bootstrap 5 convention
- ✅ Sử dụng Bootstrap Icons (bi-*)
- ✅ Hỗ trợ đa ngôn ngữ (Tiếng Việt)
- ✅ Workflow logic rõ ràng
- ✅ Status tracking chính xác
- ✅ Tự động điều hướng tab

---

## 🔗 API Endpoints Sử Dụng

- `GET /api/doctor/today/patients` - Lấy danh sách hàng đợi
- `GET /api/doctor/cases/:id` - Lấy chi tiết ca khám
- `PUT /api/doctor/cases/:id` - Cập nhật thông tin lâm sàng
- `POST /api/doctor/cases/:id/labs` - Tạo chỉ định
- `GET /api/doctor/cases/:id/labs` - Lấy danh sách chỉ định
- `PUT /api/doctor/labs/:id/note` - Cập nhật ghi chú
- `DELETE /api/doctor/labs/:id` - Xóa chỉ định
- `GET /api/doctor/cases/:id/prescriptions` - Lấy đơn đã kê
- `POST /api/doctor/cases/:id/prescriptions` - Kê đơn mới
- `POST /api/doctor/cases/:id/complete` - Kết thúc ca khám

---

**✅ Redesign hoàn tất theo yêu cầu!**
