import React from 'react';
import PageHeader from '../../components/reception/PageHeader';
import Card from '../../components/reception/Card';

export default function ReceptionPrint(){
  return (
    <div className="container rc-page">
      <PageHeader title="In số thứ tự / hóa đơn" subtitle="Chọn lịch hẹn đã thanh toán để in" />
      <Card>
        <p>Chọn lịch hẹn đã thanh toán để in số thứ tự và hóa đơn. (Tính năng chi tiết sẽ được bổ sung)</p>
        <button className="btn btn-outline-secondary" onClick={()=>window.print()}><i className="bi bi-printer"></i> In trang</button>
      </Card>
    </div>
  );
}
