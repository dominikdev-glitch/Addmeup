import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification, NotificationType } from '../types';

export interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkTab?: 'feed' | 'post' | 'verifications' | 'wallet';
  meta?: Record<string, any>;
}

/**
 * Send an in-app notification to a user
 */
export async function sendNotification(params: SendNotificationParams): Promise<string> {
  try {
    const notifRef = doc(collection(db, 'notifications'));
    const notifData: AppNotification = {
      notificationId: notifRef.id,
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      read: false,
      createdAt: Date.now(),
      linkTab: params.linkTab,
      meta: params.meta || {},
    };

    await setDoc(notifRef, notifData);
    return notifRef.id;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return '';
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { read: true });
  } catch (error) {
    console.error('Failed to mark notification read:', error);
  }
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsAsRead(notifications: AppNotification[]): Promise<void> {
  try {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      const ref = doc(db, 'notifications', n.notificationId);
      batch.update(ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const ref = doc(db, 'notifications', notificationId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Failed to delete notification:', error);
  }
}
