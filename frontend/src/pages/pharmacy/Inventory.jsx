import React from 'react';

export default function PharmacyInventory() {
  return (
    <div>
      <h4>Quản lý kho (tạm)</h4>
      <p>Trang quản lý kho tạm thời. Bạn có thể triển khai các chức năng sau:</p>
      <ul>
        <li>Danh sách thuốc, tồn kho, cảnh báo sắp hết</li>
        <li>Nhập xuất kho (phiếu nhập, phiếu xuất)</li>
        <li>Tìm kiếm theo tên/nhãn</li>
      </ul>
      <p>Hiện tại đây là placeholder — tôi có thể triển khai CRUD cho `Thuoc` và báo cáo tồn kho nếu bạn muốn.</p>
    </div>
  );
}
