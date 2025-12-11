import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../utils/socket';
import { privateApi } from '../api/axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PatientChatDrawer({ onClose }){
  const [roomId, setRoomId] = useState('');
  const [benhNhanId, setBenhNhanId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [presence, setPresence] = useState(0);
  const [typing, setTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const listRef = useRef(null);
  const { user } = useAuth();
  const socket = useMemo(()=> getSocket(), []);

  useEffect(() => {
    async function init(){
      try{
        const { data: arr } = await privateApi.get('/booking/patients');
        const id = Array.isArray(arr) && arr.length ? arr[0]._id : null;
        if(id){ setBenhNhanId(id); setRoomId(`room:benhNhan:${id}`); }
      }catch{}
    }
    init();
  }, []);

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
    if(roomId){ setError(''); setJoined(false); socket.emit('join', { roomId }); }
  }, [socket, roomId]);

  useEffect(() => {
    async function fetchHistory(){
      if(!roomId) return;
      try{
        setLoadingHistory(true);
        setError('');
        const res = await privateApi.get('/chat/history', { params: { roomId, limit: 50 } });
        if(!res || !res.data){
          setError('Không thể tải lịch sử chat. Vui lòng đảm bảo bạn đã đăng nhập và có hồ sơ bệnh nhân.');
          return;
        }
        const data = res.data;
        if(Array.isArray(data.items)){
          setMessages(data.items);
          scrollToEnd();
        } else {
          setError('Không có dữ liệu lịch sử chat để hiển thị.');
        }
      }catch(e){
        const status = e?.response?.status;
        if(status === 403){
          setError('403 Forbidden: Tài khoản hiện tại không có quyền truy cập phòng chat này. Vui lòng kiểm tra lại hồ sơ bệnh nhân gắn với tài khoản hoặc thử chọn phòng khác.');
        } else {
          setError('Có lỗi khi tải lịch sử chat. Vui lòng thử lại.');
        }
      }
      finally{ setLoadingHistory(false); }
    }
    fetchHistory();
  }, [roomId]);

  function scrollToEnd(){
    requestAnimationFrame(()=>{
      if(listRef.current){ listRef.current.scrollTop = listRef.current.scrollHeight; }
    });
  }

  const send = () => {
    const text = input.trim(); if(!text || !roomId) return;
    // emit typing false (stop)
    socket.emit('typing', { roomId, typing: false });
    socket.emit('message', { roomId, text });
    setInput('');
  };

  const onInputChange = (e) => {
    setInput(e.target.value);
    if(roomId){ socket.emit('typing', { roomId, typing: true }); }
  };

  return (
    <div style={{ position:'fixed', right:16, bottom:80, width:380, maxWidth:'92vw', background:'#fff', border:'1px solid #ddd', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
      <div className="p-2 d-flex justify-content-between align-items-center" style={{ borderBottom:'1px solid #eee' }}>
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-chat-dots text-primary"></i>
          <strong>Hỗ trợ Lễ tân</strong>
          <span className="badge text-bg-light">{presence} đang xem</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={()=> setShowDebug(v=>!v)} title="Thông tin debug"><i className="bi bi-bug"></i></button>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}><i className="bi bi-x"></i></button>
        </div>
      </div>
      <div className="p-2">
        {!roomId && (
          <div className="alert alert-info mb-2">
            <div className="fw-semibold mb-1">Bạn chưa chọn phòng chat</div>
            <div className="small">Chúng tôi sẽ tạo phòng theo hồ sơ bệnh nhân của bạn. Nếu bạn chưa có hồ sơ, vui lòng tạo tại mục <a href="/user/profiles">Hồ sơ bệnh nhân</a>.</div>
            <div className="mt-2">
              <button className="btn btn-sm btn-primary" onClick={()=>{
                (async ()=>{
                  try{
                    const res = await fetch(`${API_URL}/api/booking/patients`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')||''}` } });
                    const arr = await res.json();
                    const id = Array.isArray(arr) && arr.length ? arr[0]._id : null;
                    if(id){ setRoomId(`room:benhNhan:${id}`); }
                  }catch{}
                })();
              }}>Thử lại</button>
            </div>
          </div>
        )}
        {error && (
          <div className="alert alert-warning mb-2">
            <div className="small">{error}</div>
            <div className="mt-2 d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary" onClick={()=>{
                // Retry fetching history
                if(roomId){
                  setLoadingHistory(true);
                  setError('');
                  privateApi.get('/chat/history', { params: { roomId, limit: 50 } })
                    .then(res => {
                      const items = res?.data?.items || [];
                      setMessages(items);
                      scrollToEnd();
                    })
                    .catch(()=> setError('Có lỗi khi tải lại lịch sử chat.'))
                    .finally(()=> setLoadingHistory(false));
                }
              }}>Thử tải lại</button>
              <span className="small text-muted align-self-center">Phòng: {roomId || 'chưa thiết lập'}</span>
            </div>
          </div>
        )}
        {loadingHistory && (<div className="small text-muted mb-2"><span className="spinner-border spinner-border-sm me-2"/>Đang tải lịch sử chat...</div>)}
        {joined && (<div className="alert alert-success py-1 mb-2 small">Đã vào phòng chat</div>)}
        <div ref={listRef} style={{ height: 300, overflowY:'auto', border:'1px solid #eee', borderRadius:8, padding:8, background:'#fafafa' }}>
          {messages.map((m) => {
            const isUserMsg = m.senderRole === 'user';
            // Patient on the right, reception/staff on the left
            const sideClass = isUserMsg ? 'justify-content-end' : 'justify-content-start';
            const bubbleStyle = {
              maxWidth: '80%',
              borderRadius: 12,
              padding: '8px 10px',
              background: isUserMsg ? '#0d6efd' : '#e9ecef',
              color: isUserMsg ? '#fff' : '#333',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            };
            return (
              <div key={m._id || Math.random()} className={`d-flex mb-2 ${sideClass}`}>
                <div style={bubbleStyle}>
                  <div className="fw-semibold" style={{ fontSize:12, marginBottom:4 }}>
                    {isUserMsg ? `Bệnh Nhân: ${m.senderName || 'Không rõ'}` : (m.senderName || 'Lễ tân')}
                  </div>
                  <div className="small" style={{ whiteSpace:'pre-wrap' }}>{m.text}</div>
                  <div className="text-muted d-flex justify-content-between" style={{ fontSize:11 }}>
                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                    {/* Delivered marker simple check for patient messages */}
                    {isUserMsg && <span title="Đã gửi"><i className="bi bi-check2"/></span>}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length===0 && <div className="text-muted small">Chưa có tin nhắn</div>}
        </div>
        <div className="mt-2 d-flex gap-2">
          <input className="form-control" value={input} onChange={onInputChange} onKeyDown={e=>{ if(e.key==='Enter') send(); }} placeholder="Nhập tin nhắn..." />
          <button className="btn btn-primary" onClick={send}><i className="bi bi-send"></i></button>
        </div>
        {typing && <div className="small text-muted mt-1">Lễ tân đang trả lời...</div>}
        {showDebug && (
          <div className="mt-2 p-2 border rounded small" style={{ background:'#f8f9fa' }}>
            <div className="fw-semibold mb-1">Debug</div>
            <div>Tài khoản: {user?._id || 'chưa đăng nhập'}</div>
            <div>Hồ sơ bệnh nhân: {benhNhanId || 'chưa xác định'}</div>
            <div>Phòng: {roomId || 'chưa thiết lập'}</div>
            <div className="text-muted">Nếu 403, hãy đảm bảo hồ sơ bệnh nhân thuộc tài khoản hiện tại.</div>
          </div>
        )}
      </div>
    </div>
  );
}
