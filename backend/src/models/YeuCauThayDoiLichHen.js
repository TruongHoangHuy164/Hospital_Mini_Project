const mongoose = require('mongoose');

const YeuCauThayDoiLichHenSchema = new mongoose.Schema({
  // Thông tin bệnh nhân
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  benhNhanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BenhNhan',
    required: true
  },
  maHoSo: {
    type: String,
    required: true
  },
  tenBenhNhan: {
    type: String,
    required: true
  },
  tuoi: {
    type: Number,
    required: true
  },
  diaChi: {
    type: String,
    required: true
  },
  cccd: {
    type: String,
    required: true
  },
  
  // Thông tin lịch hẹn cũ
  lichHenCuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LichKham',
    required: true
  },
  ngayHenCu: {
    type: Date,
    required: true
  },
  gioHenCu: {
    type: String,
    required: true
  },
  bacSiCu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BacSi',
    required: true
  },
  chuyenKhoaCu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChuyenKhoa',
    required: true
  },
  
  // Thông tin lịch hẹn mới (mong muốn)
  ngayHenMoi: {
    type: Date,
    required: true
  },
  gioHenMoi: {
    type: String,
    required: true
  },
  bacSiMoi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BacSi'
  },
  chuyenKhoaMoi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChuyenKhoa'
  },
  
  // Lý do thay đổi
  lyDoThayDoi: {
    type: String,
    enum: [
      'Bận việc đột xuất',
      'Thay đổi lịch làm việc',
      'Vấn đề sức khỏe khẩn cấp',
      'Điều kiện thời tiết xấu',
      'Vấn đề gia đình',
      'Khác'
    ],
    required: true
  },
  lyDoKhac: {
    type: String,
    required: function() {
      return this.lyDoThayDoi === 'Khác';
    }
  },
  
  // Trạng thái yêu cầu
  trangThai: {
    type: String,
    enum: ['cho_duyet', 'da_duyet', 'tu_choi', 'huy'],
    default: 'cho_duyet'
  },
  
  // Thông tin xử lý từ lễ tân
  nguoiXuLy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // User có role 'reception'
  },
  ngayXuLy: {
    type: Date
  },
  ghiChuXuLy: {
    type: String
  },
  lyDoTuChoi: {
    type: String
  },
  
  // Thông tin kiểm tra tính khả thi
  kiemTraKhaThi: {
    lichBacSiTrong: {
      type: Boolean,
      default: false
    },
    chuyenKhoaPhuHop: {
      type: Boolean,
      default: false
    },
    quiDinhDoiLich: {
      type: Boolean,
      default: false
    },
    soLanDoiLich: {
      type: Number,
      default: 0
    },
    thoiGianBaoTruoc: {
      type: Number, // Số giờ báo trước
      default: 0
    }
  },
  
  // Metadata
  ngayTao: {
    type: Date,
    default: Date.now
  },
  ngayCapNhat: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware để cập nhật ngayCapNhat
YeuCauThayDoiLichHenSchema.pre('save', function(next) {
  this.ngayCapNhat = new Date();
  next();
});

// Index để tìm kiếm nhanh
YeuCauThayDoiLichHenSchema.index({ userId: 1, trangThai: 1 });
YeuCauThayDoiLichHenSchema.index({ maHoSo: 1 });
YeuCauThayDoiLichHenSchema.index({ ngayTao: -1 });

module.exports = mongoose.model('YeuCauThayDoiLichHen', YeuCauThayDoiLichHenSchema);