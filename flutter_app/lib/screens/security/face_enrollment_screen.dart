import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/api_service.dart';
import '../../widgets/face_capture_widget.dart';
import '../../providers/auth_provider.dart';

class FaceEnrollmentScreen extends ConsumerStatefulWidget {
  const FaceEnrollmentScreen({super.key});

  @override
  ConsumerState<FaceEnrollmentScreen> createState() =>
      _FaceEnrollmentScreenState();
}

class _FaceEnrollmentScreenState extends ConsumerState<FaceEnrollmentScreen> {
  bool _cameraStarted = false;
  bool _isUploading = false;
  bool _showPreview = false;
  bool _isFrontCamera = true; // Track if front camera was used
  File? _capturedPhoto;
  String? _statusMessage;

  void _handleFaceCaptured(List<double> descriptor) {
    // Photo captured - show success message
    // Backend will validate when saving
    setState(() {
      _statusMessage = 'Foto berhasil diambil. Klik simpan untuk mengunggah.';
    });
  }

  void _handlePhotoCaptured(File photo, bool isFrontCamera) {
    setState(() {
      _capturedPhoto = photo;
      _isFrontCamera = isFrontCamera;
      _showPreview = true; // Show preview immediately after capture
    });
  }

  void _handleError(String error) {
    setState(() {
      _statusMessage = error;
      _capturedPhoto = null;
    });
  }

  void _retakePhoto() {
    setState(() {
      _showPreview = false;
      _capturedPhoto = null;
      _statusMessage = null;
    });
  }
  
  void _cancelEnrollment() {
    setState(() {
      _cameraStarted = false;
      _showPreview = false;
      _capturedPhoto = null;
      _statusMessage = null;
    });
  }

