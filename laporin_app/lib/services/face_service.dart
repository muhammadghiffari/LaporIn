import 'dart:io';
import 'dart:typed_data';
import 'dart:ui';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class FaceService {
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableContours: false, // Disable contours to reduce warnings
      enableLandmarks: true, // Keep landmarks for face recognition
      enableClassification: false, // Disable classification (smiling, eyes open) to reduce processing
      enableTracking: false, // Disable tracking to reduce overhead
      minFaceSize: 0.15, // Slightly larger min size for better accuracy
      performanceMode: FaceDetectorMode.fast, // Use fast mode for better performance
    ),
  );

  // Extract face descriptor from camera image with strict validation
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
      final imageWidth = cameraImage.width.toDouble();
      final imageHeight = cameraImage.height.toDouble();
      
      // STRICT VALIDATION: Check face position (must be roughly centered)
      final faceCenterX = face.boundingBox.left + (face.boundingBox.width / 2);
      final faceCenterY = face.boundingBox.top + (face.boundingBox.height / 2);
      final imageCenterX = imageWidth / 2;
      final imageCenterY = imageHeight / 2;
      
      // Face must be within 40% of center (strict)
      final maxOffsetX = imageWidth * 0.4;
      final maxOffsetY = imageHeight * 0.4;
      
      if ((faceCenterX - imageCenterX).abs() > maxOffsetX ||
          (faceCenterY - imageCenterY).abs() > maxOffsetY) {
        return null; // Face not centered enough
      }
      
      // STRICT VALIDATION: Check face size (not too small or too large)
      final faceArea = face.boundingBox.width * face.boundingBox.height;
      final imageArea = imageWidth * imageHeight;
      final faceRatio = faceArea / imageArea;
      
      // Face should be between 10% and 50% of image (strict)
      if (faceRatio < 0.10 || faceRatio > 0.50) {
        return null; // Face size not optimal
      }
      
      // Extract face landmarks untuk membuat descriptor
      final landmarks = face.landmarks;
      
      // STRICT VALIDATION: Check if essential landmarks are detected
      final essentialLandmarks = [
        FaceLandmarkType.leftEye,
        FaceLandmarkType.rightEye,
        FaceLandmarkType.noseBase,
        FaceLandmarkType.leftMouth,
        FaceLandmarkType.rightMouth,
      ];
      
      // At least 4 out of 5 essential landmarks must be detected (strict)
      int detectedLandmarks = 0;
      for (var landmarkType in essentialLandmarks) {
        if (landmarks[landmarkType] != null) {
          detectedLandmarks++;
        }
      }
      
      if (detectedLandmarks < 4) {
        return null; // Not enough landmarks detected
      }
      
      // Create descriptor dari landmark positions
      List<double> descriptor = [];
      
      // Add bounding box info
      descriptor.add(face.boundingBox.left);
      descriptor.add(face.boundingBox.top);
      descriptor.add(face.boundingBox.width);
      descriptor.add(face.boundingBox.height);
      
      // Add landmark positions (only if detected)
      for (var landmarkType in essentialLandmarks) {
        final landmark = landmarks[landmarkType];
        if (landmark != null) {
          final position = landmark.position;
          descriptor.add(position.x.toDouble());
          descriptor.add(position.y.toDouble());
        } else {
          // Add zeros if landmark not available
          descriptor.add(0.0);
          descriptor.add(0.0);
        }
      }
      
      // Add optional landmarks if available
      final optionalLandmarks = [
        FaceLandmarkType.leftCheek,
        FaceLandmarkType.rightCheek,
      ];
      
      for (var landmarkType in optionalLandmarks) {
        final landmark = landmarks[landmarkType];
        if (landmark != null) {
          final position = landmark.position;
          descriptor.add(position.x.toDouble());
          descriptor.add(position.y.toDouble());
        } else {
          descriptor.add(0.0);
          descriptor.add(0.0);
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

  // Extract face descriptor from file image (relaxed validation - backend will do final validation)
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
      
      // Basic validation only - backend will do strict validation
      // Just check if we have at least some landmarks
      final essentialLandmarks = [
        FaceLandmarkType.leftEye,
        FaceLandmarkType.rightEye,
        FaceLandmarkType.noseBase,
        FaceLandmarkType.leftMouth,
        FaceLandmarkType.rightMouth,
      ];
      
      // At least 2 out of 5 essential landmarks (relaxed for frontend)
      int detectedLandmarks = 0;
      for (var landmarkType in essentialLandmarks) {
        if (landmarks[landmarkType] != null) {
          detectedLandmarks++;
        }
      }
      
      if (detectedLandmarks < 2) {
        return null; // Not enough landmarks detected
      }
      
      List<double> descriptor = [];
      descriptor.add(face.boundingBox.left);
      descriptor.add(face.boundingBox.top);
      descriptor.add(face.boundingBox.width);
      descriptor.add(face.boundingBox.height);
      
      // Add essential landmarks
      for (var landmarkType in essentialLandmarks) {
        final landmark = landmarks[landmarkType];
        if (landmark != null) {
          final position = landmark.position;
          descriptor.add(position.x.toDouble());
          descriptor.add(position.y.toDouble());
        } else {
          descriptor.add(0.0);
          descriptor.add(0.0);
        }
      }
      
      // Add optional landmarks if available
      final optionalLandmarks = [
        FaceLandmarkType.leftCheek,
        FaceLandmarkType.rightCheek,
      ];
      
      for (var landmarkType in optionalLandmarks) {
        final landmark = landmarks[landmarkType];
        if (landmark != null) {
          final position = landmark.position;
          descriptor.add(position.x.toDouble());
          descriptor.add(position.y.toDouble());
        } else {
          descriptor.add(0.0);
          descriptor.add(0.0);
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

