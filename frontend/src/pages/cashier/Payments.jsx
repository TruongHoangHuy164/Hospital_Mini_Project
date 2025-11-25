import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CashierPayments(){
  const token = localStorage.getItem('accessToken') || '';
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceCases, setServiceCases] = useState([]);
  const [errServices, setErrServices] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [loadingRx, setLoadingRx] = useState(false);
  const [rxCases, setRxCases] = useState([]);
  const [errRx, setErrRx] = useState('');
  const [payingRxId, setPayingRxId] = useState(null);
  const [tab, setTab] = useState('services'); // 'services' | 'medicines'

  async function loadServiceCases(){
    setLoadingServices(true); setErrServices('');
    try{
      const res = await fetch(`${API_URL}/api/cashier/cases/services`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setServiceCases(json);
    }catch(e){ setErrServices(e?.message||'Lỗi tải danh sách'); }
    finally{ setLoadingServices(false); }
  }

  async function payServices(id){
    setPayingId(id);
    try{
      const res = await fetch(`${API_URL}/api/cashier/cases/${id}/services/pay`, { method:'POST', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      // Refresh
      await loadServiceCases();
    }catch(e){ alert(e?.message||'Lỗi thanh toán dịch vụ'); }
    finally{ setPayingId(null); }
  }

  async function loadRxCases(){
    setLoadingRx(true); setErrRx('');
    try{
      const res = await fetch(`${API_URL}/api/cashier/cases/medicines`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setRxCases(json);
    }catch(e){ setErrRx(e?.message||'Lỗi tải đơn thuốc'); }
    finally{ setLoadingRx(false); }
  }

  async function payPrescription(id){
    setPayingRxId(id);
    try{
      const res = await fetch(`${API_URL}/api/cashier/prescriptions/${id}/pay`, { method:'POST', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      await loadRxCases();
    }catch(e){ alert(e?.message||'Lỗi thanh toán đơn thuốc'); }
    finally{ setPayingRxId(null); }
  }

  useEffect(()=>{
    if(tab === 'services') loadServiceCases(); else loadRxCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div>
      <h3>Thu ngân</h3>
      <div className="btn-group mb-3">
        <button className={`btn btn-sm ${tab==='services'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setTab('services')}>Dịch vụ chờ thanh toán</button>
        <button className={`btn btn-sm ${tab==='medicines'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setTab('medicines')}>Đơn thuốc chờ thanh toán</button>
      </div>

      {tab==='services' && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Dịch vụ cần thu tiền</h5>
            {errServices && <div className="alert alert-danger">{errServices}</div>}
            <button className="btn btn-sm btn-secondary mb-2" onClick={loadServiceCases} disabled={loadingServices}>Tải lại</button>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead><tr><th>Bệnh nhân</th><th>Số chỉ định</th><th>Tổng tiền</th><th></th></tr></thead>
                <tbody>
                  {serviceCases.map(c => (
                    <tr key={c._id}>
                      <td>{c.benhNhan?.hoTen || '-'}</td>
                      <td>{c.labs?.length || 0}</td>
                      <td>{c.total?.toLocaleString('vi-VN')} đ</td>
                      <td>
                        <button className="btn btn-sm btn-success" disabled={payingId===c._id} onClick={()=>payServices(c._id)}>
                          {payingId===c._id? 'Đang xử lý...' : 'Thu tiền'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loadingServices && serviceCases.length===0 && <tr><td colSpan={4} className="text-center">Không có hồ sơ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab==='medicines' && (
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Đơn thuốc chờ thanh toán</h5>
            {errRx && <div className="alert alert-danger">{errRx}</div>}
            <button className="btn btn-sm btn-secondary mb-2" onClick={loadRxCases} disabled={loadingRx}>Tải lại</button>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead><tr><th>Bệnh nhân</th><th>Số thuốc</th><th>Trạng thái đơn</th><th></th></tr></thead>
                <tbody>
                  {rxCases.map(r => (
                    <tr key={r._id}>
                      <td>{r.benhNhan?.hoTen || '-'}</td>
                      <td>{r.items?.length || 0}</td>
                      <td>{r.status}</td>
                      <td>
                        <button className="btn btn-sm btn-success" disabled={payingRxId===r._id} onClick={()=>payPrescription(r._id)}>
                          {payingRxId===r._id? 'Đang xử lý...' : 'Thu tiền thuốc'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loadingRx && rxCases.length===0 && <tr><td colSpan={4} className="text-center">Không có đơn thuốc</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
