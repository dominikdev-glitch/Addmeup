/**
 * Push & Web Notifications service for AddMeUp.
 * Provides system-level native notification prompts and alerts for claims and rewards.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      localStorage.setItem('amu_push_notifications_enabled', 'true');
    } else {
      localStorage.setItem('amu_push_notifications_enabled', 'false');
    }
    return perm;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export function areNotificationsEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted' && localStorage.getItem('amu_push_notifications_enabled') !== 'false';
}

export function setNotificationsEnabledPreference(enabled: boolean): void {
  localStorage.setItem('amu_push_notifications_enabled', enabled ? 'true' : 'false');
}

export interface ShowNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  onClick?: () => void;
}

export async function triggerSystemNotification(title: string, options: ShowNotificationOptions): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // Check if disabled by user setting
  if (localStorage.getItem('amu_push_notifications_enabled') === 'false') {
    return false;
  }

  const iconUrl = options.icon || '/logo/amu.png';

  try {
    // If service worker registration is available, prefer registration.showNotification for mobile PWA lockscreen support
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body: options.body,
            icon: iconUrl,
            badge: iconUrl,
            tag: options.tag || 'amu-notif',
            data: options.data,
          } as any);
          return true;
        }
      } catch (swErr) {
        // Fallback to standard window Notification
      }
    }

    const notif = new Notification(title, {
      body: options.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: options.tag || 'amu-notif',
    });

    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }

    return true;
  } catch (err) {
    console.warn('Could not dispatch system notification:', err);
    return false;
  }
}
