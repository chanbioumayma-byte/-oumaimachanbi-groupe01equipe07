import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class KonnectPaymentScreen extends StatefulWidget {
  final ApiService api;
  final CampusOrder order;

  const KonnectPaymentScreen({
    super.key,
    required this.api,
    required this.order,
  });

  @override
  State<KonnectPaymentScreen> createState() => _KonnectPaymentScreenState();
}

class _KonnectPaymentScreenState extends State<KonnectPaymentScreen> {
  KonnectInitSession? _session;
  CampusOrder? _paidOrder;
  bool _loadingSession = true;
  bool _confirming = false;
  String? _error;
  String _selectedMethod = 'konnect_wallet';

  static const List<({String id, String title, String subtitle, IconData icon})>
  _methods = [
    (
    id: 'konnect_wallet',
    title: 'Konnect Wallet',
    subtitle: 'Paiement instantané via portefeuille Konnect',
    icon: Icons.account_balance_wallet_outlined,
    ),
    (
    id: 'konnect_card',
    title: 'Carte Bancaire (CIB / Visa / Mastercard)',
    subtitle: 'Passerelle sécurisée Konnect Sandbox',
    icon: Icons.credit_card_outlined,
    ),
    (
    id: 'konnect_edinar',
    title: 'Carte e-Dinar',
    subtitle: 'La Poste Tunisienne · Mode test',
    icon: Icons.payments_outlined,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _initSession();
  }

  Future<void> _initSession() async {
    setState(() {
      _loadingSession = true;
      _error = null;
    });
    try {
      final session = await widget.api.initKonnectPayment(widget.order.id);
      if (mounted) {
        setState(() => _session = session);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loadingSession = false);
    }
  }

  Future<void> _confirmPayment() async {
    setState(() {
      _confirming = true;
      _error = null;
    });
    try {
      final paid = await widget.api.confirmKonnectPayment(
        widget.order.id,
        _selectedMethod,
      );
      try {
        await widget.api.fetchMe();
      } catch (_) {}
      if (mounted) {
        setState(() => _paidOrder = paid);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Écran de confirmation avec QR code généré après paiement
    if (_paidOrder != null) {
      final paid = _paidOrder!;
      return Scaffold(
        appBar: AppBar(
          title: const Text('Ticket QR généré'),
          automaticallyImplyLeading: false,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: Color(0xFF15803D),
                      size: 52,
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Paiement Konnect confirmé !',
                      style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Réf. ${paid.paymentRef ?? _session?.sessionRef ?? paid.id}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 18),
                    if (paid.qrToken != null)
                      QrImageView(data: paid.qrToken!, size: 190),
                    const SizedBox(height: 12),
                    SelectableText(
                      'Code retrait : ${paid.pickupCode ?? paid.id}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF15803D),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${paid.merchantName}\nRetrait : ${paid.pickupWindow}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () => Navigator.pop(context, paid),
                icon: const Icon(Icons.qr_code_2),
                label: const Text('Voir mes tickets QR'),
              ),
            ],
          ),
        ),
      );
    }

    // Écran de paiement Konnect Sandbox
    return Scaffold(
      appBar: AppBar(title: const Text('Paiement Konnect')),
      body: _loadingSession
          ? const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text('Initialisation de la session Konnect...'),
          ],
        ),
      )
          : _session == null
          ? Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error ?? 'Impossible d’initialiser Konnect.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _initSession,
                icon: const Icon(Icons.refresh),
                label: const Text('Réessayer'),
              ),
            ],
          ),
        ),
      )
          : ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _session!.gateway.toUpperCase(),
                      style: const TextStyle(
                        color: Color(0xFF86EFAC),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white12,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'SANDBOX',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '${widget.order.totalAmount.toStringAsFixed(2)} TND',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${_session!.amountMillimes} millimes · Réf. ${_session!.sessionRef}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
                const Divider(color: Colors.white24, height: 22),
                Text(
                  widget.order.merchantName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (widget.order.pickupWindow.isNotEmpty)
                  Text(
                    'Créneau de retrait : ${widget.order.pickupWindow}',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Choisissez votre moyen de paiement',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          ..._methods.map((m) {
            final selected = _selectedMethod == m.id;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: _confirming
                    ? null
                    : () => setState(() => _selectedMethod = m.id),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected
                          ? const Color(0xFF15803D)
                          : const Color(0xFFE2E8F0),
                      width: selected ? 1.8 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        m.icon,
                        color: selected
                            ? const Color(0xFF15803D)
                            : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              m.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              m.subtitle,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        selected
                            ? Icons.radio_button_checked
                            : Icons.radio_button_unchecked,
                        color: selected
                            ? const Color(0xFF15803D)
                            : const Color(0xFF94A3B8),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Text(
              'Mode test Konnect : aucun débit bancaire réel ne sera effectué.',
              style: TextStyle(fontSize: 12, color: Color(0xFF15803D)),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(
                _error!,
                style: TextStyle(color: Colors.red.shade800, fontSize: 13),
              ),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _confirming ? null : _confirmPayment,
            child: _confirming
                ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
                : Text(
              'Confirmer le paiement (${widget.order.totalAmount.toStringAsFixed(2)} TND)',
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed:
            _confirming ? null : () => Navigator.pop(context, null),
            child: const Text('Payer plus tard'),
          ),
        ],
      ),
    );
  }
}