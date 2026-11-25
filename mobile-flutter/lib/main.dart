import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'models/models.dart';
import 'screens/admin_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/merchant_scanner_screen.dart';
import 'screens/offers_screen.dart';
import 'screens/orders_qr_screen.dart';
import 'screens/profile_impact_screen.dart';
import 'screens/radar_screen.dart';
import 'services/api_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  String? firebaseInitError;
  try {
    await Firebase.initializeApp();
  } catch (e) {
    firebaseInitError = e.toString();
  }
  runApp(CampusSaveApp(firebaseInitError: firebaseInitError));
}

class CampusSaveApp extends StatelessWidget {
  final String? firebaseInitError;
  const CampusSaveApp({super.key, this.firebaseInitError});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CampusSave ESSECT',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF15803D),
          surface: const Color(0xFFF8F9F7),
        ),
        scaffoldBackgroundColor: const Color(0xFFF8F9F7),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        navigationBarTheme: const NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: Color(0xFFDCFCE7),
          elevation: 1,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        ),
        useMaterial3: true,
      ),
      home: MainShell(firebaseInitError: firebaseInitError),
    );
  }
}

class MainShell extends StatefulWidget {
  final String? firebaseInitError;
  const MainShell({super.key, this.firebaseInitError});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  final ApiService _api = ApiService();
  int _tabIndex = 0;
  bool _restoring = true;
  String? _startupError;
  String? _selectedMerchantIdFilter;

  @override
  void initState() {
    super.initState();
    _initSession();
  }

  Future<void> _initSession() async {
    setState(() {
      _restoring = true;
      _startupError = null;
    });
    try {
      if (widget.firebaseInitError == null) {
        await _api.restoreSession().timeout(const Duration(seconds: 8));
      }
    } on TimeoutException {
      _startupError =
      'Le serveur met trop de temps à répondre. Vérifiez l’IP locale et le serveur Node.js.';
    } on ServerUnreachableException catch (e) {
      _startupError = e.message;
    } catch (e) {
      _startupError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      if (mounted) {
        setState(() => _restoring = false);
      }
    }
  }

  void _onAuthChanged() {
    setState(() {
      _tabIndex = 0;
      _selectedMerchantIdFilter = null;
    });
  }

  void _openMerchantOffers(CampusMerchant merchant) {
    if (_api.role == 'merchant') {
      if (merchant.id == _api.currentMerchant?.id) {
        setState(() => _tabIndex = 1);
      }
      return;
    }
    if (_api.role == 'admin') return;
    setState(() {
      _selectedMerchantIdFilter = merchant.id;
      _tabIndex = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.firebaseInitError != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 52),
                const SizedBox(height: 12),
                const Text(
                  'Configuration Firebase manquante',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Vérifiez android/app/google-services.json.\nDétail : ${widget.firebaseInitError}',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_restoring) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 14),
              Text('Connexion à CampusSave...'),
            ],
          ),
        ),
      );
    }

    if (_startupError != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_outlined, color: Colors.orange, size: 52),
                const SizedBox(height: 12),
                const Text(
                  'Serveur injoignable',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(_startupError!, textAlign: TextAlign.center),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _initSession,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Réessayer'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => setState(() => _startupError = null),
                  child: const Text('Continuer sans session'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final role = _api.isAuthenticated ? _api.role : 'guest';
    final List<Widget> screens;
    final List<NavigationDestination> destinations;

    if (role == 'merchant') {
      screens = [
        MerchantScannerScreen(
          api: _api,
          onOpenOffersTab: () => setState(() => _tabIndex = 1),
        ),
        OffersScreen(
          api: _api,
          onAuthChanged: _onAuthChanged,
          initialMerchantId: null,
          onClearMerchantFilter: null,
        ),
        RadarScreen(api: _api, onSelectMerchant: _openMerchantOffers),
        ProfileImpactScreen(api: _api, onAuthChanged: _onAuthChanged),
      ];
      destinations = const [
        NavigationDestination(
          icon: Icon(Icons.store_mall_directory_outlined),
          label: 'Commerce',
        ),
        NavigationDestination(
          icon: Icon(Icons.storefront_outlined),
          label: 'Mes Offres',
        ),
        NavigationDestination(
          icon: Icon(Icons.radar_outlined),
          label: 'Radar',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          label: 'Profil',
        ),
      ];
    } else if (role == 'admin') {
      screens = [
        AdminScreen(api: _api),
        OffersScreen(
          api: _api,
          onAuthChanged: _onAuthChanged,
          initialMerchantId: null,
          onClearMerchantFilter: null,
        ),
        RadarScreen(api: _api, onSelectMerchant: _openMerchantOffers),
        ProfileImpactScreen(api: _api, onAuthChanged: _onAuthChanged),
      ];
      destinations = const [
        NavigationDestination(
          icon: Icon(Icons.admin_panel_settings_outlined),
          label: 'Admin',
        ),
        NavigationDestination(
          icon: Icon(Icons.storefront_outlined),
          label: 'Offres',
        ),
        NavigationDestination(
          icon: Icon(Icons.radar_outlined),
          label: 'Radar',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          label: 'Profil',
        ),
      ];
    } else if (role == 'student') {
      screens = [
        OffersScreen(
          api: _api,
          onAuthChanged: _onAuthChanged,
          initialMerchantId: _selectedMerchantIdFilter,
          onClearMerchantFilter: () => setState(() => _selectedMerchantIdFilter = null),
          onOrderPaid: () => setState(() => _tabIndex = 2),
        ),
        RadarScreen(api: _api, onSelectMerchant: _openMerchantOffers),
        OrdersQrScreen(api: _api),
        ProfileImpactScreen(api: _api, onAuthChanged: _onAuthChanged),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.storefront_outlined), label: 'Offres'),
        NavigationDestination(icon: Icon(Icons.radar_outlined), label: 'Radar'),
        NavigationDestination(icon: Icon(Icons.qr_code_2), label: 'Mes QR'),
        NavigationDestination(icon: Icon(Icons.eco_outlined), label: 'Impact'),
      ];
    } else {
      screens = [
        OffersScreen(
          api: _api,
          onAuthChanged: _onAuthChanged,
          initialMerchantId: _selectedMerchantIdFilter,
          onClearMerchantFilter: () => setState(() => _selectedMerchantIdFilter = null),
          onRequireLogin: () => setState(() => _tabIndex = 2),
        ),
        RadarScreen(api: _api, onSelectMerchant: _openMerchantOffers),
        AuthScreen(api: _api, onAuthSuccess: _onAuthChanged),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.storefront_outlined), label: 'Offres'),
        NavigationDestination(icon: Icon(Icons.radar_outlined), label: 'Radar'),
        NavigationDestination(icon: Icon(Icons.login), label: 'Connexion'),
      ];
    }

    final safeIndex = _tabIndex.clamp(0, screens.length - 1);

    return Scaffold(
      body: screens[safeIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIndex,
        onDestinationSelected: (idx) => setState(() => _tabIndex = idx),
        destinations: destinations,
      ),
    );
  }
}