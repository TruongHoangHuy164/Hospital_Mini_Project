/**
 * FILE: Dashboard.jsx (Doctor)
 * MÔ TẢ: Trang làm việc chính của bác sĩ
 * Chức năng:
 * - Xem danh sách bệnh nhân hôm nay (call queue)
 * - Khám bệnh: nhập triệu chứng, khám lâm sàng, chỉ số sức khỏe
 * - Chỉ định xét nghiệm và chụp chiếu
 * - Kê đơn thuốc
 * - Xem lịch sử khám bệnh của bệnh nhân
 * - Xem kết quả xét nghiệm
 */

import React, { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DoctorDashboard() {
  // ===== QUẢN LÝ TAB =====
  const [activeTab, setActiveTab] = useState('call'); // 'call', 'history', 'exam', 'referral', 'results', 'prescription'
  
  // ===== STATE CỐT LÕI =====
  const todayDate = new Date().toISOString().slice(0,10);
  const [todayPatients, setTodayPatients] = useState([]); // Danh sách bệnh nhân hôm nay
  const [selectedCase, setSelectedCase] = useState(null); // Hồ sơ khám được chọn
  const [caseDetail, setCaseDetail] = useState(null); // Chi tiết hồ sơ khám
  const [selectedDate, setSelectedDate] = useState(todayDate); // Ngày xem lịch sử
  const [historyFilter, setHistoryFilter] = useState('today'); // Bộ lọc lịch sử: 'today', 'month', 'custom'
  const [patientHistoryModal, setPatientHistoryModal] = useState(false); // Modal xem lịch sử khám
  const [patientHistoryList, setPatientHistoryList] = useState([]); // Lịch sử khám của bệnh nhân
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null); // Bệnh nhân đang xem lịch sử
  const [historySearchQuery, setHistorySearchQuery] = useState(''); // Từ khóa tìm bệnh nhân
  const [historySearchResults, setHistorySearchResults] = useState([]); // Kết quả tìm kiếm
  
  // ===== STATE THỐNG KÊ =====
  const [stats, setStats] = useState({ chiDinhPending: 0, toaThuoc: 0 });
  
  // ===== STATE KHÁM BỆNH =====
  const [clinical, setClinical] = useState({ trieuChung: '', khamLamSang: '', huyetAp: '', nhipTim: '', nhietDo: '', canNang: '', chieuCao: '' });
  
  // ===== STATE CHỈ ĐỊNH XÉT NGHIỆM =====
  const [labs, setLabs] = useState([]); // Danh sách dịch vụ đã chọn
  const [serviceQuery, setServiceQuery] = useState(''); // Từ khóa tìm dịch vụ
  const [serviceResults, setServiceResults] = useState([]); // Kết quả tìm kiếm dịch vụ
  const [specialties, setSpecialties] = useState([]); // Danh sách chuyên khoa
  const [selectedSpecialty, setSelectedSpecialty] = useState(''); // Chuyên khoa được chọn
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState('');
  
  // ===== STATE KẾT QUẢ & LỊCH Sử =====
  const [history, setHistory] = useState([]); // Lịch sử khám
  const [prescriptions, setPrescriptions] = useState([]); // Đơn thuốc
  
  // ===== STATE KÊ ĐƠN THUỐC =====
  const [rxQuery, setRxQuery] = useState(''); // Từ khóa tìm thuốc
  const [rxResults, setRxResults] = useState([]); // Kết quả tìm thuốc
  const [rxItems, setRxItems] = useState([]); // Danh sách thuốc trong đơn
  const [medicineGroups, setMedicineGroups] = useState([]); // Danh mục thuốc
  const [selectedGroup, setSelectedGroup] = useState(''); // Danh mục được chọn
  const [rxPriceOrder, setRxPriceOrder] = useState(''); // Sắp xếp theo giá
  const [submittingRx, setSubmittingRx] = useState(false); // Trạng thái gửi kê đơn để chống double-click

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  }), []);

  /**
   * Tải danh sách bệnh nhân hôm nay
   */
  async function loadTodayPatients(){
    try{
      const res = await fetch(`${API_URL}/api/doctor/today/patients`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setTodayPatients(json);
    }catch(e){ console.error(e); }
  }

  /**
   * Tải lịch sử khám theo ngày cụ thể
   */
  async function loadHistoryByDate(date){
    try{
      const res = await fetch(`${API_URL}/api/doctor/patients?date=${date}`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setTodayPatients(Array.isArray(json) ? json : (json?.patients || []));
    }catch(e){ console.error(e); alert('Lỗi tải dữ liệu'); setTodayPatients([]);
    }
  }

  /**
   * Tải lịch sử khám theo tháng
   */
  async function loadHistoryByMonth(year, month){
    try{
      const res = await fetch(`${API_URL}/api/doctor/patients?year=${year}&month=${month}`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setTodayPatients(Array.isArray(json) ? json : (json?.patients || []));
    }catch(e){ console.error(e); alert('Lỗi tải dữ liệu'); setTodayPatients([]);
    }
  }

  useEffect(() => { 
    loadTodayPatients(); 
    loadTodayStats();
  }, []);

  // ===== REALTIME (POLLING) FOR TODAY PATIENTS =====
  // Tự động cập nhật danh sách bệnh nhân hôm nay theo chu kỳ, tạm dừng khi tab bị ẩn
  useEffect(() => {
    const intervalMs = 7000; // 7 giây một lần (cân bằng tải và độ trễ)
    let timer = null;

    function startPolling(){
      if(timer) return;
      timer = setInterval(() => {
        // Tránh gọi khi tab bị ẩn để giảm tải
        if(document.hidden) return;
        loadTodayPatients();
      }, intervalMs);
    }

    function stopPolling(){
      if(timer){ clearInterval(timer); timer = null; }
    }

    const onVisibilityChange = () => {
      if(document.hidden){ stopPolling(); }
      else { startPolling(); }
    };

    // Bắt đầu polling khi vào trang và tab đang hiển thị
    if(!document.hidden){ startPolling(); }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // ===== LOAD PATIENT PREVIOUS VISITS =====
  async function loadPatientHistory(benhNhanId){
    try{
      const res = await fetch(`${API_URL}/api/doctor/patients/${benhNhanId}/history`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setPatientHistoryList(Array.isArray(json) ? json : (json?.cases || []));
    }catch(e){ console.error(e); alert('Lỗi tải lịch sử khám'); }
  }

  // ===== LOAD TODAY'S STATISTICS =====
  async function loadTodayStats(){
    try{
      const res = await fetch(`${API_URL}/api/doctor/today/stats`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setStats(json || { chiDinhPending: 0, toaThuoc: 0 });
    }catch(e){ console.error(e); }
  }

  function openPatientHistoryModal(benhNhan){
    setSelectedPatientHistory(benhNhan);
    loadPatientHistory(benhNhan._id);
    setPatientHistoryModal(true);
  }

  // ===== SEARCH PATIENTS FOR HISTORY TAB =====
  async function searchPatientsByName(){
    if(!historySearchQuery.trim()) {
      setHistorySearchResults([]);
      return;
    }
    try{
      const res = await fetch(`${API_URL}/api/patients?q=${encodeURIComponent(historySearchQuery)}`, { headers });
      const json = await res.json();
      if(!res.ok) throw json;
      setHistorySearchResults(Array.isArray(json) ? json : (json?.patients || []));
    }catch(e){ console.error(e); setHistorySearchResults([]); }
  }

  useEffect(() => {
    const delay = setTimeout(searchPatientsByName, 300);
    return () => clearTimeout(delay);
  }, [historySearchQuery]);

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
    if(submittingRx) return; // tránh double click
    setSubmittingRx(true);
    try{
      if(!selectedCase?._id) { alert('Chọn hồ sơ khám'); return; }
      if(rxItems.length===0) { alert('Chưa chọn thuốc'); return; }
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
      let json = null;
      try { json = await res.json(); } catch { json = {}; }
      if(!res.ok) { throw (json || { message: 'Kê đơn thất bại' }); }
      // Thành công: làm sạch form và hiển thị thông báo ngay
      setRxItems([]); setRxResults([]); setRxQuery('');
      if(json?.case){ setCaseDetail(json.case); setSelectedCase(json.case); }
      alert('Đã kê đơn - Hồ sơ đã chuyển sang trạng thái Khám xong');
      // Các bước tải dữ liệu tiếp theo tách riêng để nếu lỗi không ảnh hưởng thông báo thành công
      try{
        await loadPrescriptions((json?.case?._id) || selectedCase._id);
        await loadTodayPatients();
      }catch(e){ console.warn('Lỗi cập nhật dữ liệu sau kê đơn:', e); }
    }catch(e){
      alert(e?.message || 'Kê đơn thất bại');
    } finally {
      setSubmittingRx(false);
    }
  }

  async function completeVisit(){
    try{
      if(!selectedCase?._id) return;
      // Không dùng nút kết thúc ca nữa
      alert('Chức năng kết thúc ca đã được bỏ. Vui lòng kê đơn để hoàn tất.');
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
      'hoan_tat': '✅ Khám xong'
    };
    return statuses[caseDetail.trangThai] || caseDetail.trangThai || 'N/A';
  }

  function extractProvince(address) {
    if (!address) return 'N/A';
    
    // List of Vietnamese provinces and cities
    const provinces = [
      'Hà Nội', 'TP. Hồ Chí Minh', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
      'An Giang', 'Bà Rịa - Vũng Tàu', 'Bạc Liêu', 'Bắc Giang', 'Bắc Kạn', 'Bắc Ninh',
      'Bến Tre', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng',
      'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai',
      'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
      'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
      'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình',
      'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi',
      'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình',
      'Thái Nguyên', 'Thanh Hóa', 'Thừa Thiên - Huế', 'Tiền Giang', 'TP Hồ Chí Minh',
      'TP Hà Nội', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
    ];

    // Sort by length descending to match longer names first
    const sorted = provinces.sort((a, b) => b.length - a.length);
    
    for (const prov of sorted) {
      if (address.includes(prov)) {
        return prov;
      }
    }
    
    // If no match, try to get the last part (assuming format: street, district, province)
    const parts = address.split(',').map(p => p.trim());
    return parts[parts.length - 1] || 'N/A';
  }

  return (
    <div className="py-3">
      {/* ===== STATISTICS SECTION ===== */}
      <div className="container-fluid mb-3">
        <div className="row g-3">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-primary bg-opacity-10 h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="bi bi-person-fill fs-3 text-primary"></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">Bệnh nhân hôm nay</small>
                    <h5 className="mb-0 fw-bold text-primary">{Array.isArray(todayPatients) ? todayPatients.length : 0}</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-warning bg-opacity-10 h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="bi bi-hourglass-split fs-3 text-warning"></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">Đang chờ khám</small>
                    <h5 className="mb-0 fw-bold text-warning">{Array.isArray(todayPatients) ? todayPatients.filter(p => p.trangThai === 'cho_kham').length : 0}</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-info bg-opacity-10 h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="bi bi-clipboard-check fs-3 text-info"></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">Số chỉ định chờ kết quả</small>
                    <h5 className="mb-0 fw-bold text-info">{stats.chiDinhPending}</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-success bg-opacity-10 h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="bi bi-capsule fs-3 text-success"></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">Toa thuốc đã kê</small>
                    <h5 className="mb-0 fw-bold text-success">{stats.toaThuoc}</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== DATE/MONTH FILTER FOR HISTORY ===== */}
      <div className="container-fluid mb-3">
        <div className="card shadow-sm border-0 bg-light">
          <div className="card-body p-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div>
                <i className="bi bi-calendar3 me-2 text-muted"></i>
                <small className="text-muted fw-semibold">Xem lịch sử khám:</small>
              </div>
              
              {/* Hôm nay */}
              <button 
                className={`btn btn-sm ${historyFilter === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => {
                  setHistoryFilter('today');
                  setSelectedDate(todayDate);
                  loadTodayPatients();
                }}
              >
                <i className="bi bi-calendar-day me-1"></i>Hôm nay
              </button>

              {/* Chọn ngày */}
              <div>
                <input 
                  type="date" 
                  className="form-control form-control-sm"
                  value={selectedDate}
                  max={todayDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setHistoryFilter('date');
                    loadHistoryByDate(e.target.value);
                  }}
                />
              </div>

              {/* Chọn tháng */}
              <div>
                <input 
                  type="month" 
                  className="form-control form-control-sm"
                  defaultValue={todayDate.slice(0, 7)}
                  onChange={(e) => {
                    if(e.target.value) {
                      const [year, month] = e.target.value.split('-');
                      setHistoryFilter('month');
                      loadHistoryByMonth(year, month);
                    }
                  }}
                />
              </div>

              {/* Status Badge */}
              <div className="ms-auto">
                <span className="badge bg-secondary">
                  {historyFilter === 'today' && '📅 Hôm nay'}
                  {historyFilter === 'date' && `📆 ${new Date(selectedDate).toLocaleDateString('vi-VN')}`}
                  {historyFilter === 'month' && '📊 Tháng'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                className={`nav-link fw-semibold ${activeTab === 'history' ? 'active border-bottom border-3 border-primary text-primary' : 'text-muted'}`}
                onClick={() => setActiveTab('history')}
                role="tab"
              >
                <i className="bi bi-clock-history me-2"></i>Xem lịch sử
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
                        // Tính năm sinh an toàn: nếu thiếu hoặc ngày không hợp lệ thì hiển thị '-'
                        const year = (() => {
                          const dob = it.benhNhan?.ngaySinh;
                          if(!dob) return '-';
                          const dt = new Date(dob);
                          const y = dt.getFullYear();
                          return Number.isFinite(y) ? y : '-';
                        })();
                        let stLabel = 'Chờ khám';
                        let stBadge = 'bg-warning';
                        
                        // Kiểm tra trạng thái tổng thể của LichKham
                        if(it.trangThai === 'hoan_tat' || it.trangThai === 'da_kham') {
                          stLabel = '✅ Khám xong';
                          stBadge = 'bg-success';
                        } else if(selectedCase && caseDetail?.benhNhanId?._id === it.benhNhan?._id) {
                          stLabel = 'Đang khám';
                          stBadge = 'bg-info';
                        }
                        const disabled = !it.soThuTu || it.trangThai === 'hoan_tat' || it.trangThai === 'da_kham';
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
                                  className="btn btn-outline-secondary" 
                                  title="Xem lịch sử khám"
                                  onClick={() => openPatientHistoryModal(it.benhNhan)}
                                >
                                  <i className="bi bi-clock-history"></i>
                                </button>
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

        {/* HISTORY SEARCH TAB */}
        {activeTab === 'history' && (
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0">
              <h5 className="mb-0">
                <i className="bi bi-clock-history text-primary me-2"></i>Xem lịch sử khám bệnh nhân
              </h5>
            </div>
            <div className="card-body">
              {/* Search Box */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  <i className="bi bi-search me-2"></i>Tìm bệnh nhân
                </label>
                <input 
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Nhập tên hoặc số điện thoại bệnh nhân..."
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {historySearchQuery.trim() && (
                <div>
                  <label className="form-label fw-semibold small text-muted">
                    Kết quả tìm kiếm ({historySearchResults.length})
                  </label>
                  {historySearchResults.length > 0 ? (
                    <div className="list-group">
                      {historySearchResults.map(bn => {
                        const year = bn.ngaySinh ? new Date(bn.ngaySinh).getFullYear() : '';
                        return (
                          <div key={bn._id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-semibold">{bn.hoTen}</div>
                                <small className="text-muted">
                                  📱 {bn.soDienThoai || '---'} • 🎂 {year || '---'}
                                </small>
                              </div>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setSelectedPatientHistory(bn);
                                  loadPatientHistory(bn._id);
                                  setPatientHistoryModal(true);
                                }}
                              >
                                <i className="bi bi-clipboard-check me-1"></i>Xem lịch sử
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      Không tìm thấy bệnh nhân
                    </div>
                  )}
                </div>
              )}

              {!historySearchQuery.trim() && (
                <div className="alert alert-secondary text-center py-5">
                  <i className="bi bi-search fs-1 d-block mb-2"></i>
                  <p className="mb-0">Nhập tên hoặc số điện thoại để tìm kiếm bệnh nhân</p>
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
            
            {/* Patient Info Card */}
            <div className="card-body bg-light border-bottom">
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-person-circle text-primary fs-5"></i>
                    <div>
                      <small className="text-muted d-block">Họ tên</small>
                      <strong className="text-break">{caseDetail?.benhNhanId?.hoTen || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-calendar-event text-success fs-5"></i>
                    <div>
                      <small className="text-muted d-block">Tuổi</small>
                      <strong>
                        {caseDetail?.benhNhanId?.ngaySinh 
                          ? new Date().getFullYear() - new Date(caseDetail.benhNhanId.ngaySinh).getFullYear() 
                          : 'N/A'} tuổi
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-venus-mars text-warning fs-5"></i>
                    <div>
                      <small className="text-muted d-block">Giới tính</small>
                      <strong>
                        {caseDetail?.benhNhanId?.gioiTinh === 'nam' ? '👨 Nam' : 
                         caseDetail?.benhNhanId?.gioiTinh === 'nu' ? '👩 Nữ' : 'Khác'}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-telephone text-danger fs-5"></i>
                    <div>
                      <small className="text-muted d-block">Số điện thoại</small>
                      <strong className="text-break">{caseDetail?.benhNhanId?.soDienThoai || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-geo-alt text-info fs-5"></i>
                    <div>
                      <small className="text-muted d-block">Tỉnh/Thành phố</small>
                      <strong className="text-break">{extractProvince(caseDetail?.benhNhanId?.diaChi) || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-map text-secondary fs-5" style={{marginTop: '2px'}}></i>
                    <div style={{width: '100%'}}>
                      <small className="text-muted d-block">Địa chỉ đầy đủ</small>
                      <strong className="text-break">{caseDetail?.benhNhanId?.diaChi || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
                {caseDetail?.benhNhanId?.maBHYT && (
                  <div className="col-md-6">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-card-text text-secondary fs-5"></i>
                      <div>
                        <small className="text-muted d-block">Mã BHYT</small>
                        <strong className="text-break">{caseDetail.benhNhanId.maBHYT}</strong>
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={submittingRx || rxItems.length === 0}
                >
                  <i className="bi bi-check-circle me-1"></i>Lưu đơn → Chờ lấy thuốc
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== PATIENT HISTORY MODAL ===== */}
      {patientHistoryModal && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title">
                  <i className="bi bi-clock-history me-2 text-primary"></i>
                  Lịch sử khám - {selectedPatientHistory?.hoTen}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setPatientHistoryModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                {patientHistoryList.length > 0 ? (
                  <div className="accordion" id="historyAccordion">
                    {patientHistoryList.map((hs, idx) => (
                      <div key={hs._id} className="accordion-item">
                        <h2 className="accordion-header">
                          <button 
                            className="accordion-button collapsed" 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target={`#history${idx}`}
                          >
                            <div className="d-flex gap-2 w-100">
                              <small className="text-muted">
                                {new Date(hs.ngayKham).toLocaleString('vi-VN')}
                              </small>
                              <span className="badge bg-secondary ms-2">
                                {hs.trangThai || 'Chưa xác định'}
                              </span>
                            </div>
                          </button>
                        </h2>
                        <div id={`history${idx}`} className="accordion-collapse collapse" data-bs-parent="#historyAccordion">
                          <div className="accordion-body p-3">
                            {/* Thông tin lâm sàng */}
                            <div className="mb-3">
                              <h6 className="fw-semibold mb-2">📋 Thông tin lâm sàng</h6>
                              <div className="row g-2 small">
                                <div className="col-md-6">
                                  <div><strong>Triệu chứng:</strong></div>
                                  <p className="text-muted">{hs.trieuChung || '(không có)'}</p>
                                </div>
                                <div className="col-md-6">
                                  <div><strong>Khám lâm sàng:</strong></div>
                                  <p className="text-muted">{hs.khamLamSang || '(không có)'}</p>
                                </div>
                                <div className="col-md-3">
                                  <div><strong>Huyết áp:</strong> {hs.sinhHieu?.huyetAp || '-'}</div>
                                </div>
                                <div className="col-md-3">
                                  <div><strong>Nhịp tim:</strong> {hs.sinhHieu?.nhipTim || '-'} bpm</div>
                                </div>
                                <div className="col-md-3">
                                  <div><strong>Nhiệt độ:</strong> {hs.sinhHieu?.nhietDo || '-'}°C</div>
                                </div>
                                <div className="col-md-3">
                                  <div><strong>Cân nặng:</strong> {hs.sinhHieu?.canNang || '-'} kg</div>
                                </div>
                              </div>
                            </div>

                            {/* Chỉ định */}
                            {hs.chiDinh && hs.chiDinh.length > 0 && (
                              <div className="mb-3">
                                <h6 className="fw-semibold mb-2">🔬 Chỉ định xét nghiệm</h6>
                                <div className="list-group list-group-sm">
                                  {hs.chiDinh.map((cd, i) => (
                                    <div key={i} className="list-group-item">
                                      <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div className="flex-grow-1">
                                          <div className="small fw-semibold">{cd.dichVuId?.ten || cd.loaiChiDinh || '---'}</div>
                                          <small className="text-muted d-block">{cd.dichVuId?.chuyenKhoaId?.ten || ''}</small>
                                        </div>
                                        <span className={`badge ms-2 ${cd.trangThai === 'da_xong' ? 'bg-success' : cd.trangThai === 'cho_thuc_hien' ? 'bg-warning' : 'bg-secondary'}`}>
                                          {cd.trangThai === 'da_xong' ? '✓ Hoàn thành' : cd.trangThai === 'cho_thuc_hien' ? '⏳ Chờ thực hiện' : 'Chờ'}
                                        </span>
                                      </div>
                                      
                                      {cd.ketQua && (
                                        <div className="alert alert-success alert-sm mb-0 p-2">
                                          <strong className="d-block small mb-1">📋 Kết quả:</strong>
                                          <p className="small mb-0 text-break">{cd.ketQua}</p>
                                          {cd.ghiChu && (
                                            <p className="small text-muted mt-1 mb-0">
                                              <strong>📝 Ghi chú:</strong> {cd.ghiChu}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      
                                      {!cd.ketQua && cd.trangThai === 'da_xong' && (
                                        <div className="alert alert-info alert-sm mb-0 p-2">
                                          <small className="text-muted">Xét nghiệm hoàn thành nhưng chưa có kết quả</small>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Đơn thuốc */}
                            {hs.donThuoc && hs.donThuoc.length > 0 && (
                              <div className="mb-3">
                                <h6 className="fw-semibold mb-2">💊 Đơn thuốc</h6>
                                <ul className="list-group list-group-sm">
                                  {hs.donThuoc.map((dt, i) => (
                                    <li key={i} className="list-group-item">
                                      <div className="d-flex justify-content-between">
                                        <div className="small">
                                          <div className="fw-semibold">{dt.tenThuoc || dt.thuocId?.tenThuoc || '---'}</div>
                                          <small className="text-muted">
                                            {dt.soLuong} x {dt.cachDung || '---'} - {dt.soNgay || '---'} ngày
                                          </small>
                                        </div>
                                        {dt.ghi && <small className="text-muted ms-2">{dt.ghi}</small>}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Ghi chú */}
                            {hs.ghiChu && (
                              <div className="alert alert-info alert-sm mb-0">
                                <strong>📝 Ghi chú:</strong> {hs.ghiChu}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-info mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Không có lần khám nào trong lịch sử
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light border-0">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setPatientHistoryModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
