import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
  }
});

async function listTables() {
  const url = `${env.VITE_SUPABASE_URL}/rest/v1/?apikey=${env.VITE_SUPABASE_ANON_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Tables:', Object.keys(data.paths || {}).map(p => p.slice(1)));
  } catch (err) {
    console.error(err);
  }
}
listTables();
