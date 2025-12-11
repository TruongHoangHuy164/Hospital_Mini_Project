import React, { useEffect, useMemo, useState } from 'react';
import { listChatRooms } from '../../api/chat';
import { getSocket } from '../../utils/socket';

export default function ReceptionChats() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try{
      const res = await listChatRooms({ q });
      setItems(res.items || []);
    }catch(err){ console.error(err); }
    setLoading(false);
  };

  const socket = useMemo(()=> getSocket(), []);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    function onMsg(m){
      // when new message arrives, refresh rooms quick
      load();
    }
    socket.on('message', onMsg);
    return () => socket.off('message', onMsg);
  }, [socket]);

  return (
    <div className="container">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Tin nhắn bệnh nhân</h5>
        <div className="input-group" style={{maxWidth: 320}}>
          <input className="form-control" placeholder="Tìm theo tên/sđt" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn btn-primary" onClick={load}><i className="bi bi-search"/></button>
        </div>
      </div>
      {loading && <div className="text-muted">Đang tải...</div>}
      {!loading && items.length===0 && <div className="alert alert-light">Chưa có phòng chat nào.</div>}
      <ul className="list-group">
        {items.map((r)=> (
          <li key={r.roomId} className="list-group-item d-flex align-items-start justify-content-between">
            <div>
              <div className="fw-semibold">
                <i className="bi bi-chat-dots me-2"/>
                {r.patient?.hoTen ? (`Bệnh Nhân: ${r.patient.hoTen}`) : r.roomId}
              </div>
              <div className="small text-muted">
                {r.patient?.soDienThoai && (<span className="me-2">{r.patient.soDienThoai}</span>)}
                {r.count ? (<span>{r.count} tin nhắn</span>) : null}
                {r.lastMessage ? (
                  <span className="ms-2 badge text-bg-info">Mới</span>
                ) : null}
              </div>
              {r.lastMessage && (
                <div className="mt-1 small">
                  <span className="badge bg-secondary me-2">Cuối</span>
                  <span>{r.lastMessage.text}</span>
                </div>
              )}
            </div>
            <div>
              <a className="btn btn-outline-primary" href="#" onClick={(e)=>{e.preventDefault(); window.dispatchEvent(new CustomEvent('chat:open', { detail: { roomId: r.roomId } })); }}>
                Mở chat
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
