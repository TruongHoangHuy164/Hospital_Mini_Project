const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const ChatMessage = require('../models/ChatMessage');
const BenhNhan = require('../models/BenhNhan');

function getToken(handshake){
  const hAuth = handshake.headers?.authorization || '';
  if(hAuth.startsWith('Bearer ')) return hAuth.slice(7);
  const aToken = handshake.auth?.token;
  if(aToken) return aToken;
  const qToken = handshake.query?.token;
  if(qToken) return qToken;
  return null;
}

async function validateJoin({ user, role, roomId }){
  // room format: room:benhNhan:<benhNhanId>
  if(!roomId || !roomId.startsWith('room:')) return false;
  if(role === 'reception' || role === 'admin') return true;
  if(role === 'user'){
    // make sure this user owns the benhNhanId in room
    const parts = roomId.split(':');
    const type = parts[1]; const id = parts[2];
    if(type !== 'benhNhan' || !id) return false;
    try{
      const bn = await BenhNhan.findById(id).select('_id userId').lean();
      return !!bn && String(bn.userId) === String(user.id);
    }catch{ return false; }
  }
  // other roles default deny
  return false;
}

function setupChatSocket(server){
  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    }
  });

  io.use((socket, next) => {
    try{
      const token = getToken(socket.handshake);
      if(!token) return next(new Error('auth missing'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // payload: { id, role, name }
      socket.user = payload;
      next();
    }catch(err){
      next(new Error('auth invalid'));
    }
  });

  const roomPresence = new Map(); // roomId -> Set(userId)

  io.on('connection', (socket) => {
    const user = socket.user || {}; const role = user.role;

    socket.on('join', async ({ roomId }) => {
      const ok = await validateJoin({ user, role, roomId });
      if(!ok){ socket.emit('error', { message: 'join denied' }); return; }
      socket.join(roomId);
      // presence
      const set = roomPresence.get(roomId) || new Set();
      set.add(String(user.id)); roomPresence.set(roomId, set);
      io.to(roomId).emit('presence', { count: set.size });
      // send last 20 messages
      try{
        const raw = await ChatMessage.find({ roomId }).sort({ createdAt: -1 }).limit(20).lean();
        const enriched = [];
        for(const m of raw){
          let senderName = '';
          try{
            if(m.senderRole === 'user'){
              // Prefer patient name
              if(roomId.startsWith('room:benhNhan:')){
                const id = roomId.split(':')[2];
                const bn = await BenhNhan.findById(id).select('hoTen').lean();
                if(bn) senderName = bn.hoTen;
              }
            }else{
              const Staff = require('../models/Staff');
              const s = await Staff.findById(m.senderId).select('name').lean();
              if(s) senderName = s.name || '';
            }
            if(!senderName){
              const User = require('../models/User');
              const u = await User.findById(m.senderId).select('name email').lean();
              if(u) senderName = u.name || u.email || '';
            }
          }catch{}
          enriched.push({ ...m, senderName });
        }
        socket.emit('history', enriched.reverse());
      }catch{}
    });

    socket.on('message', async ({ roomId, text }) => {
      if(!text || !roomId) return;
      // naive: assume user already joined
      const msg = await ChatMessage.create({ roomId, senderId: user.id, senderRole: role, text, createdAt: new Date() });
      // enrich name for outgoing message
      let senderName = '';
      try{
        if(role === 'user'){
          if(roomId.startsWith('room:benhNhan:')){
            const id = roomId.split(':')[2];
            const bn = await BenhNhan.findById(id).select('hoTen').lean();
            if(bn) senderName = bn.hoTen;
          }
        }else{
          const Staff = require('../models/Staff');
          const s = await Staff.findById(user.id).select('name').lean();
          if(s) senderName = s.name || '';
        }
        if(!senderName){
          const User = require('../models/User');
          const u = await User.findById(user.id).select('name email').lean();
          if(u) senderName = u.name || u.email || '';
        }
      }catch{}
      io.to(roomId).emit('message', { _id: msg._id, roomId, senderId: user.id, senderRole: role, senderName, text, createdAt: msg.createdAt });
    });

    socket.on('typing', ({ roomId, typing }) => {
      if(!roomId) return;
      socket.to(roomId).emit('typing', { userId: user.id, typing: !!typing });
    });

    socket.on('disconnecting', () => {
      for(const roomId of socket.rooms){
        if(roomId === socket.id) continue;
        const set = roomPresence.get(roomId);
        if(set){ set.delete(String(user.id)); io.to(roomId).emit('presence', { count: set.size }); }
      }
    });
  });
}

module.exports = { setupChatSocket };
