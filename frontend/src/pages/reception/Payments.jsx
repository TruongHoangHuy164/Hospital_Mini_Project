import React, { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { createMomoPayment, createCashPayment, getPayment } from '../../api/payments';
import { privateApi } from '../../api/axios';

export default function ReceptionPayments(){
  // Bỏ danh sách dịch vụ
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [status, setStatus] = useState(null);
  const [hoSoId, setHoSoId] = useState('');
  const [labOrders, setLabOrders] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  });
  const [selectedPaidOrder, setSelectedPaidOrder] = useState(null);
  const [unpaidCases, setUnpaidCases] = useState([]);
  const [firstCase, setFirstCase] = useState(null);
  const [caseSearch, setCaseSearch] = useState('');
  const ordersRef = useRef(null);

  const selectedCount = labOrders.filter(o=>o._selected).length;
  const unpaidCount = labOrders.length;
  const paidCount = paidOrders.length;

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

  // Tải danh sách chỉ định đã thanh toán theo ngày
  const loadPaidOrders = async (date, hosoid) => {
    try{
      const res = await privateApi.get('/payments/paid-orders', { params: { date, hoSoKhamId: hosoid || undefined } });
      setPaidOrders(res.data || []);
    }catch(err){
      console.error('Load paid orders failed', err);
      setPaidOrders([]);
    }
  };

  useEffect(()=>{ loadPaidOrders(selectedDate, hoSoId); }, [selectedDate, hoSoId]);

  // Tổng tiền dựa trên chỉ định được chọn
  const total = labOrders.filter(o=>o._selected).reduce((s,o)=> s + (o.dichVuId?.gia || 0), 0);

  const onPay = async () => {
    if (!labOrders.filter(o=>o._selected).length) return alert('Chọn ít nhất 1 chỉ định');
    const selectedLabIds = labOrders.filter(o=>o._selected).map(o=>o._id);
    const hoSoKhamId = hoSoId || prompt('Nhập hoSoKhamId (hoặc để trống nếu chưa có)');
    setLoading(true);
    try{
      const resp = await createMomoPayment({ hoSoKhamId, amount: total, orderInfo: `Thanh toan ${selectedLabIds.length} chi dinh`, orderRefs: selectedLabIds, targetType: 'canlamsang' });
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
    if (!selectedLabIds.length) return alert('Chọn ít nhất 1 chỉ định');
    const hoSoKhamId = hoSoId || prompt('Nhập hoSoKhamId (hoặc để trống nếu chưa có)');
    if(!confirm('Xác nhận đã thu tiền mặt?')) return;
    try{
      const resp = await createCashPayment({ hoSoKhamId, amount: total, orderRefs: selectedLabIds, targetType: 'canlamsang' });
      alert('✅ Đã ghi nhận thu tiền mặt');
      // Xóa các chỉ định đã thanh toán khỏi danh sách
      setLabOrders(ls => ls.filter(o=> !selectedLabIds.includes(o._id)));
      // Làm mới danh sách hồ sơ chưa thanh toán
      loadUnpaidCases();
      loadPaidOrders(selectedDate, hoSoId);
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
    <div className="container-fluid py-3">
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded" style={{width:40,height:40}}>
            <i className="bi bi-cash-coin text-primary fs-5"></i>
          </span>
          <div>
            <h1 className="h4 m-0 fw-bold">Quản Lý Thanh Toán</h1>
            <div className="small text-muted">Chỉ định xét nghiệm và phòng khám</div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-muted fw-medium mb-1">Chỉ định chưa thanh toán</div>
                <div className="h4 m-0">{unpaidCount}</div>
                <div className="small text-primary mt-1">Đã chọn: {selectedCount}</div>
              </div>
              <span className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded" style={{width:48,height:48}}>
                <i className="bi bi-clock text-primary fs-4"></i>
              </span>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-muted fw-medium mb-1">Tổng tiền cần thanh toán</div>
                <div className="h4 m-0 text-success">{total.toLocaleString()} đ</div>
                <div className="small text-muted mt-1">Cho các chỉ định đã chọn</div>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-warning btn-sm" onClick={onPay} disabled={loading || selectedCount===0}><i className="bi bi-phone"></i> MoMo</button>
                <button className="btn btn-success btn-sm" onClick={onCashPay} disabled={selectedCount===0}><i className="bi bi-cash-coin"></i> Tiền Mặt</button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="small text-muted fw-medium mb-1">Đã thanh toán</div>
                <div className="h4 m-0 text-primary">{paidCount}</div>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <label className="small text-muted">Xem ngày:</label>
                  <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="form-control form-control-sm" style={{width:160}} />
                </div>
              </div>
              <span className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded" style={{width:48,height:48}}>
                <i className="bi bi-check2-circle text-success fs-4"></i>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-light border-bottom"><strong>Hồ Sơ Chưa Thanh Toán</strong><div className="small text-muted">{unpaidCases.length} hồ sơ</div></div>
            <div className="card-body">
              <div className="input-group mb-2">
                <input className="form-control" placeholder="Tìm theo tên hoặc SĐT" value={caseSearch} onChange={e=>setCaseSearch(e.target.value)} />
                <button className="btn btn-outline-secondary" onClick={()=>loadUnpaidCases(caseSearch)}><i className="bi bi-search"></i></button>
                <button className="btn btn-outline-secondary" onClick={()=>loadUnpaidCases('')}><i className="bi bi-arrow-clockwise"></i></button>
              </div>
              {firstCase && (
                <div className="p-2 mb-2 border rounded bg-light">
                  <div className="mb-2">
                    <div className="fw-semibold small">{firstCase.benhNhan?.hoTen || '—'}</div>
                    <div className="small text-muted">{firstCase.benhNhan?.soDienThoai || ''}</div>
                    <div className="small text-muted">Chỉ định chưa thanh toán: {firstCase.count}</div>
                  </div>
                  <button className="btn btn-sm btn-primary w-100" onClick={()=>{
                    const id = String(firstCase.hoSoKhamId);
                    startTransition(() => { setHoSoId(id); });
                    loadLabOrders(id).then(()=>{ ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
                  }}>Xem chỉ định</button>
                </div>
              )}
              <div className="list-group" style={{maxHeight:380, overflowY:'auto'}}>
                {unpaidCases.map(c => (
                  <button type="button" key={String(c.hoSoKhamId)} className={`list-group-item list-group-item-action ${hoSoId===String(c.hoSoKhamId)?'active':''}`} onClick={()=>{
                    const id = String(c.hoSoKhamId);
                    startTransition(() => { setHoSoId(id); });
                    loadLabOrders(id).then(()=>{ ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
                  }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="small fw-semibold">{c.benhNhan?.hoTen || '—'}</div>
                        <div className="small text-muted">{c.benhNhan?.soDienThoai || ''}</div>
                      </div>
                      <span className="badge bg-secondary">{c.count}</span>
                    </div>
                  </button>
                ))}
                {unpaidCases.length===0 && <div className="text-muted small">Không có hồ sơ</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="card shadow-sm mb-3">
            <div className="card-header bg-light border-bottom"><strong>Chi Tiết Hồ Sơ</strong></div>
            <div className="card-body">
              {(() => {
                const selectedCase = unpaidCases.find(cc => String(cc.hoSoKhamId) === hoSoId);
                if(selectedCase){
                  return (
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="fw-semibold">{selectedCase.benhNhan?.hoTen || '—'}</div>
                      <div className="small text-muted">{selectedCase.benhNhan?.soDienThoai || ''}</div>
                      <div className="small text-muted">Ngày khám: {selectedCase.hoSoKhamNgay ? (new Date(selectedCase.hoSoKhamNgay)).toLocaleString('vi-VN') : '—'}</div>
                      <div className="small text-muted">Mã hồ sơ: {String(selectedCase.hoSoKhamId)}</div>
                    </div>
                  );
                }
                return <div className="text-muted small">Chọn một hồ sơ để xem chi tiết</div>;
              })()}

              <div className="input-group mb-3">
                <input className="form-control" value={hoSoId} onChange={e=>startTransition(() => setHoSoId(e.target.value))} placeholder="Nhập hoSoKhamId" />
                <button className="btn btn-primary" onClick={()=>{ const id = hoSoId; loadLabOrders(id).then(()=>{ ordersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }}>Tải chỉ định</button>
              </div>

              <h6 className="mt-2 mb-2">Chỉ Định Chưa Thanh Toán</h6>
              <div ref={ordersRef} className="mb-2" style={{maxHeight:260, overflowY:'auto'}}>
                {labOrders.length===0 ? (
                  <div className="text-muted small text-center py-3">Không có chỉ định</div>
                ) : (
                  labOrders.map(l => (
                    <label key={l._id} className="d-flex align-items-start gap-2 p-2 border rounded mb-2">
                      <input type="checkbox" className="form-check-input mt-1" checked={!!l._selected} onChange={e=>{
                        setLabOrders(ls => ls.map(it => it._id === l._id ? {...it, _selected: e.target.checked } : it));
                      }} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">{l.dichVuId?.ten}</div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary-subtle text-primary border">{(l.dichVuId?.gia || 0).toLocaleString()} đ</span>
                          {l.createdAt && <span className="small text-muted">{new Date(l.createdAt).toLocaleDateString('vi-VN')}</span>}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="d-flex gap-2 pt-2 border-top">
                <button className="btn btn-primary flex-grow-1" onClick={onPaySelectedLabOrders} disabled={loading || selectedCount===0}><i className="bi bi-phone"></i> MoMo</button>
                <button className="btn btn-success flex-grow-1" onClick={onCashPay} disabled={selectedCount===0}><i className="bi bi-cash-coin"></i> Tiền Mặt</button>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light border-bottom"><strong>Chỉ Định Đã Thanh Toán</strong><div className="small text-muted">Ngày {selectedDate}</div></div>
            <div className="card-body">
              {paidOrders.length===0 ? (
                <div className="text-muted small text-center py-3">Không có chỉ định đã thanh toán cho ngày này.</div>
              ) : (
                <div className="list-group" style={{maxHeight:300, overflowY:'auto'}}>
                  {paidOrders.map(po => (
                    <button type="button" key={po._id || po.paymentId} className={`list-group-item list-group-item-action ${selectedPaidOrder?._id===po._id?'active':''}`} onClick={()=>setSelectedPaidOrder(po)}>
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="flex-grow-1">
                          <div className="fw-semibold small"><i className="bi bi-check2-circle text-success me-1"></i>{po?.dichVuId?.ten || po?.orderInfo || '—'}</div>
                          <div className="small text-muted">{po?.benhNhan?.hoTen || '—'}</div>
                          <div className="small text-muted">{po?.paymentMethod || po?.method || '—'} · {po?.paidAt ? new Date(po.paidAt).toLocaleString('vi-VN') : '—'}</div>
                        </div>
                        <span className="fw-bold text-primary">{(po?.amount || po?.dichVuId?.gia || 0).toLocaleString()} đ</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPaidOrder && (
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-semibold small">Chi Tiết Thanh Toán</div>
                      <div className="small text-muted">ID: {selectedPaidOrder.paymentId || selectedPaidOrder._id}</div>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>setSelectedPaidOrder(null)}><i className="bi bi-x-lg"></i></button>
                  </div>
                  <div className="row g-2 small">
                    <div className="col-12 col-md-6">
                      <div className="d-flex justify-content-between"><span className="text-muted">Dịch vụ:</span><span className="fw-medium">{selectedPaidOrder?.dichVuId?.ten || selectedPaidOrder?.orderInfo || '—'}</span></div>
                      <div className="d-flex justify-content-between"><span className="text-muted">Giá:</span><span className="fw-bold text-primary">{(selectedPaidOrder?.amount || selectedPaidOrder?.dichVuId?.gia || 0).toLocaleString()} đ</span></div>
                      <div className="d-flex justify-content-between"><span className="text-muted">Phương thức:</span><span className="fw-medium">{selectedPaidOrder?.paymentMethod || selectedPaidOrder?.method || '—'}</span></div>
                      <div className="d-flex justify-content-between"><span className="text-muted">Thời gian:</span><span className="fw-medium">{selectedPaidOrder?.paidAt ? new Date(selectedPaidOrder.paidAt).toLocaleString('vi-VN') : '—'}</span></div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="d-flex justify-content-between"><span className="text-muted">Bệnh nhân:</span><span className="fw-medium">{selectedPaidOrder?.benhNhan?.hoTen || '—'}</span></div>
                      <div className="d-flex justify-content-between"><span className="text-muted">SĐT:</span><span className="fw-medium">{selectedPaidOrder?.benhNhan?.soDienThoai || '—'}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {paymentResult && (
            <div className="card shadow-sm">
              <div className="card-header bg-light border-bottom"><strong>Kết Quả Yêu Cầu Thanh Toán</strong><div className="small text-muted">Trạng thái: <span className="text-primary fw-semibold">{status || 'PENDING'}</span></div></div>
              <div className="card-body">
                {paymentResult.momo?.payUrl && (
                  <a className="btn btn-primary w-100 mb-2" href={paymentResult.momo.payUrl} target="_blank" rel="noreferrer"><i className="bi bi-phone"></i> Mở MoMo Để Thanh Toán</a>
                )}
                {paymentResult.momo?.qrCode && (
                  <div className="d-flex justify-content-center mb-2"><img src={paymentResult.momo.qrCode} alt="QR" className="border rounded" style={{width:192, height:192}} /></div>
                )}
                <details className="small">
                  <summary className="fw-semibold">Xem chi tiết JSON</summary>
                  <pre className="mt-2 p-2 bg-light rounded" style={{maxHeight:200, overflow:'auto'}}>{JSON.stringify(paymentResult.momo || paymentResult, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
