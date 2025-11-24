#!/bin/bash

echo "📥 Downloading face-api.js models..."
echo ""

MODEL_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights"

# Create models directory if it doesn't exist
mkdir -p "$(dirname "$0")"

cd "$(dirname "$0")"

# Download tiny face detector model
echo "📦 Downloading tiny_face_detector model..."
curl -L -o tiny_face_detector_model-weights_manifest.json "$MODEL_URL/tiny_face_detector_model-weights_manifest.json"
curl -L -o tiny_face_detector_model-shard1 "$MODEL_URL/tiny_face_detector_model-shard1"

# Download face landmark 68 model
echo "📦 Downloading face_landmark_68 model..."
curl -L -o face_landmark_68_model-weights_manifest.json "$MODEL_URL/face_landmark_68_model-weights_manifest.json"
curl -L -o face_landmark_68_model-shard1 "$MODEL_URL/face_landmark_68_model-shard1"

# Download face recognition model
echo "📦 Downloading face_recognition model..."
curl -L -o face_recognition_model-weights_manifest.json "$MODEL_URL/face_recognition_model-weights_manifest.json"
curl -L -o face_recognition_model-shard1 "$MODEL_URL/face_recognition_model-shard1"

echo ""
echo "✅ Models downloaded successfully!"
echo "📁 Location: $(pwd)"
echo ""
echo "Files:"
ls -lh *.json *.shard1 2>/dev/null || echo "Some files may not have been downloaded. Please check manually."

