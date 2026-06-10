import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebase";
import { fetchBackendAPI } from "./api";
import config from "./config";
import NativeBridge from "./NativeBridge";

const VAPID_KEY = config.FIREBASE_VAPID_KEY;

export const saveNotificationToLocal = (title, body) => {
  if (!title && !body) return;
  try {
    const existing = localStorage.getItem('naino_notifications_list');
    let notifs = existing ? JSON.parse(existing) : [];
    
    const isDuplicate = notifs.some(n => 
      n.title === title && 
      n.body === body && 
      Date.now() - n.timestamp < 5000
    );
    
    if (!isDuplicate) {
      notifs.unshift({
        id: Date.now().toString(),
        title,
        body,
        timestamp: Date.now(),
        read: false
      });
      if (notifs.length > 50) notifs = notifs.slice(0, 50);
      localStorage.setItem('naino_notifications_list', JSON.stringify(notifs));
      
      window.dispatchEvent(new Event('notificationsUpdated'));
    }
  } catch (e) {
    console.error("Failed to save notification to local storage:", e);
  }
};

export const requestNotificationPermission = async () => {
  if (NativeBridge.isNative()) {
    // In native mode, Kotlin handles its own Push Notifications and tokens via Firebase Android SDK.
    // We just return true or request permission natively if needed in future.
    console.log("Native mode: Push notifications handled by Kotlin Android App.");
    return true;
  }

  // Browser-based notification registration for PC Testing
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    if (!messaging) {
      console.log('Firebase messaging is not initialized.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      if (VAPID_KEY) {
        try {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            console.log('FCM Token generated:', token);
            const userCode = localStorage.getItem('naino_access_token');
            const deviceId = localStorage.getItem('naino_device_uuid');
            if (userCode && userCode !== 'XXXXXX') {
              await fetchBackendAPI('/api/keys/update', 'POST', {
                code: userCode,
                deviceId: deviceId,
                updates: { fcmToken: token }
              });
            }
            return token;
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } catch (tokenError) {
          console.log('An error occurred while retrieving token. ', tokenError);
        }
      } else {
        console.log('VAPID_KEY not provided.');
      }
      return true;
    } else {
      console.log('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.log('An error occurred while requesting notification permission ', error);
    return false;
  }
};

export const listenForForegroundMessages = (onMessageReceivedCallback) => {
  if (NativeBridge.isNative()) {
    // Native app handles its own foreground notifications natively
    return () => {};
  }

  if (messaging) {
    return onMessage(messaging, (payload) => {
      console.log('Message received in foreground: ', payload);
      
      saveNotificationToLocal(
        payload.notification?.title || payload.data?.title, 
        payload.notification?.body || payload.data?.body
      );

      if (onMessageReceivedCallback) {
        onMessageReceivedCallback(payload);
      } else {
        alert(`${payload.notification?.title || 'Notification'}\n${payload.notification?.body || ''}`);
      }
    });
  }
  return () => {};
};
