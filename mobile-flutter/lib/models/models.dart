import '../config/api_config.dart';

int _asInt(dynamic v, [int fallback = 0]) {
  if (v == null) return fallback;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? fallback;
}

double _asDouble(dynamic v, [double fallback = 0.0]) {
  if (v == null) return fallback;
  if (v is double) return v;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? fallback;
}

bool _asBool(dynamic v, [bool fallback = false]) {
  if (v == null) return fallback;
  if (v is bool) return v;
  if (v is String) return v.toLowerCase() == 'true';
  return fallback;
}

class CampusUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String phone;
  final String? studentCardId;
  final int ecoPoints;
  final int mealsRescued;
  final double foodSavedKg;
  final double moneySavedTnd;
  final bool active;

  CampusUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.phone,
    this.studentCardId,
    required this.ecoPoints,
    required this.mealsRescued,
    required this.foodSavedKg,
    required this.moneySavedTnd,
    required this.active,
  });

  double get co2AvoidedKg => foodSavedKg * 2.5;

  factory CampusUser.fromJson(Map<String, dynamic> json) {
    return CampusUser(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'student',
      phone: json['phone']?.toString() ?? '',
      studentCardId: json['studentCardId']?.toString(),
      ecoPoints: _asInt(json['ecoPoints']),
      mealsRescued: _asInt(json['mealsRescued']),
      foodSavedKg: _asDouble(json['foodSavedKg']),
      moneySavedTnd: _asDouble(json['moneySavedTnd']),
      active: _asBool(json['active'], true),
    );
  }
}

class CampusMerchant {
  final String id;
  final String ownerId;
  final String name;
  final String category;
  final String description;
  final String address;
  final int distanceMeters;
  final int walkMinutes;
  final double mapX;
  final double mapY;
  final String openingHours;
  final String phone;
  final String status;
  final double rating;
  final int totalMealsSaved;

  CampusMerchant({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.category,
    required this.description,
    required this.address,
    required this.distanceMeters,
    required this.walkMinutes,
    required this.mapX,
    required this.mapY,
    required this.openingHours,
    required this.phone,
    required this.status,
    required this.rating,
    required this.totalMealsSaved,
  });

  factory CampusMerchant.fromJson(Map<String, dynamic> json) {
    return CampusMerchant(
      id: json['id']?.toString() ?? '',
      ownerId: json['ownerId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      distanceMeters: _asInt(json['distanceMeters'], 200),
      walkMinutes: _asInt(json['walkMinutes'], 3),
      mapX: _asDouble(json['mapX'], 50.0),
      mapY: _asDouble(json['mapY'], 50.0),
      openingHours: json['openingHours']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      rating: _asDouble(json['rating'], 4.5),
      totalMealsSaved: _asInt(json['totalMealsSaved']),
    );
  }
}

class CampusOffer {
  final String id;
  final String merchantId;
  final String merchantName;
  final String merchantAddress;
  final int distanceMeters;
  final String title;
  final String description;
  final String category;
  final String offerType;
  final double originalPrice;
  final double discountedPrice;
  final int quantity;
  final double weightKg;
  final String pickupStart;
  final String pickupEnd;
  final String? imageUrl;
  final bool active;

  CampusOffer({
    required this.id,
    required this.merchantId,
    required this.merchantName,
    required this.merchantAddress,
    required this.distanceMeters,
    required this.title,
    required this.description,
    required this.category,
    required this.offerType,
    required this.originalPrice,
    required this.discountedPrice,
    required this.quantity,
    required this.weightKg,
    required this.pickupStart,
    required this.pickupEnd,
    this.imageUrl,
    required this.active,
  });

  String? get resolvedImageUrl => ApiConfig.resolveImageUrl(imageUrl);

  int get discountPercent {
    if (originalPrice <= 0) return 0;
    return (((originalPrice - discountedPrice) / originalPrice) * 100)
        .round()
        .clamp(0, 99);
  }

  factory CampusOffer.fromJson(Map<String, dynamic> json) {
    return CampusOffer(
      id: json['id']?.toString() ?? '',
      merchantId: json['merchantId']?.toString() ?? '',
      merchantName: json['merchantName']?.toString() ?? '',
      merchantAddress: json['merchantAddress']?.toString() ?? '',
      distanceMeters: _asInt(json['distanceMeters'], 250),
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      offerType: json['offerType']?.toString() ?? 'standard',
      originalPrice: _asDouble(json['originalPrice']),
      discountedPrice: _asDouble(json['discountedPrice']),
      quantity: _asInt(json['quantity']),
      weightKg: _asDouble(json['weightKg'], 0.5),
      pickupStart: json['pickupStart']?.toString() ?? '',
      pickupEnd: json['pickupEnd']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString(),
      active: _asBool(json['active'], true),
    );
  }
}

class CampusOrderItem {
  final String offerId;
  final String title;
  final String offerType;
  final int quantity;
  final double unitPrice;
  final double originalUnitPrice;
  final double weightKg;

