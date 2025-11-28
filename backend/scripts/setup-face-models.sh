#!/bin/bash

# Script untuk setup face-api.js models
# Run: bash scripts/setup-face-models.sh

MODELS_DIR="public/models"
REPO_URL="https://github.com/justadudewhohacks/face-api.js-models.git"
TEMP_DIR="/tmp/face-api-models"

echo "📥 Setting up face-api.js models..."
echo ""

# Create models directory
mkdir -p "$MODELS_DIR"
echo "✅ Created directory: $MODELS_DIR"
echo ""

# Method 1: Try git clone (recommended)
echo "🔄 Method 1: Cloning repository..."
if git clone "$REPO_URL" "$TEMP_DIR" 2>/dev/null; then
    echo "✅ Repository cloned successfully"
    
    # Copy models from individual folders to models directory
    if [ -d "$TEMP_DIR/tiny_face_detector" ] && [ -d "$TEMP_DIR/face_landmark_68" ] && [ -d "$TEMP_DIR/face_recognition" ]; then
        # Copy tiny_face_detector files
        cp "$TEMP_DIR/tiny_face_detector/"* "$MODELS_DIR/" 2>/dev/null
        
        # Copy face_landmark_68 files
        cp "$TEMP_DIR/face_landmark_68/"* "$MODELS_DIR/" 2>/dev/null
        
        # Copy face_recognition files
        cp "$TEMP_DIR/face_recognition/"* "$MODELS_DIR/" 2>/dev/null
        
        echo "✅ Models copied to $MODELS_DIR"
        
        # Verify files
        FILE_COUNT=$(ls -1 "$MODELS_DIR" | wc -l | tr -d ' ')
        if [ "$FILE_COUNT" -ge 7 ]; then
            echo "✅ Verified: $FILE_COUNT files copied"
        else
            echo "⚠️  Warning: Expected 7 files, found $FILE_COUNT"
        fi
        
        # Cleanup
        rm -rf "$TEMP_DIR"
        echo "✅ Cleanup completed"
        
        echo ""
        echo "🎉 Models setup completed successfully!"
        echo "📁 Models location: $MODELS_DIR"
        exit 0
    else
        echo "❌ Model folders not found in repository"
        rm -rf "$TEMP_DIR"
    fi
else
    echo "⚠️  Git clone failed (git might not be installed)"
fi

echo ""
echo "💡 Alternative: Manual download"
echo "   1. Visit: https://github.com/justadudewhohacks/face-api.js-models"
echo "   2. Click 'Code' → 'Download ZIP'"
echo "   3. Extract and copy 'weights' folder contents to: $MODELS_DIR"
echo ""
echo "📝 Required files:"
echo "   - tiny_face_detector_model-weights_manifest.json"
echo "   - tiny_face_detector_model-shard1"
echo "   - face_landmark_68_model-weights_manifest.json"
echo "   - face_landmark_68_model-shard1"
echo "   - face_recognition_model-weights_manifest.json"
echo "   - face_recognition_model-shard1"
echo "   - face_recognition_model-shard2"

