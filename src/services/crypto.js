import CryptoJS from 'crypto-js';

const SECRET_KEY = '2503';

export const encryptText = (text) => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptText = (ciphertext) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ''; // Handles case where decryption succeeds but yields empty string
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};