  CampusOrderItem({
    required this.offerId,
    required this.title,
    required this.offerType,
    required this.quantity,
    required this.unitPrice,
    required this.originalUnitPrice,
    required this.weightKg,
  });

  factory CampusOrderItem.fromJson(Map<String, dynamic> json) {
    return CampusOrderItem(
      offerId: json['offerId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      offerType: json['offerType']?.toString() ?? 'standard',
      quantity: _asInt(json['quantity'], 1),
      unitPrice: _asDouble(json['unitPrice']),
      originalUnitPrice: _asDouble(json['originalUnitPrice']),
      weightKg: _asDouble(json['weightKg'], 0.5),
    );
  }
}

class CampusOrder {
  final String id;
  final String studentId;
  final String studentName;
  final String merchantId;
  final String merchantName;
  final String merchantAddress;
  final List<CampusOrderItem> items;
  final String pickupWindow;
  final double totalAmount;
  final double originalTotal;
  final double savingsTnd;
  final double totalWeightKg;
  final String status;
  final String? pickupCode;
  final String? qrToken;
  final String? paymentMethod;
  final String? paymentRef;
  final int ecoPointsAwarded;

  CampusOrder({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.merchantId,
    required this.merchantName,
    required this.merchantAddress,
    required this.items,
    required this.pickupWindow,
    required this.totalAmount,
    required this.originalTotal,
    required this.savingsTnd,
    required this.totalWeightKg,
    required this.status,
    this.pickupCode,
    this.qrToken,
    this.paymentMethod,
    this.paymentRef,
    required this.ecoPointsAwarded,
  });

  factory CampusOrder.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>? ?? []);
    return CampusOrder(
      id: json['id']?.toString() ?? '',
      studentId: json['studentId']?.toString() ?? '',
      studentName: json['studentName']?.toString() ?? '',
      merchantId: json['merchantId']?.toString() ?? '',
      merchantName: json['merchantName']?.toString() ?? '',
      merchantAddress: json['merchantAddress']?.toString() ?? '',
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(CampusOrderItem.fromJson)
          .toList(),
      pickupWindow: json['pickupWindow']?.toString() ?? '',
      totalAmount: _asDouble(json['totalAmount']),
      originalTotal: _asDouble(json['originalTotal']),
      savingsTnd: _asDouble(json['savingsTnd']),
      totalWeightKg: _asDouble(json['totalWeightKg']),
      status: json['status']?.toString() ?? 'pending_payment',
      pickupCode: json['pickupCode']?.toString(),
      qrToken: json['qrToken']?.toString(),
      paymentMethod: json['paymentMethod']?.toString(),
      paymentRef: json['paymentRef']?.toString(),
      ecoPointsAwarded: _asInt(json['ecoPointsAwarded']),
    );
  }
}

class KonnectInitSession {
  final bool sandbox;
  final String gateway;
  final String sessionRef;
  final int amountMillimes;
  final String currency;
  final String receiverWallet;

  KonnectInitSession({
    required this.sandbox,
    required this.gateway,
    required this.sessionRef,
    required this.amountMillimes,
    required this.currency,
    required this.receiverWallet,
  });

  factory KonnectInitSession.fromJson(Map<String, dynamic> json) {
    return KonnectInitSession(
      sandbox: _asBool(json['sandbox'], true),
      gateway: json['gateway']?.toString() ?? 'Konnect',
      sessionRef: json['sessionRef']?.toString() ?? '',
      amountMillimes: _asInt(json['amountMillimes']),
      currency: json['currency']?.toString() ?? 'TND',
      receiverWallet: json['receiverWallet']?.toString() ?? '',
    );
  }
}

class CampusNotification {
  final String id;
  final String title;
  final String message;
  final bool read;
  final String createdAt;

  CampusNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.read,
    required this.createdAt,
  });

  factory CampusNotification.fromJson(Map<String, dynamic> json) {
    return CampusNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? json['body']?.toString() ?? '',
      read: _asBool(json['read']),
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}