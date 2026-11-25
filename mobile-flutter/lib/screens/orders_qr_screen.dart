import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import 'konnect_payment_screen.dart';
class OrdersQrScreen extends StatefulWidget {
  final ApiService api;
  const OrdersQrScreen({super.key, required this.api});

  @override
  State<OrdersQrScreen> createState() => _OrdersQrScreenState();
}

class _OrdersQrScreenState extends State<OrdersQrScreen> {
  List<CampusOrder> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!widget.api.isAuthenticated) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await widget.api.fetchOrders();
      if (mounted) setState(() => _orders = list);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _cancelOrder(CampusOrder order) async {
    try {
      await widget.api.cancelOrder(order.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Commande annulée.')),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  Future<void> _payPendingOrder(CampusOrder order) async {
    final paidOrder = await Navigator.push<CampusOrder?>(
      context,
      MaterialPageRoute(
        builder: (_) => KonnectPaymentScreen(api: widget.api, order: order),
      ),
    );
    if (!mounted) return;
    if (paidOrder != null) {
      _load();
    }
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'pending_payment':
        return 'En attente de paiement';
      case 'paid':
        return 'Payée · Prête au retrait';
      case 'picked_up':
        return 'Récupérée';
      case 'cancelled':
        return 'Annulée';
      default:
        return s;
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.api.role;
    final pageTitle = role == 'admin'
        ? 'Supervision des Commandes'
        : role == 'merchant'
        ? 'Commandes Clients'
        : 'Mes Commandes & Tickets QR';
    return Scaffold(
      appBar: AppBar(
        title: Text(pageTitle),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Text(_error!))
          : _orders.isEmpty
          ? const Center(child: Text('Aucune commande pour le moment.'))
          : RefreshIndicator(
        onRefresh: _load,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _orders.length,
          itemBuilder: (context, idx) {
            final order = _orders[idx];
            final canCancel = role == 'student' &&
                (order.status == 'pending_payment' || order.status == 'paid');
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            order.merchantName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        Chip(
                          label: Text(
                            _statusLabel(order.status),
                            style: const TextStyle(fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                    if (role != 'student' && order.studentName.isNotEmpty)
                      Text('Étudiant : ${order.studentName}'),
                    if (order.pickupWindow.isNotEmpty)
                      Text('Créneau : ${order.pickupWindow}'),
                    Text(
                      'Total : ${order.totalAmount.toStringAsFixed(2)} TND · Économie : ${order.savingsTnd.toStringAsFixed(2)} TND',
                    ),
                    if (order.items.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      ...order.items.map(
                            (i) => Text(
                          '• ${i.quantity}× ${i.title} (${i.unitPrice.toStringAsFixed(2)} TND)',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                    if (order.status == 'paid' &&
                        order.qrToken != null &&
                        role == 'student') ...[
                      const SizedBox(height: 12),
                      Center(
                        child: Column(
                          children: [
                            QrImageView(data: order.qrToken!, size: 160),
                            const SizedBox(height: 6),
                            SelectableText(
                              'Code retrait : ${order.pickupCode ?? order.id}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (order.status == 'picked_up' && order.ecoPointsAwarded > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '+${order.ecoPointsAwarded} EcoPoints gagnés !',
                          style: const TextStyle(
                            color: Color(0xFF15803D),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (order.status == 'pending_payment' && role == 'student')
                          FilledButton(
                            onPressed: () => _payPendingOrder(order),
                            child: const Text('Payer Konnect'),
                          ),
                        if (canCancel) ...[
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: () => _cancelOrder(order),
                            child: const Text('Annuler'),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}