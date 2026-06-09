import fs from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';

const getObfuscationKey = () => {
  const p1 = 'naino';
  const p2 = 'academy';
  const p3 = 'secure';
  const p4 = '2026';
  return `${p1}_${p2}_${p3}_${p4}`;
};

const encrypt = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, getObfuscationKey()).toString();
};

const run = () => {
  const envPath = path.resolve('.env');
  const backupPath = path.resolve('.env.backup');

  if (!fs.existsSync(envPath)) {
    console.error('No .env file found!');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  
  const isAlreadyEncrypted = lines.some(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
      return val.startsWith('U2FsdGVkX1');
    }
    return false;
  });

  if (isAlreadyEncrypted) {
    console.log('.env is already encrypted. No action needed.');
    return;
  }

  // Backup original plain .env (if not already existing)
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, envContent, 'utf8');
    console.log('Created backup .env.backup with plain text keys.');
  } else {
    console.log('.env.backup already exists. Keeping existing backup.');
  }

  // Process and encrypt
  const encryptedLines = lines.map(line => {
    if (!line.trim() || line.trim().startsWith('#')) {
      return line;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return line;

    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();

    const match = val.match(/^(['"])(.*)\1$/);
    let originalVal = val;
    let quote = '"';
    if (match) {
      quote = match[1];
      originalVal = match[2];
    }

    if (key.startsWith('VITE_') && !originalVal.startsWith('U2FsdGVkX1')) {
      const encVal = encrypt(originalVal);
      console.log(`Encrypted key: ${key}`);
      return `${key}=${quote}${encVal}${quote}`;
    }

    return line;
  });

  fs.writeFileSync(envPath, encryptedLines.join('\n'), 'utf8');
  console.log('Successfully encrypted .env file!');
};

run();
