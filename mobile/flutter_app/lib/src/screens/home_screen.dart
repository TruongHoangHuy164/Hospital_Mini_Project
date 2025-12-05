import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../widgets/section_header.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Material(
        color: Colors.transparent,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SectionHeader(title: 'Trang chủ', icon: PhosphorIconsBold.house),
              const SizedBox(height: 12),
              // Hero banner / hospital intro
              _HeroIntro(),
              const SizedBox(height: 16),
              // Services grid
              // Services grid
              Text('Dịch vụ nổi bật', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              GridView(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.8,
                ),
                children: const [
                  _ServiceCard(icon: PhosphorIconsBold.stethoscope, title: 'Khám nội tổng quát'),
                  _ServiceCard(icon: PhosphorIconsBold.heart, title: 'Tim mạch'),
                  _ServiceCard(icon: PhosphorIconsBold.flask, title: 'Xét nghiệm cận lâm sàng'),
                  _ServiceCard(icon: PhosphorIconsBold.firstAid, title: 'Cấp cứu 24/7'),
                ],
              ),
              const SizedBox(height: 20),
              // Booking process guide
              Text('Quy trình đặt khám', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              const _ProcessSteps(),
              const SizedBox(height: 20),
              // Featured news
              Text('Tin tức nổi bật', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              const _NewsList(),
              const SizedBox(height: 20),
              // About Us
              Text('Về chúng tôi', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              const _AboutUs(),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroIntro extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primary.withOpacity(0.12),
            Theme.of(context).colorScheme.secondary.withOpacity(0.12),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 12, offset: Offset(0,6))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(PhosphorIconsBold.firstAid, color: Theme.of(context).colorScheme.primary, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Bệnh viện Demo', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                SizedBox(height: 6),
                Text(
                  'Chăm sóc sức khỏe toàn diện với đội ngũ bác sĩ giàu kinh nghiệm và trang thiết bị hiện đại. Đặt lịch nhanh chóng, theo dõi kết quả tiện lợi.',
                  style: TextStyle(color: Colors.black87),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  const _ActionCard({required this.icon, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 160,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE0E0E0)),
          boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 8, offset: Offset(0,4))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 24, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 10),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  const _ServiceCard({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E0E0)),
        boxShadow: const [BoxShadow(color: Color(0x11000000), blurRadius: 8, offset: Offset(0,4))],
      ),
      child: Row(
        children: [
          Icon(icon, size: 24, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
          Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _ProcessSteps extends StatelessWidget {
  const _ProcessSteps();
  @override
  Widget build(BuildContext context) {
    final steps = [
      {'icon': PhosphorIconsBold.calendarPlus, 'title': 'Chọn ngày & chuyên khoa', 'desc': 'Chọn ngày khám và chuyên khoa mong muốn.'},
      {'icon': PhosphorIconsBold.user, 'title': 'Chọn bác sĩ & khung giờ', 'desc': 'Xem lịch trống, chọn bác sĩ và giờ phù hợp.'},
      {'icon': PhosphorIconsBold.creditCard, 'title': 'Thanh toán MoMo', 'desc': 'Thanh toán để giữ chỗ, nhận số thứ tự.'},
      {'icon': PhosphorIconsBold.identificationCard, 'title': 'Check-in & khám', 'desc': 'Đến quầy, xuất số thứ tự, khám theo hướng dẫn.'},
      {'icon': PhosphorIconsBold.flask, 'title': 'Nhận kết quả', 'desc': 'Theo dõi kết quả xét nghiệm và đơn thuốc trong ứng dụng.'},
    ];
    return Column(
      children: steps.map((s) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEAEAEA)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(s['icon'] as IconData, size: 22, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 10),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s['title'] as String, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(s['desc'] as String, style: const TextStyle(color: Colors.black87)),
              ],
            )),
          ],
        ),
      )).toList(),
    );
  }
}

class _NewsList extends StatelessWidget {
  const _NewsList();
  @override
  Widget build(BuildContext context) {
    final news = [
      {'title': 'Khai trương khoa Tim mạch chất lượng cao', 'date': '05/12/2025'},
      {'title': 'Miễn phí khám tổng quát tuần lễ sức khỏe', 'date': '01/12/2025'},
      {'title': 'Cập nhật quy trình xét nghiệm nhanh 24/7', 'date': '28/11/2025'},
    ];
    return Column(
      children: news.map((n) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEAEAEA)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(child: Text(n['title'] as String, style: const TextStyle(fontWeight: FontWeight.w600))),
            const SizedBox(width: 12),
            Text(n['date'] as String, style: const TextStyle(color: Colors.black54)),
          ],
        ),
      )).toList(),
    );
  }
}

class _AboutUs extends StatelessWidget {
  const _AboutUs();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEAEAEA)),
      ),
      child: const Text(
        'Bệnh viện Demo là cơ sở y tế hiện đại với sứ mệnh chăm sóc sức khỏe cộng đồng. Chúng tôi sở hữu đội ngũ bác sĩ nhiều kinh nghiệm, hệ thống xét nghiệm tiên tiến và quy trình thăm khám minh bạch, nhanh chóng. Ứng dụng hỗ trợ đặt lịch, thanh toán và tra cứu kết quả thuận tiện mọi lúc mọi nơi.',
        style: TextStyle(color: Colors.black87),
      ),
    );
  }
}
