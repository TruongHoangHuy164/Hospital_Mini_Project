import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../api/api_client.dart';
import '../widgets/section_header.dart';

class RelativesScreen extends StatefulWidget {
  const RelativesScreen({super.key});

  @override
  State<RelativesScreen> createState() => _RelativesScreenState();
}

class _RelativesScreenState extends State<RelativesScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _profiles = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient.get('/api/patient-profiles');
      setState(() {
        _profiles = List<Map<String, dynamic>>.from(res is List ? res : []);
      });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ người thân')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const SectionHeader(title: 'Danh sách hồ sơ', icon: PhosphorIconsBold.usersThree),
            const SizedBox(height: 12),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_loading)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
            else if (_profiles.isEmpty)
              const Text('Chưa có hồ sơ người thân.')
            else ..._profiles.map((p) => _ProfileTile(profile: p, onTap: () {
              Navigator.push(context, MaterialPageRoute(
                builder: (_) => ProfileDetailScreen(profileId: p['_id'].toString()),
              ));
            })),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // TODO: Implement add-new profile screen
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tính năng thêm hồ sơ sẽ sớm có.')));
        },
        icon: const Icon(PhosphorIconsBold.userPlus),
        label: const Text('Thêm hồ sơ'),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final Map<String, dynamic> profile;
  final VoidCallback onTap;
  const _ProfileTile({required this.profile, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final name = (profile['hoTen'] ?? '').toString();
    final phone = (profile['soDienThoai'] ?? '').toString();
    final relation = (profile['quanHe'] ?? '').toString();
    return Card(
      child: ListTile(
        leading: const CircleAvatar(child: Icon(PhosphorIconsBold.user)),
        title: Text(name.isEmpty ? 'Chưa đặt tên' : name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text([relation, phone].where((e) => e.isNotEmpty).join(' • ')),
        trailing: const Icon(PhosphorIconsBold.caretRight),
        onTap: onTap,
      ),
    );
  }
}

class ProfileDetailScreen extends StatefulWidget {
  final String profileId;
  const ProfileDetailScreen({super.key, required this.profileId});

  @override
  State<ProfileDetailScreen> createState() => _ProfileDetailScreenState();
}

class _ProfileDetailScreenState extends State<ProfileDetailScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient.get('/api/patient-profiles/${widget.profileId}');
      setState(() { _profile = Map<String, dynamic>.from(res); });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _profile;
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết hồ sơ')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : p == null
                  ? const Center(child: Text('Không tìm thấy hồ sơ'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  const CircleAvatar(radius: 28, child: Icon(PhosphorIconsBold.user)),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text((p['hoTen'] ?? '').toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                                        const SizedBox(height: 4),
                                        Text((p['quanHe'] ?? '').toString(), style: const TextStyle(color: Colors.grey)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          _InfoRow(icon: PhosphorIconsBold.identificationCard, label: 'CCCD', value: (p['cccd'] ?? '').toString()),
                          _InfoRow(icon: PhosphorIconsBold.phone, label: 'Số điện thoại', value: (p['soDienThoai'] ?? '').toString()),
                          _InfoRow(icon: PhosphorIconsBold.envelopeSimple, label: 'Email', value: (p['email'] ?? '').toString()),
                          _InfoRow(icon: PhosphorIconsBold.cake, label: 'Ngày sinh', value: (p['ngaySinh'] ?? '').toString()),
                          _InfoRow(icon: PhosphorIconsBold.genderIntersex, label: 'Giới tính', value: (p['gioiTinh'] ?? '').toString()),
                          _InfoRow(icon: PhosphorIconsBold.mapPin, label: 'Địa chỉ', value: (p['diaChi'] ?? '').toString()),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _load,
                                  icon: const Icon(PhosphorIconsBold.arrowClockwise),
                                  label: const Text('Làm mới'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () { 
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chỉnh sửa hồ sơ sẽ sớm có.')));
                                  },
                                  icon: const Icon(PhosphorIconsBold.pencilSimple),
                                  label: const Text('Chỉnh sửa'),
                                ),
                              ),
                            ],
                          )
                        ],
                      ),
                    ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 2),
                Text(value.isEmpty ? '-' : value, style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
