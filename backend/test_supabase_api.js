const https = require('https');

const options = {
  hostname: 'nlicjaulpudklgxfvqtr.supabase.co',
  path: '/rest/v1/products?select=*',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saWNqYXVscHVka2xneGZ2cXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzU2ODIsImV4cCI6MjA5NzExMTY4Mn0.t6em13eq74c0xrLci6Lgj30dZ_JSN7Ad8oNTpJQs_Vw',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saWNqYXVscHVka2xneGZ2cXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzU2ODIsImV4cCI6MjA5NzExMTY4Mn0.t6em13eq74c0xrLci6Lgj30dZ_JSN7Ad8oNTpJQs_Vw'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response headers:', res.headers);
    console.log('Response body:', data);
  });
});

req.on('error', (err) => {
  console.error('Error:', err.message);
});

req.end();
