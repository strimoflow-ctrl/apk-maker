import NativeBridge from './NativeBridge';

/**
 * Gets a highly persistent unique device identifier.
 * Uses NativeBridge on Android.
 * Falls back to a highly persistent random UUID in localStorage for Web/Development environment.
 */
export const getDeviceUuid = async () => {
  if (NativeBridge.isNative()) {
    const nativeId = NativeBridge.getDeviceId();
    if (nativeId) return nativeId;
  }

  // Highly persistent fallback for Web/Browsers
  let localUuid = localStorage.getItem('naino_device_uuid');
  if (!localUuid) {
    localUuid = 'web-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('naino_device_uuid', localUuid);
  }
  return localUuid;
};
