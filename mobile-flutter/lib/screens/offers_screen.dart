import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import 'konnect_payment_screen.dart';
class OffersScreen extends StatefulWidget {
  final ApiService api;
  final VoidCallback onAuthChanged;
  final String? initialMerchantId;
  final VoidCallback? onClearMerchantFilter;
  final VoidCallback? onRequireLogin;
  final VoidCallback? onOrderPaid;

  const OffersScreen({
    super.key,
    required this.api,
    required this.onAuthChanged,
    this.initialMerchantId,
    this.onClearMerchantFilter,
    this.onRequireLogin,
    this.onOrderPaid,
  });

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> {
  static const List<String> _categories = [
    'Toutes',
    'Boulangerie',
    'Plats cuisinés',
    'Sandwichs',
    'Cafétéria',
    'Pâtisserie',
  ];

  List<CampusOffer> _offers = [];
  bool _loading = true;
  String? _error;

  String _search = '';
  String _selectedType = 'all';
  String _selectedCategory = 'Toutes';
  double? _maxPrice;

  final Map<String, ({CampusOffer offer, int qty})> _cart = {};

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  @override
  void didUpdateWidget(covariant OffersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialMerchantId != widget.initialMerchantId) {
      _loadOffers();
    }
  }

  Future<void> _loadOffers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      List<CampusOffer> list;
      if (widget.api.role == 'merchant') {
        if (widget.api.currentMerchant == null) {
          try {
            await widget.api.fetchMyMerchant();
          } catch (_) {}
        }
        final mine = await widget.api.fetchMyOffers();
        final myMerchantId = widget.api.currentMerchant?.id;
        final q = _search.trim().toLowerCase();
        list = mine.where((o) {
          if (myMerchantId != null && o.merchantId != myMerchantId) return false;
          final matchQuery = q.isEmpty ||
              o.title.toLowerCase().contains(q) ||
              o.description.toLowerCase().contains(q);
          final matchCat =
              _selectedCategory == 'Toutes' || o.category == _selectedCategory;
          final matchType =
              _selectedType == 'all' || o.offerType == _selectedType;
          final matchPrice =
              _maxPrice == null || o.discountedPrice <= _maxPrice!;
          return matchQuery && matchCat && matchType && matchPrice;
        }).toList();
      } else {
        list = await widget.api.fetchOffers(
          query: _search,
          category: _selectedCategory,
          merchantId: widget.initialMerchantId,
          maxPrice: _maxPrice,
          type: _selectedType,
          onlyAvailable: widget.api.role != 'admin',
        );
      }
      if (mounted) setState(() => _offers = list);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _addToCart(CampusOffer offer) {
    if (!widget.api.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connectez-vous pour réserver une offre.')),
      );
      widget.onRequireLogin?.call();
      return;
    }
    if (widget.api.role != 'student') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seuls les comptes Étudiant peuvent réserver.')),
      );
      return;
    }
    if (_cart.isNotEmpty && _cart.values.first.offer.merchantId != offer.merchantId) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Panier mono-commerce'),
          content: const Text(
            'Votre panier contient déjà des offres d\'un autre commerce. Voulez-vous vider le panier actuel ?',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                setState(() {
                  _cart.clear();
                  _cart[offer.id] = (offer: offer, qty: 1);
                });
              },
              child: const Text('Vider et ajouter'),
            ),
          ],
        ),
      );
      return;
    }
    setState(() {
      final existing = _cart[offer.id];
      final nextQty = (existing?.qty ?? 0) + 1;
      if (nextQty <= offer.quantity) {
        _cart[offer.id] = (offer: offer, qty: nextQty);
      }
    });
  }

  Future<void> _openOfferForm({CampusOffer? existing}) async {
    final editableCategories = _categories.where((c) => c != 'Toutes').toList();
    final formKey = GlobalKey<FormState>();
    final titleCtrl = TextEditingController(text: existing?.title ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    final origCtrl = TextEditingController(
      text: existing != null ? existing.originalPrice.toString() : '',
    );
    final discCtrl = TextEditingController(
      text: existing != null ? existing.discountedPrice.toString() : '',
    );
    final qtyCtrl = TextEditingController(
      text: existing != null ? existing.quantity.toString() : '5',
    );
    final weightCtrl = TextEditingController(
      text: existing != null ? existing.weightKg.toString() : '0.8',
    );
    final startCtrl = TextEditingController(text: existing?.pickupStart ?? '17h30');
    final endCtrl = TextEditingController(text: existing?.pickupEnd ?? '19h30');
    final imgCtrl = TextEditingController(text: existing?.imageUrl ?? '');

    String category = editableCategories.contains(existing?.category)
        ? existing!.category
        : editableCategories.first;
    String offerType = existing?.offerType ?? 'standard';
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
                  Text(
                    existing == null ? 'Nouvelle offre alimentaire' : 'Modifier l\'offre',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
                          items: editableCategories
                              .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                              .toList(),
                          onChanged: (v) =>
                              setDlg(() => category = v ?? editableCategories.first),
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
                            final min = existing == null ? 1 : 0;
                            return (q == null || q < min) ? 'Min $min' : null;
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
                        final payload = {
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
                        };
                        if (existing == null) {
                          await widget.api.createOffer(payload);
                        } else {
                          await widget.api.updateOffer(existing.id, payload);
                        }
                        if (ctx.mounted) Navigator.pop(ctx);
                        _loadOffers();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                existing == null
                                    ? 'Offre publiée avec succès !'
                                    : 'Offre modifiée avec succès !',
                              ),
                              backgroundColor: const Color(0xFF15803D),
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
                    child: Text(existing == null ? 'Publier l\'offre' : 'Enregistrer'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteOffer(CampusOffer offer) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer cette offre ?'),
        content: Text(
          'Voulez-vous vraiment supprimer "${offer.title}" (${offer.merchantName}) ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await widget.api.deleteOffer(offer.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offre supprimée.'),
            backgroundColor: Color(0xFF15803D),
          ),
        );
        _loadOffers();
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
    }
  }

  Future<void> _openCheckoutModal() async {
    if (_cart.isEmpty) return;
    bool submitting = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final total = _cart.values.fold<double>(
            0,
                (sum, item) => sum + item.offer.discountedPrice * item.qty,
          );
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Panier · ${_cart.values.first.offer.merchantName}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                ..._cart.values.map(
                      (entry) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(entry.offer.title),
                    subtitle: Text(
                      '${entry.offer.discountedPrice.toStringAsFixed(2)} TND × ${entry.qty}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: submitting
                              ? null
                              : () {
                            setState(() {
                              if (entry.qty <= 1) {
                                _cart.remove(entry.offer.id);
                              } else {
                                _cart[entry.offer.id] =
                                (offer: entry.offer, qty: entry.qty - 1);
                              }
                            });
                            setModalState(() {});
                            if (_cart.isEmpty) Navigator.pop(ctx);
                          },
                        ),
                        Text('${entry.qty}'),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          onPressed: submitting || entry.qty >= entry.offer.quantity
                              ? null
                              : () {
                            setState(() {
                              _cart[entry.offer.id] =
                              (offer: entry.offer, qty: entry.qty + 1);
                            });
                            setModalState(() {});
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                const Divider(),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: submitting
                      ? null
                      : () async {
                    setModalState(() => submitting = true);
                    try {
                      final items = _cart.values
                          .map((e) => {'offerId': e.offer.id, 'quantity': e.qty})
                          .toList();
                      final order = await widget.api.createOrder(items);
                      if (!mounted) return;
                      setState(() => _cart.clear());
                      if (ctx.mounted) Navigator.pop(ctx);

                      final paidOrder = await Navigator.push<CampusOrder?>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => KonnectPaymentScreen(
                            api: widget.api,
                            order: order,
                          ),
                        ),
                      );
                      if (!mounted) return;
                      _loadOffers();
                      widget.onOrderPaid?.call();
                      if (paidOrder == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Commande enregistrée. Finalisez le paiement depuis Mes QR.',
                            ),
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
                      if (ctx.mounted) setModalState(() => submitting = false);
                    }
                  },
                  child: submitting
                      ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                      : Text('Continuer vers Konnect (${total.toStringAsFixed(2)} TND)'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildOfferImage(CampusOffer offer) {
    final url = offer.resolvedImageUrl;
    Widget fallback() => Container(
      height: 150,
      width: double.infinity,
      color: const Color(0xFFECFDF5),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.restaurant, size: 36, color: Color(0xFF15803D)),
          const SizedBox(height: 6),
          Text(
            offer.category,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF15803D),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );

    if (url == null) return fallback();

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
      child: Image.network(
        url,
        height: 150,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.api.role;
    final isStudentOrGuest = !widget.api.isAuthenticated || role == 'student';
    final isMerchant = role == 'merchant';
    final isAdmin = role == 'admin';
    final cartCount = _cart.values.fold<int>(0, (sum, e) => sum + e.qty);

    final titleText = isMerchant
        ? 'CampusSave · Mes Offres'
        : isAdmin
        ? 'Modération des offres'
        : 'CampusSave · Offres';

    Widget? fab;
    if (isStudentOrGuest && cartCount > 0) {
      fab = FloatingActionButton.extended(
        onPressed: _openCheckoutModal,
        icon: const Icon(Icons.shopping_bag_outlined),
        label: Text('Panier ($cartCount)'),
      );
    } else if (isMerchant && widget.api.currentMerchant?.status == 'approved') {
      fab = FloatingActionButton.extended(
        onPressed: () => _openOfferForm(),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle offre'),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(titleText),
        actions: [
          if (widget.api.isAuthenticated && role == 'student')
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(
                avatar: const Icon(Icons.eco, size: 18, color: Color(0xFF15803D)),
                label: Text('${widget.api.currentUser!.ecoPoints} pts'),
              ),
            ),
        ],
      ),
      floatingActionButton: fab,
      body: Column(
        children: [
          if (widget.initialMerchantId != null && isStudentOrGuest)
            MaterialBanner(
              content: const Text('Filtré sur le commerce sélectionné depuis le Radar'),
              actions: [
                TextButton(
                  onPressed: widget.onClearMerchantFilter,
                  child: const Text('Voir tout'),
                ),
              ],
            ),
          // Ligne 1 : Recherche + Prix max aligné
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Rechercher un repas, boulangerie...',
                      prefixIcon: Icon(Icons.search),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (v) {
                      _search = v;
                      _loadOffers();
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  height: 44,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<double?>(
                      value: _maxPrice,
                      isDense: true,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('Tous prix')),
                        DropdownMenuItem(value: 3.0, child: Text('≤ 3 TND')),
                        DropdownMenuItem(value: 5.0, child: Text('≤ 5 TND')),
                        DropdownMenuItem(value: 10.0, child: Text('≤ 10 TND')),
                      ],
                      onChanged: (v) {
                        setState(() => _maxPrice = v);
                        _loadOffers();
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Ligne 2 : SegmentedButton pleine largeur (aucune coupure de mot)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<String>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(
                    value: 'all',
                    label: Text(
                      'Toutes',
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  ButtonSegment(
                    value: 'standard',
                    label: Text(
                      'Classiques',
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  ButtonSegment(
                    value: 'surprise',
                    label: Text(
                      'Surprise',
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                selected: {_selectedType},
                onSelectionChanged: (s) {
                  setState(() => _selectedType = s.first);
                  _loadOffers();
                },
              ),
            ),
          ),
          const SizedBox(height: 6),
          // Ligne 3 : Catégories
          SizedBox(
            height: 44,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, idx) {
                final cat = _categories[idx];
                return ChoiceChip(
                  label: Text(cat),
                  selected: _selectedCategory == cat,
                  onSelected: (_) {
                    setState(() => _selectedCategory = cat);
                    _loadOffers();
                  },
                );
              },
            ),
          ),
          Expanded(
            child: _loading
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
                      onPressed: _loadOffers,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Réessayer'),
                    ),
                  ],
                ),
              ),
            )
                : _offers.isEmpty
                ? const Center(
              child: Text('Aucune offre disponible pour ces critères.'),
            )
                : RefreshIndicator(
              onRefresh: _loadOffers,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
                itemCount: _offers.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, idx) {
                  final offer = _offers[idx];
                  return Card(
                    elevation: 0,
                    color: Colors.white,
                    clipBehavior: Clip.antiAlias,
                    shape: RoundedRectangleBorder(
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildOfferImage(offer),
                        Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      isMerchant
                                          ? offer.merchantName
                                          : '${offer.merchantName} · ${offer.distanceMeters} m',
                                      style: const TextStyle(
                                        color: Color(0xFF64748B),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  if (offer.offerType == 'surprise')
                                    const Chip(
                                      label: Text(
                                        'Surprise',
                                        style: TextStyle(fontSize: 11),
                                      ),
                                      visualDensity: VisualDensity.compact,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                offer.title,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (offer.description.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  offer.description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Color(0xFF475569),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 6),
                              Text(
                                '${offer.category} · Retrait ${offer.pickupStart}-${offer.pickupEnd} · ${offer.quantity} restant(s)',
                                style: const TextStyle(fontSize: 12),
                              ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: Wrap(
                                  alignment: WrapAlignment.spaceBetween,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    Wrap(
                                      crossAxisAlignment:
                                      WrapCrossAlignment.center,
                                      spacing: 8,
                                      children: [
                                        Text(
                                          '${offer.discountedPrice.toStringAsFixed(2)} TND',
                                          style: const TextStyle(
                                            fontSize: 17,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF15803D),
                                          ),
                                        ),
                                        Text(
                                          '${offer.originalPrice.toStringAsFixed(2)} TND',
                                          style: const TextStyle(
                                            decoration: TextDecoration.lineThrough,
                                            color: Color(0xFF94A3B8),
                                            fontSize: 13,
                                          ),
                                        ),
                                        if (offer.discountPercent > 0)
                                          Text(
                                            '-${offer.discountPercent}%',
                                            style: const TextStyle(
                                              color: Color(0xFFB45309),
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                            ),
                                          ),
                                      ],
                                    ),
                                    if (isStudentOrGuest)
                                      FilledButton.icon(
                                        onPressed: offer.quantity > 0
                                            ? () => _addToCart(offer)
                                            : null,
                                        icon: const Icon(
                                          Icons.add_shopping_cart,
                                          size: 18,
                                        ),
                                        label: const Text('Ajouter'),
                                      ),
                                    if (isMerchant)
                                      Wrap(
                                        spacing: 8,
                                        children: [
                                          OutlinedButton.icon(
                                            onPressed: () =>
                                                _openOfferForm(existing: offer),
                                            icon: const Icon(
                                              Icons.edit_outlined,
                                              size: 18,
                                            ),
                                            label: const Text('Modifier'),
                                          ),
                                          OutlinedButton.icon(
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: Colors.red.shade700,
                                            ),
                                            onPressed: () =>
                                                _confirmDeleteOffer(offer),
                                            icon: const Icon(
                                              Icons.delete_outline,
                                              size: 18,
                                            ),
                                            label: const Text('Supprimer'),
                                          ),
                                        ],
                                      ),
                                    if (isAdmin)
                                      OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: Colors.red.shade700,
                                        ),
                                        onPressed: () => _confirmDeleteOffer(offer),
                                        icon: const Icon(
                                          Icons.delete_outline,
                                          size: 18,
                                        ),
                                        label: const Text('Supprimer'),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}