  Future<void> _registerFace() async {
    if (_capturedPhoto == null || _isUploading) return;
    
    setState(() {
      _isUploading = true;
      _statusMessage = 'Mengirim foto ke server...';
    });
    
    try {
      // Convert foto ke base64
      final imageBytes = await _capturedPhoto!.readAsBytes();
      final base64Image = base64Encode(imageBytes);
      final photoBase64 = 'data:image/jpeg;base64,$base64Image';
      
      // Kirim ke backend (backend akan extract embedding otomatis)
      final apiService = ApiService();
      final response = await apiService.registerFaceFromPhoto(photoBase64);
      
      if (response.statusCode == 200) {
        if (!mounted) return;
        
        // Update state: set hasFaceRegistered = true
        final authNotifier = ref.read(authProvider.notifier);
        await authNotifier.updateFaceRegisteredStatus();
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Wajah berhasil didaftarkan!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(true);
      } else {
        throw Exception('Gagal mendaftarkan wajah');
      }
    } catch (e) {
      String errorMessage = 'Gagal menyimpan wajah. Silakan coba lagi.';
      
      // Parse error message untuk user-friendly message
      final errorString = e.toString();
      
      // Try to extract error message from Dio response
      String? backendErrorMessage;
      if (e is DioException) {
        if (e.response != null) {
          final responseData = e.response!.data;
          if (responseData is Map && responseData['error'] != null) {
            backendErrorMessage = responseData['error'].toString();
          }
        } else if (e.type == DioExceptionType.connectionTimeout || 
                   e.type == DioExceptionType.receiveTimeout ||
                   e.type == DioExceptionType.sendTimeout) {
          errorMessage = 'Waktu koneksi habis. Periksa koneksi internet dan coba lagi.';
        } else if (e.type == DioExceptionType.connectionError) {
          errorMessage = 'Tidak dapat terhubung ke server. Pastikan server berjalan dan koneksi internet aktif.';
        } else if (e.error != null) {
          final errorStr = e.error.toString();
          if (errorStr.contains('SocketException') || errorStr.contains('Failed host lookup')) {
            errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet dan pastikan server berjalan.';
          }
        }
      }
      
      // Use backend error message if available, otherwise parse from exception
      if (backendErrorMessage != null && backendErrorMessage.isNotEmpty) {
        errorMessage = backendErrorMessage;
      } else if (errorString.contains('400') || errorString.contains('bad response')) {
        if (errorString.contains('Tidak ada wajah') || errorString.contains('No face detected') || errorString.contains('tidak ada wajah')) {
          errorMessage = 'Tidak ada wajah terdeteksi. Pastikan wajah terlihat jelas dengan pencahayaan cukup dan posisikan wajah di tengah frame.';
        } else if (errorString.contains('lebih dari satu') || errorString.contains('Multiple faces') || errorString.contains('lebih dari satu')) {
          errorMessage = 'Terdeteksi lebih dari satu wajah. Pastikan hanya wajah Anda yang terlihat di kamera.';
        } else if (errorString.contains('Format foto') || errorString.contains('format')) {
          errorMessage = 'Format foto tidak valid. Silakan coba ambil foto lagi.';
        } else if (errorString.contains('Face descriptor tidak valid') || errorString.contains('descriptor')) {
          errorMessage = 'Wajah tidak dapat diproses. Pastikan wajah terlihat jelas dengan pencahayaan cukup dan coba ambil foto lagi.';
        } else {
          errorMessage = 'Foto tidak dapat diproses. Pastikan wajah terlihat jelas dengan pencahayaan cukup dan coba lagi.';
        }
      } else if (errorString.contains('network') || errorString.contains('timeout') || errorString.contains('SocketException')) {
        errorMessage = 'Koneksi bermasalah. Periksa koneksi internet dan coba lagi.';
      }
      
      setState(() {
        _statusMessage = errorMessage;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'OK',
              textColor: Colors.white,
              onPressed: () {},
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  Widget _buildInstructionView(BuildContext context) {
    final theme = Theme.of(context);
    final steps = [
      'Pastikan wajah terlihat jelas dan pencahayaan cukup.',
      'Pegang ponsel setinggi mata, jangan gunakan masker/kacamata gelap.',
      'Tetap diam beberapa detik hingga indikator berubah hijau.',
    ];

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.blue[100]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.shield_outlined, color: Colors.blue[700], size: 28),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Keamanan Tambahan',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...steps.map(
                    (step) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.check_circle, color: Colors.blue, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              step,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: Colors.blueGrey[800],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _cameraStarted = true;
                  });
                },
                icon: const Icon(Icons.videocam),
                label: const Text('Aktifkan Kamera'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Colors.blue[600],
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewView(BuildContext context) {
    if (_capturedPhoto == null) return const SizedBox.shrink();
    
    return Stack(
      children: [
        Positioned.fill(
          child: _isFrontCamera
              ? Transform.scale(
                  scaleX: -1.0, // Flip horizontally for front camera preview (mirror effect)
                  child: Image.file(
                    _capturedPhoto!,
                    fit: BoxFit.cover,
                  ),
                )
              : Image.file(
                  _capturedPhoto!,
                  fit: BoxFit.cover,
                ),
        ),
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            bottom: false,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.7),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: _cancelEnrollment,
                  ),
                  const Expanded(
                    child: Text(
                      'Preview Foto',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 48), // Balance for close button
                ],
              ),
            ),
          ),
        ),
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black54,
                    Colors.black,
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_statusMessage != null && _statusMessage!.toLowerCase().contains('gagal'))
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.redAccent.withOpacity(0.5),
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: Colors.redAccent,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Flexible(
                            child: Text(
                              _statusMessage!,
                              style: const TextStyle(
                                color: Colors.redAccent,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isUploading ? null : _retakePhoto,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: BorderSide(
                              color: Colors.white.withOpacity(0.6),
                              width: 1.5,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          icon: const Icon(Icons.refresh, size: 20),
                          label: const Text(
                            'Ambil Ulang',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          onPressed: _isUploading ? null : _registerFace,
                          icon: _isUploading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Icon(Icons.check_circle, size: 20),
                          label: Text(
                            _isUploading ? 'Menyimpan...' : 'Gunakan Foto Ini',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              letterSpacing: 0.3,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            backgroundColor: !_isUploading
                                ? Colors.greenAccent
                                : Colors.grey[600],
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: !_isUploading ? 4 : 0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCameraView(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: FaceCaptureWidget(
            onFaceCaptured: _handleFaceCaptured,
            onPhotoCaptured: _handlePhotoCaptured,
            onError: _handleError,
            autoStart: true,
            fullscreen: true,
          ),
        ),
        if (_statusMessage != null && _statusMessage!.toLowerCase().contains('gagal'))
          Positioned(
            top: kToolbarHeight + 80,
            left: 24,
            right: 24,
            child: SafeArea(
              bottom: false,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.redAccent.withOpacity(0.6),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.red.withOpacity(0.4),
                      blurRadius: 16,
                      spreadRadius: 3,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      color: Colors.white,
                      size: 22,
                    ),
                    const SizedBox(width: 12),
                    Flexible(
                      child: Text(
                        _statusMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          letterSpacing: 0.2,
                          height: 1.3,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        // No buttons in camera view - user just takes photo via shutter button
        // After capture, automatically goes to preview
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: _cameraStarted,
      backgroundColor: _cameraStarted ? Colors.black : Colors.white,
      appBar: AppBar(
        title: Text(_cameraStarted ? 'Verifikasi Wajah' : 'Daftarkan Wajah (2FA)'),
        backgroundColor:
            Colors.blue[600],
        foregroundColor: Colors.white,
        elevation: _cameraStarted ? 0 : 4,
      ),
      body: _cameraStarted && _showPreview && _capturedPhoto != null
          ? Container(
              child: _buildPreviewView(context),
            )
          : (_cameraStarted
              ? _buildCameraView(context)
              : Container(
                  margin: const EdgeInsets.only(top: 40),
                  child: _buildInstructionView(context),
                )),
    );
  }
}

