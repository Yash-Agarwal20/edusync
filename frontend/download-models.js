const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_DIR = path.join(__dirname, 'public', 'models');
const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

let done = 0;
files.forEach(f => {
  const url = `${BASE}/${f}`;
  const dest = path.join(MODEL_DIR, f);
  if (fs.existsSync(dest)) { console.log(`[skip] ${f}`); done++; if(done===files.length) console.log('All done!'); return; }
  console.log(`[downloading] ${f}...`);
  const file = fs.createWriteStream(dest);
  https.get(url, res => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      https.get(res.headers.location, res2 => { res2.pipe(file); file.on('finish', () => { file.close(); console.log(`[done] ${f}`); done++; if(done===files.length) console.log('All models downloaded!'); }); });
    } else {
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log(`[done] ${f}`); done++; if(done===files.length) console.log('All models downloaded!'); });
    }
  }).on('error', e => console.error(`[error] ${f}:`, e.message));
});
