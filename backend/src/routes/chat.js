const express = require('express');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const ChatMessage = require('../models/ChatMessage');

const router = express.Router();

// Fetch chat history for a room (user can only fetch own room; reception/admin unrestricted)
router.get('/history', auth, async (req, res, next) => {
  try{
    const { roomId, page = 1, limit = 50 } = req.query;
    if(!roomId) return res.status(400).json({ message: 'roomId is required' });
    const p = Math.max(parseInt(page,10)||1,1);
    const l = Math.min(Math.max(parseInt(limit,10)||50,1),200);
    // Access rules
    const role = req.user?.role; const userId = req.user?.id;
    if(role === 'user'){
      const ok = roomId.startsWith('room:benhNhan:');
      const id = ok ? roomId.split(':')[2] : null;
      if(!id) return res.status(403).json({ message: 'Forbidden' });
      const BenhNhan = require('../models/BenhNhan');
      // Validate that the specific benhNhan in room belongs to the current user
      const bn = await BenhNhan.findById(id).select('_id userId').lean();
      if(!bn || String(bn.userId) !== String(userId)) return res.status(403).json({ message: 'Forbidden' });
    }
    const total = await ChatMessage.countDocuments({ roomId });
    const raw = await ChatMessage.find({ roomId }).sort({ createdAt: -1 }).skip((p-1)*l).limit(l).lean();
    // Enrich sender names
    const items = [];
    for(const m of raw){
      let senderName = '';
      try{
        if(m.senderRole === 'user'){
          // Prefer patient name for user role
          if(roomId.startsWith('room:benhNhan:')){
            const id = roomId.split(':')[2];
            const BenhNhan = require('../models/BenhNhan');
            const bn = await BenhNhan.findById(id).select('hoTen').lean();
            if(bn) senderName = bn.hoTen;
          }
          if(!senderName){
            const User = require('../models/User');
            const u = await User.findById(m.senderId).select('name email').lean();
            if(u) senderName = u.name || u.email || '';
          }
        }else{
          // staff or reception/admin/nurse/cashier/doctor
          const Staff = require('../models/Staff');
          const s = await Staff.findById(m.senderId).select('name role').lean();
          if(s) senderName = s.name || s.role || '';
          if(!senderName){
            const User = require('../models/User');
            const u = await User.findById(m.senderId).select('name email').lean();
            if(u) senderName = u.name || u.email || '';
          }
        }
      }catch{}
      items.push({ ...m, senderName });
    }
    res.json({ items: items.reverse(), total, page: p, limit: l, totalPages: Math.ceil(total/l) });
  }catch(err){ next(err); }
});

// List chat rooms (grouped by roomId) with last message and basic patient info
router.get('/rooms', auth, authorize('reception','admin'), async (req, res, next) => {
  try{
    const { q = '', page = 1, limit = 20 } = req.query;
    const p = Math.max(parseInt(page,10)||1,1);
    const l = Math.min(Math.max(parseInt(limit,10)||20,1),100);
    // Aggregate last message per room
    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$roomId', lastMessage: { $first: '$$ROOT' }, count: { $sum: 1 } } },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $skip: (p-1)*l },
      { $limit: l },
    ];
    const rooms = await ChatMessage.aggregate(pipeline).allowDiskUse(true);
    // Enrich with patient info if room is room:benhNhan:<id>
    const out = [];
    for(const r of rooms){
      const rid = r._id || '';
      let patient = null;
      if(rid.startsWith('room:benhNhan:')){
        const id = rid.split(':')[2];
        try{
          const BenhNhan = require('../models/BenhNhan');
          const bn = await BenhNhan.findById(id).select('hoTen soDienThoai').lean();
          if(bn) patient = { id, hoTen: bn.hoTen, soDienThoai: bn.soDienThoai };
        }catch{}
      }
      out.push({ roomId: rid, lastMessage: r.lastMessage, count: r.count, patient });
    }
    // Simple text filter on patient name/phone
    const qlow = String(q).trim().toLowerCase();
    const filtered = qlow ? out.filter(x => {
      const name = x.patient?.hoTen?.toLowerCase() || '';
      const phone = x.patient?.soDienThoai || '';
      return name.includes(qlow) || phone.includes(qlow) || String(x.roomId).includes(qlow);
    }) : out;
    res.json({ items: filtered, page: p, limit: l });
  }catch(err){ next(err); }
});

module.exports = router;
