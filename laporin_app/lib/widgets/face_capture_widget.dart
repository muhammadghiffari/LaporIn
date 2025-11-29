import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;

import '../services/api_service.dart';

class FaceCaptureWidget extends StatefulWidget {
  final Function(List<double>) onFaceCaptured;
  final Function(String) onError;
  final Function(File, bool)? onPhotoCaptured; // Added bool parameter for isFrontCamera
  final bool autoStart;
  final bool fullscreen;
  final bool stopAfterCapture; // Stop camera after capture (for 2FA)

  const FaceCaptureWidget({
    super.key,
    required this.onFaceCaptured,
    required this.onError,
    this.onPhotoCaptured,
    this.autoStart = false,
    this.fullscreen = false,
    this.stopAfterCapture = false, // Default: keep camera running for retakes
  });

  @override
  State<FaceCaptureWidget> createState() => _FaceCaptureWidgetState();
}

class _FaceCaptureWidgetState extends State<FaceCaptureWidget> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isInitialized = false;
  bool _isCapturing = false;
  bool _faceDetected = false;
  bool _isSwitchingCamera = false;
  int _selectedCameraIndex = 0;

  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras == null || _cameras!.isEmpty) {
        widget.onError('Tidak ada kamera tersedia');
        return;
      }

      final frontCameraIndex = _cameras!.indexWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
      );

      _selectedCameraIndex = frontCameraIndex >= 0 ? frontCameraIndex : 0;
      await _setupSelectedCamera(startStream: widget.autoStart);
    } catch (e) {
      widget.onError('Gagal menginisialisasi kamera: $e');
    }
  }

  Future<void> _setupSelectedCamera({bool startStream = false}) async {
    if (_cameras == null || _cameras!.isEmpty) return;

    try {
      final newController = CameraController(
        _cameras![_selectedCameraIndex],
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420,
      );

      await newController.initialize();
      await _controller?.dispose();

      if (!mounted) {
        await newController.dispose();
        return;
      }

      setState(() {
        _controller = newController;
        _isInitialized = true;
      });

      if (startStream) {
        await _startCamera();
      }
    } catch (e) {
      widget.onError('Gagal menginisialisasi kamera: $e');
    }
  }

  Future<void> _switchCamera() async {
    if (_cameras == null || _cameras!.length < 2 || _isSwitchingCamera) {
      return;
    }

    final wasStreaming = _isCapturing;

    setState(() {
      _isSwitchingCamera = true;
      _faceDetected = false;
    });

    await _stopCamera();
    _selectedCameraIndex = (_selectedCameraIndex + 1) % _cameras!.length;
    await _setupSelectedCamera(startStream: wasStreaming);

    if (mounted) {
      setState(() {
        _isSwitchingCamera = false;
      });
    }
  }

  Future<void> _startCamera() async {
    if (_controller == null || !_controller!.value.isInitialized || _isCapturing) {
      return;
    }

    try {
      await _controller!.startImageStream(_processCameraImage);
      if (!mounted) return;
      setState(() {
        _isCapturing = true;
      });
    } catch (e) {
      widget.onError('Gagal memulai kamera: $e');
    }
  }

  Future<void> _stopCamera() async {
    if (_controller == null || !_isCapturing) {
      return;
    }

    try {
      await _controller!.stopImageStream();
      if (!mounted) return;
      setState(() {
        _isCapturing = false;
        _faceDetected = false;
      });
    } catch (_) {
      // Abaikan error saat stop camera
    }
  }

  DateTime _lastProcessTime = DateTime.now();
  static const Duration _processInterval = Duration(milliseconds: 1500); // Process every 1.5s to reduce network load

  Future<void> _processCameraImage(CameraImage image) async {
    if (!_isCapturing) return;

    // Throttle processing to reduce network load
    final now = DateTime.now();
    if (now.difference(_lastProcessTime) < _processInterval) {
      return;
    }
    _lastProcessTime = now;

    try {
      // Convert CameraImage to base64 for API call
      final imageBytes = await _cameraImageToBytes(image);
      if (imageBytes == null || !mounted) return;
      
      final base64Image = base64Encode(imageBytes);
      final photoBase64 = 'data:image/jpeg;base64,$base64Image';
      
      // Call backend API for face detection (async, don't block)
      _apiService.detectFaceFromPhoto(photoBase64).then((response) {
        if (!mounted) return;
        
        // Update face detected state based on API response
        final bool isDetected = response.data['detected'] == true;
        if (_faceDetected != isDetected) {
          setState(() => _faceDetected = isDetected);
        }
      }).catchError((_) {
        // Abaikan error - mungkin network issue
        if (!mounted) return;
        if (_faceDetected) {
          setState(() => _faceDetected = false);
        }
      });
    } catch (_) {
      // Abaikan error pemrosesan frame
    }
  }

  // Helper: Convert CameraImage to JPEG bytes
  Future<Uint8List?> _cameraImageToBytes(CameraImage image) async {
    try {
      // Convert YUV420 to RGB, then to JPEG
      final yBuffer = image.planes[0].bytes;
      final uBuffer = image.planes[1].bytes;
      final vBuffer = image.planes[2].bytes;
      
      final yStride = image.planes[0].bytesPerRow;
      final uStride = image.planes[1].bytesPerRow;
      
      // Create image from YUV data
      final yuvImage = img.Image(
        width: image.width,
        height: image.height,
      );
      
      // Convert YUV to RGB (simplified - for production use proper conversion)
      for (int y = 0; y < image.height; y++) {
        for (int x = 0; x < image.width; x++) {
          final yIndex = y * yStride + x;
          final uvIndex = (y ~/ 2) * uStride + (x ~/ 2);
          
          final yValue = yBuffer[yIndex];
          final uValue = uBuffer[uvIndex] - 128;
          final vValue = vBuffer[uvIndex] - 128;
          
          // YUV to RGB conversion
          int r = (yValue + (1.402 * vValue)).round().clamp(0, 255);
          int g = (yValue - (0.344 * uValue) - (0.714 * vValue)).round().clamp(0, 255);
          int b = (yValue + (1.772 * uValue)).round().clamp(0, 255);
          
          yuvImage.setPixel(x, y, img.ColorRgb8(r, g, b));
        }
      }
      
      // Convert to JPEG with lower quality for faster upload
      return Uint8List.fromList(img.encodeJpg(yuvImage, quality: 70));
    } catch (e) {
      print('Error converting camera image: $e');
      return null;
    }
  }

  Future<void> _captureFace() async {
    if (_controller == null || !_controller!.value.isInitialized) {
      widget.onError('Kamera belum siap');
      return;
    }

    try {
      // Stop image stream before taking picture to prevent conflicts
      final wasCapturing = _isCapturing;
      await _stopCamera();
      
      // Wait a bit for camera to stabilize
      await Future.delayed(const Duration(milliseconds: 200));
      
      final image = await _controller!.takePicture();
      final imageFile = File(image.path);
      
      // Check if it's front camera
      final isFrontCamera = _cameras != null && 
          _cameras![_selectedCameraIndex].lensDirection == CameraLensDirection.front;
      
      // No flipping needed - camera already provides natural (non-mirrored) image
      if (widget.onPhotoCaptured != null) {
        widget.onPhotoCaptured!(imageFile, isFrontCamera);
      }

      // Notify that photo was captured - backend will validate
      widget.onFaceCaptured([]);
      
      // Stop camera after capture if stopAfterCapture is true (for 2FA)
      if (widget.stopAfterCapture) {
        // Camera already stopped, just ensure it stays stopped
        return;
      }
      
      // Restart camera setelah capture agar tetap hidup untuk ambil ulang jika perlu
      if (wasCapturing && _controller != null && _controller!.value.isInitialized) {
        await Future.delayed(const Duration(milliseconds: 300));
        if (mounted && _controller != null && _controller!.value.isInitialized) {
          await _startCamera();
        }
      }
    } catch (e) {
      widget.onError('Gagal menangkap wajah: $e');
      // Restart camera on error
      if (_controller != null && _controller!.value.isInitialized) {
        await _startCamera();
      }
    }
  }

  @override
  void dispose() {
    _stopCamera();
    _controller?.dispose();
    super.dispose();
  }

  Widget _buildLoadingPlaceholder() {
    return Container(
      width: double.infinity,
      height: widget.fullscreen ? double.infinity : 360,
      color: Colors.black,
      child: const Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
    );
  }

  Widget _buildCameraPreview(Size size) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return _buildLoadingPlaceholder();
    }

    final previewSize = _controller!.value.previewSize;
    final previewWidth = previewSize != null ? previewSize.height : size.width;
    final previewHeight = previewSize != null ? previewSize.width : size.height;

    // No mirroring - show natural preview (same as captured photo)
    return FittedBox(
      fit: BoxFit.cover,
      child: SizedBox(
        width: previewWidth,
        height: previewHeight,
        child: CameraPreview(_controller!),
      ),
    );
  }

  Widget _buildDetectionBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: Colors.white.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.face,
            color: Colors.white,
            size: 18,
          ),
          SizedBox(width: 10),
          Text(
            'Posisikan wajah Anda',
            style: TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShutterButton() {
    return GestureDetector(
      onTap: _captureFace,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: Colors.white,
            width: 4,
          ),
          color: Colors.transparent,
        ),
        child: Center(
          child: Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
            ),
            child: const Icon(
              Icons.camera_alt,
              color: Colors.black87,
              size: 28,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStartStopButton() {
    final isRunning = _isCapturing;
    return OutlinedButton.icon(
      onPressed: isRunning ? _stopCamera : _startCamera,
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        side: BorderSide(
          color: Colors.white.withOpacity(0.6),
          width: 1.5,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        backgroundColor: Colors.black.withOpacity(0.3),
      ),
      icon: Icon(
        isRunning ? Icons.pause_circle_outline : Icons.play_circle_outline,
        size: 20,
      ),
      label: Text(
        isRunning ? 'Jeda' : 'Mulai',
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildOverlay(Size size) {
    return Stack(
      children: [
        // Gradient overlay untuk readability
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withOpacity(0.3),
                  Colors.transparent,
                  Colors.transparent,
                  Colors.black.withOpacity(0.7),
                ],
                stops: const [0.0, 0.15, 0.7, 1.0],
              ),
            ),
          ),
        ),
        // Face guide oval (simple border, no color change)
        Center(
          child: Container(
            width: size.width * 0.75,
            height: size.height * 0.55,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(size.width * 0.4),
              border: Border.all(
                color: Colors.white.withOpacity(0.5),
                width: 3,
              ),
            ),
          ),
        ),
        // Top section: Badge and instructions
        Positioned(
          top: widget.fullscreen ? kToolbarHeight + 16 : 16,
          left: 16,
          right: 16,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_isSwitchingCamera)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Mengganti kamera...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                )
              else
                _buildDetectionBadge(),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Pastikan wajah berada di dalam garis bantu\nGunakan pencahayaan yang cukup',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    height: 1.4,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
            ],
          ),
        ),
        // Camera switch button (top right)
        if (widget.fullscreen)
          Positioned(
            top: kToolbarHeight + 16,
            right: 16,
            child: IconButton.filled(
              onPressed: (_cameras == null || _cameras!.length < 2)
                  ? null
                  : _switchCamera,
              style: IconButton.styleFrom(
                backgroundColor: Colors.black.withOpacity(0.5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.all(12),
              ),
              icon: const Icon(Icons.cameraswitch, size: 24),
            ),
          ),
        // Bottom section: Controls
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: EdgeInsets.fromLTRB(
              24,
              20,
              24,
              widget.fullscreen ? 32 : 24,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withOpacity(0.8),
                  Colors.black,
                ],
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Tip text
                if (!widget.fullscreen)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      'Tip: Pegang ponsel setinggi mata dan tetap diam saat tombol shutter ditekan.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                // Control buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Start/Stop button (only show if not fullscreen or if needed)
                    if (!widget.fullscreen)
                      _buildStartStopButton()
                    else
                      const SizedBox(width: 80),
                    // Shutter button (center) - always enabled
                    _buildShutterButton(),
                    // Placeholder for symmetry
                    if (!widget.fullscreen)
                      SizedBox(
                        width: 80,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _isCapturing ? Icons.check_circle : Icons.radio_button_unchecked,
                              color: _isCapturing
                                  ? Colors.white
                                  : Colors.white.withOpacity(0.4),
                              size: 20,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _isCapturing ? 'Aktif' : 'Standby',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.7),
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      const SizedBox(width: 80),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized || _controller == null) {
      return _buildLoadingPlaceholder();
    }

    final borderRadius =
        widget.fullscreen ? BorderRadius.zero : BorderRadius.circular(16);

    final child = LayoutBuilder(
      builder: (context, constraints) {
        final size = widget.fullscreen
            ? Size(constraints.maxWidth, constraints.maxHeight)
            : Size(constraints.maxWidth, 360);

        return ClipRRect(
          borderRadius: borderRadius,
          child: Container(
            color: Colors.black,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _buildCameraPreview(size),
                _buildOverlay(size),
              ],
            ),
          ),
        );
      },
    );

    if (widget.fullscreen) {
      return SizedBox.expand(child: child);
    }

    return SizedBox(
      height: 360,
      width: double.infinity,
      child: child,
    );
  }
}

