import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/face_capture_widget.dart';
import '../../services/api_service.dart';
import '../dashboard/dashboard_screen.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _rtRwController = TextEditingController();
  String? _selectedGender;
  
  // Face recognition state
  bool _showFaceCapture = false;
  File? _capturedPhoto;
  bool _isCapturingFace = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _rtRwController.dispose();
    super.dispose();
  }

  void _handleFaceCaptured(List<double> descriptor) {
    // Photo captured - akan diproses saat register
    setState(() {
      _isCapturingFace = false;
    });
  }

  void _handlePhotoCaptured(File photo, bool isFrontCamera) {
    setState(() {
      _capturedPhoto = photo;
      _showFaceCapture = false; // Tutup kamera setelah capture
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Foto wajah berhasil diambil'),
        backgroundColor: Colors.green,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _handleFaceError(String error) {
    setState(() {
      _isCapturingFace = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _startFaceCapture() {
    setState(() {
      _showFaceCapture = true;
      _isCapturingFace = true;
    });
  }

  void _cancelFaceCapture() {
    setState(() {
      _showFaceCapture = false;
      _isCapturingFace = false;
    });
  }

  void _removeFacePhoto() {
    setState(() {
      _capturedPhoto = null;
    });
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    // WAJIB face recognition untuk registrasi
    if (_capturedPhoto == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Wajib melakukan verifikasi wajah terlebih dahulu'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

    setState(() {
      _isCapturingFace = true;
    });

    try {
      // Convert foto ke base64
      final imageBytes = await _capturedPhoto!.readAsBytes();
      final base64Image = base64Encode(imageBytes);
      final photoBase64 = 'data:image/jpeg;base64,$base64Image';

      // Register dengan face photo
      final authNotifier = ref.read(authProvider.notifier);
      final apiService = ApiService();
      
      // Register user dulu
      final registerData = {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
        'rt_rw': _rtRwController.text.trim(),
        'jenis_kelamin': _selectedGender == 'L' ? 'laki_laki' : 'perempuan',
        'role': 'warga',
      };
      
      final registerSuccess = await authNotifier.register(registerData);
      
      if (!registerSuccess) {
        if (mounted) {
          setState(() {
            _isCapturingFace = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ref.read(authProvider).error ?? 'Registrasi gagal'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Setelah register berhasil, register face
      try {
        await apiService.registerFaceFromPhoto(photoBase64);
        
        if (mounted) {
          setState(() {
            _isCapturingFace = false;
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Registrasi berhasil! Wajah berhasil didaftarkan.'),
              backgroundColor: Colors.green,
            ),
          );
          
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      } catch (e) {
        // User sudah terdaftar, tapi face registration gagal
        // Biarkan user login dulu, bisa register face nanti
        if (mounted) {
          setState(() {
            _isCapturingFace = false;
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Registrasi berhasil, tapi gagal mendaftarkan wajah: ${e.toString()}'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 5),
            ),
          );
          
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCapturingFace = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    // Show face capture in fullscreen overlay
    if (_showFaceCapture) {
      return Scaffold(
        extendBodyBehindAppBar: true,
        backgroundColor: Colors.black,
        appBar: AppBar(
          title: const Text('Verifikasi Wajah'),
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: _cancelFaceCapture,
          ),
        ),
        body: FaceCaptureWidget(
          onFaceCaptured: _handleFaceCaptured,
          onPhotoCaptured: _handlePhotoCaptured,
          onError: _handleFaceError,
          autoStart: true,
          fullscreen: true,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Daftar sebagai Warga'),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.blue[50]!,
              Colors.white,
              Colors.indigo[50]!,
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nama Lengkap',
                      prefixIcon: Icon(Icons.person),
                    ),
                    validator: (value) =>
                        value?.isEmpty ?? true ? 'Nama harus diisi' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                    ),
                    validator: (value) {
                      if (value?.isEmpty ?? true) return 'Email harus diisi';
                      if (!value!.contains('@')) return 'Email tidak valid';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      prefixIcon: Icon(Icons.lock),
                    ),
                    validator: (value) {
                      if (value?.isEmpty ?? true) return 'Password harus diisi';
                      if (value!.length < 6) return 'Password minimal 6 karakter';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _rtRwController,
                    decoration: const InputDecoration(
                      labelText: 'RT/RW (contoh: 05/02)',
                      prefixIcon: Icon(Icons.home),
                    ),
                    validator: (value) =>
                        value?.isEmpty ?? true ? 'RT/RW harus diisi' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _selectedGender,
                    decoration: const InputDecoration(
                      labelText: 'Jenis Kelamin',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'L', child: Text('Laki-laki')),
                      DropdownMenuItem(value: 'P', child: Text('Perempuan')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedGender = value;
                      });
                    },
                    validator: (value) =>
                        value == null ? 'Jenis kelamin harus dipilih' : null,
                  ),
                  const SizedBox(height: 24),
                  
                  // Face Recognition Section
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue[200]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.face, color: Colors.blue[700], size: 24),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Verifikasi Wajah (2FA)',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            if (_capturedPhoto != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.green[100],
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.check_circle, color: Colors.green[700], size: 16),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Selesai',
                                      style: TextStyle(
                                        color: Colors.green[700],
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_capturedPhoto == null)
                          ElevatedButton.icon(
                            onPressed: _showFaceCapture ? null : _startFaceCapture,
                            icon: const Icon(Icons.camera_alt),
                            label: const Text('Verifikasi Wajah'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue[600],
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                              minimumSize: const Size(double.infinity, 48),
                            ),
                          )
                        else
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _removeFacePhoto,
                                  icon: const Icon(Icons.delete_outline),
                                  label: const Text('Hapus Foto'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red[600],
                                    side: BorderSide(color: Colors.red[300]!),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _startFaceCapture,
                                  icon: const Icon(Icons.camera_alt),
                                  label: const Text('Ambil Ulang'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.blue[600],
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        const SizedBox(height: 8),
                        Text(
                          _capturedPhoto == null
                              ? 'Wajib melakukan verifikasi wajah untuk keamanan akun Anda'
                              : 'Foto wajah sudah diambil. Klik "Daftar" untuk menyelesaikan registrasi.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.blueGrey[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  ElevatedButton(
                    onPressed: (authState.isLoading || _isCapturingFace) ? null : _handleRegister,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[600],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      disabledBackgroundColor: Colors.grey[400],
                    ),
                    child: (authState.isLoading || _isCapturingFace)
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              ),
                              SizedBox(width: 12),
                              Text('Memproses...', style: TextStyle(fontSize: 16)),
                            ],
                          )
                        : const Text('Daftar', style: TextStyle(fontSize: 16)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

