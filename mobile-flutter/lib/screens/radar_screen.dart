import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class RadarScreen extends StatefulWidget {
  final ApiService api;
  final void Function(CampusMerchant merchant)? onSelectMerchant;

  const RadarScreen({super.key, required this.api, this.onSelectMerchant});

  @override
  State<RadarScreen> createState() => _RadarScreenState();
}

class _RadarScreenState extends State<RadarScreen> {
  List<CampusMerchant> _merchants = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = widget.api.role == 'admin'
          ? await widget.api.fetchAdminMerchants()
          : await widget.api.fetchMerchants();
      list.sort((a, b) => a.distanceMeters.compareTo(b.distanceMeters));
      if (mounted) setState(() => _merchants = list);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'Validé';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Refusé';
      default:
        return status;
    }
  }

  void _handleMerchantTap(CampusMerchant m) {
    final role = widget.api.role;
    if (role != 'merchant' && role != 'admin') {
      widget.onSelectMerchant?.call(m);
      return;
    }

    final isOwnStore =
        role == 'merchant' && widget.api.currentMerchant?.id == m.id;

    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    m.name,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                if (role == 'admin')
                  Chip(label: Text(_statusLabel(m.status))),
              ],
            ),
            const SizedBox(height: 6),
            Text('${m.category} · ${m.distanceMeters} m (${m.walkMinutes} min à pied)'),
            const SizedBox(height: 8),
            if (m.description.isNotEmpty) Text(m.description),
            const SizedBox(height: 10),
            Text('Adresse : ${m.address}', style: const TextStyle(fontSize: 13)),
            Text('Horaires : ${m.openingHours}', style: const TextStyle(fontSize: 13)),
            if (role == 'admin')
              Text(
                'Portions sauvées : ${m.totalMealsSaved}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            const SizedBox(height: 14),
            if (isOwnStore)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    widget.onSelectMerchant?.call(m);
                  },
                  icon: const Icon(Icons.storefront_outlined),
                  label: const Text('Gérer mes offres'),
                ),
              )
            else
              const Text(
                'Fiche établissement en consultation seule.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.api.role;
    final isStudentOrGuest = role != 'merchant' && role != 'admin';

    return Scaffold(
      appBar: AppBar(title: const Text('Campus Radar · ESSECT')),
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
                onPressed: _load,
                icon: const Icon(Icons.refresh),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      )
          : RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              height: 210,
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return Stack(
                    children: [
                      Center(
                        child: Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFF6EE7B7)),
                          ),
                        ),
                      ),
                      const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.school, color: Color(0xFF15803D)),
                            Text(
                              'ESSECT',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF15803D),
                              ),
                            ),
                          ],
                        ),
                      ),
                      ..._merchants.map((m) {
                        final left =
                            (m.mapX.clamp(8, 92) / 100) * constraints.maxWidth - 16;
                        final top =
                            (m.mapY.clamp(10, 88) / 100) * constraints.maxHeight - 16;
                        return Positioned(
                          left: left,
                          top: top,
                          child: Tooltip(
                            message: '${m.name} (${m.distanceMeters} m)',
                            child: InkWell(
                              onTap: () => _handleMerchantTap(m),
                              child: const CircleAvatar(
                                radius: 14,
                                backgroundColor: Color(0xFF15803D),
                                child: Icon(
                                  Icons.store,
                                  size: 15,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            Text(
              '${_merchants.length} commerces partenaires à proximité',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 8),
            ..._merchants.map((m) {
              final isOwn = role == 'merchant' &&
                  widget.api.currentMerchant?.id == m.id;
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ListTile(
                  onTap: () => _handleMerchantTap(m),
                  leading: const Icon(
                    Icons.location_on,
                    color: Color(0xFF15803D),
                  ),
                  title: Text(
                    m.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    '${m.category} · ${m.address}\n${m.distanceMeters} m (${m.walkMinutes} min à pied) · ${m.openingHours}',
                  ),
                  isThreeLine: true,
                  trailing: role == 'admin'
                      ? Chip(
                    label: Text(
                      _statusLabel(m.status),
                      style: const TextStyle(fontSize: 11),
                    ),
                  )
                      : isOwn
                      ? const Chip(
                    label: Text(
                      'Mon commerce',
                      style: TextStyle(fontSize: 11),
                    ),
                  )
                      : isStudentOrGuest
                      ? const Icon(Icons.arrow_forward_ios, size: 16)
                      : null,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}