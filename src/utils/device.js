import { Device } from '@capacitor/device';

/**
 * Gets a highly persistent unique device identifier.
 * Uses Capacitor Device UUID on Android/iOS platforms.
 * Falls back to a highly persistent random UUID in localStorage for Web/Development environment.
 */
export const getDeviceUuid = async () => {
  try {
    const info = await Device.getId();
    if (info && info.uuid) {
      return info.uuid;
    }
  } catch (e) {
    // Expected when running on standard browser without Capacitor bridge active
    console.warn("Capacitor Device plugin not active on this platform. Using localStorage fallback.");
  }

  // Highly persistent fallback for Web/Browsers
  let localUuid = localStorage.getItem('naino_device_uuid');
  if (!localUuid) {
    localUuid = 'web-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('naino_device_uuid', localUuid);
  }
  return localUuid;
};
