import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DoctorDashboard() {
  // ===== TAB STATE =====
  const [activeTab, setActiveTab] = useState('call'); // 'call', 'exam', 'referral', 'results', 'prescription'
  
  // ===== CORE STATES =====
  const todayDate = new Date().toISOString().slice(0,10);
  const [todayPatients, setTodayPatients] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  
  // ===== EXAMINATION STATES =====
  const [clinical, setClinical] = useState({ trieuChung: '', khamLamSang: '', huyetAp: '', nhipTim: '', nhietDo: '', canNang: '', chieuCao: '' });
  
  // ===== REFERRAL/LAB STATES =====
  const [labs, setLabs] = useState([]);
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceResults, setServiceResults] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState('');
  
  // ===== RESULTS/HISTORY STATES =====
  const [history, setHistory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  
  // ===== PRESCRIPTION STATES =====
  const [rxQuery, setRxQuery] = useState('');
  const [rxResults, setRxResults] = useState([]);
  const [rxItems, setRxItems] = useState([]);
  const [medicineGroups, setMedicineGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [rxPriceOrder, setRxPriceOrder] = useState('');

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  }), []);

  // ===== LOAD TODAY'S PATIENT QUEUE =====
  async function loadTodayPatients(){
    try{
      const res = await fetch(`${API_URL}/api/doctor/today/patients`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setTodayPatients(json);
    }catch(e){ console.error(e); }
  }

  useEffect(() => { loadTodayPatients(); }, []);

  // ===== OPEN A CASE =====
  async function openCase(hsId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/cases/${hsId}`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setSelectedCase(json);
      setCaseDetail(json);
      setClinical({
        trieuChung: json.trieuChung || '', khamLamSang: json.khamLamSang || '',
        huyetAp: json.sinhHieu?.huyetAp || '', nhipTim: json.sinhHieu?.nhipTim || '', nhietDo: json.sinhHieu?.nhietDo || '',
        canNang: json.sinhHieu?.canNang || '', chieuCao: json.sinhHieu?.chieuCao || ''
      });
      await loadLabs(json._id);
      await loadHistory(json.benhNhanId?._id);
      await loadPrescriptions(json._id);
      setActiveTab('exam'); // Automatically go to examination
    }catch(e){ console.error(e); }
  }

  // ===== QUEUE MANAGEMENT =====
  async function intake(lichKhamId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/appointments/${lichKhamId}/intake`, { method:'POST', headers });
      const json = await res.json();
      if(!res.ok) throw json;
      if(json.case){
        await openCase(json.case._id);
      }
      await loadTodayPatients();
    }catch(e){ alert(e?.message || 'Tiếp nhận thất bại'); }
  }

  async function skip(lichKhamId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/appointments/${lichKhamId}/skip`, { method:'POST', headers });
      const json = await res.json();
      if(!res.ok) throw json;
      await loadTodayPatients();
    }catch(e){ alert(e?.message || 'Bỏ qua thất bại'); }
  }

  async function notify(lichKhamId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/appointments/${lichKhamId}/notify`, { method:'POST', headers });
      const json = await res.json();
      if(!res.ok) throw json;
      await loadTodayPatients();
    }catch(e){ alert(e?.message || 'Thông báo thất bại'); }
  }

  async function callNext(){
    try{
      const res = await fetch(`${API_URL}/api/doctor/queue/next`, { method:'POST', headers });
      const json = await res.json();
      if(!res.ok) throw json;
      if(json.case){
        await openCase(json.case._id);
      }
      await loadTodayPatients();
    }catch(e){ alert(e?.message || 'Không thể gọi tiếp theo'); }
  }

  // ===== EXAMINATION (CLINICAL) =====
  async function saveClinical(){
    try{
      if(!selectedCase?._id) return;
      const payload = {
        trieuChung: clinical.trieuChung,
        khamLamSang: clinical.khamLamSang,
        sinhHieu: { huyetAp: clinical.huyetAp, nhipTim: Number(clinical.nhipTim)||undefined, nhietDo: Number(clinical.nhietDo)||undefined, canNang: Number(clinical.canNang)||undefined, chieuCao: Number(clinical.chieuCao)||undefined },
      };
      const res = await fetch(`${API_URL}/api/doctor/cases/${selectedCase._id}`, { method:'PUT', headers, body: JSON.stringify(payload) });
      const json = await res.json();
      if(!res.ok) throw json;
      setCaseDetail(json);
      alert('Đã lưu thông tin lâm sàng');
    }catch(e){ alert(e?.message||'Lỗi lưu'); }
  }

  // ===== LAB/SERVICE REFERRAL =====
  async function loadLabs(hsId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/cases/${hsId}/labs`, { headers });
      const json = await res.json();
      if(res.ok) setLabs(json); else console.error(json);
    }catch(e){ console.error(e); }
  }

  async function searchServices(){
    try{
      setLoadingServices(true); setServicesError('');
      const url = new URL(`${API_URL}/api/services`);
      if(serviceQuery) url.searchParams.set('q', serviceQuery);
      if(selectedSpecialty) url.searchParams.set('chuyenKhoaId', selectedSpecialty);
      const res = await fetch(url, { headers });
      const json = await res.json();
      if(res.ok) setServiceResults(json.slice(0,12)); else setServicesError(json?.message||'Lỗi tải dịch vụ');
    }catch(e){ console.error(e); setServicesError('Lỗi kết nối dịch vụ'); }
    finally{ setLoadingServices(false); }
  }

  useEffect(()=>{
    if(serviceQuery.length>0){
      const t=setTimeout(searchServices,300); return ()=>clearTimeout(t);
    } else {
      if(!selectedSpecialty) setServiceResults([]);
    }
  }, [serviceQuery, selectedSpecialty]);
  useEffect(()=>{ if(selectedSpecialty) searchServices(); }, [selectedSpecialty]);

  async function loadSpecialties(){
    try{
      setLoadingSpecialties(true); setSpecialtiesError('');
      const url = new URL(`${API_URL}/api/specialties`);
      url.searchParams.set('limit','100');
      const res = await fetch(url, { headers });
      const json = await res.json();
      if(res.ok) setSpecialties(json.items || []); else setSpecialtiesError(json?.message||'Lỗi tải chuyên khoa');
    }catch(e){ console.error(e); setSpecialtiesError('Lỗi kết nối chuyên khoa'); }
    finally{ setLoadingSpecialties(false); }
  }
  useEffect(()=>{ loadSpecialties(); searchServices(); },[]);

  async function orderService(svc){
    try{
      if(!selectedCase?._id) return alert('Chưa chọn hồ sơ');
      const payload = { dichVuId: svc._id };
      const res = await fetch(`${API_URL}/api/doctor/cases/${selectedCase._id}/labs`, { method:'POST', headers, body: JSON.stringify(payload) });
      const json = await res.json();
      if(!res.ok) throw json;
      setServiceQuery(''); setServiceResults([]);
      await loadLabs(selectedCase._id);
      alert('Đã tạo chỉ định');
    }catch(e){ alert(e?.message || 'Lỗi chỉ định'); }
  }

  async function deleteService(labId){
    if(!confirm('Xóa chỉ định này?')) return;
    try{
      const res = await fetch(`${API_URL}/api/doctor/labs/${labId}`, { method:'DELETE', headers });
      const json = await res.json();
      if(res.ok){ setLabs(json.items || []); }
    }catch(err){ console.error(err); }
  }

  async function updateLabNote(labId, ghiChu){
    try{
      const res = await fetch(`${API_URL}/api/doctor/labs/${labId}/note`, { method:'PUT', headers, body: JSON.stringify({ ghiChu }) });
      if(res.ok){ const updated = await res.json(); setLabs(ls=> ls.map(x=> x._id===updated._id? updated : x)); }
    }catch(err){ console.error(err); }
  }

  // ===== RESULTS & HISTORY =====
  async function loadHistory(benhNhanId){
    try{
      if(!benhNhanId) return setHistory([]);
      const url = new URL(`${API_URL}/api/doctor/patients/${benhNhanId}/cases`);
      url.searchParams.set('limit','5');
      const res = await fetch(url, { headers });
      const json = await res.json();
      if(res.ok) setHistory(json.items || []);
    }catch(e){ console.error(e); }
  }

  async function loadPrescriptions(hsId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/cases/${hsId}/prescriptions`, { headers });
      const json = await res.json();
      if(res.ok) setPrescriptions(json || []); else console.error(json);
    }catch(e){ console.error(e); }
  }

  // ===== PRESCRIPTION =====
  async function searchMedicines(){
    try{
      const url = new URL(`${API_URL}/api/doctor/medicines`);
      if (rxQuery) url.searchParams.set('q', rxQuery);
      url.searchParams.set('limit','8');
      if (selectedGroup) {
        url.searchParams.set('group', selectedGroup);
      } else {
        url.searchParams.set('group','ALL');
      }
      if (rxPriceOrder) url.searchParams.set('priceOrder', rxPriceOrder);
      const res = await fetch(url, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setRxResults(json || []);
    }catch(e){ console.error(e); }
  }
  
  async function loadMedicineGroups(){
    try{
      const res = await fetch(`${API_URL}/api/doctor/medicine-groups`, { headers });
      const json = await res.json();
      if(res.ok){ setMedicineGroups(json); }
    }catch(e){ console.error(e); }
  }
  useEffect(()=>{ loadMedicineGroups(); },[]);

  useEffect(()=>{
    const delay = setTimeout(searchMedicines, rxQuery ? 300 : 0);
    return ()=>clearTimeout(delay);
  }, [rxQuery, selectedGroup, rxPriceOrder]);

  function addMedicine(m){
    if(!m) return;
    setRxItems(items => {
      if(items.some(x => x.thuoc._id === m._id)) return items;
      return [...items, { thuoc: m, soLuong: 1 }];
    });
  }

  function updateQty(idx, val){
    const n = Math.max(1, Number(val)||1);
    setRxItems(items => items.map((it,i)=> i===idx ? { ...it, soLuong: n } : it));
  }

  function removeItem(idx){ setRxItems(items => items.filter((_,i)=>i!==idx)); }

  async function submitPrescription(){
    try{
      if(!selectedCase?._id) return alert('Chọn hồ sơ khám');
      if(rxItems.length===0) return alert('Chưa chọn thuốc');
      const payload = { items: rxItems.map(x => ({
        thuocId: x.thuoc._id,
        soLuong: x.soLuong,
        dosageMorning: Number(x.dosageMorning)||0,
        dosageNoon: Number(x.dosageNoon)||0,
        dosageEvening: Number(x.dosageEvening)||0,
        days: Number(x.days)||0,
        usageNote: x.usageNote||''
      })) };
      const res = await fetch(`${API_URL}/api/doctor/cases/${selectedCase._id}/prescriptions`, { method:'POST', headers, body: JSON.stringify(payload) });
      const json = await res.json();
      if(!res.ok) throw json;
      setRxItems([]); setRxResults([]); setRxQuery('');
      alert('Đã kê đơn - Bệnh nhân chuyển sang chờ lấy thuốc (WAITING_FOR_MEDICINE)');
      await loadPrescriptions(selectedCase._id);
      await loadTodayPatients();
    }catch(e){ alert(e?.message || 'Kê đơn thất bại'); }
  }

  async function completeVisit(){
    try{
      if(!selectedCase?._id) return;
      const res = await fetch(`${API_URL}/api/doctor/cases/${selectedCase._id}/complete`, { method:'POST', headers });
      const json = await res.json();
      if(!res.ok) throw json;
      alert('Đã kết thúc ca khám');
      setSelectedCase(null);
      setCaseDetail(null);
      setLabs([]);
      setHistory([]);
      setPrescriptions([]);
      setRxItems([]);
      setActiveTab('call');
      await loadTodayPatients();
    }catch(e){ alert(e?.message || 'Lỗi kết thúc ca'); }
  }

  // ===== HELPER FUNCTIONS =====
  function getCaseStatus(){
    if(!caseDetail) return 'N/A';
    const statuses = {
      'dang_kham': '🔴 Đang khám',
      'cho_chi_dinh': '🟡 Chờ chỉ định',
      'cho_ket_qua': '🟠 Chờ kết quả',
      'da_co_ket_qua': '✓ Đã có kết quả',
      'cho_ke_don': '💊 Chờ kê đơn',
      'WAITING_FOR_MEDICINE': '⏳ Chờ lấy thuốc',
      'hoan_tat': '✅ Hoàn tất'
    };
    return statuses[caseDetail.trangThai] || caseDetail.trangThai || 'N/A';
  }

  return (
    <div className="py-3">
      {/* ===== TAB NAVIGATION ===== */}
      <div className="container-fluid mb-3">
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <nav className="nav nav-tabs border-bottom-0" role="tablist">
              <button 
                className={`nav-link fw-semibold ${activeTab === 'call' ? 'active border-bottom border-3 border-primary text-primary' : 'text-muted'}`}
                onClick={() => setActiveTab('call')}
                role="tab"
              >
                <i className="bi bi-telephone-fill me-2"></i>Gọi bệnh nhân
              </button>
              <button 
                className={`nav-link fw-semibold ${activeTab === 'exam' ? 'active border-bottom border-3 border-primary text-primary' : !selectedCase ? 'disabled text-muted' : 'text-muted'}`}
                onClick={() => selectedCase && setActiveTab('exam')}
                role="tab"
                disabled={!selectedCase}
              >
                <i className="bi bi-stethoscope me-2"></i>Khám
              </button>
              <button 
                className={`nav-link fw-semibold ${activeTab === 'referral' ? 'active border-bottom border-3 border-primary text-primary' : !selectedCase ? 'disabled text-muted' : 'text-muted'}`}
                onClick={() => selectedCase && setActiveTab('referral')}
                role="tab"
                disabled={!selectedCase}
              >
                <i className="bi bi-clipboard-check me-2"></i>Chỉ định
              </button>
              <button 
                className={`nav-link fw-semibold ${activeTab === 'results' ? 'active border-bottom border-3 border-primary text-primary' : !selectedCase ? 'disabled text-muted' : 'text-muted'}`}
                onClick={() => selectedCase && setActiveTab('results')}
                role="tab"
                disabled={!selectedCase}
              >
                <i className="bi bi-file-earmark-text me-2"></i>Kết quả
              </button>
              <button 
                className={`nav-link fw-semibold ${activeTab === 'prescription' ? 'active border-bottom border-3 border-primary text-primary' : !selectedCase ? 'disabled text-muted' : 'text-muted'}`}
                onClick={() => selectedCase && setActiveTab('prescription')}
                role="tab"
                disabled={!selectedCase}
              >
                <i className="bi bi-capsule me-2"></i>Kê đơn
              </button>
              {selectedCase && (
                <div className="ms-auto d-flex align-items-center gap-2 pe-3">
                  <small className="text-muted">Trạng thái:</small>
                  <small className="fw-semibold text-success">{getCaseStatus()}</small>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={completeVisit}
                    title="Kết thúc ca khám"
                  >
                    <i className="bi bi-check-circle me-1"></i>Kết thúc
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="container-fluid">
        {/* CALL PATIENT TAB */}
        {activeTab === 'call' && (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-calendar-check text-primary me-2"></i>Hàng đợi hôm nay
              </h5>
              <button className="btn btn-sm btn-primary" onClick={callNext}>
                <i className="bi bi-play-fill me-1"></i>Gọi tiếp
              </button>
            </div>
            <div className="card-body p-0">
              {todayPatients.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                  <p>Chưa có lịch hẹn cho hôm nay</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{width:60}}><i className="bi bi-hash"></i> STT</th>
                        <th><i className="bi bi-person"></i> Tên bệnh nhân</th>
                        <th style={{width:100}}>Năm sinh</th>
                        <th style={{width:120}}>Trạng thái</th>
                        <th className="text-end" style={{width:160}}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayPatients.map((it, idx) => {
                        const year = it.benhNhan?.ngaySinh ? new Date(it.benhNhan.ngaySinh).getFullYear() : '';
                        let stLabel = 'Chờ khám';
                        let stBadge = 'bg-warning';
                        if(selectedCase && caseDetail?.benhNhanId?._id === it.benhNhan?._id) {
                          stLabel = 'Đang khám';
                          stBadge = 'bg-success';
                        }
                        const disabled = !it.soThuTu;
                        return (
                          <tr key={idx} className={selectedCase?.benhNhanId?._id === it.benhNhan?._id ? 'table-active' : ''}>
                            <td>
                              <span className="badge bg-primary fs-6">{it.soThuTu || '-'}</span>
                            </td>
                            <td className="fw-semibold">{it.benhNhan?.hoTen}</td>
                            <td className="text-muted">{year}</td>
                            <td>
                              <span className={`badge ${stBadge}`}>{stLabel}</span>
                            </td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm" role="group">
                                <button 
                                  disabled={disabled} 
                                  className="btn btn-outline-success" 
                                  title="Tiếp nhận bệnh nhân" 
                                  onClick={() => intake(it._id)}
                                >
                                  <i className="bi bi-check2"></i>
                                </button>
                                <button 
                                  disabled={disabled} 
                                  className="btn btn-outline-info" 
                                  title="Thông báo bệnh nhân" 
                                  onClick={() => notify(it._id)}
                                >
                                  <i className="bi bi-bell"></i>
                                </button>
                                <button 
                                  disabled={disabled} 
                                  className="btn btn-outline-warning" 
                                  title="Bỏ qua lịch hẹn" 
                                  onClick={() => skip(it._id)}
                                >
                                  <i className="bi bi-skip-forward"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXAMINATION TAB */}
        {activeTab === 'exam' && selectedCase && (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">
                    <i className="bi bi-clipboard2-pulse text-primary me-2"></i>Khám bệnh nhân
                  </h5>
                  <p className="mb-0 text-muted small">
                    <strong>{caseDetail?.benhNhanId?.hoTen}</strong> • 
                    <span className="badge bg-info ms-2">{getCaseStatus()}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-chat-left-dots text-primary me-2"></i>Triệu chứng
                  </label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    placeholder="Ghi nhập triệu chứng bệnh nhân..."
                    value={clinical.trieuChung}
                    onChange={e => setClinical(s => ({...s, trieuChung: e.target.value}))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-heart-pulse text-danger me-2"></i>Khám lâm sàng
                  </label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    placeholder="Ghi nhập kết quả khám lâm sàng..."
                    value={clinical.khamLamSang}
                    onChange={e => setClinical(s => ({...s, khamLamSang: e.target.value}))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold d-block">
                    <i className="bi bi-graph-up text-success me-2"></i>Sinh hiệu
                  </label>
                  <div className="row g-2">
                    <div className="col-md-3">
                      <label className="form-label small text-muted">Huyết áp</label>
                      <input 
                        className="form-control" 
                        placeholder="VD: 120/80"
                        value={clinical.huyetAp}
                        onChange={e => setClinical(s => ({...s, huyetAp: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small text-muted">Nhịp tim (lần/phút)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="VD: 72"
                        value={clinical.nhipTim}
                        onChange={e => setClinical(s => ({...s, nhipTim: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small text-muted">Nhiệt độ (°C)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="form-control" 
                        placeholder="VD: 36.5"
                        value={clinical.nhietDo}
                        onChange={e => setClinical(s => ({...s, nhietDo: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small text-muted">Cân nặng (kg)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="form-control" 
                        placeholder="VD: 70"
                        value={clinical.canNang}
                        onChange={e => setClinical(s => ({...s, canNang: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small text-muted">Chiều cao (cm)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        className="form-control" 
                        placeholder="VD: 175"
                        value={clinical.chieuCao}
                        onChange={e => setClinical(s => ({...s, chieuCao: e.target.value}))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="btn btn-outline-secondary" onClick={() => setActiveTab('call')}>
                  <i className="bi bi-arrow-left me-1"></i>Quay lại
                </button>
                <button className="btn btn-primary" onClick={saveClinical}>
                  <i className="bi bi-save me-1"></i>Lưu thông tin
                </button>
                <button className="btn btn-outline-success ms-2" onClick={() => setActiveTab('referral')}>
                  <i className="bi bi-arrow-right me-1"></i>Tạo chỉ định
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REFERRAL TAB */}
        {activeTab === 'referral' && selectedCase && (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-prescription2 text-primary me-2"></i>Tạo chỉ định cận lâm sàng
                </h5>
              </div>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  <i className="bi bi-search me-2"></i>Tìm dịch vụ
                </label>
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <select 
                      className="form-select"
                      value={selectedSpecialty}
                      onChange={e => setSelectedSpecialty(e.target.value)}
                    >
                      <option value="">-- Chọn chuyên khoa --</option>
                      {specialties.map(sp => (
                        <option key={sp._id} value={sp._id}>{sp.ten}</option>
                      ))}
                    </select>
                    {loadingSpecialties && <small className="text-muted">Đang tải...</small>}
                    {specialtiesError && <small className="text-danger">{specialtiesError}</small>}
                  </div>
                  <div className="col-md-8">
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Tìm tên dịch vụ..."
                      value={serviceQuery}
                      onChange={e => setServiceQuery(e.target.value)}
                    />
                    {loadingServices && <small className="text-muted">Đang tìm kiếm...</small>}
                    {servicesError && <small className="text-danger">{servicesError}</small>}
                  </div>
                </div>

                {serviceResults.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Kết quả tìm kiếm</label>
                    <div className="list-group list-group-sm">
                      {serviceResults.map(svc => (
                        <button
                          type="button"
                          key={svc._id}
                          className="list-group-item list-group-item-action"
                          onClick={() => orderService(svc)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-semibold">{svc.ten}</div>
                              <small className="text-muted">{svc.chuyenKhoaId?.ten || ''}</small>
                            </div>
                            <span className="badge bg-light text-dark">
                              {Number.isFinite(svc.gia) ? svc.gia.toLocaleString() + '₫' : ''}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {labs.length > 0 && (
                <div>
                  <label className="form-label fw-semibold">
                    <i className="bi bi-list-check text-success me-2"></i>Danh sách chỉ định
                  </label>
                  <div className="list-group list-group-sm">
                    {labs.map(l => (
                      <div key={l._id} className="list-group-item p-3 border-start border-3 border-primary">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{l.dichVuId?.ten || l.loaiChiDinh}</div>
                            <small className="text-muted d-block">{l.dichVuId?.chuyenKhoaId?.ten}</small>
                            <div className="mt-2">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Ghi chú..."
                                defaultValue={l.ghiChu || ''}
                                onBlur={e => updateLabNote(l._id, e.target.value)}
                                disabled={l.trangThai === 'da_xong'}
                              />
                            </div>
                          </div>
                          <div className="text-end ms-3">
                            <div className="small text-muted mb-1">
                              {Number.isFinite(l.dichVuId?.gia) ? l.dichVuId.gia.toLocaleString() + '₫' : ''}
                            </div>
                            <span className={`badge ${l.ketQua ? 'bg-success' : 'bg-warning'}`}>
                              {l.ketQua ? 'Có kết quả' : 'Chờ thực hiện'}
                            </span>
                            {l.trangThai === 'cho_thuc_hien' && (
                              <button
                                className="btn btn-outline-danger btn-sm d-block mt-2"
                                onClick={() => deleteService(l._id)}
                              >
                                <i className="bi bi-trash me-1"></i>Xóa
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="list-group-item list-group-item-light fw-semibold d-flex justify-content-between p-3">
                    <span>Tổng chi phí</span>
                    <span className="text-primary">
                      {labs.reduce((sum, it) => sum + (Number.isFinite(it?.dichVuId?.gia) ? it.dichVuId.gia : 0), 0).toLocaleString()}₫
                    </span>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="btn btn-outline-secondary" onClick={() => setActiveTab('exam')}>
                  <i className="bi bi-arrow-left me-1"></i>Quay lại
                </button>
                {labs.length > 0 && (
                  <button className="btn btn-outline-primary" onClick={() => setActiveTab('results')}>
                    <i className="bi bi-arrow-right me-1"></i>Xem kết quả
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === 'results' && selectedCase && (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0">
              <h5 className="mb-0">
                <i className="bi bi-file-text text-primary me-2"></i>Kết quả & Lịch sử khám
              </h5>
            </div>
            <div className="card-body">
              {labs.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-semibold mb-3">Kết quả hiện tại</h6>
                  <div className="list-group list-group-sm">
                    {labs.map(l => (
                      <div key={l._id} className="list-group-item p-3 border-start border-3 border-success">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{l.dichVuId?.ten || l.loaiChiDinh}</div>
                            <small className="text-muted d-block">{l.dichVuId?.chuyenKhoaId?.ten}</small>
                            {l.ketQua && (
                              <div className="mt-2 p-2 bg-light rounded">
                                <p className="small mb-1">
                                  <strong>📋 Kết quả:</strong> {l.ketQua}
                                </p>
                                {l.ghiChu && (
                                  <p className="small text-muted mb-0">
                                    <strong>📝 Ghi chú:</strong> {l.ghiChu}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <span className={`badge ${l.ketQua ? 'bg-success' : 'bg-warning'}`}>
                            {l.ketQua ? '✓ Có kết quả' : '⏳ Chờ kết quả'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {history.length > 0 && (
                <div>
                  <h6 className="fw-semibold mb-3">Lịch sử khám gần đây</h6>
                  <div className="list-group list-group-sm">
                    {history.map(h => (
                      <div key={h._id} className="list-group-item p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="small text-muted">{new Date(h.createdAt).toLocaleDateString()}</div>
                            <div className="fw-semibold">{h.chanDoan || 'Chưa ghi'}</div>
                          </div>
                          <span className="badge bg-light text-dark">{h.trangThai}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {labs.length === 0 && history.length === 0 && (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                  <p>Chưa có kết quả nào</p>
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="btn btn-outline-secondary" onClick={() => setActiveTab('referral')}>
                  <i className="bi bi-arrow-left me-1"></i>Quay lại
                </button>
                <button className="btn btn-outline-primary" onClick={() => setActiveTab('prescription')}>
                  <i className="bi bi-arrow-right me-1"></i>Kê đơn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRESCRIPTION TAB */}
        {activeTab === 'prescription' && selectedCase && (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0">
              <h5 className="mb-0">
                <i className="bi bi-capsule text-primary me-2"></i>Kê đơn thuốc → Chờ lấy thuốc (WAITING_FOR_MEDICINE)
              </h5>
            </div>
            <div className="card-body">
              {/* Medicine Search & Groups */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  <i className="bi bi-search me-2"></i>Tìm thuốc
                </label>
                
                {medicineGroups.length > 0 && (
                  <div className="mb-3 p-2 bg-light rounded">
                    <small className="text-muted d-block mb-2 fw-semibold">Nhóm thuốc</small>
                    <div className="d-flex flex-wrap gap-1">
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedGroup === '' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setSelectedGroup('')}
                      >
                        Tất cả
                      </button>
                      {medicineGroups.map(g => (
                        <button
                          type="button"
                          key={g.value || 'NONE'}
                          className={`btn btn-sm ${selectedGroup === g.value ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setSelectedGroup(g.value)}
                        >
                          {g.name} <span className="badge bg-light text-dark ms-1">{g.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="row g-2 mb-3">
                  <div className="col-md-8">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm tên thuốc..."
                      value={rxQuery}
                      onChange={e => setRxQuery(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 d-flex gap-1">
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill ${rxPriceOrder === 'asc' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRxPriceOrder(rxPriceOrder === 'asc' ? '' : 'asc')}
                    >
                      Giá ↑
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill ${rxPriceOrder === 'desc' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setRxPriceOrder(rxPriceOrder === 'desc' ? '' : 'desc')}
                    >
                      Giá ↓
                    </button>
                  </div>
                </div>

                {rxResults.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Kết quả tìm kiếm</label>
                    <div className="list-group list-group-sm">
                      {rxResults.map(m => (
                        <button
                          type="button"
                          key={m._id}
                          className="list-group-item list-group-item-action"
                          onClick={() => addMedicine(m)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-semibold">{m.tenThuoc}</div>
                              <small className="text-muted">{m.donViTinh || m.dangBaoChe || ''}</small>
                            </div>
                            <span className="badge bg-light text-dark">
                              {Number.isFinite(m.gia) ? m.gia.toLocaleString() + '₫' : ''}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <hr />

              {/* Prescription Table */}
              {rxItems.length > 0 && (
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-list-check me-2"></i>Danh sách thuốc kê đơn
                  </label>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle border">
                      <thead className="table-light">
                        <tr>
                          <th>Tên thuốc</th>
                          <th style={{width:70}} className="text-center">SL</th>
                          <th style={{width:60}} className="text-center">Sáng</th>
                          <th style={{width:60}} className="text-center">Trưa</th>
                          <th style={{width:60}} className="text-center">Tối</th>
                          <th style={{width:60}} className="text-center">Ngày</th>
                          <th>Ghi chú</th>
                          <th style={{width:40}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rxItems.map((it, idx) => (
                          <tr key={it.thuoc._id}>
                            <td>
                              <div className="small fw-semibold">{it.thuoc.tenThuoc}</div>
                              <small className="text-muted">{it.thuoc.donViTinh || it.thuoc.dangBaoChe || ''}</small>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm text-center"
                                value={it.soLuong}
                                onChange={e => updateQty(idx, e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm text-center"
                                value={it.dosageMorning || ''}
                                onChange={e => setRxItems(arr => arr.map((x, i) => i === idx ? {...x, dosageMorning: e.target.value} : x))}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm text-center"
                                value={it.dosageNoon || ''}
                                onChange={e => setRxItems(arr => arr.map((x, i) => i === idx ? {...x, dosageNoon: e.target.value} : x))}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm text-center"
                                value={it.dosageEvening || ''}
                                onChange={e => setRxItems(arr => arr.map((x, i) => i === idx ? {...x, dosageEvening: e.target.value} : x))}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-control form-control-sm text-center"
                                value={it.days || ''}
                                onChange={e => setRxItems(arr => arr.map((x, i) => i === idx ? {...x, days: e.target.value} : x))}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="HDSD"
                                value={it.usageNote || ''}
                                onChange={e => setRxItems(arr => arr.map((x, i) => i === idx ? {...x, usageNote: e.target.value} : x))}
                              />
                            </td>
                            <td>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => removeItem(idx)}
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Previous Prescriptions */}
              {prescriptions.length > 0 && (
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-archive me-2"></i>Đơn đã kê
                  </label>
                  <div className="accordion accordion-flush">
                    {prescriptions.map((rx, idx) => (
                      <div key={rx._id} className="accordion-item">
                        <h2 className="accordion-header">
                          <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#rx-${rx._id}`}>
                            <span className="small">
                              <strong>Đơn {idx + 1}</strong> • {new Date(rx.createdAt).toLocaleString()}
                              <span className="badge bg-light text-dark ms-2">{rx.items?.length || 0} thuốc</span>
                            </span>
                          </button>
                        </h2>
                        <div id={`rx-${rx._id}`} className="accordion-collapse collapse" data-bs-parent="#prescriptions">
                          <div className="accordion-body p-2">
                            {(!rx.items || rx.items.length === 0) ? (
                              <small className="text-muted">Trống</small>
                            ) : (
                              <ul className="list-group list-group-sm list-group-flush">
                                {rx.items.map(it => (
                                  <li key={it._id || it.thuocId?._id || Math.random()} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                      <div className="small fw-semibold">{it.tenThuoc || it.thuocId?.tenThuoc || '---'}</div>
                                      <small className="text-muted">{it.thuocId?.loaiThuoc?.ten || ''}</small>
                                    </div>
                                    <span className="badge bg-light text-dark">SL: {it.soLuong}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="btn btn-outline-secondary" onClick={() => setActiveTab('results')}>
                  <i className="bi bi-arrow-left me-1"></i>Quay lại
                </button>
                <button
                  className="btn btn-success"
                  onClick={submitPrescription}
                  disabled={rxItems.length === 0}
                >
                  <i className="bi bi-check-circle me-1"></i>Lưu đơn → Chờ lấy thuốc
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
