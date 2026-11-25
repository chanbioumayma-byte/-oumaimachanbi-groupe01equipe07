import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AdminScreen extends StatefulWidget {
  final ApiService api;
  const AdminScreen({super.key, required this.api});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  Map<String, dynamic> _stats = {};
  List<CampusMerchant> _merchants = [];
  List<CampusUser> _users = [];
  List<CampusOrder> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        widget.api.fetchPlatformStats(),
        widget.api.fetchAdminMerchants(),
        widget.api.fetchAdminUsers(),
        widget.api.fetchOrders(),
      ]);
      if (mounted) {
        setState(() {
          _stats = results[0] as Map<String, dynamic>;
          _merchants = results[1] as List<CampusMerchant>;
          _users = results[2] as List<CampusUser>;
          _orders = results[3] as List<CampusOrder>;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setMerchantStatus(String id, String status) async {
    try {
      await widget.api.updateMerchantStatus(id, status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              status == 'approved'
                  ? 'Commerce approuvé.'
                  : status == 'rejected'
                  ? 'Commerce rejeté.'
                  : 'Statut mis à jour.',
            ),
            backgroundColor: const Color(0xFF15803D),
          ),
        );
      }
      _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  Future<void> _toggleUserActive(CampusUser user) async {
    try {
      await widget.api.updateUserStatus(user.id, !user.active);
      _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  num _numStat(String key) {
    final v = _stats[key];
    return v is num ? v : 0;
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'student':
        return 'Étudiant';
      case 'merchant':
        return 'Commerçant';
      case 'admin':
        return 'Administrateur';
      default:
        return role;
    }
  }

  String _orderStatusLabel(String status) {
    switch (status) {
      case 'pending_payment':
        return 'En attente paiement';
      case 'paid':
        return 'Payée';
      case 'picked_up':
        return 'Récupérée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    Color valueColor = const Color(0xFF0F172A),
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: valueColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalUsers = _numStat('totalUsers').toInt();
    final totalStudents = _numStat('totalStudents').toInt();
    final totalMerchants = _numStat('totalMerchants').toInt();
    final pendingMerchants = _numStat('pendingMerchants').toInt();
    final approvedMerchants = _numStat('approvedMerchants').toInt();
    final totalRevenue = _numStat('totalRevenueTnd').toDouble();
    final paidOrders = _numStat('paidOrPickedUpOrders').toInt();
    final co2Kg = _numStat('totalCo2AvoidedKg').toDouble();
    final foodKg = _numStat('totalFoodSavedKg').toDouble();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de bord Admin'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadAll)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _loadAll,
                icon: const Icon(Icons.refresh),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      )
          : RefreshIndicator(
        onRefresh: _loadAll,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Supervision Plateforme · ESSECT Administration',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF15803D),
              ),
            ),
            const SizedBox(height: 10),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _buildKpiCard(
                      title: 'Utilisateurs inscrits',
                      value: '$totalUsers',
                      subtitle: '$totalStudents étudiants · $totalMerchants commerces',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildKpiCard(
                      title: 'Commerces à valider',
                      value: '$pendingMerchants',
                      subtitle: '$approvedMerchants approuvés',
                      valueColor: pendingMerchants > 0
                          ? const Color(0xFFB45309)
                          : const Color(0xFF15803D),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _buildKpiCard(
                      title: 'Volume Konnect',
                      value: '${totalRevenue.toStringAsFixed(2)} TND',
                      subtitle: '$paidOrders commandes réglées',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildKpiCard(
                      title: 'Impact CO₂ campus',
                      value: '${co2Kg.toStringAsFixed(1)} kg',
                      subtitle: '${foodKg.toStringAsFixed(1)} kg d’invendus sauvés',
                      valueColor: const Color(0xFF15803D),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: ExpansionTile(
                title: const Text(
                  'Détails complets de la plateforme',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                children: [
                  _detailRow(
                    'Établissements enregistrés',
                    '${_numStat('totalMerchantStores').toInt()}',
                  ),
                  _detailRow('Offres actives', '${_numStat('activeOffers').toInt()}'),
                  _detailRow(
                    'Paniers Surprise actifs',
                    '${_numStat('surpriseBasketsCount').toInt()}',
                  ),
                  _detailRow('Commandes totales', '${_numStat('totalOrders').toInt()}'),
                  _detailRow('Repas sauvés', '${_numStat('totalMealsRescued').toInt()}'),
                  _detailRow(
                    'Économies étudiantes',
                    '${_numStat('totalMoneySavedTnd').toDouble().toStringAsFixed(2)} TND',
                  ),
                  _detailRow(
                    'EcoPoints distribués',
                    '${_numStat('totalEcoPointsDistributed').toInt()} pts',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Validation des commerces partenaires (${_merchants.length})',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ..._merchants.map((m) {
              final statusColor = m.status == 'approved'
                  ? const Color(0xFF15803D)
                  : m.status == 'pending'
                  ? const Color(0xFFB45309)
                  : Colors.red.shade700;
              final statusText = m.status == 'approved'
                  ? 'Approuvé'
                  : m.status == 'pending'
                  ? 'En attente'
                  : 'Refusé';

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            m.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        Text(
                          statusText,
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${m.category} · ${m.address}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (m.status != 'approved')
                          FilledButton.icon(
                            onPressed: () => _setMerchantStatus(m.id, 'approved'),
                            icon: const Icon(Icons.check, size: 16),
                            label: const Text('Valider'),
                          ),
                        if (m.status != 'approved') const SizedBox(width: 8),
                        if (m.status != 'rejected')
                          OutlinedButton.icon(
                            onPressed: () => _setMerchantStatus(m.id, 'rejected'),
                            icon: const Icon(Icons.close, size: 16),
                            label: const Text('Rejeter'),
                          ),
                      ],
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 16),
            Text(
              'Supervision des commandes (${_orders.length})',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (_orders.isEmpty)
              const Text('Aucune commande enregistrée.')
            else
              ..._orders.take(15).map(
                    (o) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${o.studentName} → ${o.merchantName}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${o.pickupCode ?? o.id} · ${_orderStatusLabel(o.status)}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '${o.totalAmount.toStringAsFixed(2)} TND',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Text(
              'Comptes utilisateurs (${_users.length})',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ..._users.map(
                  (u) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: SwitchListTile(
                  title: Text(
                    u.name,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: Text(
                    '${_roleLabel(u.role)} · ${u.email}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  value: u.active,
                  onChanged: (_) => _toggleUserActive(u),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
          Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}