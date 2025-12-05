import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../src/theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/booking_screen.dart';
import 'screens/results_screen.dart';
import 'screens/history_screen.dart';
import 'screens/booking_detail_screen.dart';
import 'screens/result_detail_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/relatives_screen.dart';

class ClinicApp extends StatefulWidget {
  const ClinicApp({super.key});

  @override
  State<ClinicApp> createState() => _ClinicAppState();
}

class _ClinicAppState extends State<ClinicApp> {
  String? _token;

  @override
  void initState() {
    super.initState();
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _token = prefs.getString('accessToken');
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hospital Clinic',
      theme: AppTheme.light(),
      home: _token == null ? const LoginScreen() : const HomeTabs(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/tabs': (context) => const HomeTabs(),
        '/home': (context) => const HomeScreen(),
        '/booking': (context) => const BookingScreen(),
        '/results': (context) => const ResultsScreen(),
        '/history': (context) => const HistoryScreen(),
        '/profile': (context) => const ProfileScreen(),
        '/relatives': (context) => const RelativesScreen(),
        '/booking-detail': (context) => const BookingDetailScreen(),
        '/result-detail': (context) => const ResultDetailScreen(),
      },
    );
  }
}

class HomeTabs extends StatefulWidget {
  const HomeTabs({super.key});

  @override
  State<HomeTabs> createState() => _HomeTabsState();
}

class _HomeTabsState extends State<HomeTabs> {
  int _index = 0;
  final pages = const [HomeScreen(), BookingScreen(), ResultsScreen(), HistoryScreen(), ProfileScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bệnh viện Demo')),
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        destinations: const [
          NavigationDestination(icon: Icon(PhosphorIconsBold.house), label: 'Trang chủ'),
          NavigationDestination(icon: Icon(PhosphorIconsBold.calendarBlank), label: 'Đặt lịch'),
          NavigationDestination(icon: Icon(PhosphorIconsBold.flask), label: 'Kết quả'),
          NavigationDestination(icon: Icon(PhosphorIconsBold.clockCounterClockwise), label: 'Lịch sử'),
          NavigationDestination(icon: Icon(PhosphorIconsBold.userCircle), label: 'Hồ sơ'),
        ],
        onDestinationSelected: (i) => setState(() => _index = i),
      ),
    );
  }
}