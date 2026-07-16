const https = require('https');
require('dotenv').config({ path: '.env.local' });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const options = {
  hostname: 'firestore.googleapis.com',
  port: 443,
  path: `/v1/projects/${projectId}/databases/(default)/documents/tabel_user?key=${apiKey}`,
  method: 'GET',
  headers: {
    'Referer': 'https://sikad-triesakti.vercel.app/',
    'Origin': 'https://sikad-triesakti.vercel.app/'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data.substring(0, 500)}`);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
