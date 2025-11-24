'use client';

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

interface FaceCaptureProps {
  onFaceCaptured: (descriptor: number[]) => void;
  onError?: (error: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  autoStart?: boolean;
  hideAfterCapture?: boolean; // Sembunyikan UI setelah capture berhasil
}

export default function FaceCapture({ 
  onFaceCaptured, 
  onError,
  videoRef: externalVideoRef,
  autoStart = false,
  hideAfterCapture = false
}: FaceCaptureProps) {
  const videoRef = externalVideoRef || useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false); // Track jika wajah sudah di-capture
  const autoStartRef = useRef(autoStart); // Ref untuk track autoStart tanpa re-render
  const hasAutoStartedRef = useRef(false); // Track apakah sudah pernah auto-start

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        
        // Load models dari public/models folder
        const MODEL_URL = '/models';
        
        try {
          // Try loading from local public/models first
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
          ]);
          console.log('[FaceCapture] Models loaded from local public/models');
        } catch (localError) {
          console.warn('[FaceCapture] Failed to load from local, trying CDN...', localError);
          // Fallback to CDN if local models not available
          const CDN_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights';
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL)
          ]);
          console.log('[FaceCapture] Models loaded from CDN');
        }
        
        setModelsLoaded(true);
        console.log('[FaceCapture] Models loaded successfully');
      } catch (error: any) {
        console.error('[FaceCapture] Error loading models:', error);
        const errorMsg = error.message || 'Failed to load face recognition models. Model weights (.shard1 files) may be missing. Please download them from: https://github.com/justadudewhohacks/face-api.js-models';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [onError]);

  // Start video stream
  const startVideo = async () => {
    try {
      if (!videoRef.current) return;
      
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' // Front camera
        }
      });
      
      videoRef.current.srcObject = videoStream;
      setStream(videoStream);
      setIsCapturing(true);
      setError(null);
    } catch (error: any) {
      console.error('[FaceCapture] Error accessing camera:', error);
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera access to use face recognition.'
        : 'Failed to access camera. Please check your camera permissions.';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  // Stop video stream
  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('[FaceCapture] Camera track stopped');
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setFaceDetected(false);
  };
  
  // Reset capture state (untuk retry)
  const resetCapture = () => {
    setFaceCaptured(false);
    setFaceDetected(false);
    setError(null);
    hasAutoStartedRef.current = false; // Reset auto-start flag
  };

  // Detect face and extract descriptor
  const captureFace = async () => {
    try {
      if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
        throw new Error('Video or models not ready');
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Wait for video to have valid dimensions
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('Video not ready. Please wait for camera to initialize.');
      }

      // Get actual video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const displaySize = { width: videoWidth, height: videoHeight };

      // Set canvas dimensions to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      faceapi.matchDimensions(canvas, displaySize);

      // Detect face
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setFaceDetected(false);
        throw new Error('No face detected. Please position your face in front of the camera.');
      }

      if (detections.length > 1) {
        setFaceDetected(false);
        throw new Error('Multiple faces detected. Please ensure only one face is visible.');
      }

      const detection = detections[0];
      
      // Draw detection on canvas (only if we have valid dimensions)
      if (displaySize.width > 0 && displaySize.height > 0) {
        try {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        } catch (drawError) {
          console.warn('[FaceCapture] Could not draw on canvas:', drawError);
          // Continue anyway, drawing is optional
        }
      }

      // Extract descriptor (128-dimensional vector)
      const descriptor = Array.from(detection.descriptor);
      
      setFaceDetected(true);
      setFaceCaptured(true); // Mark bahwa wajah sudah di-capture
      
      // Stop video setelah capture berhasil
      stopVideo();
      
      // Call callback
      onFaceCaptured(descriptor);
      
      return descriptor;
    } catch (error: any) {
      console.error('[FaceCapture] Error capturing face:', error);
      setFaceDetected(false);
      const errorMessage = error.message || 'Failed to capture face';
      setError(errorMessage);
      onError?.(errorMessage);
      throw error;
    }
  };

  // Update ref saat autoStart berubah
  useEffect(() => {
    autoStartRef.current = autoStart;
  }, [autoStart]);

  // Auto start jika autoStart = true (hanya sekali saat models loaded)
  useEffect(() => {
    if (autoStart && modelsLoaded && !isCapturing && !faceCaptured && !hasAutoStartedRef.current) {
      console.log('[FaceCapture] Auto-starting video (models loaded, first time)...');
      hasAutoStartedRef.current = true;
      startVideo();
    }
  }, [modelsLoaded]); // Hanya trigger saat models loaded pertama kali

  // Handle autoStart changes (stop jika menjadi false, start jika menjadi true dan belum pernah start)
  useEffect(() => {
    // Skip jika models belum loaded atau sudah captured
    if (!modelsLoaded || faceCaptured) return;
    
    if (!autoStart && isCapturing) {
      console.log('[FaceCapture] AutoStart disabled, stopping video...');
      stopVideo();
      hasAutoStartedRef.current = false; // Reset agar bisa start lagi jika autoStart menjadi true
    } else if (autoStart && !isCapturing && !hasAutoStartedRef.current) {
      console.log('[FaceCapture] AutoStart enabled, starting video...');
      hasAutoStartedRef.current = true;
      startVideo();
    }
  }, [autoStart]); // Hanya watch autoStart, tidak watch isCapturing untuk prevent loop

  // Cleanup on unmount - pastikan kamera dimatikan
  useEffect(() => {
    return () => {
      console.log('[FaceCapture] Component unmounting, cleaning up...');
      // Matikan semua track kamera saat komponen unmount
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('[FaceCapture] Camera track stopped on unmount');
        });
      }
      // Jangan set state di cleanup karena komponen sudah unmount
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []); // Empty dependency - hanya cleanup saat unmount

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ width: 640, height: 480, maxWidth: '100%' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror image
          onLoadedMetadata={(e) => {
            // Ensure video dimensions are set when metadata loads
            const video = e.currentTarget;
            if (video && canvasRef.current) {
              canvasRef.current.width = video.videoWidth || 640;
              canvasRef.current.height = video.videoHeight || 480;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }} // Mirror canvas
        />
        
        {!isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="text-center text-white">
              <p className="text-lg font-semibold mb-2">Camera is off</p>
              <p className="text-sm text-gray-300">Click "Start Camera" to begin</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Loading face recognition models...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-800 bg-opacity-90">
            <div className="text-center text-white p-4">
              <p className="text-sm font-semibold mb-1">⚠️ Error</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {faceDetected && isCapturing && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Face Detected
          </div>
        )}
      </div>

      {/* Hide controls after capture if hideAfterCapture is true */}
      {!(hideAfterCapture && faceCaptured) && (
        <div className="flex items-center gap-3">
          {faceCaptured ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-700 font-medium">Wajah berhasil di-capture</span>
              </div>
              <button
                onClick={resetCapture}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Capture Ulang
              </button>
            </div>
          ) : !isCapturing ? (
            <button
              onClick={startVideo}
              disabled={isLoading || !modelsLoaded}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Start Camera
            </button>
          ) : (
            <>
              <button
                onClick={captureFace}
                disabled={isLoading || !modelsLoaded || !isCapturing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture Face
              </button>
              <button
                onClick={stopVideo}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Camera
              </button>
            </>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Position your face in front of the camera</p>
        <p>• Ensure good lighting</p>
        <p>• Keep still while capturing</p>
        <p>• Only one face should be visible</p>
      </div>
    </div>
  );
}

