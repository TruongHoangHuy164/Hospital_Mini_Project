import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../api/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({super.key});

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  List<dynamic> _items = [];
  bool _loading = false;
  String? _error;
  // Patient selector (UI only; backend response lacks patient field)
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
      final data = await ApiClient.get('/api/booking/my-results');
      // Backend does not include patient info per item, so we display all
      setState(() { _items = List<dynamic>.from(data['items'] ?? data); });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
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
              // Note: Backend doesn't return patient per result; showing all
            },
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _items.isEmpty
              ? const Center(child: Text('Chưa có kết quả xét nghiệm'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final it = _items[i];
                      return Card(
                        child: ListTile(
                          leading: const Icon(PhosphorIconsBold.flask),
                          title: Text('${it['loaiChiDinh'] ?? it['ten'] ?? it['name'] ?? 'Kết quả'}', style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text('Ngày: ${it['ngayThucHien'] ?? it['createdAt'] ?? ''}'),
                          trailing: const Icon(PhosphorIconsBold.caretRight),
                          onTap: () => Navigator.pushNamed(context, '/result-detail', arguments: it),
                        ),
                      ).animate().fadeIn(duration: 250.ms).moveY(begin: 6, end: 0);
                    },
                  ),
                ),
        ),
      ],
    );
  }
}