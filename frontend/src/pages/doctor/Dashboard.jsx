import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DoctorDashboard() {
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({ hoTen: '', soDienThoai: '' });
  const [caseForm, setCaseForm] = useState({ chanDoan: '', huongDieuTri: 'ngoai_tru' });
  const [casesToday, setCasesToday] = useState([]); // reused for selected day
  const [loadingCases, setLoadingCases] = useState(false);
  const todayDate = new Date().toISOString().slice(0,10);
  const [selectedDay, setSelectedDay] = useState(todayDate); // YYYY-MM-DD
  const [selectedCase, setSelectedCase] = useState(null);
  const [rxQuery, setRxQuery] = useState('');
  const [rxResults, setRxResults] = useState([]);
  const [rxItems, setRxItems] = useState([]); // {thuoc, soLuong}
  const [medicineGroups, setMedicineGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [rxPriceOrder, setRxPriceOrder] = useState(''); // '', 'asc', 'desc'
  const [todayPatients, setTodayPatients] = useState([]);
  const [caseDetail, setCaseDetail] = useState(null);
  const [clinical, setClinical] = useState({ trieuChung: '', khamLamSang: '', huyetAp: '', nhipTim: '', nhietDo: '', canNang: '', chieuCao: '' });
  const [labs, setLabs] = useState([]);
  const [history, setHistory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceResults, setServiceResults] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState('');

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  }), []);

  async function searchPatients(){
    try{
      const url = new URL(`${API_URL}/api/doctor/patients`);
      if (patientQuery) url.searchParams.set('q', patientQuery);
      url.searchParams.set('limit','10');
      const res = await fetch(url, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setPatients(json.items || []);
    }catch(e){ console.error(e); }
  }

  useEffect(()=>{ if(patientQuery.length>=1){ const t=setTimeout(searchPatients,300); return ()=>clearTimeout(t);} else { setPatients([]);} }, [patientQuery]);

  async function createPatientQuick(){
    try{
      if(!newPatient.hoTen) return alert('Nhập họ tên');
      const res = await fetch(`${API_URL}/api/doctor/patients`, { method:'POST', headers, body: JSON.stringify(newPatient) });
      const json = await res.json();
      if(!res.ok) throw json;
      setSelectedPatient(json);
      setNewPatient({ hoTen: '', soDienThoai: '' });
      alert('Đã tạo bệnh nhân');
    }catch(e){ alert(e?.message || 'Tạo bệnh nhân thất bại'); }
  }
      // Tải danh sách thuốc khi thay đổi từ khóa, nhóm hoặc sắp xếp giá
      useEffect(()=>{ if(rxQuery.length>=1){ const t=setTimeout(searchMedicines,300); return ()=>clearTimeout(t);} else { searchMedicines(); } }, [rxQuery, selectedGroup, rxPriceOrder]);
  async function loadCasesToday(){
    setLoadingCases(true);
    try{
      const url = new URL(`${API_URL}/api/doctor/cases`);
      // If selectedDay equals todayDate use 'today' shortcut (queue unaffected)
      if(selectedDay === todayDate){
        url.searchParams.set('date','today');
      } else {
        url.searchParams.set('date', selectedDay);
      }
      url.searchParams.set('limit','20');
      const res = await fetch(url, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setCasesToday(json.items || []);
    }catch(e){ console.error(e); }
    finally{ setLoadingCases(false); }
  }

  useEffect(()=>{ loadCasesToday(); },[selectedDay]);

  async function loadTodayPatients(){
    try{
      const res = await fetch(`${API_URL}/api/doctor/today/patients`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setTodayPatients(json);
    }catch(e){ console.error(e); }
  }

  useEffect(()=>{ loadTodayPatients(); },[]);

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
    }catch(e){ console.error(e); }
  }

  async function loadLabs(hsId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/cases/${hsId}/labs`, { headers });
      const json = await res.json();
      if(res.ok) setLabs(json); else console.error(json);
    }catch(e){ console.error(e); }
  }

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

  async function completeVisit(){
    try{
      if(!selectedCase?._id) return;
      const res = await fetch(`${API_URL}/api/doctor/cases/${selectedCase._id}/complete`, { method:'POST', headers });
      const json = await res.json();
      if(!res.ok) throw json;
      alert('Đã kết thúc ca khám');
      await Promise.all([loadCasesToday(), loadTodayPatients()]);
    }catch(e){ alert(e?.message || 'Lỗi kết thúc ca'); }
  }

  async function intake(lichKhamId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/appointments/${lichKhamId}/intake`, { method:'POST', headers });
      const json = await res.json();
      if(!res.ok) throw json;
      // Open / select returned case
      if(json.case){
        setSelectedCase(json.case);
        setCaseDetail(json.case);
        setClinical({ trieuChung:'', khamLamSang:'', huyetAp:'', nhipTim:'', nhietDo:'', canNang:'', chieuCao:'' });
      }
      await Promise.all([loadTodayPatients(), loadCasesToday()]);
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
        setSelectedCase(json.case);
        setCaseDetail(json.case);
        setClinical({ trieuChung:'', khamLamSang:'', huyetAp:'', nhipTim:'', nhietDo:'', canNang:'', chieuCao:'' });
      }
      await Promise.all([loadTodayPatients(), loadCasesToday()]);
    }catch(e){ alert(e?.message || 'Không thể gọi tiếp theo'); }
  }

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

  async function orderLab(loai){
    // legacy kept for quick buttons if needed
    try{
      if(!selectedCase?._id) return;
      const res = await fetch(`${API_URL}/api/doctor/cases/${selectedCase._id}/labs`, { method:'POST', headers, body: JSON.stringify({ loaiChiDinh: loai, dichVuId: serviceResults[0]?._id }) });
      const json = await res.json();
      if(res.ok){ await loadLabs(selectedCase._id); } else { alert(json?.message||'Lỗi'); }
    }catch(e){ alert('Lỗi chỉ định'); }
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

  // Service query effect: only clear results when no specialty selected
  useEffect(()=>{
    if(serviceQuery.length>0){
      const t=setTimeout(searchServices,300); return ()=>clearTimeout(t);
    } else {
      if(!selectedSpecialty) setServiceResults([]); // keep results if filtering by specialty with empty query
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
    }catch(e){ alert(e?.message || 'Lỗi chỉ định'); }
  }

  async function createCase(){
    try{
      if(!selectedPatient?._id) return alert('Chọn bệnh nhân');
      const payload = { benhNhanId: selectedPatient._id, chanDoan: caseForm.chanDoan, huongDieuTri: caseForm.huongDieuTri };
      const res = await fetch(`${API_URL}/api/doctor/cases`, { method:'POST', headers, body: JSON.stringify(payload) });
      const json = await res.json();
      if(!res.ok) throw json;
      setCaseForm({ chanDoan: '', huongDieuTri: 'ngoai_tru' });
      setSelectedPatient(null);
      await loadCasesToday();
      alert('Đã tạo hồ sơ khám');
    }catch(e){ alert(e?.message || 'Tạo hồ sơ khám thất bại'); }
  }

  async function searchMedicines(){
    try{
      const url = new URL(`${API_URL}/api/doctor/medicines`);
      if (rxQuery) url.searchParams.set('q', rxQuery);
      url.searchParams.set('limit','8');
      // selectedGroup '' means ALL; 'NONE' means ungrouped medicines
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

  // Load medicines also when no query (initial list) or group changes
  useEffect(()=>{
    const delay = setTimeout(searchMedicines, rxQuery ? 300 : 0);
    return ()=>clearTimeout(delay);
  }, [rxQuery, selectedGroup, rxPriceOrder]);

  function addMedicine(m){
    if(!m) return;
    setRxItems(items => {
      if(items.some(x => x.thuoc._id === m._id)) return items; // avoid dup
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
      alert('Đã kê đơn');
      await loadPrescriptions(selectedCase._id);
    }catch(e){ alert(e?.message || 'Kê đơn thất bại'); }
  }

  return (
    <div className="container py-2">
      <div className="hc-card">
        <div className="hc-card-header d-flex justify-content-between align-items-center">
          <span>Hồ sơ khám {selectedDay === todayDate ? 'hôm nay' : new Date(selectedDay+'T00:00:00').toLocaleDateString()}</span>
          <div className="d-flex align-items-center gap-2">
            <input type="date" className="form-control form-control-sm" style={{width:'150px'}} max={todayDate} value={selectedDay} onChange={e=>setSelectedDay(e.target.value)} />
            <div className="btn-group btn-group-sm" role="group">
              <button type="button" className="btn btn-outline-secondary" onClick={()=>{
                const d = new Date(selectedDay+'T00:00:00'); d.setDate(d.getDate()-1); setSelectedDay(d.toISOString().slice(0,10));
              }}>{'<'}
              </button>
              <button type="button" className="btn btn-outline-secondary" disabled={selectedDay===todayDate} onClick={()=>{
                const d = new Date(selectedDay+'T00:00:00'); d.setDate(d.getDate()+1); const next = d.toISOString().slice(0,10); if(next<=todayDate) setSelectedDay(next);
              }}>{'>'}
              </button>
              <button type="button" className="btn btn-outline-primary" disabled={selectedDay===todayDate} onClick={()=>setSelectedDay(todayDate)}>Hôm nay</button>
            </div>
          </div>
        </div>
        <div className="card-body">
              {loadingCases ? (
                <div>Đang tải...</div>
              ) : casesToday.length===0 ? (
                <div className="text-muted">Không có hồ sơ cho ngày này</div>
              ) : (
                <div className="list-group">
                  {casesToday.map(hs => (
                    <button type="button" key={hs._id} className={`list-group-item list-group-item-action ${selectedCase?._id===hs._id?'active':''}`} onClick={()=>openCase(hs._id)}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{hs.benhNhanId?.hoTen}</div>
                          <div className="small opacity-75">{new Date(hs.createdAt).toLocaleTimeString()} • {hs.chanDoan || 'Chưa ghi'}</div>
                        </div>
                        <span className="badge text-bg-light">{hs.huongDieuTri || 'N/A'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
        </div>
      </div>

      <div className="hc-card">
        <div className="hc-card-header d-flex justify-content-between align-items-center">
          <span>Hàng đợi hôm nay</span>
          <button className="btn btn-sm btn-outline-primary" onClick={callNext}><i className="bi bi-chevron-double-right"/> Gọi tiếp</button>
        </div>
        <div className="card-body">
              {todayPatients.length===0 ? (
                <div className="text-muted">Chưa có lịch hẹn</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th style={{width:60}}>STT</th>
                        <th>Bệnh nhân</th>
                        <th style={{width:90}}>Năm sinh</th>
                        <th style={{width:120}}>Trạng thái</th>
                        <th className="text-end" style={{width:140}}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayPatients.map((it, idx)=> {
                        const year = it.benhNhan?.ngaySinh ? new Date(it.benhNhan.ngaySinh).getFullYear() : '';
                        let stLabel = 'Chờ khám';
                        if(selectedCase && caseDetail?.benhNhanId?._id === it.benhNhan?._id) stLabel = 'Đang khám';
                        const disabled = !it.soThuTu;
                        return (
                          <tr key={idx}>
                            <td>{it.soThuTu || '-'}</td>
                            <td>{it.benhNhan?.hoTen}</td>
                            <td>{year}</td>
                            <td>{stLabel}</td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm" role="group">
                                <button disabled={disabled} className="btn btn-outline-primary" title="Gọi / Tiếp nhận" onClick={()=>intake(it._id)}><i className="bi bi-telephone"/></button>
                                <button disabled={disabled} className="btn btn-outline-secondary" title="Thông báo" onClick={()=>notify(it._id)}><i className="bi bi-bell"/></button>
                                <button disabled={disabled} className="btn btn-outline-danger" title="Bỏ qua" onClick={()=>skip(it._id)}><i className="bi bi-skip-forward"/></button>
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

      {selectedCase && (
        <div className="hc-card hc-card--wide">
          <div className="hc-card-header">Khám cho: {caseDetail?.benhNhanId?.hoTen || selectedCase.benhNhanId?.hoTen}</div>
          <div className="card-body">
                <div className="mb-3">
                  <div className="fw-semibold mb-2">Thông tin lâm sàng</div>
                  <div className="row g-2">
                    <div className="col-12"><textarea className="form-control" placeholder="Triệu chứng" value={clinical.trieuChung} onChange={e=>setClinical(s=>({...s, trieuChung:e.target.value}))}/></div>
                    <div className="col-12"><textarea className="form-control" placeholder="Khám lâm sàng" value={clinical.khamLamSang} onChange={e=>setClinical(s=>({...s, khamLamSang:e.target.value}))}/></div>
                    <div className="col-6"><input className="form-control" placeholder="Huyết áp" value={clinical.huyetAp} onChange={e=>setClinical(s=>({...s, huyetAp:e.target.value}))}/></div>
                    <div className="col-6"><input className="form-control" type="number" placeholder="Nhịp tim" value={clinical.nhipTim} onChange={e=>setClinical(s=>({...s, nhipTim:e.target.value}))}/></div>
                    <div className="col-6"><input className="form-control" type="number" step="0.1" placeholder="Nhiệt độ (°C)" value={clinical.nhietDo} onChange={e=>setClinical(s=>({...s, nhietDo:e.target.value}))}/></div>
                    <div className="col-3"><input className="form-control" type="number" step="0.1" placeholder="Cân nặng (kg)" value={clinical.canNang} onChange={e=>setClinical(s=>({...s, canNang:e.target.value}))}/></div>
                    <div className="col-3"><input className="form-control" type="number" step="0.1" placeholder="Chiều cao (cm)" value={clinical.chieuCao} onChange={e=>setClinical(s=>({...s, chieuCao:e.target.value}))}/></div>
                  </div>
                  <div className="d-flex justify-content-end mt-2 gap-2">
                    <button className="btn btn-outline-primary btn-sm" onClick={saveClinical}><i className="bi bi-save"/> Lưu lâm sàng</button>
                    <button className="btn btn-outline-success btn-sm" onClick={completeVisit}><i className="bi bi-check2-circle"/> Kết thúc ca</button>
                  </div>
                </div>

                <hr/>
                <div className="mb-3">
                  <div className="fw-semibold mb-2">Chỉ định cận lâm sàng (dịch vụ)</div>
                  <div className="row g-2 mb-2">
                    <div className="col-md-5">
                      <select className="form-select" value={selectedSpecialty} onChange={e=>setSelectedSpecialty(e.target.value)}>
                        <option value="">-- Chọn chuyên khoa --</option>
                        {specialties.map(sp => <option key={sp._id} value={sp._id}>{sp.ten}</option>)}
                      </select>
                      {loadingSpecialties && <small className="text-muted">Đang tải chuyên khoa...</small>}
                      {specialtiesError && <small className="text-danger">{specialtiesError}</small>}
                    </div>
                    <div className="col-md-7">
                      <input className="form-control" placeholder="Tìm dịch vụ..." value={serviceQuery} onChange={e=>setServiceQuery(e.target.value)} />
                      {loadingServices && <small className="text-muted">Đang tìm dịch vụ...</small>}
                      {servicesError && <small className="text-danger">{servicesError}</small>}
                    </div>
                  </div>
                  {serviceResults.length>0 && (
                    <div className="list-group mb-2">
                      {serviceResults.map(svc => (
                        <button type="button" key={svc._id} className="list-group-item list-group-item-action" onClick={()=>orderService(svc)}>
                          <div className="d-flex justify-content-between">
                            <span>{svc.ten}</span>
                            <small className="text-muted">{Number.isFinite(svc.gia)? svc.gia.toLocaleString()+'₫':''}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {labs.length>0 && (
                    <ul className="list-group">
                      {labs.map(l => (
                        <li key={l._id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div className="d-flex flex-column">
                            <span>{l.dichVuId?.ten || l.loaiChiDinh}</span>
                            {l.dichVuId?.chuyenKhoaId?.ten && <small className="text-muted">{l.dichVuId.chuyenKhoaId.ten}</small>}
                            <div className="mt-1">
                              <input
                                className="form-control form-control-sm"
                                placeholder="Ghi chú..."
                                defaultValue={l.ghiChu || ''}
                                onBlur={async (e)=>{
                                  const val = e.target.value;
                                  if(val !== (l.ghiChu||'')){
                                    try{
                                      const res = await fetch(`${API_URL}/api/doctor/labs/${l._id}/note`, { method:'PUT', headers, body: JSON.stringify({ ghiChu: val }) });
                                      if(res.ok){ const updated = await res.json(); setLabs(ls=> ls.map(x=> x._id===updated._id? updated : x)); }
                                    }catch(err){ console.error(err); }
                                  }
                                }}
                                disabled={l.trangThai==='da_xong'}
                              />
                            </div>
                          </div>
                          <div className="d-flex flex-column align-items-end">
                            {Number.isFinite(l.dichVuId?.gia) && <small className="text-muted">{l.dichVuId.gia.toLocaleString()}₫</small>}
                            <span className="badge text-bg-light">{l.ketQua? 'Đã có kết quả':'Đang chờ'}</span>
                            {l.trangThai==='cho_thuc_hien' && (
                              <button className="btn btn-sm btn-outline-danger mt-1" onClick={async ()=> {
                                if(!confirm('Xóa chỉ định này?')) return;
                                try{
                                  const res = await fetch(`${API_URL}/api/doctor/labs/${l._id}`, { method:'DELETE', headers });
                                  const json = await res.json();
                                  if(res.ok){ setLabs(json.items || []); }
                                }catch(err){ console.error(err); }
                              }}>Xóa</button>
                            )}
                          </div>
                        </li>
                      ))}
                      <li className="list-group-item d-flex justify-content-between fw-semibold">
                        <span>Tổng chi phí</span>
                        <span>{labs.reduce((sum, it)=> sum + (Number.isFinite(it?.dichVuId?.gia)? it.dichVuId.gia : 0), 0).toLocaleString()}₫</span>
                      </li>
                    </ul>
                  )}
                </div>

                <hr/>
                {history.length>0 && (
                  <div className="mb-3">
                    <div className="fw-semibold mb-2">Lịch sử khám gần đây</div>
                    <ul className="list-group">
                      {history.map(h => (
                        <li key={h._id} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>{new Date(h.createdAt).toLocaleDateString()} • {h.chanDoan || 'Chưa ghi'}</span>
                          <span className="badge text-bg-light">{h.trangThai || ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Kê đơn thuốc */}
                <hr/>
                <div className="mb-3">
                  <div className="fw-semibold mb-2">Kê đơn thuốc</div>
                  {medicineGroups.length>0 && (
                    <div className="mb-2">
                      <div className="small text-muted mb-1">Nhóm thuốc</div>
                      <div className="d-flex flex-wrap gap-1">
                        <button type="button" className={`btn btn-sm ${selectedGroup===''?'btn-primary':'btn-outline-primary'}`} onClick={()=>setSelectedGroup('')}>Tất cả</button>
                        {medicineGroups.map(g => (
                          <button
                            type="button"
                            key={g.value||'NONE'}
                            className={`btn btn-sm ${selectedGroup===g.value?'btn-primary':'btn-outline-primary'}`}
                            onClick={()=>setSelectedGroup(g.value)}
                          >{g.name} <span className="badge text-bg-light ms-1">{g.count}</span></button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="row g-2 mb-2">
                    <div className="col-md-6">
                      <input className="form-control" placeholder="Tìm thuốc..." value={rxQuery} onChange={e=>setRxQuery(e.target.value)} />
                    </div>
                    <div className="col-md-6 d-flex gap-2 align-items-start">
                      <button type="button" className={`btn btn-outline-primary btn-sm ${rxPriceOrder==='asc'?'active':''}`} onClick={()=> setRxPriceOrder(rxPriceOrder==='asc'? '' : 'asc')}>Giá ↑</button>
                      <button type="button" className={`btn btn-outline-primary btn-sm ${rxPriceOrder==='desc'?'active':''}`} onClick={()=> setRxPriceOrder(rxPriceOrder==='desc'? '' : 'desc')}>Giá ↓</button>
                      {rxPriceOrder && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={()=> setRxPriceOrder('')}>Xóa</button>}
                    </div>
                  </div>
                  {rxResults.length>0 && (
                    <div className="list-group mb-2">
                      {rxResults.map(m => (
                        <button type="button" key={m._id} className="list-group-item list-group-item-action" onClick={()=>addMedicine(m)}>
                          <div className="d-flex justify-content-between align-items-center">
                            <span>{m.tenThuoc}</span>
                            <div className="text-end d-flex flex-column">
                              <small className="text-muted">{m.donViTinh || m.dangBaoChe || ''}</small>
                              {Number.isFinite(m.gia) && <small>{m.gia.toLocaleString()}₫</small>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {rxItems.length>0 && (
                    <div className="table-responsive mb-2">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr>
                            <th>Thuốc</th>
                            <th style={{width:70}}>SL</th>
                            <th style={{width:60}}>Sáng</th>
                            <th style={{width:60}}>Trưa</th>
                            <th style={{width:60}}>Tối</th>
                            <th style={{width:70}}>Ngày</th>
                            <th>Ghi chú</th>
                            <th style={{width:40}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rxItems.map((it, idx) => (
                            <tr key={it.thuoc._id}>
                              <td>
                                <div className="d-flex flex-column">
                                  <span>{it.thuoc.tenThuoc}</span>
                                  <small className="text-muted">{it.thuoc.donViTinh || it.thuoc.dangBaoChe || ''}</small>
                                  {Number.isFinite(it.thuoc.gia) && <small>{it.thuoc.gia.toLocaleString()}₫</small>}
                                </div>
                              </td>
                              <td><input type="number" min="1" className="form-control form-control-sm" value={it.soLuong} onChange={(e)=>updateQty(idx, e.target.value)} /></td>
                              <td><input type="number" min="0" className="form-control form-control-sm" value={it.dosageMorning||''} onChange={(e)=> setRxItems(arr=> arr.map((x,i)=> i===idx? { ...x, dosageMorning: e.target.value } : x))} /></td>
                              <td><input type="number" min="0" className="form-control form-control-sm" value={it.dosageNoon||''} onChange={(e)=> setRxItems(arr=> arr.map((x,i)=> i===idx? { ...x, dosageNoon: e.target.value } : x))} /></td>
                              <td><input type="number" min="0" className="form-control form-control-sm" value={it.dosageEvening||''} onChange={(e)=> setRxItems(arr=> arr.map((x,i)=> i===idx? { ...x, dosageEvening: e.target.value } : x))} /></td>
                              <td><input type="number" min="0" className="form-control form-control-sm" value={it.days||''} onChange={(e)=> setRxItems(arr=> arr.map((x,i)=> i===idx? { ...x, days: e.target.value } : x))} /></td>
                              <td><input type="text" className="form-control form-control-sm" placeholder="HDSD" value={it.usageNote||''} onChange={(e)=> setRxItems(arr=> arr.map((x,i)=> i===idx? { ...x, usageNote: e.target.value } : x))} /></td>
                              <td><button className="btn btn-outline-danger btn-sm" onClick={()=>removeItem(idx)}><i className="bi bi-x"/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={submitPrescription} disabled={rxItems.length===0}><i className="bi bi-capsule"/> Lưu đơn thuốc</button>
                  </div>
                </div>

                {prescriptions.length>0 && (
                  <div className="mb-3">
                    <div className="fw-semibold mb-2">Đơn đã kê</div>
                    <div className="accordion" id="rxAccordion">
                      {prescriptions.map((rx, idx) => (
                        <div className="accordion-item" key={rx._id}>
                          <h2 className="accordion-header" id={`rx-h-${rx._id}`}>
                            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#rx-c-${rx._id}`} aria-expanded="false" aria-controls={`rx-c-${rx._id}`}>
                              <div className="d-flex flex-column">
                                <span>Đơn {idx+1} • {new Date(rx.createdAt).toLocaleString()}</span>
                                <small className="text-muted">{rx.items?.length || 0} thuốc</small>
                              </div>
                            </button>
                          </h2>
                          <div id={`rx-c-${rx._id}`} className="accordion-collapse collapse" aria-labelledby={`rx-h-${rx._id}`} data-bs-parent="#rxAccordion">
                            <div className="accordion-body p-2">
                              {(!rx.items || rx.items.length===0) ? <div className="text-muted small">Trống</div> : (
                                <ul className="list-group list-group-flush">
                                  {rx.items.map(it => (
                                    <li key={it._id || it.thuocId?._id || Math.random()} className="list-group-item d-flex justify-content-between align-items-center">
                                      <div className="d-flex flex-column">
                                        <span>{it.tenThuoc || it.thuocId?.tenThuoc || '---'}</span>
                                        <small className="text-muted">{it.thuocId?.loaiThuoc?.ten || '---'}</small>
                                      </div>
                                      <span className="badge text-bg-light">SL: {it.soLuong}</span>
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

                <hr/>
                
               
               
          </div>
        </div>
      )}
    </div>
  );
}
