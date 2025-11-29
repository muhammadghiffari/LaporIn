import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/face_capture_widget.dart';
import '../../services/api_service.dart';
import '../dashboard/dashboard_screen.dart';

class FaceVerificationScreen extends ConsumerStatefulWidget {
  const FaceVerificationScreen({super.key});

  @override
  ConsumerState<FaceVerificationScreen> createState() => _FaceVerificationScreenState();
}

class _FaceVerificationScreenState extends ConsumerState<FaceVerificationScreen> {
  File? _capturedPhoto;
  String? _faceError;
  bool _isVerifying = false;

  Future<void> _handleFaceVerification() async {
    if (_capturedPhoto == null) {
      setState(() {
        _faceError = 'Silakan capture wajah terlebih dahulu';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
      _faceError = null;
    });

    try {
      // Convert foto ke base64
      final imageBytes = await _capturedPhoto!.readAsBytes();
      final base64Image = base64Encode(imageBytes);
      final photoBase64 = 'data:image/jpeg;base64,$base64Image';

      // Kirim ke backend untuk verifikasi
      final apiService = ApiService();
      final response = await apiService.verifyFaceFromPhoto(photoBase64);

      if (response.statusCode == 200 && response.data['verified'] == true) {
        // Verifikasi berhasil, langsung navigate ke dashboard
        // Camera sudah di-stop setelah capture, jadi langsung close
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      } else {
        setState(() {
          _faceError = response.data['error'] ?? 'Verifikasi wajah gagal. Silakan coba lagi.';
          _capturedPhoto = null;
        });
      }
    } catch (e) {
      String errorMessage = 'Verifikasi wajah gagal. Silakan coba lagi.';
      
      // Parse error message untuk user-friendly message
      if (e is DioException) {
        if (e.response != null) {
          final responseData = e.response!.data;
          if (responseData is Map && responseData['error'] != null) {
            errorMessage = responseData['error'].toString();
          }
        }
      }
      
      setState(() {
        _faceError = errorMessage;
        _capturedPhoto = null;
      });
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verifikasi Wajah'),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Container(
        color: Colors.white,
        child: SafeArea(
          child: Column(
            children: [
              // Info box - compact
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  border: Border(
                    bottom: BorderSide(color: Colors.blue[100]!, width: 1),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.blue[700], size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Verifikasi Wajah (2FA)',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue[900],
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Silakan verifikasi wajah Anda untuk melanjutkan ke dashboard.',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.blue[700],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              // Face capture area - takes most of the screen
              Expanded(
                child: Stack(
                  children: [
                    // Camera preview
                    if (_capturedPhoto == null)
                      ClipRect(
                        child: FaceCaptureWidget(
                          onFaceCaptured: (descriptor) {
                            // Not used for verification, but required by widget
                          },
                          onPhotoCaptured: (photo, isFrontCamera) {
                            setState(() {
                              _capturedPhoto = photo;
                              _faceError = null;
                            });
                          },
                          onError: (error) {
                            setState(() {
                              _faceError = error;
                            });
                          },
                          autoStart: true,
                          fullscreen: true,
                          stopAfterCapture: true, // Stop camera after capture for 2FA
                        ),
                      )
                    else
                      // Success message overlay
                      Container(
                        color: Colors.black87,
                        child: Center(
                          child: Container(
                            margin: const EdgeInsets.all(24),
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.green[50],
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.green[300]!, width: 2),
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle, 
                                  color: Colors.green[700], 
                                  size: 48,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'Wajah berhasil di-capture',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.green[900],
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Klik tombol "Verifikasi" di bawah untuk melanjutkan',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.green[700],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    
                    // Error message overlay
                    if (_faceError != null && _capturedPhoto == null)
                      Positioned(
                        top: 16,
                        left: 16,
                        right: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.red[50],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.red[300]!, width: 1.5),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline, 
                                color: Colors.red[700], 
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _faceError!,
                                  style: TextStyle(
                                    color: Colors.red[700], 
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
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
              
              // Bottom section with verify button
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: SafeArea(
                  top: false,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Verify button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: (_capturedPhoto == null || _isVerifying)
                              ? null
                              : _handleFaceVerification,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: (_capturedPhoto == null || _isVerifying)
                                ? Colors.grey[400]
                                : Colors.blue[600],
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: (_capturedPhoto == null || _isVerifying) ? 0 : 2,
                          ),
                          child: _isVerifying
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      _capturedPhoto == null 
                                          ? Icons.verified_user_outlined 
                                          : Icons.verified_user,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Verifikasi',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
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
      ),
    );
  }
}

