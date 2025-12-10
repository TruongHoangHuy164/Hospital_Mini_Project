import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../widgets/section_header.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

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
              const SectionHeader(title: 'Hồ sơ cá nhân', icon: PhosphorIconsBold.userCircle),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE0E0E0)),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(radius: 28, child: Icon(PhosphorIconsBold.user)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Tên người dùng', style: TextStyle(fontWeight: FontWeight.w600)),
                          SizedBox(height: 4),
                          Text('Số điện thoại / Email', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text('Quản lý hồ sơ'),
              const SizedBox(height: 8),
              _ProfileItem(icon: PhosphorIconsBold.identificationCard, title: 'Thông tin cá nhân', onTap: () {}),
              _ProfileItem(icon: PhosphorIconsBold.usersThree, title: 'Hồ sơ người thân', onTap: () {
                Navigator.pushNamed(context, '/relatives');
              }),
              _ProfileItem(icon: PhosphorIconsBold.mapPin, title: 'Địa chỉ liên hệ', onTap: () {}),
              const SizedBox(height: 16),
              const Text('Bảo mật'),
              const SizedBox(height: 8),
              _ProfileItem(icon: PhosphorIconsBold.lockKey, title: 'Đổi mật khẩu', onTap: () {}),
              _ProfileItem(icon: PhosphorIconsBold.signOut, title: 'Đăng xuất', onTap: () {
                Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
              }),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  const _ProfileItem({required this.icon, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFE0E0E0))),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(child: Text(title)),
            const Icon(PhosphorIconsBold.caretRight),
          ],
        ),
      ),
    );
  }
}
