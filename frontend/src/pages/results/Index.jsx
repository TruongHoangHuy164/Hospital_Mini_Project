import React, { useEffect, useState, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MyResults(){
  const [cases, setCases] = useState([]);
  const [casesPage, setCasesPage] = useState(1);
  const [casesTotalPages, setCasesTotalPages] = useState(1);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseError, setCaseError] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [caseDetail, setCaseDetail] = useState(null);
  const [labs, setLabs] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  async function loadCases(p=1){
    setCaseLoading(true); setCaseError('');
    try{
      const res = await fetch(`${API_URL}/api/booking/my-cases?page=${p}&limit=20`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setCases(json.items||[]);
      setCasesPage(json.page||1);
      setCasesTotalPages(json.totalPages||1);
      // Auto select if 1 or 2 cases
      if((json.items||[]).length>0 && (json.items||[]).length<=2){
        setSelectedCaseId(json.items[0]._id);
      }
    }catch(e){ setCaseError(e?.message||'Lỗi tải hồ sơ'); }
    finally{ setCaseLoading(false); }
  }

  async function loadCaseDetail(id){
    if(!id) return;
    setDetailLoading(true); setDetailError('');
    try{
      const res = await fetch(`${API_URL}/api/booking/my-cases/${id}/detail`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
      const json = await res.json();
      if(!res.ok) throw json;
      setCaseDetail(json.case); setLabs(json.labs||[]); setPrescriptions(json.prescriptions||[]);
    }catch(e){ setDetailError(e?.message||'Lỗi tải chi tiết'); }
    finally{ setDetailLoading(false); }
  }

  useEffect(()=>{ loadCases(1); },[]);
  useEffect(()=>{ if(selectedCaseId) loadCaseDetail(selectedCaseId); }, [selectedCaseId]);

  // Group by hoSoKhamId (medical record). Fallback group key by ngayKham date string.
  const showCaseList = cases.length > 2;

  return (
    <div className="container my-4">
      <h3>Tra cứu kết quả</h3>
      {caseError && <div className="alert alert-danger">{caseError}</div>}
      {showCaseList && (
        <div className="mb-3">
          <div className="fw-semibold mb-2">Danh sách hồ sơ khám</div>
          {caseLoading && <div className="text-muted">Đang tải...</div>}
          <div className="row g-2">
            {cases.map(c => (
              <div key={c._id} className="col-md-4">
                <button type="button" className={`btn w-100 text-start ${selectedCaseId===c._id?'btn-primary':'btn-outline-primary'}`} onClick={()=> setSelectedCaseId(c._id)}>
                  <div className="d-flex flex-column">
                    <span>{new Date(c.createdAt).toLocaleDateString()} • {c.chanDoan || 'Chưa có chẩn đoán'}</span>
                    <small className="text-muted">Bác sĩ: {c.bacSi?.hoTen || '-'}</small>
                  </div>
                </button>
              </div>
            ))}
            {cases.length===0 && !caseLoading && <div className="col-12 text-muted">Không có hồ sơ</div>}
          </div>
        </div>
      )}
      {!showCaseList && caseLoading && <div className="text-muted">Đang tải...</div>}
      {/* Selected case section */}
      {selectedCaseId && (
        <div className="mb-4">
          <div className="fw-semibold mb-2">Hồ sơ ngày {caseDetail ? new Date(caseDetail.createdAt).toLocaleDateString() : ''}</div>
          {detailError && <div className="alert alert-danger">{detailError}</div>}
          {detailLoading && <div className="text-muted">Đang tải chi tiết...</div>}
          {caseDetail && !detailLoading && (
            <div className="accordion" id="caseDetailAccordion">
              <div className="accordion-item">
                <h2 className="accordion-header" id="sect-labs-h">
                  <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#sect-labs" aria-expanded="true" aria-controls="sect-labs">1. Kết quả cận lâm sàng ({labs.length})</button>
                </h2>
                <div id="sect-labs" className="accordion-collapse collapse show" aria-labelledby="sect-labs-h" data-bs-parent="#caseDetailAccordion">
                  <div className="accordion-body p-2">
                    {labs.length===0 && <div className="text-muted">Không có chỉ định</div>}
                    {labs.length>0 && (
                      <div className="table-responsive">
                        <table className="table table-sm table-striped">
                          <thead><tr><th>Dịch vụ</th><th>Chuyên khoa</th><th>Trạng thái</th><th>Kết quả</th><th>File</th><th>Thực hiện</th></tr></thead>
                          <tbody>
                            {labs.map(l => (
                              <tr key={l._id}>
                                <td>{l.dichVu?.ten || formatLoai(l.loaiChiDinh)}</td>
                                <td>{l.dichVu?.chuyenKhoa || ''}</td>
                                <td>{formatTrangThai(l.trangThai)}</td>
                                <td style={{minWidth:180}}>{l.ketQua ? <ResultPreview ketQua={l.ketQua}/> : <span className="text-muted">(chưa có)</span>}</td>
                                <td>{l.ketQuaPdf ? <a href={API_URL + l.ketQuaPdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">PDF</a> : '-'}</td>
                                <td><small>{l.ngayThucHien ? new Date(l.ngayThucHien).toLocaleString() : '-'}</small></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <h2 className="accordion-header" id="sect-rx-h">
                  <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sect-rx" aria-expanded="false" aria-controls="sect-rx">2. Đơn thuốc ({prescriptions.reduce((sum,r)=> sum + r.items.length,0)})</button>
                </h2>
                <div id="sect-rx" className="accordion-collapse collapse" aria-labelledby="sect-rx-h" data-bs-parent="#caseDetailAccordion">
                  <div className="accordion-body p-2">
                    {prescriptions.length===0 && <div className="text-muted">Không có đơn thuốc</div>}
                    {prescriptions.map((rx, idx) => (
                      <div key={rx._id} className="mb-3 border rounded p-2">
                        <div className="d-flex justify-content-between mb-1"><strong>Đơn {idx+1}</strong><small className="text-muted">{new Date(rx.createdAt).toLocaleString()}</small></div>
                        <table className="table table-sm mb-0">
                          <thead><tr><th>Thuốc</th><th>SL</th><th>Sáng</th><th>Trưa</th><th>Tối</th><th>Ngày</th><th>Ghi chú</th></tr></thead>
                          <tbody>
                            {rx.items.map(it => (
                              <tr key={it.thuocId+it.tenThuoc}>
                                <td>{it.tenThuoc} <small className="text-muted d-block">{it.loaiThuoc}</small></td>
                                <td>{it.soLuong}</td>
                                <td>{it.dosageMorning||'-'}</td>
                                <td>{it.dosageNoon||'-'}</td>
                                <td>{it.dosageEvening||'-'}</td>
                                <td>{it.days||'-'}</td>
                                <td>{it.usageNote||'-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <h2 className="accordion-header" id="sect-conclusion-h">
                  <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sect-conclusion" aria-expanded="false" aria-controls="sect-conclusion">3. Kết luận bác sĩ</button>
                </h2>
                <div id="sect-conclusion" className="accordion-collapse collapse" aria-labelledby="sect-conclusion-h" data-bs-parent="#caseDetailAccordion">
                  <div className="accordion-body">
                    <div className="mb-2"><strong>Chẩn đoán:</strong> {caseDetail.chanDoan || <span className="text-muted">(chưa ghi)</span>}</div>
                    <div className="mb-2"><strong>Hướng điều trị:</strong> {caseDetail.huongDieuTri || <span className="text-muted">(chưa ghi)</span>}</div>
                    <div className="mb-2"><strong>Triệu chứng:</strong><div className="small" style={{whiteSpace:'pre-wrap'}}>{caseDetail.trieuChung || '(chưa ghi)'}</div></div>
                    <div className="mb-2"><strong>Khám lâm sàng:</strong><div className="small" style={{whiteSpace:'pre-wrap'}}>{caseDetail.khamLamSang || '(chưa ghi)'}</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {!selectedCaseId && !caseLoading && cases.length>0 && !showCaseList && <div className="alert alert-info">Tự động chọn hồ sơ gần nhất.</div>}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <button disabled={caseLoading || casesPage<=1} className="btn btn-outline-secondary" onClick={()=>loadCases(casesPage-1)}>Trang trước</button>
        <span>Trang {casesPage}/{casesTotalPages}</span>
        <button disabled={caseLoading || casesPage>=casesTotalPages} className="btn btn-outline-secondary" onClick={()=>loadCases(casesPage+1)}>Trang sau</button>
      </div>
    </div>
  );
}

function formatLoai(v){
  const map = { xet_nghiem: 'Xét nghiệm', sieu_am: 'Siêu âm', x_quang: 'X-Quang', ct: 'CT', mri: 'MRI', dien_tim: 'Điện tim', noi_soi: 'Nội soi' };
  return map[v] || v;
}
function formatTrangThai(v){
  const map = { cho_thuc_hien: 'Chờ thực hiện', dang_thuc_hien: 'Đang thực hiện', da_xong: 'Đã xong' };
  return map[v] || v;
}

function ResultPreview({ ketQua }){
  const [expanded, setExpanded] = useState(false);
  const isLong = (ketQua||'').length > 120;
  const text = expanded || !isLong ? ketQua : `${ketQua.slice(0,120)}...`;
  return (
    <div>
      <div style={{whiteSpace:'pre-wrap'}}>{text}</div>
      {isLong && (
        <button className="btn btn-link p-0" onClick={()=>setExpanded(!expanded)}>
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
