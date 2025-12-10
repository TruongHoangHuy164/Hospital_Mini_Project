import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../api/api_client.dart';
import '../widgets/section_header.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});
  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  DateTime? _date;
  String? _specialtyId;
  String? _doctorId;
  String? _slot;
  bool _loading = false;
  String? _message;
  bool _paying = false;
  bool _issuing = false;
  bool _checking = false;
  final _patients = <Map<String, dynamic>>[]; // unified list: { id, label, type }
  String? _patientId; // stores the unified id
  String? _patientType; // 'self' or 'relative'

  final _specialties = <Map<String, dynamic>>[];
  final _doctors = <Map<String, dynamic>>[];
  final Map<String, List<String>> _slotsByDoctor = {};
  Map<String, dynamic>? _shiftHours;
  Map<String, dynamic>? _appointment; // created appointment
  int? _issuedSoThuTu; // issued queue number

  @override
  void initState() {
    super.initState();
    _loadPatients();
    _loadSpecialties();
  }

  Future<void> _loadPatients() async {
    try {
      final listSelf = await ApiClient.get('/api/booking/patients');
      final listRel = await ApiClient.get('/api/patient-profiles');
      final selfAll = List<Map<String, dynamic>>.from(listSelf is List ? listSelf : []);
      final relAll = List<Map<String, dynamic>>.from(listRel is List ? listRel : []);
      if (selfAll.isEmpty) {
        // Create minimal self profile if none exists
        final prefs = await SharedPreferences.getInstance();
        final name = prefs.getString('userName') ?? 'Người dùng';
        final created = await ApiClient.post('/api/booking/patients', {'hoTen': name});
        selfAll.add(Map<String, dynamic>.from(created));
      }
      // Keep only the most recent self record (API already sorted desc; pick first)
      final selfItems = selfAll.isNotEmpty ? [selfAll.first] : <Map<String, dynamic>>[];
      // Dedupe relatives by id just in case
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
        unified.add({
          'id': (p['_id'] ?? '').toString(),
          'label': (p['hoTen'] ?? 'Hồ sơ cá nhân').toString(),
          'type': 'self',
        });
      }
      for (final p in relItems) {
        unified.add({
          'id': (p['_id'] ?? '').toString(),
          'label': ((p['hoTen'] ?? 'Hồ sơ người thân').toString() + (p['quanHe'] != null && p['quanHe'].toString().isNotEmpty ? ' (${p['quanHe']})' : '')),
          'type': 'relative',
        });
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
      setState(() { _message = 'Tải hồ sơ bệnh nhân thất bại: $e'; });
    }
  }

  Future<void> _loadSpecialties() async {
    try {
      // Align with web: use booking specialties
      final data = await ApiClient.get('/api/booking/specialties');
      setState(() {
        _specialties
          ..clear()
          ..addAll(List<Map<String, dynamic>>.from(data is List ? data : (data['items'] ?? [])));
      });
    } catch (e) {
      setState(() { _message = 'Tải chuyên khoa thất bại: $e'; });
    }
  }

  Future<void> _checkAvailability() async {
    if (_specialtyId == null || _date == null) {
      setState(() { _message = 'Vui lòng chọn chuyên khoa và ngày khám'; });
      return;
    }
    setState(() { _loading = true; _message = null; _doctorId = null; _slot = null; });
    try {
      final dateStr = _date!.toIso8601String().substring(0, 10);
      final data = await ApiClient.get('/api/booking/availability', {
        'chuyenKhoaId': _specialtyId!,
        'date': dateStr,
      });
      final List<dynamic> docs = data['doctors'] ?? [];
      setState(() {
        _doctors
          ..clear()
          ..addAll(docs.map((d) => {
                '_id': d['bacSiId'],
                'hoTen': d['hoTen'],
                'chuyenKhoa': d['chuyenKhoa'],
                'khungGioTrong': d['khungGioTrong'] ?? [],
              }).cast<Map<String, dynamic>>());
        _slotsByDoctor
          ..clear();
        for (final d in docs) {
          final id = (d['bacSiId'] ?? '').toString();
          final slots = (d['khungGioTrong'] as List?)?.map((e) => e.toString()).toList() ?? <String>[];
          _slotsByDoctor[id] = slots;
        }
        _shiftHours = (data['shiftHours'] is Map) ? Map<String, dynamic>.from(data['shiftHours']) : null;
      });
    } catch (e) {
      setState(() { _message = 'Tải lịch trống thất bại: $e'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<String?> _ensureSelfPatientId() async {
    try {
      final list = await ApiClient.get('/api/booking/patients');
      final items = List<Map<String,dynamic>>.from(list);
      if (items.isNotEmpty) return items.first['_id']?.toString();
    } catch (_) {}
    // Try to create minimal patient from stored userName
    try {
      final prefs = await SharedPreferences.getInstance();
      final name = prefs.getString('userName') ?? 'Người dùng';
      final created = await ApiClient.post('/api/booking/patients', { 'hoTen': name });
      return created['_id']?.toString();
    } catch (e) {
      setState(() { _message = 'Không thể tạo hồ sơ bệnh nhân: $e'; });
      return null;
    }
  }

  Future<void> _book() async {
    if (_date == null || _doctorId == null) {
      setState(() { _message = 'Vui lòng chọn ngày và bác sĩ'; });
      return;
    }
    setState(() { _loading = true; _message = null; });
    try {
      if (_slot == null) {
        setState(() { _message = 'Vui lòng chọn khung giờ trống'; });
        return;
      }
      String? selectedId = _patientId;
      String? selectedType = _patientType;
      if (selectedId == null) {
        selectedId = await _ensureSelfPatientId();
        selectedType = 'self';
      }
      if (selectedId == null) return;
      final dateStr = _date!.toIso8601String().substring(0, 10);
      final payload = {
        if (selectedType == 'relative') 'hoSoBenhNhanId': selectedId,
        if (selectedType != 'relative') 'benhNhanId': selectedId,
        'bacSiId': _doctorId,
        'chuyenKhoaId': _specialtyId,
        'date': dateStr,
        'khungGio': _slot,
      };
      final res = await ApiClient.post('/api/booking/appointments', payload);
      Map<String, dynamic>? appt;
      if (res is Map) {
        if (res.containsKey('_id')) {
          appt = Map<String, dynamic>.from(res);
        } else if (res['lichKham'] is Map) {
          appt = Map<String, dynamic>.from(res['lichKham']);
        }
      }
      setState(() {
        _appointment = appt;
        _message = 'Đặt lịch thành công';
      });
    } catch (e) {
      setState(() { _message = 'Đặt lịch thất bại: $e'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<void> _payMomo() async {
    final id = _appointment?['_id']?.toString();
    if (id == null) { setState(() { _message = 'Chưa có lịch để thanh toán'; }); return; }
    setState(() { _paying = true; _message = null; });
    try {
      final res = await ApiClient.post('/api/booking/appointments/$id/momo', {});
      String? payUrl; String? deeplink;
      if (res is Map) {
        payUrl = res['payUrl']?.toString();
        deeplink = res['deeplink']?.toString();
      }
      final target = (deeplink != null && deeplink.isNotEmpty) ? deeplink : payUrl;
      if (target == null || target.isEmpty) {
        throw Exception('Không nhận được liên kết thanh toán (payUrl/deeplink)');
      }
      await _openUrl(target);
    } catch (e) {
      setState(() { _message = 'Tạo thanh toán MoMo thất bại: $e'; });
    } finally {
      setState(() { _paying = false; });
    }
  }

  Future<void> _issueTicket() async {
    final id = _appointment?['_id']?.toString();
    if (id == null) { setState(() { _message = 'Chưa có lịch để cấp số'; }); return; }
    setState(() { _issuing = true; _message = null; });
    try {
      final res = await ApiClient.post('/api/booking/appointments/$id/pay', {});
      int? stt;
      if (res is Map) {
        // Could be { lichKham: {...}, soThuTu: { soThuTu: n } } or { ok:true, soThuTu:n }
        final soThuTuObj = res['soThuTu'];
        if (soThuTuObj is Map) {
          stt = (soThuTuObj['soThuTu'] as num?)?.toInt();
        } else {
          stt = (res['soThuTu'] as num?)?.toInt();
        }
      }
      setState(() { _issuedSoThuTu = stt; });
      if (stt == null) throw Exception('Máy chủ không trả về số thứ tự');
    } catch (e) {
      setState(() { _message = 'Cấp số thứ tự thất bại: $e'; });
    } finally {
      setState(() { _issuing = false; });
    }
  }

  Future<void> _checkTicket() async {
    final id = _appointment?['_id']?.toString();
    if (id == null) return;
    setState(() { _checking = true; });
    try {
      final res = await ApiClient.get('/api/booking/appointments/$id/ticket');
      int? stt;
      if (res is Map) {
        stt = (res['soThuTu'] as num?)?.toInt();
      }
      setState(() { _issuedSoThuTu = stt ?? _issuedSoThuTu; });
    } catch (_) {} finally { setState(() { _checking = false; }); }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      throw Exception('Không thể mở liên kết thanh toán');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'Đặt lịch khám', icon: PhosphorIconsBold.stethoscope),
          const SizedBox(height: 12),
          // Patient selector (self or relatives)
          if (_patients.isNotEmpty) ...[
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Hồ sơ khám'),
              items: _patients
                  .map((p) {
                    final id = p['id']?.toString();
                    final label = (p['label'] ?? 'Hồ sơ').toString();
                    final type = (p['type'] ?? 'self').toString();
                    final tag = type == 'relative' ? 'Người thân' : 'Cá nhân';
                    return DropdownMenuItem<String>(value: id, child: Row(
                      children: [
                        Text(label), const SizedBox(width: 8),
                        Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.blue.withOpacity(0.08), borderRadius: BorderRadius.circular(999)), child: Text(tag, style: const TextStyle(fontSize: 11, color: Colors.blue))),
                      ],
                    ));
                  })
                  .whereType<DropdownMenuItem<String>>()
                  .toList(),
              onChanged: (v) {
                final sel = _patients.firstWhere((e) => e['id'] == v, orElse: () => {});
                setState(() { _patientId = v; _patientType = sel['type']?.toString(); });
              },
              value: _patientId,
            ),
            const SizedBox(height: 12),
          ],
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Chuyên khoa'),
            items: _specialties
                .map((s) {
                  final id = s['_id']?.toString();
                  final label = '${s['ten'] ?? s['name'] ?? 'Unknown'}';
                  return DropdownMenuItem<String>(value: id, child: Text(label));
                })
                .whereType<DropdownMenuItem<String>>()
                .toList(),
            onChanged: (v) => setState(() { _specialtyId = v; _doctorId = null; _slot = null; }),
            value: _specialtyId,
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () async {
                final picked = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 60)));
                if (picked != null) {
                  setState(() { _date = picked; });
                }
              },
              child: Text(_date == null ? 'Chọn ngày' : 'Ngày: ${_date!.toLocal().toString().substring(0,10)}'),
            )),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton(
              onPressed: _loading ? null : _checkAvailability,
              child: _loading ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Xem lịch trống'),
            )),
          ]),
          const SizedBox(height: 12),
          if (_shiftHours != null) ...[
            Text(
              'Khung ca: '
              'Sáng ${_shiftHours!['sang']?['start'] ?? '--'}-${_shiftHours!['sang']?['end'] ?? '--'} • '
              'Chiều ${_shiftHours!['chieu']?['start'] ?? '--'}-${_shiftHours!['chieu']?['end'] ?? '--'} • '
              'Tối ${_shiftHours!['toi']?['start'] ?? '--'}-${_shiftHours!['toi']?['end'] ?? '--'}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 8),
          ],
          // Doctors and slot chips
          if (_doctors.isNotEmpty) ...[
            const Text('Chọn bác sĩ và khung giờ', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ..._doctors.map((d) {
              final id = d['_id']?.toString() ?? '';
              final slots = _slotsByDoctor[id] ?? <String>[];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE0E0E0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text(d['hoTen']?.toString() ?? 'Bác sĩ', style: const TextStyle(fontWeight: FontWeight.w600))),
                        Text(d['chuyenKhoa']?.toString() ?? '', style: const TextStyle(color: Colors.grey)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (slots.isEmpty)
                      const Text('Hết chỗ', style: TextStyle(color: Colors.grey))
                    else
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final s in slots)
                            ChoiceChip(
                              label: Text(s),
                              selected: _doctorId == id && _slot == s,
                              onSelected: (_) => setState(() { _doctorId = id; _slot = s; }),
                            ),
                        ],
                      ),
                  ],
                ),
              ).animate().fadeIn(duration: 250.ms).moveY(begin: 6, end: 0);
            }).toList(),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading || _doctorId == null || _slot == null ? null : _book,
              child: _loading ? const CircularProgressIndicator() : const Text('Đặt lịch'),
            ),
          ),
          const SizedBox(height: 12),
          if (_appointment != null) ...[
            const Divider(),
            const Text('Thanh toán & Số thứ tự', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: ElevatedButton(
                onPressed: _paying ? null : _payMomo,
                child: _paying ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Thanh toán MoMo'),
              )),
              const SizedBox(width: 12),
              Expanded(child: OutlinedButton(
                onPressed: _issuing ? null : _issueTicket,
                child: _issuing ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Cấp số thứ tự'),
              )),
            ]),
            const SizedBox(height: 8),
            if (_issuedSoThuTu != null)
              Text('Số thứ tự của bạn: $_issuedSoThuTu', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
            TextButton(onPressed: _checking ? null : _checkTicket, child: _checking ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Kiểm tra số thứ tự')),
          ],
          const SizedBox(height: 4),
          if (_message != null) Text(_message!, style: TextStyle(color: _message!.startsWith('Đặt lịch thành công') ? Colors.green : Colors.red)),
        ],
        ),
      ),
    );
  }
}