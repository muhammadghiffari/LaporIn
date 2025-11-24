import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../services/face_service.dart';

class FaceCaptureWidget extends StatefulWidget {
  final Function(List<double>) onFaceCaptured;
  final Function(String) onError;
  final bool autoStart;

  const FaceCaptureWidget({
    super.key,
    required this.onFaceCaptured,
    required this.onError,
    this.autoStart = false,
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
  final FaceService _faceService = FaceService();

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

      _controller = CameraController(
        _cameras![0],
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _controller!.initialize();
      
      if (widget.autoStart) {
        _startCamera();
      }

      setState(() {
        _isInitialized = true;
      });
    } catch (e) {
      widget.onError('Gagal menginisialisasi kamera: $e');
    }
  }

  Future<void> _startCamera() async {
    if (_controller == null || !_isInitialized) return;
    
    try {
      await _controller!.startImageStream(_processCameraImage);
      setState(() {
        _isCapturing = true;
      });
    } catch (e) {
      widget.onError('Gagal memulai kamera: $e');
    }
  }

  Future<void> _stopCamera() async {
    if (_controller == null) return;
    
    try {
      await _controller!.stopImageStream();
      setState(() {
        _isCapturing = false;
        _faceDetected = false;
      });
    } catch (e) {
      // Ignore errors when stopping
    }
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (!_isCapturing) return;

    try {
      final descriptor = await _faceService.extractFaceDescriptor(image);
      if (descriptor != null) {
        setState(() {
          _faceDetected = true;
        });
      } else {
        setState(() {
          _faceDetected = false;
        });
      }
    } catch (e) {
      // Ignore processing errors
    }
  }

  Future<void> _captureFace() async {
    if (_controller == null || !_isInitialized) {
      widget.onError('Kamera belum siap');
      return;
    }

    try {
      final image = await _controller!.takePicture();
      final imageFile = File(image.path);
      final descriptor = await _faceService.extractFaceDescriptorFromFile(imageFile);
      
      if (descriptor == null) {
        widget.onError('Tidak ada wajah terdeteksi. Pastikan wajah Anda berada di depan kamera.');
        return;
      }

      await _stopCamera();
      widget.onFaceCaptured(descriptor);
    } catch (e) {
      widget.onError('Gagal capture wajah: $e');
    }
  }

  @override
  void dispose() {
    _stopCamera();
    _controller?.dispose();
    _faceService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized || _controller == null) {
      return Container(
        height: 300,
        decoration: BoxDecoration(
          color: Colors.grey[900],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    return Column(
      children: [
        Container(
          height: 300,
          decoration: BoxDecoration(
            color: Colors.grey[900],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _faceDetected ? Colors.green : Colors.transparent,
              width: 3,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              if (_isCapturing)
                CameraPreview(_controller!)
              else
                Container(
                  color: Colors.grey[800],
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.videocam_off, size: 48, color: Colors.grey[400]),
                        const SizedBox(height: 8),
                        Text(
                          'Kamera dimatikan',
                          style: TextStyle(color: Colors.grey[400]),
                        ),
                      ],
                    ),
                  ),
                ),
              if (_faceDetected && _isCapturing)
                Positioned(
                  top: 16,
                  left: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'Wajah Terdeteksi',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (!_isCapturing)
          ElevatedButton.icon(
            onPressed: _startCamera,
            icon: const Icon(Icons.videocam),
            label: const Text('Mulai Kamera'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue[600],
              foregroundColor: Colors.white,
            ),
          )
        else
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _captureFace,
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Capture Wajah'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: _stopCamera,
                icon: const Icon(Icons.stop),
                label: const Text('Stop'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        const SizedBox(height: 12),
        Text(
          '• Posisikan wajah di depan kamera\n• Pastikan pencahayaan cukup\n• Tetap diam saat capture\n• Hanya satu wajah yang terlihat',
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey[600],
            height: 1.5,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

