import React, { useEffect, useState } from 'react';
import { getPendingPrescriptions, dispensePrescription } from '../../api/pharmacy';

export default function PharmacyPrescriptions() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPendingPrescriptions();
      setList(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Không thể tải danh sách');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onDispense = async (id) => {
    if (!confirm('Xác nhận phát thuốc?')) return;
    try {
      await dispensePrescription(id);
      await load();
      alert('Đã phát thuốc');
    } catch (err) {
      alert('Lỗi khi phát thuốc: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div>
      <h4>Đơn chờ xử lý</h4>
      {loading && <div>Đang tải...</div>}
      {!loading && !list.length && <div>Không có đơn chờ.</div>}
      <div className="list-group">
        {list.map(d => (
          <div key={d._id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div><strong>Đơn:</strong> {d._id}</div>
                <div><strong>Bệnh nhân:</strong> {d.hoSoKhamId?.benhNhanId || d.hoSoKhamId?._id}</div>
                <div><strong>Ngày:</strong> {new Date(d.ngayKeDon || d.createdAt).toLocaleString()}</div>
                <div><strong>Trạng thái:</strong> {d.status}</div>
              </div>
              <div>
                <button className="btn btn-sm btn-primary" onClick={()=>onDispense(d._id)}>Phát thuốc</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
