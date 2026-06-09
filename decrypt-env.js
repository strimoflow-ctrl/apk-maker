import fs from 'fs';
import path from 'path';

const run = () => {
  const envPath = path.resolve('.env');
  const backupPath = path.resolve('.env.backup');

  if (!fs.existsSync(backupPath)) {
    console.error('No .env.backup file found! Cannot decrypt/restore .env.');
    return;
  }

  const backupContent = fs.readFileSync(backupPath, 'utf8');
  fs.writeFileSync(envPath, backupContent, 'utf8');
  console.log('Successfully restored plaintext .env from .env.backup!');
};

run();
