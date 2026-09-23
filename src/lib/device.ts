// Native mobile device helpers (Deep linking, haptic feedback, Web Share, Clipboard, Network status, PWA install prompt)

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'heavy':
          navigator.vibrate(45);
          break;
        case 'success':
          navigator.vibrate([15, 30, 20]);
          break;
        case 'warning':
          navigator.vibrate([30, 40, 30]);
          break;
      }
    } catch {
      // Vibration not permitted or supported in this context
    }
  }
}

export interface NativeSharePayload {
  title: string;
  text: string;
  url?: string;
}

export async function triggerNativeShare(payload: NativeSharePayload): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(payload);
      triggerHaptic('success');
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
      return false;
    }
  }
  return false;
}

import { normalizeWhatsAppNumber } from './phone';

export interface DeepLinkResult {
  fallbackUrl: string;
  nativeSchemeUrl?: string;
}

/**
 * Returns both deep-link scheme (e.g. snapchat:// or whatsapp://)
 * and universal fallback web URLs for native mobile app handover.
 */
export function getNativeAppLinks(platform: 'snapchat' | 'whatsapp', targetHandleOrNumber: string, messageText?: string): DeepLinkResult {
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  const cleanTarget = targetHandleOrNumber.replace('@', '').trim();
  const cleanPhone = normalizeWhatsAppNumber(targetHandleOrNumber);

  if (platform === 'snapchat') {
    return {
      nativeSchemeUrl: `snapchat://add/${cleanTarget}`,
      fallbackUrl: `https://snapchat.com/add/${cleanTarget}`,
    };
  } else {
    // WhatsApp - cleanPhone is normalized with proper country code (e.g. 2348108237903)
    const encoded = messageText ? encodeURIComponent(messageText) : '';
    return {
      nativeSchemeUrl: cleanPhone ? `whatsapp://send?phone=${cleanPhone}${encoded ? `&text=${encoded}` : ''}` : undefined,
      fallbackUrl: cleanPhone 
        ? `https://wa.me/${cleanPhone}${encoded ? `?text=${encoded}` : ''}`
        : 'https://wa.me',
    };
  }
}

/**
 * Seamlessly launches the native app on mobile devices using native URI scheme,
 * falling back to web URL if the app isn't installed.
 */
export function openNativeAppOrWeb(platform: 'snapchat' | 'whatsapp', targetHandleOrNumber: string, messageText?: string) {
  triggerHaptic('medium');
  const links = getNativeAppLinks(platform, targetHandleOrNumber, messageText);
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isMobile && links.nativeSchemeUrl) {
    // Attempt native app protocol via invisible iframe / location
    const start = Date.now();
    window.location.href = links.nativeSchemeUrl;

    // If still in the same tab after 800ms, open universal web fallback
    setTimeout(() => {
      if (Date.now() - start < 1200) {
        window.open(links.fallbackUrl, '_blank');
      }
    }, 800);
  } else {
    window.open(links.fallbackUrl, '_blank');
  }
}
