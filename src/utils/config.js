import CryptoJS from 'crypto-js';

// Reconstruct the obfuscation key dynamically at runtime
const getObfuscationKey = () => {
  const p1 = 'naino';
  const p2 = 'academy';
  const p3 = 'secure';
  const p4 = '2026';
  return `${p1}_${p2}_${p3}_${p4}`;
};

// Decryption helper
const decryptVal = (encryptedStr) => {
  if (!encryptedStr) return '';
  // CryptoJS AES ciphertexts always start with 'U2FsdGVkX1' in Base64
  if (!encryptedStr.startsWith('U2FsdGVkX1')) {
    return encryptedStr;
  }
  try {
    const key = getObfuscationKey();
    const bytes = CryptoJS.AES.decrypt(encryptedStr, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedStr;
  } catch (e) {
    console.error('Decryption failed for value, returning raw string', e);
    return encryptedStr;
  }
};

const config = {
  FIREBASE_API_KEY: decryptVal(import.meta.env.VITE_FIREBASE_API_KEY),
  FIREBASE_AUTH_DOMAIN: decryptVal(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  FIREBASE_DATABASE_URL: decryptVal(import.meta.env.VITE_FIREBASE_DATABASE_URL),
  FIREBASE_PROJECT_ID: decryptVal(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  FIREBASE_STORAGE_BUCKET: decryptVal(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  FIREBASE_MESSAGING_SENDER_ID: decryptVal(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  FIREBASE_APP_ID: decryptVal(import.meta.env.VITE_FIREBASE_APP_ID),
  APP_SECRET_KEY: decryptVal(import.meta.env.VITE_APP_SECRET_KEY),
  FIREBASE_VAPID_KEY: decryptVal(import.meta.env.VITE_FIREBASE_VAPID_KEY),
  BACKEND_API_URL: decryptVal(import.meta.env.VITE_BACKEND_API_URL),
  API_KEY: decryptVal(import.meta.env.VITE_API_KEY),
  IMGBB_API_KEY: decryptVal(import.meta.env.VITE_IMGBB_API_KEY || 'U2FsdGVkX18oKbfrLfkbYPGcX/751Uhuw6tpU2SoVgumjvWlWTSA1yVTzvfh4y971qIn+FIyTtJUANtOIRk2Kw==')
};

export default config;
