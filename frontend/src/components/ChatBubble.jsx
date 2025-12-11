import React, { useState } from 'react';
import PatientChatDrawer from './PatientChatDrawer';
import ReceptionChatDrawer from './ReceptionChatDrawer';
import { useAuth } from '../context/AuthContext';

export default function ChatBubble(){
  const [open, setOpen] = useState(false);
  const [initialRoomId, setInitialRoomId] = useState('');
  const { user } = useAuth();
  const role = user?.role || 'user';

  React.useEffect(() => {
    function onOpen(e){
      const rid = e.detail?.roomId;
      if(rid){ setInitialRoomId(rid); }
      setOpen(true);
    }
    window.addEventListener('chat:open', onOpen);
    return () => window.removeEventListener('chat:open', onOpen);
  }, []);
  return (
    <>
      <button
        onClick={()=> setOpen(!open)}
        style={{ position:'fixed', right:16, bottom:16, width:56, height:56, borderRadius:'50%', background:'#0d6efd', color:'#fff', border:'none', boxShadow:'0 6px 18px rgba(0,0,0,0.15)' }}
        title="Hỗ trợ trực tuyến"
      >
        <i className="bi bi-chat-dots"></i>
      </button>
      {open && (
        role === 'reception'
          ? <ReceptionChatDrawer initialRoomId={initialRoomId} onClose={()=> setOpen(false)} />
          : <PatientChatDrawer onClose={()=> setOpen(false)} />
      )}
    </>
  );
}
