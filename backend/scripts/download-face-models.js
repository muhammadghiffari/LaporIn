/**
 * Script untuk download face-api.js models
 * Run: node scripts/download-face-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights';
const MODELS_DIR = path.join(__dirname, '../public/models');

// Models yang diperlukan dengan path yang benar
const models = [
  { path: 'tiny_face_detector_model-weights_manifest.json', url: `${MODEL_BASE_URL}/tiny_face_detector_model-weights_manifest.json` },
  { path: 'tiny_face_detector_model-shard1', url: `${MODEL_BASE_URL}/tiny_face_detector_model-shard1` },
  { path: 'face_landmark_68_model-weights_manifest.json', url: `${MODEL_BASE_URL}/face_landmark_68_model-weights_manifest.json` },
  { path: 'face_landmark_68_model-shard1', url: `${MODEL_BASE_URL}/face_landmark_68_model-shard1` },
  { path: 'face_recognition_model-weights_manifest.json', url: `${MODEL_BASE_URL}/face_recognition_model-weights_manifest.json` },
  { path: 'face_recognition_model-shard1', url: `${MODEL_BASE_URL}/face_recognition_model-shard1` },
  { path: 'face_recognition_model-shard2', url: `${MODEL_BASE_URL}/face_recognition_model-shard2` }
];

// Create models directory
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`✅ Created directory: ${MODELS_DIR}`);
}

/**
 * Download file dari URL
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        const redirectUrl = response.headers.location || response.headers.Location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        } else {
          reject(new Error(`Redirect without location: ${response.statusCode}`));
        }
      } else {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

/**
 * Download semua models
 */
async function downloadModels() {
  console.log('📥 Downloading face-api.js models...\n');
  console.log(`📁 Target directory: ${MODELS_DIR}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const model of models) {
    const dest = path.join(MODELS_DIR, model.path);

    try {
      process.stdout.write(`⏳ Downloading ${model.path}... `);
      await downloadFile(model.url, dest);
      console.log('✅');
      successCount++;
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      failCount++;
      
      // Try alternative URL (without .json extension for manifest)
      if (model.path.endsWith('.json') && error.message.includes('404')) {
        try {
          const altUrl = model.url.replace('.json', '');
          process.stdout.write(`   Retrying with alternative URL... `);
          await downloadFile(altUrl, dest);
          console.log('✅ (alternative)');
          successCount++;
          failCount--;
        } catch (altError) {
          // Ignore alternative attempt
        }
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}/${models.length}`);
  console.log(`   ❌ Failed: ${failCount}/${models.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All models downloaded successfully!');
    console.log(`📁 Models location: ${MODELS_DIR}`);
  } else {
    console.log('\n⚠️  Automatic download failed.');
    console.log('\n💡 Please download models manually:');
    console.log('\n📖 See detailed instructions:');
    console.log('   backend/scripts/MANUAL_DOWNLOAD_MODELS.md');
    console.log('\n🚀 Quick method:');
    console.log('   1. Visit: https://github.com/justadudewhohacks/face-api.js-models');
    console.log('   2. Click "Code" → "Download ZIP"');
    console.log('   3. Extract and copy weights/* to:', MODELS_DIR);
    console.log('\n📝 Required files (7 total):');
    models.forEach(m => console.log(`   - ${m.path}`));
    console.log('\n✅ After manual download, verify with:');
    console.log('   ls -la', MODELS_DIR);
  }
}

// Run
downloadModels().catch(console.error);

