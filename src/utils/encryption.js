import CryptoJS from 'crypto-js';

/**
 * Attempts to decrypt the provided data string using the app's secret key.
 * If the data is plain JSON, it will gracefully parse and return it.
 * If decryption fails, it returns the raw data.
 * 
 * @param {string} text - The raw text response (could be encrypted AES string or plain JSON string)
 * @returns {object|string} - The parsed JSON object, or the original string if parsing/decryption fails
 */
export const decryptData = (text) => {
  if (!text) return text;

  try {
    // Attempt 1: Try parsing it as plain JSON first.
    // If it's a normal unencrypted JSON file, this will succeed immediately.
    return JSON.parse(text);
  } catch (e) {
    // It's not plain JSON, let's try to decrypt it.
    try {
      const secretKey = import.meta.env.VITE_APP_SECRET_KEY;
      if (!secretKey) {
        console.warn('VITE_APP_SECRET_KEY is not defined. Cannot decrypt data.');
        return text;
      }

      // Decrypt the AES string
      const bytes = CryptoJS.AES.decrypt(text, secretKey);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      
      if (decryptedText) {
        // Parse the decrypted JSON string
        return JSON.parse(decryptedText);
      }
    } catch (decryptError) {
      console.error('Failed to decrypt or parse data. It might be corrupt or the key is incorrect.', decryptError);
    }
  }

  // If both parsing and decryption fail, return the raw text
  return text;
};

/**
 * Attempts to decrypt a plain string (like a video URL) using the app's secret key.
 * If decryption fails, it returns the original string.
 */
export const decryptString = (text) => {
  if (!text) return text;
  
  // If it starts with 'http' or '/', it's already a plain URL, don't try to decrypt
  if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/dl/')) {
    return text;
  }

  try {
    const secretKey = import.meta.env.VITE_APP_SECRET_KEY;
    if (!secretKey) return text;

    const bytes = CryptoJS.AES.decrypt(text, secretKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    
    if (decryptedText && (decryptedText.startsWith('http') || decryptedText.startsWith('/dl/'))) {
      return decryptedText;
    }
  } catch (e) {
    // Decryption failed, return original text
  }

  return text;
};
