import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class CampusFirebaseService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  User? get currentFirebaseUser => _auth.currentUser;

  Future<String?> getIdToken({bool forceRefresh = false}) async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return user.getIdToken(forceRefresh);
  }

  Future<void> initNotifications({
    required Future<void> Function(String token) onToken,
    void Function(String title, String body)? onForegroundMessage,
  }) async {
    try {
      await _messaging.requestPermission(alert: true, badge: true, sound: true);
      final token = await _messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await onToken(token);
      }
      _messaging.onTokenRefresh.listen((newToken) {
        if (newToken.isNotEmpty) onToken(newToken);
      });
      FirebaseMessaging.onMessage.listen((msg) {
        final title = msg.notification?.title ?? 'CampusSave';
        final body = msg.notification?.body ?? '';
        if (onForegroundMessage != null) {
          onForegroundMessage(title, body);
        }
      });
    } catch (e) {
      debugPrint('FCM init ignore (ex: emulateur sans Play Services): $e');
    }
  }

  Future<void> signOutFirebase() async {
    await _auth.signOut();
  }
}