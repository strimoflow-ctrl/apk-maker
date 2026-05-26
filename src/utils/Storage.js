export const StorageService = {
  /**
   * Deep Native-Ready Setter
   * Prepares the app for Capacitor/VoltBuilder. 
   * When you migrate to Android APK, you will replace localStorage with Capacitor Preferences here.
   */
  async set(key, value) {
    // Current Web Implementation
    localStorage.setItem(key, value);
    
    // Future Native Android Implementation (Uncomment later):
    // import { Preferences } from '@capacitor/preferences';
    // await Preferences.set({ key, value: String(value) });
  },
  
  /**
   * Deep Native-Ready Getter
   */
  async get(key) {
    return localStorage.getItem(key);
    
    // Future Native Android Implementation:
    // const { value } = await Preferences.get({ key });
    // return value;
  },

  /**
   * Deep Native-Ready Remover
   */
  async remove(key) {
    localStorage.removeItem(key);
    
    // Future Native Android Implementation:
    // await Preferences.remove({ key });
  }
};
