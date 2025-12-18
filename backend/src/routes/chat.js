/*
TÓM TẮT API — Chat support
- Mục tiêu: Tra cứu lịch sử tin nhắn theo phòng và liệt kê các phòng đang hoạt động.
- Quyền:
  - `GET /history`: yêu cầu đăng nhập (`auth`). Role `user` chỉ xem phòng của chính mình (room:benhNhan:<id> khớp user hiện tại). `reception`/`admin` không bị giới hạn theo phòng.
  - `GET /rooms`: yêu cầu đăng nhập + phân quyền `reception` hoặc `admin`.
- Mô hình/phụ thuộc: `ChatMessage`, `BenhNhan`, `Staff`, `User`.

Endpoints chính:
1) GET /api/chat/history?roomId=...&page=1&limit=50
  - Bắt buộc `roomId`. Phân trang: page>=1, limit 1..200 (mặc định 50).
  - Trả về tin nhắn theo `roomId`, sắp xếp mới→cũ, kèm `senderName` đã suy diễn theo vai trò.
  - Kiểm soát truy cập: role `user` chỉ được xem phòng dạng `room:benhNhan:<benhNhanId>` thuộc `userId` của mình.
  - Kết quả: { items[], total, page, limit, totalPages } — items được đảo lại theo thời gian cũ→mới để hiển thị thuận mắt.

2) GET /api/chat/rooms?q=&page=1&limit=20
  - Gom phòng theo `roomId`, lấy tin nhắn cuối cùng (lastMessage) và tổng số tin nhắn (count) qua aggregation.
  - Bổ sung `patient` khi phòng có dạng `room:benhNhan:<id>` (lấy họ tên/số ĐT). Lọc đơn giản bởi `q` theo tên, số điện thoại, hoặc roomId.
  - Phân trang: page>=1, limit 1..100 (mặc định 20). Trả về: { items[{ roomId, lastMessage, count, patient }], page, limit }.

Ghi chú:
- Bảo mật: tránh lộ phòng của bệnh nhân khác cho role `user`. Các vai trò nội bộ (`reception`, `admin`) có quyền xem danh mục phòng.
- Tối ưu: cân nhắc index `ChatMessage(roomId, createdAt)` để tăng tốc truy vấn lịch sử và gom phòng.
*/
const express = require('express');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const ChatMessage = require('../models/ChatMessage');

const router = express.Router();

// Lấy lịch sử chat của một phòng
// - Người dùng (role 'user') chỉ được phép lấy lịch sử phòng của chính mình
// - Lễ tân/quản trị ('reception'/'admin') không bị giới hạn theo phòng
router.get('/history', auth, async (req, res, next) => {
  try{
    const { roomId, page = 1, limit = 50 } = req.query;
    if(!roomId) return res.status(400).json({ message: 'roomId is required' });
    const p = Math.max(parseInt(page,10)||1,1);
    const l = Math.min(Math.max(parseInt(limit,10)||50,1),200);
    // Quy tắc truy cập
    const role = req.user?.role; const userId = req.user?.id;
    if(role === 'user'){
      const ok = roomId.startsWith('room:benhNhan:'); // Phòng dạng room:benhNhan:<id>
      const id = ok ? roomId.split(':')[2] : null;
      if(!id) return res.status(403).json({ message: 'Forbidden' });
      const BenhNhan = require('../models/BenhNhan');
      // Xác thực rằng bệnh nhân của phòng thuộc về user hiện tại
      const bn = await BenhNhan.findById(id).select('_id userId').lean();
      if(!bn || String(bn.userId) !== String(userId)) return res.status(403).json({ message: 'Forbidden' });
    }
    const total = await ChatMessage.countDocuments({ roomId });
    const raw = await ChatMessage.find({ roomId }).sort({ createdAt: -1 }).skip((p-1)*l).limit(l).lean();
    // Bổ sung tên người gửi để hiển thị 
    const items = [];
    for(const m of raw){
      let senderName = '';
      try{
        if(m.senderRole === 'user'){
          // Ưu tiên hiển thị tên bệnh nhân khi vai trò là 'user'
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
          // Nhân viên hoặc các vai trò: reception
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

// Liệt kê các phòng chat (gom theo roomId) kèm tin nhắn cuối và thông tin bệnh nhân cơ bản
router.get('/rooms', auth, authorize('reception','admin'), async (req, res, next) => {
  try{
    const { q = '', page = 1, limit = 20 } = req.query;
    const p = Math.max(parseInt(page,10)||1,1);
    const l = Math.min(Math.max(parseInt(limit,10)||20,1),100);
    // Gom tin nhắn cuối cùng cho mỗi phòng
    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$roomId', lastMessage: { $first: '$$ROOT' }, count: { $sum: 1 } } },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $skip: (p-1)*l },
      { $limit: l },
    ];
    const rooms = await ChatMessage.aggregate(pipeline).allowDiskUse(true);
    // Bổ sung thông tin bệnh nhân nếu phòng có dạng room:benhNhan:<id>
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
    // Bộ lọc văn bản đơn giản theo tên/số điện thoại bệnh nhân hoặc roomId
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
