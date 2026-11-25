import 'dart:async';
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/models.dart';
import 'campus_firebase_service.dart';

class EmailNotVerifiedException implements Exception {
  final String message;
  EmailNotVerifiedException(this.message);
  @override
  String toString() => message;
}

class ServerUnreachableException implements Exception {
  final String message;
  ServerUnreachableException([
    this.message =
    'Serveur CampusSave injoignable. Vérifiez que le serveur Node.js est démarré et accessible.',
  ]);
  @override
  String toString() => message;
}

class ApiService {
  static const Duration _timeout = Duration(seconds: 8);

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final CampusFirebaseService firebaseService = CampusFirebaseService();

  CampusUser? currentUser;
  CampusMerchant? currentMerchant;

  bool get isAuthenticated => _auth.currentUser != null && currentUser != null;
  String get role => currentUser?.role ?? 'guest';

  Future<Map<String, String>> _authHeaders({bool forceRefresh = false}) async {
    final token = await firebaseService
        .getIdToken(forceRefresh: forceRefresh)
        .timeout(_timeout);
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> _send(Future<http.Response> Function() req) async {
    try {
      return await req().timeout(_timeout);
    } on TimeoutException {
      throw ServerUnreachableException();
    } on http.ClientException {
      throw ServerUnreachableException();
    }
  }

  dynamic _decodeResponse(http.Response res) {
    final dynamic data = res.body.isNotEmpty ? jsonDecode(res.body) : {};
    if (res.statusCode >= 400) {
      final msg = data is Map && data['error'] != null
          ? data['error'].toString()
          : 'Erreur serveur (${res.statusCode})';
      throw Exception(msg);
    }
    return data;
  }

  void _validateGmail(String email) {
    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
      throw Exception('Seules les adresses @gmail.com sont acceptées.');
    }
  }

  Future<void> _syncFcmToken() async {
    await firebaseService.initNotifications(
      onToken: (token) async {
        try {
          await _send(
                () async => http.post(
              Uri.parse('${ApiConfig.baseUrl}/notifications/token'),
              headers: await _authHeaders(),
              body: jsonEncode({'token': token}),
            ),
          );
        } catch (_) {}
      },
    );
  }

  /// Restaure la session au démarrage si Firebase Auth est déjà connecté.
  /// Lève ServerUnreachableException si le serveur Node.js ne répond pas sous 8s.
  Future<bool> restoreSession() async {
    final user = _auth.currentUser;
    if (user == null) return false;
    try {
      await user.reload().timeout(_timeout);
      final refreshed = _auth.currentUser;
      if (refreshed == null || !refreshed.emailVerified) {
        return false;
      }
      await fetchMe(forceRefreshToken: true);
      unawaited(_syncFcmToken());
      return true;
    } on TimeoutException {
      throw ServerUnreachableException();
    } on ServerUnreachableException {
      rethrow;
    } catch (_) {
      return false;
    }
  }

