import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc, setDoc, getDoc, limit } from 'firebase/firestore';
import { encryptText } from './crypto';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper function to send a message (supports images and replies)
export const sendMessage = async (contentPayload, sender, type = 'text', replyTo = null, expiryTimer = 24 * 60 * 60) => {
  try {
    const finalContent = type === 'text' ? encryptText(contentPayload) : contentPayload; // Don't encrypt URLs
    await addDoc(collection(db, 'messages'), {
      text: finalContent, // Keeping 'text' for backward compatibility, though it holds urls now too
      type: type,
      sender: sender,
      replyTo: replyTo,
      timestamp: serverTimestamp(),
      expiryTimer: expiryTimer,
      seenAt: null
    });
  } catch (error) {
    console.error('Error sending message: ', error);
  }
};

// Helper function to mark message as seen
export const markAsSeen = async (messageId) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      seenAt: Date.now()
    });
  } catch (error) {
    console.error('Error marking as seen:', error);
  }
};

// Listener for messages with pagination
export const listenForMessages = (limitCount, callback) => {
  const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(limitCount));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).reverse(); // Reverse to show oldest first in UI
    callback(messages);
  });
};

// Helper function to delete message
export const deleteMessage = async (messageId) => {
  try {
    await deleteDoc(doc(db, 'messages', messageId));
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

// Helper function to react to message
export const reactToMessage = async (messageId, emoji) => {
  try {
    await updateDoc(doc(db, 'messages', messageId), { reaction: emoji });
  } catch (error) {
    console.error('Error reacting to message:', error);
  }
};

// Helper function to setup User Profile
export const setupUserProfile = async (userId, name, gender) => {
  try {
    await setDoc(doc(db, 'users', userId), { name, gender });
  } catch (error) {
    console.error('Error setting profile:', error);
  }
};

// Listener for a single user profile
export const listenForUserProfile = (userId, callback) => {
  return onSnapshot(doc(db, 'users', userId), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  });
};
