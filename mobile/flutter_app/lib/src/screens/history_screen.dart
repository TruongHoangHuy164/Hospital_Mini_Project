import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../api/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _items = [];
  List<dynamic> _allItems = [];
  bool _loading = false;
  String? _error;
  // Patient selector state
  final _patients = <Map<String, dynamic>>[]; // { id, label, type }
  String? _patientId;
  String? _patientType;

  @override
  void initState() {
    super.initState();
    _loadPatients().then((_) => _load());
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      // Adjust to actual endpoint if different
      final data = await ApiClient.get('/api/booking/my-appointments');
      _allItems = List<dynamic>.from(data['items'] ?? data);
      _applyFilter();
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  void _applyFilter() {
    final sel = _patients.firstWhere((e) => e['id'] == _patientId, orElse: () => {});
    final selLabel = (sel['label'] ?? '').toString().trim();
    final filtered = (selLabel.isEmpty)
        ? _allItems
        : _allItems.where((it) {
            final name = (it['benhNhan']?['hoTen'] ?? '').toString().trim();
            return name.isNotEmpty && name == selLabel;
          }).toList();
    setState(() { _items = filtered; });
  }

  Future<void> _loadPatients() async {
    try {
      final listSelf = await ApiClient.get('/api/booking/patients');
      final listRel = await ApiClient.get('/api/patient-profiles');
      final selfAll = List<Map<String, dynamic>>.from(listSelf is List ? listSelf : []);
      final relAll = List<Map<String, dynamic>>.from(listRel is List ? listRel : []);
      if (selfAll.isEmpty) {
        final prefs = await SharedPreferences.getInstance();
        final name = prefs.getString('userName') ?? 'Người dùng';
        final created = await ApiClient.post('/api/booking/patients', {'hoTen': name});
        selfAll.add(Map<String, dynamic>.from(created));
      }
      final selfItems = selfAll.isNotEmpty ? [selfAll.first] : <Map<String, dynamic>>[];
      final seenRel = <String>{};
      final relItems = <Map<String, dynamic>>[];
      for (final p in relAll) {
        final id = (p['_id'] ?? '').toString();
        if (id.isEmpty || seenRel.contains(id)) continue;
        seenRel.add(id);
        relItems.add(p);
      }
      final unified = <Map<String, dynamic>>[];
      for (final p in selfItems) {
        unified.add({'id': (p['_id'] ?? '').toString(), 'label': (p['hoTen'] ?? 'Hồ sơ cá nhân').toString(), 'type': 'self'});
      }
      for (final p in relItems) {
        unified.add({'id': (p['_id'] ?? '').toString(), 'label': ((p['hoTen'] ?? 'Hồ sơ người thân').toString() + (p['quanHe'] != null && p['quanHe'].toString().isNotEmpty ? ' (${p['quanHe']})' : '')), 'type': 'relative'});
      }
      setState(() {
        _patients
          ..clear()
          ..addAll(unified);
        if (_patients.isNotEmpty) {
          _patientId = _patients.first['id'];
          _patientType = _patients.first['type'];
        }
      });
    } catch (e) {
      // keep silent
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text('Lỗi: $_error'));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Hồ sơ'),
            items: _patients.map((p) {
              final id = p['id']?.toString();
              final label = (p['label'] ?? 'Hồ sơ').toString();
              return DropdownMenuItem<String>(value: id, child: Text(label));
            }).toList(),
            value: _patientId,
            onChanged: (v) {
              final sel = _patients.firstWhere((e) => e['id'] == v, orElse: () => {});
              setState(() { _patientId = v; _patientType = sel['type']?.toString(); });
              _applyFilter();
            },
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _items.isEmpty
              ? const Center(child: Text('Chưa có lịch sử khám'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemBuilder: (_, i) {
          final it = _items[i];
          final status = '${it['trangThai'] ?? ''}';
          final ngay = it['ngayKham']?.toString() ?? '';
          final gio = it['khungGio']?.toString() ?? '';
          final patientName = it['benhNhan']?['hoTen']?.toString() ?? '';
          final bacSiName = it['bacSi']?['hoTen']?.toString() ?? '';
          final chuyenKhoa = it['bacSi']?['chuyenKhoa']?.toString() ?? it['chuyenKhoa']?['ten']?.toString() ?? '';
          return Card(
            child: ListTile(
              leading: const Icon(PhosphorIconsBold.calendarCheck),
              title: Text(bacSiName.isNotEmpty ? '$bacSiName • $chuyenKhoa' : 'Lịch khám', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('Bệnh nhân: $patientName\nNgày: $ngay • Giờ: $gio'),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(status),
              ),
              onTap: () => Navigator.pushNamed(context, '/booking-detail', arguments: it),
            ),
          ).animate().fadeIn(duration: 250.ms).moveY(begin: 6, end: 0);
        },
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemCount: _items.length,
                  ),
                ),
        ),
      ],
    );
  }
}