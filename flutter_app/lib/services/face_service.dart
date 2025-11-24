import 'dart:io';
import 'dart:typed_data';
import 'dart:ui';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;

class FaceService {
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableContours: true,
      enableLandmarks: true,
      enableClassification: true,
      enableTracking: true,
      minFaceSize: 0.1,
    ),
  );

  // Extract face descriptor from camera image
  Future<List<double>?> extractFaceDescriptor(CameraImage cameraImage) async {
    try {
      // Convert CameraImage to InputImage
      final inputImage = _inputImageFromCameraImage(cameraImage);
      
      // Detect faces
      final faces = await _faceDetector.processImage(inputImage);
      
      if (faces.isEmpty) {
        return null; // No face detected
      }
      
      if (faces.length > 1) {
        throw Exception('Multiple faces detected. Please ensure only one face is visible.');
      }
      
      final face = faces.first;
      
      // Extract face landmarks untuk membuat descriptor
      // Note: Google ML Kit tidak memberikan face descriptor langsung
      // Kita perlu menggunakan landmarks untuk membuat descriptor sederhana
      // Atau gunakan library lain seperti face_recognition atau custom model
      
      // Untuk sekarang, kita buat descriptor dari landmarks
      final landmarks = face.landmarks;
      if (landmarks == null) {
        return null;
      }
      
      // Create descriptor dari landmark positions
      List<double> descriptor = [];
      
      // Add bounding box info
      descriptor.add(face.boundingBox.left);
      descriptor.add(face.boundingBox.top);
      descriptor.add(face.boundingBox.width);
      descriptor.add(face.boundingBox.height);
      
      // Add landmark positions (simplified)
      // In production, use proper face recognition model
      for (var landmark in landmarks.values) {
        final position = landmark?.position;
        if (position != null) {
          descriptor.add(position.x.toDouble());
          descriptor.add(position.y.toDouble());
        }
      }
      
      // Pad atau truncate to 128 dimensions (standard face descriptor size)
      while (descriptor.length < 128) {
        descriptor.add(0.0);
      }
      descriptor = descriptor.sublist(0, 128);
      
      return descriptor;
    } catch (e) {
      print('Error extracting face descriptor: $e');
      return null;
    }
  }

  // Extract face descriptor from file image
  Future<List<double>?> extractFaceDescriptorFromFile(File imageFile) async {
    try {
      final inputImage = InputImage.fromFilePath(imageFile.path);
      final faces = await _faceDetector.processImage(inputImage);
      
      if (faces.isEmpty) {
        return null;
      }
      
      if (faces.length > 1) {
        throw Exception('Multiple faces detected');
      }
      
      final face = faces.first;
      final landmarks = face.landmarks;
      
      if (landmarks == null) {
        return null;
      }
      
      List<double> descriptor = [];
      descriptor.add(face.boundingBox.left);
      descriptor.add(face.boundingBox.top);
      descriptor.add(face.boundingBox.width);
      descriptor.add(face.boundingBox.height);
      
      for (var landmark in landmarks.values) {
        final position = landmark?.position;
        if (position != null) {
          descriptor.add(position.x.toDouble());
          descriptor.add(position.y.toDouble());
        }
      }
      
      while (descriptor.length < 128) {
        descriptor.add(0.0);
      }
      descriptor = descriptor.sublist(0, 128);
      
      return descriptor;
    } catch (e) {
      print('Error extracting face descriptor from file: $e');
      return null;
    }
  }

  InputImage _inputImageFromCameraImage(CameraImage cameraImage) {
    final BytesBuilder allBytes = BytesBuilder();
    for (final Plane plane in cameraImage.planes) {
      allBytes.add(plane.bytes);
    }
    final bytes = allBytes.takeBytes();

    final imageSize = img.Image(
      width: cameraImage.width,
      height: cameraImage.height,
    );

    final imageRotation = InputImageRotation.rotation0deg;
    final format = InputImageFormat.nv21;

    final planeData = cameraImage.planes.map(
      (Plane plane) {
        return InputImageMetadata(
          size: Size(cameraImage.width.toDouble(), cameraImage.height.toDouble()),
          rotation: imageRotation,
          format: format,
          bytesPerRow: plane.bytesPerRow,
        );
      },
    ).toList();

    return InputImage.fromBytes(
      bytes: bytes,
      metadata: planeData[0],
    );
  }

  void dispose() {
    _faceDetector.close();
  }
}

