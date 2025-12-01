import React, { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { createMomoPayment, createCashPayment, getPayment } from '../../api/payments';
import { privateApi } from '../../api/axios';

export default function ReceptionPayments(){
  const [services, setServices] = useState([]);
  const [items, setItems] = useState([]); // {serviceId, qty}
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [status, setStatus] = useState(null);
  const [hoSoId, setHoSoId] = useState('');
  const [labOrders, setLabOrders] = useState([]);
  const [unpaidCases, setUnpaidCases] = useState([]);
  const [firstCase, setFirstCase] = useState(null);
  const [caseSearch, setCaseSearch] = useState('');
  const ordersRef = useRef(null);

  const loadLabOrders = async (hosoid) => {
    if(!hosoid) return alert('Nhập hoSoKhamId');
    try{
      const res = await privateApi.get('/payments/canlamsang', { params: { hoSoKhamId: hosoid } });
      const items = (res.data || []).map(it => ({ ...it, _selected: false }));
      setLabOrders(items);
      return items;
    }catch(e){
      console.error('load orders', e);
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Không tải được chỉ định';
      alert(msg);
    }
  };

  const loadUnpaidCases = async (q = '') => {
    try{
      const res = await privateApi.get('/payments/unpaid-cases', { params: { q } });
      const list = res.data || [];
      setUnpaidCases(list);
      setFirstCase(list.length ? list[0] : null);
    }catch(e){ console.error('load unpaid cases', e); }
  };

  useEffect(()=>{ loadUnpaidCases(); }, []);

  useEffect(()=>{
    async function load(){
      try{
          const res = await privateApi.get('/payments/services');
        setServices(res.data || []);
      }catch(err){
        console.error('Load services failed', err);
      }
    }
    load();
  },[]);

  const addLine = () => setItems(i => [...i, { serviceId: '', qty: 1 }]);
  const updateLine = (idx, patch) => setItems(i => i.map((it,j)=> j===idx? {...it,...patch} : it));
  const removeLine = (idx) => setItems(i => i.filter((_,j)=> j!==idx));

  const total = items.reduce((s,it)=>{
    const svc = services.find(sv=> String(sv._id) === String(it.serviceId));
    return s + (svc? (svc.gia||0) * (it.qty||0) : 0);
  },0);

  const onPay = async () => {
    if (!items.length && !labOrders.filter(o=>o._selected).length) return alert('Chọn ít nhất 1 dịch vụ hoặc chỉ định');
    const selectedLabIds = labOrders.filter(o=>o._selected).map(o=>o._id);
    const hoSoKhamId = hoSoId || prompt('Nhập hoSoKhamId (hoặc để trống nếu chưa có)');
    setLoading(true);
    try{
      const resp = await createMomoPayment({ hoSoKhamId, amount: total, orderInfo: `Thanh toan ${items.length} dich vu`, orderRefs: selectedLabIds, targetType: selectedLabIds.length? 'canlamsang' : 'hosokham' });
      setPaymentResult(resp);
      setPaymentId(resp.paymentId);
      setStatus('PENDING');
      // Nếu nhận được payUrl từ MoMo, mở nhanh để cashier/receptionist thực hiện thanh toán
      const payUrl = resp?.momo?.payUrl;
      if (payUrl) {
        try{ window.open(payUrl, '_blank'); }catch(e){ console.warn('Unable to open payUrl', e); }
      }
    }catch(err){
      console.error(err);
      alert('Tạo yêu cầu thanh toán thất bại');
    }finally{ setLoading(false); }
  };

  const onCashPay = async () => {
    const selectedLabIds = labOrders.filter(o=>o._selected).map(o=>o._id);
    if (!items.length && !selectedLabIds.length) return alert('Chọn ít nhất 1 dịch vụ hoặc chỉ định');
    const hoSoKhamId = hoSoId || prompt('Nhập hoSoKhamId (hoặc để trống nếu chưa có)');
    if(!confirm('Xác nhận đã thu tiền mặt?')) return;
    try{
      const resp = await createCashPayment({ hoSoKhamId, amount: total, orderRefs: selectedLabIds, targetType: selectedLabIds.length? 'canlamsang' : 'hosokham' });
      alert('✅ Đã ghi nhận thu tiền mặt');
      // Xóa các chỉ định đã thanh toán khỏi danh sách
      setLabOrders(ls => ls.filter(o=> !selectedLabIds.includes(o._id)));
      setItems([]);
      // Làm mới danh sách hồ sơ chưa thanh toán
      loadUnpaidCases();
    }catch(e){ console.error(e); alert('❌ Ghi nhận thất bại'); }
  };

    // Thanh toán MoMo chỉ cho các chỉ định đã chọn (chỉ cập nhật CanLamSang)
    const onPaySelectedLabOrders = async () => {
      const selectedLabIds = labOrders.filter(o=>o._selected).map(o=>o._id);
      if (!selectedLabIds.length) return alert('Chọn ít nhất 1 chỉ định để thanh toán');
      const hoSoKhamId = hoSoId || prompt('Nhập hoSoKhamId (hoặc để trống nếu chưa có)');
      // Tính tổng tiền từ các chỉ định đã chọn
      const amount = labOrders.filter(o=>o._selected).reduce((s,o)=> s + (o.dichVuId?.gia || 0), 0);
      setLoading(true);
      try{
        const resp = await createMomoPayment({ hoSoKhamId, amount, orderInfo: `Thanh toan ${selectedLabIds.length} chi dinh`, orderRefs: selectedLabIds, targetType: 'canlamsang' });
        setPaymentResult(resp);
        setPaymentId(resp.paymentId);
        setStatus('PENDING');
        
        // Xóa ngay các chỉ định đã chọn khỏi danh sách (giả định thanh toán sẽ thành công)
        setLabOrders(ls => ls.filter(o => !selectedLabIds.includes(o._id)));
        
        const payUrl = resp?.momo?.payUrl;
        if (payUrl) {
          try{ window.open(payUrl, '_blank'); }catch(e){ console.warn('Unable to open payUrl', e); }
        }
      }catch(err){
        console.error(err);
        alert('Tạo yêu cầu thanh toán thất bại');
      }finally{ setLoading(false); }
    };

  // Poll payment status
  useEffect(()=>{
    if(!paymentId) return;
    let stopped = false;
    const iv = setInterval(async ()=>{
      try{
        const resp = await getPayment(paymentId);
        if(stopped) return;
        setStatus(resp.status || resp?.data?.status || null);
        if(resp.status === 'PAID' || resp.status === 'paid'){
          clearInterval(iv); stopped = true;
          // Thanh toán thành công - làm mới danh sách chỉ định
          if(hoSoId){
            setTimeout(() => {
              loadLabOrders(hoSoId);
              loadUnpaidCases();
              alert('✅ Thanh toán thành công! Danh sách chỉ định đã cập nhật.');
            }, 500);
          }
        } else if(resp.status === 'FAILED' || resp.status === 'failed'){
          clearInterval(iv); stopped = true;
          alert('❌ Thanh toán thất bại');
        }
      }catch(err){
        console.error('poll error', err);
      }
    }, 3000);
    return ()=>{ clearInterval(iv); stopped = true; };
  },[paymentId, hoSoId]);

  return (
    <div className="py-3 px-3 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 m-0"><i className="bi bi-cash-coin text-success me-2"></i>Thu tiền dịch vụ</h1>
          <div className="small text-muted">MoMo hoặc tiền mặt · Lễ tân</div>
        </div>
        <div>
          <span className="badge bg-primary-subtle text-primary border">Tổng hiện tại: {total.toLocaleString()} đ</span>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-light"><strong>Hồ sơ chưa thanh toán</strong></div>
            <div className="card-body">
              <div className="input-group mb-2">
                <input className="form-control" placeholder="Tìm theo tên hoặc SĐT" value={caseSearch} onChange={e=>setCaseSearch(e.target.value)} />
                <button className="btn btn-outline-secondary" onClick={()=>loadUnpaidCases(caseSearch)}><i className="bi bi-search"></i></button>
                <button className="btn btn-outline-secondary" onClick={()=>loadUnpaidCases('')}><i className="bi bi-arrow-clockwise"></i></button>
              </div>
              {firstCase && (
                <div className="alert alert-info d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{firstCase.benhNhan?.hoTen || '—'} <small className="text-muted">{firstCase.benhNhan?.soDienThoai || ''}</small></div>
                    <div className="small text-muted">Chỉ định chưa thanh toán: {firstCase.count}</div>
                    <div className="small text-muted">Mã hồ sơ: {String(firstCase.hoSoKhamId)}</div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={()=>{
                    const id = String(firstCase.hoSoKhamId);
                    startTransition(() => { setHoSoId(id); });
                    loadLabOrders(id).then(()=>{ ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
                  }}>Xem chỉ định</button>
                </div>
              )}
              <div className="list-group" style={{maxHeight:450, overflow:'auto'}}>
                {unpaidCases.map(c => (
                  <button type="button" key={String(c.hoSoKhamId)} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${hoSoId===String(c.hoSoKhamId)?'active':''}`} onClick={()=>{
                    const id = String(c.hoSoKhamId);
                    startTransition(() => { setHoSoId(id); });
                    loadLabOrders(id).then(()=>{ ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
                  }}>
                    <div>
                      <div className="fw-semibold">{c.benhNhan?.hoTen || '—'} <small className="text-muted">{c.benhNhan?.soDienThoai || ''}</small></div>
                      <div className="small text-muted">Mã hồ sơ: {String(c.hoSoKhamId)}</div>
                    </div>
                    <span className="badge bg-secondary">{c.count}</span>
                  </button>
                ))}
                {unpaidCases.length===0 && <div className="text-muted small">Không có hồ sơ</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card shadow-sm mb-3">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <strong>Chi tiết hồ sơ</strong>
              {hoSoId && <span className="badge bg-info">HoSoKhamId: {hoSoId}</span>}
            </div>
            <div className="card-body">
              {(() => {
                const selectedCase = unpaidCases.find(cc => String(cc.hoSoKhamId) === hoSoId);
                if(selectedCase){
                  return (
                    <div className="mb-3">
                      <div className="fw-semibold">{selectedCase.benhNhan?.hoTen || '—'} <small className="text-muted">{selectedCase.benhNhan?.soDienThoai || ''}</small></div>
                      <div className="small text-muted">Ngày khám: {selectedCase.hoSoKhamNgay ? (new Date(selectedCase.hoSoKhamNgay)).toLocaleString() : '—'}</div>
                      <div className="small text-muted">Mã hồ sơ: {String(selectedCase.hoSoKhamId)}</div>
                    </div>
                  );
                }
                return <div className="text-muted small">Chọn một hồ sơ để xem chi tiết</div>;
              })()}
              <div className="input-group mb-2">
                <input className="form-control" value={hoSoId} onChange={e=>startTransition(() => setHoSoId(e.target.value))} placeholder="Nhập hoSoKhamId" />
                <button className="btn btn-outline-secondary" onClick={()=>{ const id = hoSoId; loadLabOrders(id).then(()=>{ ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }}>Tải chỉ định</button>
              </div>

              <h6 className="mt-3">Chỉ định chưa thanh toán</h6>
              <div className="mb-2" ref={ordersRef}>
                {labOrders.map(l=> (
                  <div key={l._id} className="form-check">
                    <input className="form-check-input" type="checkbox" id={`lab-${l._id}`} checked={!!l._selected} onChange={e=>{
                      setLabOrders(ls => ls.map(it => it._id === l._id ? {...it, _selected: e.target.checked } : it));
                    }} />
                    <label className="form-check-label" htmlFor={`lab-${l._id}`}>
                      {l.dichVuId?.ten} — Giá: {l.dichVuId?.gia || 0}
                      {l.createdAt && (
                        <span className="text-muted small ms-2">(Ngày chỉ định: {new Date(l.createdAt).toLocaleString('vi-VN')})</span>
                      )}
                    </label>
                  </div>
                ))}
                <div className="mt-2 d-flex gap-2">
                  <button className="btn btn-success btn-sm" onClick={onPaySelectedLabOrders} disabled={loading}><i className="bi bi-phone"></i> Thanh toán MoMo (chỉ định đã chọn)</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <strong>Danh sách dịch vụ</strong>
              <div><span className="badge bg-primary">Tổng: {total.toLocaleString()} đ</span></div>
            </div>
            <div className="card-body">
              <table className="table align-middle">
                <thead><tr><th>Service</th><th style={{width:120}}>Giá</th><th style={{width:140}}>Số lượng</th><th style={{width:80}}></th></tr></thead>
                <tbody>
                  {items.map((it,idx)=> (
                    <tr key={idx}>
                      <td>
                        <select value={it.serviceId} onChange={e=>updateLine(idx,{serviceId:e.target.value})} className="form-select">
                          <option value="">-- Chọn dịch vụ --</option>
                          {services.map(s=> <option key={s._id} value={s._id}>{s.ten} ({s.chuyenKhoaId?.ten || ''})</option>)}
                        </select>
                      </td>
                      <td>{services.find(s=> String(s._id)===String(it.serviceId))?.gia ?? 0}</td>
                      <td><input type="number" className="form-control" value={it.qty} min={1} onChange={e=>updateLine(idx,{qty: Number(e.target.value)})} /></td>
                      <td><button className="btn btn-sm btn-outline-danger" onClick={()=>removeLine(idx)}><i className="bi bi-trash"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="d-flex justify-content-between align-items-center">
                <button className="btn btn-sm btn-outline-primary" onClick={addLine}><i className="bi bi-plus-circle"></i> Thêm dịch vụ</button>
                <div className="d-flex gap-2">
                  <button className="btn btn-warning" onClick={onPay} disabled={loading || total<=0}><i className="bi bi-phone"></i> Thanh toán MoMo</button>
                  <button className="btn btn-success" onClick={onCashPay} disabled={total<=0}><i className="bi bi-cash-coin"></i> Thu tiền mặt</button>
                </div>
              </div>
            </div>
          </div>

          {paymentResult && (
            <div className="card shadow-sm mt-3">
              <div className="card-header bg-light"><strong>Kết quả tạo yêu cầu thanh toán</strong></div>
              <div className="card-body">
                <pre style={{maxHeight:200, overflow:'auto'}}>{JSON.stringify(paymentResult.momo || paymentResult, null, 2)}</pre>
                {paymentResult.momo?.payUrl && (
                  <a className="btn btn-success" href={paymentResult.momo.payUrl} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right"></i> Mở MoMo để thanh toán</a>
                )}
                {paymentResult.momo?.qrCode && (
                  <div className="mt-2"><img src={paymentResult.momo.qrCode} alt="QR" style={{maxWidth:300}} /></div>
                )}
                <div className="mt-2">Trạng thái: <span className="badge bg-secondary">{status || 'PENDING'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
