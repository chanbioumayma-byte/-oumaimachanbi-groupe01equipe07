import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthScreen extends StatefulWidget {
  final ApiService api;
  final VoidCallback onAuthSuccess;

  const AuthScreen({super.key, required this.api, required this.onAuthSuccess});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLogin = true;
  bool _awaitingEmailVerification = false;
  bool _loading = false;

  String _role = 'student';
  String _businessCategory = 'Boulangerie';

  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _studentCardCtrl = TextEditingController();
  final _businessNameCtrl = TextEditingController();
  final _businessAddressCtrl = TextEditingController();
  final _businessDescCtrl = TextEditingController();

  static const List<String> _categories = [
    'Boulangerie',
    'Plats cuisinés',
    'Sandwichs',
    'Cafétéria',
    'Pâtisserie',
  ];

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _studentCardCtrl.dispose();
    _businessNameCtrl.dispose();
    _businessAddressCtrl.dispose();
    _businessDescCtrl.dispose();
    super.dispose();
  }

  void _showMsg(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.red.shade700 : const Color(0xFF15803D),
      ),
    );
  }
  String _friendlyError(Object e) {
    final msg = e.toString().replaceFirst('Exception: ', '');
    final lower = msg.toLowerCase();
    if (lower.contains('invalid-credential') ||
        lower.contains('wrong-password') ||
        lower.contains('user-not-found')) {
      return 'Adresse e-mail ou mot de passe incorrect.';
    }
    if (lower.contains('invalid-email')) {
      return 'Adresse e-mail invalide.';
    }
    if (lower.contains('email-already-in-use')) {
      return 'Un compte existe déjà avec cette adresse Gmail.';
    }
    if (lower.contains('weak-password')) {
      return 'Mot de passe trop faible (minimum 6 caractères).';
    }
    if (lower.contains('too-many-requests')) {
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    }
    if (lower.contains('network-request-failed') || lower.contains('socketexception')) {
      return 'Erreur réseau. Vérifiez votre connexion Internet.';
    }
    return msg;
  }

  Future<void> _submitLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await widget.api.login(_emailCtrl.text, _passwordCtrl.text);
      _showMsg('Connexion réussie !');
      widget.onAuthSuccess();
    } on EmailNotVerifiedException catch (e) {
      setState(() => _awaitingEmailVerification = true);
      _showMsg(e.message, isError: true);
    } catch (e) {
      _showMsg(_friendlyError(e), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startRegister() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await widget.api.startFirebaseRegister(_emailCtrl.text, _passwordCtrl.text);
      setState(() => _awaitingEmailVerification = true);
      _showMsg('Un lien de vérification a été envoyé sur votre Gmail.');
    } catch (e) {
      _showMsg(_friendlyError(e), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _completeRegister() async {
    setState(() => _loading = true);
    try {
      await widget.api.completeBackendRegister(
        name: _nameCtrl.text,
        role: _role,
        phone: _phoneCtrl.text,
        studentCardId: _role == 'student' ? _studentCardCtrl.text : null,
        businessName: _role == 'merchant' ? _businessNameCtrl.text : null,
        businessAddress: _role == 'merchant' ? _businessAddressCtrl.text : null,
        businessCategory: _role == 'merchant' ? _businessCategory : null,
        businessDescription: _role == 'merchant' ? _businessDescCtrl.text : null,
      );
      _showMsg('Compte CampusSave activé !');
      widget.onAuthSuccess();
    } on EmailNotVerifiedException catch (e) {
      _showMsg(e.message, isError: true);
    } catch (e) {
      _showMsg(_friendlyError(e), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendEmail() async {
    setState(() => _loading = true);
    try {
      await widget.api.resendVerificationEmail();
      _showMsg('E-mail de vérification renvoyé.');
    } catch (e) {
      _showMsg(_friendlyError(e), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isLogin ? 'Connexion CampusSave' : 'Inscription CampusSave')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: true, label: Text('Connexion')),
                  ButtonSegment(value: false, label: Text('Inscription')),
                ],
                selected: {_isLogin},
                onSelectionChanged: (s) => setState(() {
                  _isLogin = s.first;
                  _awaitingEmailVerification = false;
                }),
              ),
              const SizedBox(height: 16),
              if (_awaitingEmailVerification) ...[
                Card(
                  color: const Color(0xFFECFDF5),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Vérification Gmail requise',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Ouvrez votre boîte Gmail, cliquez sur le lien de confirmation Firebase, puis appuyez sur le bouton ci-dessous.',
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _loading
                              ? null
                              : (_isLogin ? _submitLogin : _completeRegister),
                          child: const Text('J\'ai vérifié mon e-mail → Continuer'),
                        ),
                        TextButton(
                          onPressed: _loading ? null : _resendEmail,
                          child: const Text('Renvoyer le lien de vérification'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Adresse Gmail (@gmail.com obligatoire)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'E-mail requis';
                  if (!v.trim().toLowerCase().endsWith('@gmail.com')) {
                    return 'Seuls les comptes @gmail.com sont acceptés';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Mot de passe (min. 6 caractères)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.length < 6) ? 'Minimum 6 caractères' : null,
              ),
              if (!_isLogin) ...[
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _role,
                  decoration: const InputDecoration(labelText: 'Rôle', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'student', child: Text('Étudiant ESSECT')),
                    DropdownMenuItem(value: 'merchant', child: Text('Commerçant / Restaurant')),
                  ],
                  onChanged: (v) => setState(() => _role = v ?? 'student'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(labelText: 'Nom complet', border: OutlineInputBorder()),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Nom requis' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Téléphone', border: OutlineInputBorder()),
                  validator: (v) => (v == null || v.trim().length < 8) ? 'Téléphone invalide' : null,
                ),
                if (_role == 'student') ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _studentCardCtrl,
                    decoration: const InputDecoration(
                      labelText: 'N° Carte Étudiant (optionnel)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
                if (_role == 'merchant') ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _businessNameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nom du commerce',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => (_role == 'merchant' && (v == null || v.trim().isEmpty))
                        ? 'Nom du commerce requis'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _businessAddressCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Adresse (ex: Montfleury, Tunis)',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => (_role == 'merchant' && (v == null || v.trim().isEmpty))
                        ? 'Adresse requise'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _businessCategory,
                    decoration: const InputDecoration(
                      labelText: 'Catégorie du commerce',
                      border: OutlineInputBorder(),
                    ),
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _businessCategory = v ?? 'Boulangerie'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _businessDescCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Description du commerce',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _loading ? null : (_isLogin ? _submitLogin : _startRegister),
                child: _loading
                    ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
                    : Text(_isLogin ? 'Se connecter' : 'Créer le compte et envoyer l\'e-mail'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}