  Future<CampusUser> login(String email, String password) async {
    _validateGmail(email);
    await _auth
        .signInWithEmailAndPassword(email: email.trim(), password: password)
        .timeout(_timeout);
    await _auth.currentUser?.reload().timeout(_timeout);
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Impossible de récupérer la session Firebase.');
    }
    if (!user.emailVerified) {
      throw EmailNotVerifiedException(
        'Votre adresse Gmail n\'est pas encore vérifiée. Consultez votre boîte de réception.',
      );
    }
    await fetchMe(forceRefreshToken: true);
    unawaited(_syncFcmToken());
    return currentUser!;
  }

  Future<void> startFirebaseRegister(String email, String password) async {
    _validateGmail(email);
    if (password.length < 6) {
      throw Exception('Le mot de passe doit contenir au moins 6 caractères.');
    }
    final cred = await _auth
        .createUserWithEmailAndPassword(email: email.trim(), password: password)
        .timeout(_timeout);
    await cred.user?.sendEmailVerification().timeout(_timeout);
  }

  Future<void> resendVerificationEmail() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Aucune session Firebase active.');
    }
    await user.sendEmailVerification().timeout(_timeout);
  }

  Future<CampusUser> completeBackendRegister({
    required String name,
    required String role,
    required String phone,
    String? studentCardId,
    String? businessName,
    String? businessAddress,
    String? businessCategory,
    String? businessDescription,
  }) async {
    await _auth.currentUser?.reload().timeout(_timeout);
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Session Firebase expirée. Reconnectez-vous.');
    }
    if (!user.emailVerified) {
      throw EmailNotVerifiedException(
        'E-mail non encore vérifié. Cliquez sur le lien reçu sur Gmail puis réessayez.',
      );
    }

    final body = <String, dynamic>{
      'name': name.trim(),
      'role': role,
      'phone': phone.trim(),
      if (studentCardId != null && studentCardId.trim().isNotEmpty)
        'studentCardId': studentCardId.trim(),
      if (role == 'merchant') ...{
        'businessName': businessName?.trim() ?? '',
        'businessAddress': businessAddress?.trim() ?? '',
        'businessCategory': businessCategory ?? 'Boulangerie',
        'businessDescription': businessDescription?.trim() ?? '',
      },
    };

    final res = await _send(
          () async => http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/register'),
        headers: await _authHeaders(forceRefresh: true),
        body: jsonEncode(body),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    if (data['user'] != null) {
      currentUser = CampusUser.fromJson(data['user']);
      if (data['merchant'] != null) {
        currentMerchant = CampusMerchant.fromJson(data['merchant']);
      }
    } else {
      await fetchMe(forceRefreshToken: true);
    }
    unawaited(_syncFcmToken());
    return currentUser!;
  }

  Future<CampusUser> fetchMe({bool forceRefreshToken = false}) async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/auth/me'),
        headers: await _authHeaders(forceRefresh: forceRefreshToken),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    currentUser = CampusUser.fromJson(data['user']);
    currentMerchant = data['merchant'] != null
        ? CampusMerchant.fromJson(data['merchant'])
        : null;
    return currentUser!;
  }

  Future<CampusUser> updateProfile({
    required String name,
    required String phone,
    String? studentCardId,
  }) async {
    final res = await _send(
          () async => http.patch(
        Uri.parse('${ApiConfig.baseUrl}/auth/profile'),
        headers: await _authHeaders(),
        body: jsonEncode({
          'name': name.trim(),
          'phone': phone.trim(),
          'studentCardId': studentCardId?.trim() ?? '',
        }),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    if (data['user'] != null) {
      currentUser = CampusUser.fromJson(data['user']);
    } else {
      await fetchMe();
    }
    return currentUser!;
  }

  Future<void> logout() async {
    await firebaseService.signOutFirebase();
    currentUser = null;
    currentMerchant = null;
  }

  // ==================== COMMERCES ====================

  Future<List<CampusMerchant>> fetchMerchants() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/merchants'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final list = (data['merchants'] as List<dynamic>? ?? []);
    return list
        .whereType<Map<String, dynamic>>()
        .map(CampusMerchant.fromJson)
        .toList();
  }

  Future<CampusMerchant> fetchMyMerchant() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/merchants/mine'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    currentMerchant = CampusMerchant.fromJson(data['merchant'] ?? data);
    return currentMerchant!;
  }

  Future<CampusMerchant> updateMyMerchant(Map<String, dynamic> payload) async {
    final res = await _send(
          () async => http.patch(
        Uri.parse('${ApiConfig.baseUrl}/merchants/mine'),
        headers: await _authHeaders(),
        body: jsonEncode(payload),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    currentMerchant = CampusMerchant.fromJson(data['merchant'] ?? data);
    return currentMerchant!;
  }

  // ==================== OFFRES ====================

  Future<List<CampusOffer>> fetchOffers({
    String? query,
    String? category,
    String? merchantId,
    double? maxPrice,
    String? type,
    bool onlyAvailable = true,
  }) async {
    final params = <String, String>{};
    if (query != null && query.trim().isNotEmpty) params['q'] = query.trim();
    if (category != null && category != 'Toutes') params['category'] = category;
    if (merchantId != null && merchantId.isNotEmpty) params['merchantId'] = merchantId;
    if (maxPrice != null && maxPrice > 0) params['maxPrice'] = maxPrice.toString();
    if (type != null && type != 'all') params['type'] = type;
    if (onlyAvailable) params['onlyAvailable'] = 'true';

    final uri = Uri.parse('${ApiConfig.baseUrl}/offers').replace(queryParameters: params);
    final res = await _send(
          () async => http.get(uri, headers: await _authHeaders()),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final list = (data['offers'] as List<dynamic>? ?? []);
    return list
        .whereType<Map<String, dynamic>>()
        .map(CampusOffer.fromJson)
        .toList();
  }

  Future<List<CampusOffer>> fetchMyOffers() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/offers/mine'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final list = (data['offers'] as List<dynamic>? ?? []);
    return list
        .whereType<Map<String, dynamic>>()
        .map(CampusOffer.fromJson)
        .toList();
  }

  Future<CampusOffer> createOffer(Map<String, dynamic> payload) async {
    final res = await _send(
          () async => http.post(
        Uri.parse('${ApiConfig.baseUrl}/offers'),
        headers: await _authHeaders(),
        body: jsonEncode(payload),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    return CampusOffer.fromJson(data['offer'] ?? data);
  }

  Future<CampusOffer> updateOffer(String offerId, Map<String, dynamic> payload) async {
    final res = await _send(
          () async => http.patch(
        Uri.parse('${ApiConfig.baseUrl}/offers/$offerId'),
        headers: await _authHeaders(),
        body: jsonEncode(payload),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    return CampusOffer.fromJson(data['offer'] ?? data);
  }

  Future<void> deleteOffer(String offerId) async {
    final res = await _send(
          () async => http.delete(
        Uri.parse('${ApiConfig.baseUrl}/offers/$offerId'),
        headers: await _authHeaders(),
      ),
    );
    _decodeResponse(res);
  }

  // ==================== COMMANDES, KONNECT & QR ====================

  Future<List<CampusOrder>> fetchOrders() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final list = (data['orders'] as List<dynamic>? ?? []);
    return list
        .whereType<Map<String, dynamic>>()
        .map(CampusOrder.fromJson)
        .toList();
  }

  Future<CampusOrder> createOrder(List<Map<String, dynamic>> items) async {
    final res = await _send(
          () async => http.post(
        Uri.parse('${ApiConfig.baseUrl}/orders'),
        headers: await _authHeaders(),
        body: jsonEncode({'items': items}),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    return CampusOrder.fromJson(data['order']);
  }

  Future<CampusOrder> cancelOrder(String orderId) async {
    final res = await _send(
          () async => http.patch(
        Uri.parse('${ApiConfig.baseUrl}/orders/$orderId/cancel'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    return CampusOrder.fromJson(data['order'] ?? data);
  }

  Future<KonnectInitSession> initKonnectPayment(String orderId) async {
    final res = await _send(
          () async => http.post(
        Uri.parse('${ApiConfig.baseUrl}/payments/konnect/init'),
        headers: await _authHeaders(),
        body: jsonEncode({'orderId': orderId}),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    return KonnectInitSession.fromJson(data);
  }

  Future<CampusOrder> confirmKonnectPayment(String orderId, String method) async {
    final res = await _send(
          () async => http.post(
        Uri.parse('${ApiConfig.baseUrl}/payments/konnect/confirm'),
        headers: await _authHeaders(),
        body: jsonEncode({'orderId': orderId, 'method': method}),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    return CampusOrder.fromJson(data['order']);
  }

  Future<CampusOrder> verifyQrCode(String codeOrToken) async {
    final res = await _send(
          () async => http.post(
        Uri.parse('${ApiConfig.baseUrl}/orders/verify-qr'),
        headers: await _authHeaders(),
        body: jsonEncode({'code': codeOrToken.trim()}),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    return CampusOrder.fromJson(data['order']);
  }

  // ==================== NOTIFICATIONS & STATS ====================

  Future<List<CampusNotification>> fetchNotifications() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/notifications'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final list = (data['notifications'] as List<dynamic>? ?? []);
    return list
        .whereType<Map<String, dynamic>>()
        .map(CampusNotification.fromJson)
        .toList();
  }

  Future<void> markNotificationRead(String id) async {
    final res = await _send(
          () async => http.patch(
        Uri.parse('${ApiConfig.baseUrl}/notifications/$id/read'),
        headers: await _authHeaders(),
      ),
    );
    _decodeResponse(res);
  }

  Future<Map<String, dynamic>> fetchPlatformStats() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/stats/platform'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final stats = data['stats'];
    return stats is Map<String, dynamic> ? stats : data;
  }

  // ==================== ADMIN ====================

  Future<List<CampusMerchant>> fetchAdminMerchants() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/admin/merchants'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final list = (data['merchants'] as List<dynamic>? ?? []);
    return list
        .whereType<Map<String, dynamic>>()
        .map(CampusMerchant.fromJson)
        .toList();
  }

  Future<void> updateMerchantStatus(String merchantId, String status) async {
    final res = await _send(
          () async => http.patch(
        Uri.parse('${ApiConfig.baseUrl}/admin/merchants/$merchantId/status'),
        headers: await _authHeaders(),
        body: jsonEncode({'status': status}),
      ),
    );
    _decodeResponse(res);
  }

  Future<List<CampusUser>> fetchAdminUsers() async {
    final res = await _send(
          () async => http.get(
        Uri.parse('${ApiConfig.baseUrl}/admin/users'),
        headers: await _authHeaders(),
      ),
    );
    final data = _decodeResponse(res) as Map<String, dynamic>;
    final list = (data['users'] as List<dynamic>? ?? []);
    return list
        .whereType<Map<String, dynamic>>()
        .map(CampusUser.fromJson)
        .toList();
  }

  Future<void> updateUserStatus(String userId, bool active) async {
    final res = await _send(
          () async => http.patch(
        Uri.parse('${ApiConfig.baseUrl}/admin/users/$userId/status'),
        headers: await _authHeaders(),
        body: jsonEncode({'active': active}),
      ),
    );
    _decodeResponse(res);
  }
}