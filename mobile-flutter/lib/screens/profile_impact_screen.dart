import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class ProfileImpactScreen extends StatefulWidget {
  final ApiService api;
  final VoidCallback onAuthChanged;

  const ProfileImpactScreen({
    super.key,
    required this.api,
    required this.onAuthChanged,
  });

  @override
  State<ProfileImpactScreen> createState() => _ProfileImpactScreenState();
}

class _ProfileImpactScreenState extends State<ProfileImpactScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cardCtrl = TextEditingController();
  List<CampusNotification> _notifications = [];
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _syncControllers();
    _loadExtras();
  }

  void _syncControllers() {
    final u = widget.api.currentUser;
    if (u != null) {
      _nameCtrl.text = u.name;
      _phoneCtrl.text = u.phone;
      _cardCtrl.text = u.studentCardId ?? '';
    }
  }

  Future<void> _loadExtras() async {
    try {
      await widget.api.fetchMe();
      final notifs = await widget.api.fetchNotifications();
      final isStudent = widget.api.currentUser?.role == 'student';
      if (mounted) {
        setState(() {
          _syncControllers();
          _notifications = isStudent
              ? notifs
              : notifs
              .where((n) =>
          !n.message.contains('EcoPoints') &&
              !n.message.contains('compte étudiant'))
              .toList();
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _cardCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (_nameCtrl.text.trim().isEmpty || _phoneCtrl.text.trim().length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nom et téléphone (8+ chiffres) obligatoires.')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await widget.api.updateProfile(
        name: _nameCtrl.text,
        phone: _phoneCtrl.text,
        studentCardId: _cardCtrl.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profil mis à jour.')),
        );
        setState(() {});
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _roleBadge(String role) {
    switch (role) {
      case 'student':
        return 'ÉTUDIANT';
      case 'merchant':
        return 'COMMERÇANT';
      case 'admin':
        return 'ADMINISTRATEUR';
      default:
        return role.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.api.currentUser;
    if (user == null) {
      return const Scaffold(body: Center(child: Text('Non connecté.')));
    }

    final isStudent = user.role == 'student';
    final isMerchant = user.role == 'merchant';
    final pageTitle = isStudent
        ? 'Impact & Profil'
        : isMerchant
        ? 'Profil Commerçant'
        : 'Profil Administrateur';

    return Scaffold(
      appBar: AppBar(
        title: Text(pageTitle),
        actions: [
          IconButton(
            tooltip: 'Déconnexion',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await widget.api.logout();
              widget.onAuthChanged();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadExtras,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${user.name} · ${_roleBadge(user.role)}',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  Text(user.email, style: const TextStyle(color: Color(0xFF475569))),
                  const SizedBox(height: 12),
                  if (isStudent)
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: [
                        Chip(label: Text('EcoPoints : ${user.ecoPoints}')),
                        Chip(label: Text('Repas sauvés : ${user.mealsRescued}')),
                        Chip(label: Text('Sauvé : ${user.foodSavedKg.toStringAsFixed(1)} kg')),
                        Chip(label: Text('CO₂ évité : ${user.co2AvoidedKg.toStringAsFixed(1)} kg')),
                        Chip(label: Text('Économies : ${user.moneySavedTnd.toStringAsFixed(2)} TND')),
                      ],
                    )
                  else if (isMerchant)
                    const Text(
                      'Compte partenaire vérifié. Gérez vos offres, commandes et QR codes depuis l’onglet Commerce.',
                    )
                  else
                    const Text(
                      'Compte Administrateur · Supervision globale des commerces, utilisateurs et commandes.',
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text('Mon Profil', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Nom complet',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Téléphone',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(),
              ),
            ),
            if (isStudent) ...[
              const SizedBox(height: 10),
              TextField(
                controller: _cardCtrl,
                decoration: const InputDecoration(
                  labelText: 'N° Carte Étudiant',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(),
                ),
              ),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _saving ? null : _saveProfile,
              child: const Text('Enregistrer le profil'),
            ),
            const SizedBox(height: 20),
            Text(
              'Notifications (${_notifications.length})',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (_notifications.isEmpty)
              const Text('Aucune notification récente.')
            else
              ..._notifications.map(
                    (n) => Card(
                  color: n.read ? Colors.white : const Color(0xFFF0FDF4),
                  child: ListTile(
                    title: Text(n.title),
                    subtitle: Text(n.message),
                    trailing: n.read
                        ? const Icon(Icons.done, size: 18)
                        : TextButton(
                      onPressed: () async {
                        await widget.api.markNotificationRead(n.id);
                        _loadExtras();
                      },
                      child: const Text('Lu'),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}