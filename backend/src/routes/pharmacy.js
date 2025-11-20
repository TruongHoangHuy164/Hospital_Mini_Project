const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const DonThuoc = require('../models/DonThuoc');
const CapThuoc = require('../models/CapThuoc');

// All endpoints require authentication and pharmacy role
router.use(auth);
router.use(authorize('pharmacy', 'admin'));

// Get prescriptions pending for pharmacy
router.get('/prescriptions', async (req, res) => {
  try {
    const list = await DonThuoc.find({ status: { $in: ['issued', 'pending_pharmacy', 'dispensing'] } })
      .populate('hoSoKhamId')
      .sort({ createdAt: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

// Dispense a prescription: mark as dispensed and optionally create CapThuoc records
router.post('/prescriptions/:id/dispense', async (req, res) => {
  try {
    const id = req.params.id;
    const don = await DonThuoc.findById(id);
    if (!don) return res.status(404).json({ message: 'Không tìm thấy đơn' });

    if (don.status === 'dispensed') return res.status(400).json({ message: 'Đơn đã được phát' });

    // Mark as dispensed
    don.status = 'dispensed';
    don.pharmacyIssuedBy = req.user._id;
    don.pharmacyIssuedAt = new Date();
    await don.save();

    // Optionally, create CapThuoc records from items if provided
    if (don.items && don.items.length) {
      const caps = await Promise.all(
        don.items.map(async (it) => {
          try {
            const cap = await CapThuoc.create({ donThuocId: don._id, thuocId: it.thuocId, soLuong: it.soLuong || it.quantity || 1 });
            return cap;
          } catch (e) {
            return null;
          }
        })
      );
    }

    res.json({ message: 'Đã đánh dấu là đã phát', don });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

module.exports = router;
