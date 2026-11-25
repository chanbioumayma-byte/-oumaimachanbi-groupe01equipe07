import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class MerchantScannerScreen extends StatefulWidget {
  final ApiService api;
  final VoidCallback? onOpenOffersTab;

  const MerchantScannerScreen({
    super.key,
    required this.api,
    this.onOpenOffersTab,
  });

  @override
  State<MerchantScannerScreen> createState() => _MerchantScannerScreenState();
}

class _MerchantScannerScreenState extends State<MerchantScannerScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  final TextEditingController _codeCtrl = TextEditingController();
  final MobileScannerController _scannerCtrl = MobileScannerController();

  final TextEditingController _shopNameCtrl = TextEditingController();
  final TextEditingController _shopAddressCtrl = TextEditingController();
  final TextEditingController _shopHoursCtrl = TextEditingController();

  bool _cameraEnabled = false;
  bool _verifying = false;
  bool _savingShop = false;
  String? _scanResult;
  bool _scanSuccess = false;

  CampusMerchant? _merchant;
  List<CampusOffer> _myOffers = [];
  List<CampusOrder> _orders = [];
  bool _loadingMerchant = true;

  static const List<String> _categories = [
    'Boulangerie',
    'Plats cuisinés',
    'Sandwichs',
    'Cafétéria',
    'Pâtisserie',
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _loadMerchantData();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _codeCtrl.dispose();
    _scannerCtrl.dispose();
    _shopNameCtrl.dispose();
    _shopAddressCtrl.dispose();
    _shopHoursCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMerchantData() async {
    setState(() => _loadingMerchant = true);
    try {
      final m = await widget.api.fetchMyMerchant();
      final offers = await widget.api.fetchMyOffers();
      final orders = await widget.api.fetchOrders();
      if (mounted) {
        setState(() {
          _merchant = m;
          _myOffers = offers;
          _orders = orders;
          _shopNameCtrl.text = m.name;
          _shopAddressCtrl.text = m.address;
          _shopHoursCtrl.text = m.openingHours;
        });
      }
    } catch (_) {
      // Commerce non encore initialisé
    } finally {
      if (mounted) setState(() => _loadingMerchant = false);
    }
  }

  Future<void> _validateCode(String code) async {
    if (_verifying) return;
    if (code.trim().isEmpty) {
      setState(() {
        _scanSuccess = false;
        _scanResult = 'Veuillez saisir un code de retrait ou scanner un QR code.';
      });
      return;
    }
    setState(() => _verifying = true);
    try {
      final order = await widget.api.verifyQrCode(code.trim());
      if (mounted) {
        setState(() {
          _scanSuccess = true;
          _cameraEnabled = false;
          _scanResult =
          'Retrait validé ! Code : ${order.pickupCode ?? order.id}\nÉtudiant : ${order.studentName} · +${order.ecoPointsAwarded} EcoPoints';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Retrait ${order.pickupCode ?? order.id} validé !'),
            backgroundColor: const Color(0xFF15803D),
          ),
        );
      }
      _loadMerchantData();
    } catch (e) {
      if (mounted) {
        setState(() {
          _scanSuccess = false;
          _scanResult = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _saveShopInfo() async {
    setState(() => _savingShop = true);
    try {
      final updated = await widget.api.updateMyMerchant({
        'name': _shopNameCtrl.text.trim(),
        'address': _shopAddressCtrl.text.trim(),
        'openingHours': _shopHoursCtrl.text.trim(),
      });
      if (mounted) {
        setState(() => _merchant = updated);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Informations de l’établissement enregistrées.'),
            backgroundColor: Color(0xFF15803D),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _savingShop = false);
    }
  }

  Future<void> _openCreateOfferForm() async {
    final formKey = GlobalKey<FormState>();
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final origCtrl = TextEditingController();
    final discCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '5');
    final weightCtrl = TextEditingController(text: '0.8');
    final startCtrl = TextEditingController(text: '17h30');
    final endCtrl = TextEditingController(text: '19h30');
    final imgCtrl = TextEditingController();

    String category = _categories.first;
    String offerType = 'standard';
    bool saving = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            16,
            16,
            MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Nouvelle offre alimentaire',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: titleCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Titre',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) =>
                    (v == null || v.trim().length < 3) ? 'Min. 3 caractères' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: descCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) =>
                    (v == null || v.trim().length < 5) ? 'Min. 5 caractères' : null,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: category,
                          decoration: const InputDecoration(
                            labelText: 'Catégorie',
                            border: OutlineInputBorder(),
                          ),
                          items: _categories
                              .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                              .toList(),
                          onChanged: (v) => setDlg(() => category = v ?? _categories.first),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: offerType,
                          decoration: const InputDecoration(
                            labelText: 'Format',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'standard', child: Text('Offre classique')),
                            DropdownMenuItem(value: 'surprise', child: Text('Panier Surprise')),
                          ],
                          onChanged: (v) => setDlg(() => offerType = v ?? 'standard'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: origCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Prix initial (TND)',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) {
                            final d = double.tryParse(v ?? '');
                            return (d == null || d <= 0) ? 'Invalide' : null;
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: discCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Prix réduit (TND)',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) {
                            final d = double.tryParse(v ?? '');
                            final orig = double.tryParse(origCtrl.text) ?? 0;
                            if (d == null || d <= 0) return 'Invalide';
                            if (orig > 0 && d >= orig) return 'Doit être < initial';
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: qtyCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Quantité',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) {
                            final q = int.tryParse(v ?? '');
                            return (q == null || q < 1) ? 'Min 1' : null;
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: weightCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Poids (kg)',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) {
                            final w = double.tryParse(v ?? '');
                            return (w == null || w <= 0) ? 'Invalide' : null;
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: startCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Début retrait',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Requis' : null,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: endCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Fin retrait',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Requis' : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: imgCtrl,
                    decoration: const InputDecoration(
                      labelText: 'URL Photo (optionnel)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  FilledButton(
                    onPressed: saving
                        ? null
                        : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDlg(() => saving = true);
                      try {
                        await widget.api.createOffer({
                          'title': titleCtrl.text.trim(),
                          'description': descCtrl.text.trim(),
                          'category': category,
                          'offerType': offerType,
                          'originalPrice': double.parse(origCtrl.text),
                          'discountedPrice': double.parse(discCtrl.text),
                          'quantity': int.parse(qtyCtrl.text),
                          'weightKg': double.parse(weightCtrl.text),
                          'pickupStart': startCtrl.text.trim(),
                          'pickupEnd': endCtrl.text.trim(),
                          if (imgCtrl.text.trim().isNotEmpty)
                            'imageUrl': imgCtrl.text.trim(),
                        });
                        if (ctx.mounted) Navigator.pop(ctx);
                        _loadMerchantData();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Offre publiée avec succès !'),
                              backgroundColor: Color(0xFF15803D),
                            ),
                          );
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                e.toString().replaceFirst('Exception: ', ''),
                              ),
                              backgroundColor: Colors.red.shade700,
                            ),
                          );
                        }
                      } finally {
                        if (ctx.mounted) setDlg(() => saving = false);
                      }
                    },
                    child: const Text('Publier l\'offre'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _merchantStatusFr(String status) {
    switch (status) {
      case 'approved':
        return 'Établissement validé';
      case 'pending':
        return 'En attente de validation';
      case 'rejected':
        return 'Refusé';
      default:
        return status;
    }
  }

  String _orderStatusFr(String status) {
    switch (status) {
      case 'paid':
        return 'Payée · Prête au retrait';
      case 'picked_up':
        return 'Remise effectuée';
      case 'pending_payment':
        return 'En attente de paiement';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  }

  Widget _kpiCard(String label, String value, {Color valueColor = const Color(0xFF0F172A)}) {
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
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
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
        ],
      ),
    );
  }

  Widget _buildDashboardGrid() {
    final validOrders = _orders
        .where((o) => o.status == 'paid' || o.status == 'picked_up')
        .toList();
    final pendingPickup = _orders.where((o) => o.status == 'paid').length;
    final revenueTnd = validOrders.fold<double>(0, (s, o) => s + o.totalAmount);
    final mealsSaved = _merchant?.totalMealsSaved ?? 0;

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.75,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      children: [
        _kpiCard('Chiffre d\'affaires', '${revenueTnd.toStringAsFixed(2)} TND'),
        _kpiCard(
          'Retraits QR en attente',
          '$pendingPickup',
          valueColor: const Color(0xFF15803D),
        ),
        _kpiCard('Offres publiées', '${_myOffers.length}'),
        _kpiCard('Portions sauvées', '$mealsSaved'),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isApproved = _merchant?.status == 'approved';

    return Scaffold(
      appBar: AppBar(
        title: Text(_merchant?.name ?? 'Espace Commerçant'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadMerchantData),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(icon: Icon(Icons.dashboard_outlined), text: 'Tableau de bord'),
            Tab(icon: Icon(Icons.qr_code_scanner), text: 'Scanner QR'),
            Tab(icon: Icon(Icons.receipt_long_outlined), text: 'Commandes'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          // TAB 1 : TABLEAU DE BORD (KPIs + Actions + Fiche établissement)
          _loadingMerchant
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
            onRefresh: _loadMerchantData,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_merchant != null)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isApproved
                          ? const Color(0xFFECFDF5)
                          : const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isApproved
                            ? const Color(0xFFA7F3D0)
                            : const Color(0xFFFDE68A),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Espace Commerçant · ${_merchantStatusFr(_merchant!.status)}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isApproved
                                ? const Color(0xFF15803D)
                                : const Color(0xFFB45309),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _merchant!.name,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          _merchant!.address,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 14),
                _buildDashboardGrid(),
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: isApproved ? _openCreateOfferForm : null,
                  icon: const Icon(Icons.add),
                  label: Text(
                    isApproved
                        ? 'Publier une nouvelle offre'
                        : 'Validation admin requise avant publication',
                  ),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: widget.onOpenOffersTab,
                  icon: const Icon(Icons.storefront_outlined),
                  label: Text('Gérer mes offres (${_myOffers.length})'),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Fiche établissement',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _shopNameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Nom commercial',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _shopAddressCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Adresse',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _shopHoursCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Horaires',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: _savingShop ? null : _saveShopInfo,
                        child: Text(
                          _savingShop
                              ? 'Enregistrement...'
                              : 'Mettre à jour la fiche',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // TAB 2 : SCANNER QR
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SwitchListTile(
                  title: const Text('Activer la caméra QR'),
                  value: _cameraEnabled,
                  onChanged: (v) => setState(() => _cameraEnabled = v),
                ),
                if (_cameraEnabled)
                  SizedBox(
                    height: 260,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: MobileScanner(
                        controller: _scannerCtrl,
                        onDetect: (capture) {
                          final raw = capture.barcodes.firstOrNull?.rawValue;
                          if (raw != null && raw.isNotEmpty) {
                            _codeCtrl.text = raw;
                            _validateCode(raw);
                          }
                        },
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                TextField(
                  controller: _codeCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Code retrait (ex: CS-5D13) ou jeton QR',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _verifying ? null : () => _validateCode(_codeCtrl.text),
                  icon: const Icon(Icons.verified_outlined),
                  label: const Text('Valider la récupération'),
                ),
                if (_scanResult != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: _scanSuccess
                          ? const Color(0xFFECFDF5)
                          : const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _scanSuccess
                            ? const Color(0xFFA7F3D0)
                            : const Color(0xFFFECACA),
                      ),
                    ),
                    child: Text(
                      _scanResult!,
                      style: TextStyle(
                        color: _scanSuccess
                            ? const Color(0xFF15803D)
                            : Colors.red.shade800,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // TAB 3 : COMMANDES À REMETTRE
          _loadingMerchant
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
            onRefresh: _loadMerchantData,
            child: _orders.isEmpty
                ? ListView(
              children: const [
                SizedBox(height: 120),
                Center(child: Text('Aucune commande reçue pour l’instant.')),
              ],
            )
                : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, idx) {
                final order = _orders[idx];
                final isPaid = order.status == 'paid';
                return Container(
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
                          Text(
                            '${order.pickupCode ?? order.id} · ${order.pickupWindow}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          Text(
                            '${order.totalAmount.toStringAsFixed(2)} TND',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        order.studentName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        order.items
                            .map((i) => '${i.quantity}× ${i.title}')
                            .join(', '),
                        style: const TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _orderStatusFr(order.status),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isPaid
                                  ? const Color(0xFF15803D)
                                  : const Color(0xFF64748B),
                            ),
                          ),
                          if (isPaid && order.pickupCode != null)
                            FilledButton.icon(
                              onPressed: _verifying
                                  ? null
                                  : () => _validateCode(order.pickupCode!),
                              icon: const Icon(Icons.check_circle_outline, size: 16),
                              label: const Text('Valider retrait'),
                            ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}