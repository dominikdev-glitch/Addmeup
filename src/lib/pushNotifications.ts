/**
 * Push & Web Notifications service for AddMeUp.
 * Provides system-level native notification prompts and alerts for claims and rewards.
 */

export function isIframeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isPWAStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;
}

export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window || ('serviceWorker' in navigator && 'PushManager' in window);
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch (e) {
    return 'unsupported';
  }
}

export interface PermissionRequestResult {
  permission: NotificationPermission | 'unsupported';
  error?: string;
  isIframe?: boolean;
  needsIOSPwa?: boolean;
}

export async function requestNotificationPermission(): Promise<PermissionRequestResult> {
  if (isIOS() && !isPWAStandalone() && !('Notification' in window)) {
    return {
      permission: 'unsupported',
      needsIOSPwa: true,
      error: 'On iPhone/iPad, push notifications require adding AddMeUp to your Home Screen first (Tap Share ⎋ -> Add to Home Screen).'
    };
  }

  if (!isNotificationSupported()) {
    return {
      permission: 'unsupported',
      error: 'Web notifications are not supported by this browser.'
    };
  }

  // Pre-register service worker if available
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('SW pre-registration note:', e);
    }
  }

  try {
    let perm: NotificationPermission;
    // Handle both modern Promise syntax and legacy callback syntax
    if (typeof Notification.requestPermission === 'function') {
      const result = Notification.requestPermission();
      if (result && typeof result.then === 'function') {
        perm = await result;
      } else {
        perm = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }
    } else {
      perm = Notification.permission;
    }

    if (perm === 'granted') {
      localStorage.setItem('amu_push_notifications_enabled', 'true');
    } else if (perm === 'denied') {
      localStorage.setItem('amu_push_notifications_enabled', 'false');
    }

    return { permission: perm };
  } catch (err: any) {
    console.error('Error requesting notification permission:', err);
    const inIframe = isIframeEnvironment();
    return {
      permission: getNotificationPermission(),
      isIframe: inIframe,
      error: inIframe 
        ? 'Embedded preview blocks notifications. Open the standalone app link to enable push alerts.'
        : err?.message || 'Could not request notification permission.'
    };
  }
}

export function areNotificationsEnabled(): boolean {
  if (!isNotificationSupported()) return false;
  try {
    return Notification.permission === 'granted' && localStorage.getItem('amu_push_notifications_enabled') !== 'false';
  } catch (e) {
    return false;
  }
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
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    if (Notification.permission !== 'granted') {
      return false;
    }
  } catch (e) {
    return false;
  }

  // Check if disabled by user setting
  if (localStorage.getItem('amu_push_notifications_enabled') === 'false') {
    return false;
  }

  const iconUrl = options.icon || '/pwa-192x192.png';

  // 1. Try Service Worker showNotification (Mandatory on Android Chrome & iOS PWA; avoids Illegal constructor error)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1500))
      ]);

      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body: options.body,
          icon: iconUrl,
          badge: iconUrl,
          tag: options.tag || `amu-${Date.now()}`,
          data: {
            ...options.data,
            url: window.location.href,
          },
        } as any);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification fallback:', swErr);
    }
  }

  // 2. Try window Notification (Desktop Chrome, Firefox, Edge, Safari)
  try {
    if (typeof Notification === 'function') {
      const notif = new Notification(title, {
        body: options.body,
        icon: iconUrl,
        badge: iconUrl,
        tag: options.tag || `amu-${Date.now()}`,
      });

      if (options.onClick) {
        notif.onclick = () => {
          window.focus();
          options.onClick?.();
          notif.close();
        };
      }

      return true;
    }
  } catch (err) {
    console.warn('Direct Notification constructor unavailable or blocked on this device:', err);
  }

  return false;
}

