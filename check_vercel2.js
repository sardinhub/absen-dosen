const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function findFirebaseConfig() {
  try {
    const html = await get('https://sikad-v1.vercel.app/login');
    
    // Find all script tags
    const scriptRegex = /<script[^>]+src="([^">]+)"/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      if (match[1].includes('_next/static')) {
        scripts.push('https://sikad-v1.vercel.app' + (match[1].startsWith('/') ? '' : '/') + match[1]);
      }
    }
    
    console.log(`Found ${scripts.length} scripts to check on /login.`);
    
    for (const scriptUrl of scripts) {
      const js = await get(scriptUrl);
      if (js.includes('database-sikad')) {
         console.log(`\nFound 'database-sikad' in ${scriptUrl}`);
      }
      if (js.includes('AIzaSy')) {
         console.log(`\nFound 'AIzaSy...' API key in ${scriptUrl}`);
      }
      
      const projectIdMatch = js.match(/projectId:"([^"]+)"/);
      if (projectIdMatch) {
        console.log(`Found a projectId: ${projectIdMatch[1]} in ${scriptUrl}`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

findFirebaseConfig();
