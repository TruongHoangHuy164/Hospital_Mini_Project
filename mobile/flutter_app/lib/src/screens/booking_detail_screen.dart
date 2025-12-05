import 'package:flutter/material.dart';

class BookingDetailScreen extends StatelessWidget {
  const BookingDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final booking = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;

    if (booking == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đặt lịch')),
        body: const Center(child: Text('Không có dữ liệu')),
      );
    }

    final status = '${booking['trangThai'] ?? booking['status'] ?? 'Chờ xác nhận'}';
    final statusColor = _getStatusColor(status);

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết đặt lịch')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [statusColor, statusColor.withOpacity(0.8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      status,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${booking['tenKham'] ?? booking['serviceName'] ?? 'Lịch khám'}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Thông tin khám', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildDetailRow(
              icon: Icons.calendar_today,
              label: 'Ngày khám',
              value: '${booking['ngayKham'] ?? booking['createdAt'] ?? 'N/A'}',
            ),
            const SizedBox(height: 12),
            _buildDetailRow(
              icon: Icons.access_time,
              label: 'Giờ khám',
              value: '${booking['gioKham'] ?? booking['khungGio'] ?? booking['time'] ?? 'N/A'}',
            ),
            const SizedBox(height: 12),
            _buildDetailRow(
              icon: Icons.person,
              label: 'Bác sĩ',
              value: '${booking['bacSi']?['hoTen'] ?? booking['bacSi'] ?? booking['doctor'] ?? 'N/A'}',
            ),
            const SizedBox(height: 12),
            _buildDetailRow(
              icon: Icons.medical_services,
              label: 'Chuyên khoa',
              value: '${booking['chuyenKhoa']?['ten'] ?? booking['chuyenKhoa'] ?? booking['specialty'] ?? 'N/A'}',
            ),
            const SizedBox(height: 12),
            _buildDetailRow(
              icon: Icons.meeting_room,
              label: 'Phòng khám',
              value: '${booking['phong'] ?? booking['room'] ?? 'N/A'}',
            ),
            const SizedBox(height: 24),
            const Text('Ghi chú', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE0E0E0)),
              ),
              child: Text(
                '${booking['ghiChu'] ?? booking['notes'] ?? 'Không có ghi chú'}',
                style: const TextStyle(fontSize: 14, color: Colors.black87),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF1E88E5)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Quay lại', style: TextStyle(color: Color(0xFF1E88E5))),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E88E5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {},
                      child: const Text('Liên hệ phòng khám', style: TextStyle(color: Colors.white)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'xác nhận':
        return const Color(0xFF4CAF50);
      case 'pending':
      case 'chờ xác nhận':
        return const Color(0xFFFB8C00);
      case 'cancelled':
      case 'hủy':
        return const Color(0xFFF44336);
      default:
        return const Color(0xFF1E88E5);
    }
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFF1E88E5).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: const Color(0xFF1E88E5), size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 4),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}