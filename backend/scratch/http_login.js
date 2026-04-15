require('dotenv').config();
const http = require('http');

function testLogin(email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  try {
    console.log('Testing login for yash@inv / 123456...');
    const r1 = await testLogin('yash@inv', '123456');
    console.log('Status:', r1.status);
    const parsed = JSON.parse(r1.body);
    if (r1.status === 200) {
      console.log('✅ LOGIN SUCCESS! User:', parsed.user?.name, '| Role:', parsed.user?.role);
    } else {
      console.log('❌ Login failed:', parsed.message);
    }
  } catch(e) {
    console.error('Connection error - server may not be running:', e.message);
  }
}
main();
