const https = require('https');

const API_KEY = 'sbp_f8634d1e2f10e5a5da6065421645cab260f3ba1b';
const PROJECT_REF = 'ffddohkyuegzywkepfsk';
const sqlQuery = "ALTER PUBLICATION supabase_realtime ADD TABLE orders;";

const data = JSON.stringify({ query: sqlQuery });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log(`Status code: ${res.statusCode}`);
    console.log(`Response: ${responseBody}`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
