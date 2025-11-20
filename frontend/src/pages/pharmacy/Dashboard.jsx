import React, { useEffect, useState } from 'react';
import { getPendingPrescriptions, dispensePrescription } from '../../api/pharmacy';

export default function PharmacyDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPendingPrescriptions();
      setList(res.data || []);
    } catch (err) {
      setError(err.message || 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDispense = async (id) => {
    if (!confirm('Xác nhận phát thuốc cho đơn này?')) return;
    try {
      await dispensePrescription(id);
      await load();
      alert('Đã phát thuốc');
    } catch (err) {
      alert('Lỗi khi phát thuốc: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="container mt-3">
      <h3>Pharmacy Dashboard - Đơn chờ phát</h3>
      {loading && <div>Đang tải...</div>}
      {error && <div className="text-danger">{error}</div>}
      {!loading && !list.length && <div>Không có đơn chờ.</div>}
      <div className="list-group">
        {list.map(d => (
          <div key={d._id} className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Đơn:</strong> {d._id} <br />
                <strong>Bệnh nhân:</strong> {d.hoSoKhamId?.benhNhanId || d.hoSoKhamId?._id} <br />
                <strong>Trạng thái:</strong> {d.status}
              </div>
              <div>
                <button className="btn btn-sm btn-primary" onClick={() => onDispense(d._id)}>Phát thuốc</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
