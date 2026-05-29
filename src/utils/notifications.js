import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebase";
import { fetchBackendAPI } from "./api";
import { PushNotifications } from '@capacitor/push-notifications';

// Note: To receive tokens, you MUST pass your VAPID key below
// Generate this key in Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;

export const saveNotificationToLocal = (title, body) => {
  if (!title && !body) return;
  try {
    const existing = localStorage.getItem('naino_notifications_list');
    let notifs = existing ? JSON.parse(existing) : [];
    
    // Check if duplicate (same title/body within last 5 seconds)
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
      // Keep only last 50 notifications
      if (notifs.length > 50) notifs = notifs.slice(0, 50);
      localStorage.setItem('naino_notifications_list', JSON.stringify(notifs));
      
      // Dispatch event to update UI badges
      window.dispatchEvent(new Event('notificationsUpdated'));
    }
  } catch (e) {
    console.error("Failed to save notification to local storage:", e);
  }
};

export const requestNotificationPermission = async () => {
  if (isCapacitor) {
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive === 'granted') {
        // Remove existing listeners first to prevent duplicates
        await PushNotifications.removeAllListeners();

        // Register token
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Native Push Registration Token:', token.value);
          const userCode = localStorage.getItem('naino_access_token');
          const deviceId = localStorage.getItem('naino_device_uuid');
          if (userCode && userCode !== 'XXXXXX') {
            try {
              await fetchBackendAPI('/api/keys/update', 'POST', {
                code: userCode,
                deviceId: deviceId,
                updates: { fcmToken: token.value }
              });
              console.log('Native FCM Token saved to backend successfully.');
            } catch (err) {
              console.error('Failed to save native FCM token to backend:', err);
            }
          }
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Native Push Registration Error:', error);
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Native Push Received in Foreground:', notification);
          saveNotificationToLocal(notification.title, notification.body);
          if (window.onNativePushReceived) {
            window.onNativePushReceived(notification);
          }
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Native Push Action Performed:', action);
          const notification = action.notification;
          if (notification) {
            saveNotificationToLocal(notification.title, notification.body);
          }
        });

        await PushNotifications.register();
        return true;
      } else {
        console.log('Native push notification permission denied.');
        return false;
      }
    } catch (error) {
      console.error('Error during native push notification setup:', error);
      return false;
    }
  }

  // Browser-based notification registration
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
      
      // Get FCM token if VAPID key is provided
      if (VAPID_KEY) {
        try {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            console.log('FCM Token generated:', token);
            // Save token to backend securely
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
        console.log('VAPID_KEY not provided. Add VITE_FIREBASE_VAPID_KEY to your .env to receive push tokens.');
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
  if (isCapacitor) {
    // For native app, register the callback globally so the push listener can call it
    window.onNativePushReceived = (notification) => {
      if (onMessageReceivedCallback) {
        onMessageReceivedCallback({
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: notification.data
        });
      }
    };
    return () => {
      window.onNativePushReceived = null;
    };
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
        // Fallback default alert for foreground notification
        alert(`${payload.notification?.title || 'Notification'}\n${payload.notification?.body || ''}`);
      }
    });
  }
  return () => {};
};
