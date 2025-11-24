#!/bin/bash

echo "📥 Downloading face-api.js models..."
echo ""

MODEL_BASE_URL="https://github.com/justadudewhohacks/face-api.js-models/raw/master/weights"

cd "$(dirname "$0")"

# Download tiny face detector model
echo "📦 Downloading tiny_face_detector model..."
curl -L -f -o tiny_face_detector_model-weights_manifest.json "${MODEL_BASE_URL}/tiny_face_detector_model-weights_manifest.json" || echo "Failed to download manifest"
curl -L -f -o tiny_face_detector_model-shard1 "${MODEL_BASE_URL}/tiny_face_detector_model-shard1" || echo "Failed to download shard1"

# Download face landmark 68 model
echo "📦 Downloading face_landmark_68 model..."
curl -L -f -o face_landmark_68_model-weights_manifest.json "${MODEL_BASE_URL}/face_landmark_68_model-weights_manifest.json" || echo "Failed to download manifest"
curl -L -f -o face_landmark_68_model-shard1 "${MODEL_BASE_URL}/face_landmark_68_model-shard1" || echo "Failed to download shard1"

# Download face recognition model
echo "📦 Downloading face_recognition model..."
curl -L -f -o face_recognition_model-weights_manifest.json "${MODEL_BASE_URL}/face_recognition_model-weights_manifest.json" || echo "Failed to download manifest"
curl -L -f -o face_recognition_model-shard1 "${MODEL_BASE_URL}/face_recognition_model-shard1" || echo "Failed to download shard1"

echo ""
echo "✅ Download complete!"
echo ""
echo "📁 Files downloaded:"
ls -lh *.json *.shard1 2>/dev/null | awk '{print $9, "(" $5 ")"}'

echo ""
echo "⚠️  If files are too small (< 1KB), they may not have downloaded correctly."
echo "    Please check the GitHub repository manually:"
echo "    https://github.com/justadudewhohacks/face-api.js-models/tree/master/weights"
echo ""

