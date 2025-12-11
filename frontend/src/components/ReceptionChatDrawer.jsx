import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../utils/socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReceptionChatDrawer({ onClose, initialRoomId }){
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [presence, setPresence] = useState(0);
  const [typing, setTyping] = useState(false);
  const [joined, setJoined] = useState(false);
  const listRef = useRef(null);
  const socket = useMemo(()=> getSocket(), []);

  useEffect(() => {
    function onHistory(h){ setMessages(h); setJoined(true); scrollToEnd(); }
    function onMsg(m){ setMessages(x => [...x, m]); scrollToEnd(); }
    function onPresence(p){ setPresence(p.count || 0); }
    function onTyping(evt){ setTyping(!!evt.typing); setTimeout(()=> setTyping(false), 2000); }
    socket.on('history', onHistory);
    socket.on('message', onMsg);
    socket.on('presence', onPresence);
    socket.on('typing', onTyping);
    return () => {
      socket.off('history', onHistory);
      socket.off('message', onMsg);
      socket.off('presence', onPresence);
      socket.off('typing', onTyping);
    };
  }, [socket]);

  useEffect(() => {
    if(roomId){ setJoined(false); socket.emit('join', { roomId }); }
  }, [socket, roomId]);

  function scrollToEnd(){
    requestAnimationFrame(()=>{
      if(listRef.current){ listRef.current.scrollTop = listRef.current.scrollHeight; }
    });
  }

  const send = () => {
    const text = input.trim(); if(!text || !roomId) return;
    socket.emit('message', { roomId, text });
    setInput('');
  };

  return (
    <div style={{ position:'fixed', right:16, bottom:80, width:380, maxWidth:'92vw', background:'#fff', border:'1px solid #ddd', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
      <div className="p-2 d-flex justify-content-between align-items-center" style={{ borderBottom:'1px solid #eee' }}>
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-chat-dots text-primary"></i>
          <strong>Chat bệnh nhân</strong>
          <span className="badge text-bg-light">{presence} đang xem</span>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}><i className="bi bi-x"></i></button>
      </div>
      <div className="p-2">
        <ReceptionRoomPicker onSelect={(benhNhanId)=> setRoomId(`room:benhNhan:${benhNhanId}`)} />
        <div ref={listRef} style={{ height: 300, overflowY:'auto', border:'1px solid #eee', borderRadius:8, padding:8, background:'#fafafa' }}>
          {joined && (<div className="alert alert-success py-1 mb-2 small">Đã vào phòng chat</div>)}
          {messages.map((m) => {
            const isReceptionMsg = m.senderRole && m.senderRole !== 'user';
            const sideClass = isReceptionMsg ? 'justify-content-end' : 'justify-content-start';
            const bubbleStyle = {
              maxWidth: '80%',
              borderRadius: 12,
              padding: '8px 10px',
              background: isReceptionMsg ? '#0d6efd' : '#e9ecef',
              color: isReceptionMsg ? '#fff' : '#333',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            };
            return (
              <div key={m._id || Math.random()} className={`d-flex mb-2 ${sideClass}`}>
                <div style={bubbleStyle}>
                  {(!isReceptionMsg) && (
                    <div className="fw-semibold" style={{ fontSize:12, marginBottom:4 }}>
                      {m.senderRole==='user' ? `Bệnh Nhân: ${m.senderName || 'Không rõ'}` : (m.senderName || 'Lễ tân')}
                    </div>
                  )}
                  <div className="small" style={{ whiteSpace:'pre-wrap' }}>{m.text}</div>
                  <div className="text-muted d-flex justify-content-between" style={{ fontSize:11 }}>
                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                    {/* Delivered marker simple check for reception messages */}
                    {isReceptionMsg && <span title="Đã gửi"><i className="bi bi-check2"/></span>}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length===0 && <div className="text-muted small">Chưa có tin nhắn</div>}
        </div>
        <div className="mt-2 d-flex gap-2">
          <input className="form-control" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} placeholder="Nhập tin nhắn..." />
          <button className="btn btn-primary" onClick={send}><i className="bi bi-send"></i></button>
        </div>
        {typing && <div className="small text-muted mt-1">Bệnh nhân đang trả lời...</div>}
      </div>
    </div>
  );
}

function ReceptionRoomPicker({ onSelect }){
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const token = localStorage.getItem('accessToken')||'';

  const search = async () => {
    setLoading(true);
    try{
      const res = await fetch(`${API_URL}/api/patients?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
      const arr = await res.json();
      const normalized = Array.isArray(arr) ? arr.map(p=> ({ id: p._id, name: p.hoTen, phone: p.soDienThoai })) : [];
      setItems(normalized);
    }catch{ setItems([]); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ search(); },[]);

  return (
    <div className="mb-2">
      <label className="form-label">Chọn bệnh nhân</label>
      <div className="input-group">
        <input className="form-control" value={q} onChange={e=>setQ(e.target.value)} placeholder="Tên hoặc SĐT" />
        <button className="btn btn-outline-secondary" onClick={search}><i className="bi bi-search"></i></button>
      </div>
      <div className="mt-2" style={{ maxHeight: 120, overflowY:'auto', border:'1px solid #eee', borderRadius:8 }}>
        {loading && <div className="p-2 small text-muted">Đang tìm...</div>}
        {!loading && items.length===0 && <div className="p-2 small text-muted">Không có kết quả</div>}
        {!loading && items.map(p => (
          <button key={p.id} type="button" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" onClick={()=> onSelect(p.id)}>
            <span>{p.name || '(không tên)'}<br/><small className="text-muted">{p.phone || '-'}</small></span>
            <i className="bi bi-chat-text"></i>
          </button>
        ))}
      </div>
      <div className="form-text">Chọn bệnh nhân để vào phòng chat. Tất cả lễ tân sẽ xem cùng một phòng.</div>
    </div>
  );
}
