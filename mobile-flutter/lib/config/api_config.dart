class ApiConfig {
  // Utiliser --dart-define=API_BASE_URL=https://votre-domaine/api en production
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3000/api',
  );

  static const String konnectMode = 'sandbox';

  static String get serverOrigin {
    final uri = Uri.parse(baseUrl);
    final cleanPath = uri.path.endsWith('/api')
        ? uri.path.substring(0, uri.path.length - 4)
        : uri.path;
    return uri.replace(path: cleanPath).toString().replaceAll(RegExp(r'/$'), '');
  }

  static String? resolveImageUrl(String? rawUrl) {
    if (rawUrl == null) return null;
    final trimmed = rawUrl.trim();
    if (trimmed.isEmpty) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return '$serverOrigin$trimmed';
    }
    return '$serverOrigin/$trimmed';
  }
}
