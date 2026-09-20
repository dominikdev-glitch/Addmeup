/**
 * AddMeUp Hybrid Avatar & Free In-Browser Image Compressor
 * - Compresses mobile & desktop photos to ultra-compact WebP/JPEG Base64 (~8-12 KB)
 *   saving directly inside Firestore documents for $0.00 (NO Cloud Storage or Blaze upgrade required).
 * - Curated 1-tap 3D memojis/avatars for privacy & high style.
 * - Dynamic fallback avatar generator seeded with user handle/name.
 */

export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
  category: '3d-memoji' | 'streetwear' | 'anime' | 'emoji';
}

export const PRESET_3D_AVATARS: PresetAvatar[] = [
  {
    id: 'cool-felix',
    name: 'Streetwear Felix',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&backgroundColor=ffd5dc&radius=50',
    category: 'streetwear',
  },
  {
    id: 'chic-aneka',
    name: 'Chic Aneka',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka&backgroundColor=b6e3f4&radius=50',
    category: 'streetwear',
  },
  {
    id: 'chill-leo',
    name: 'Chill Leo',
    url: 'https://api.dicebear.com/9.x/micah/svg?seed=Leo&backgroundColor=ffdfbf&radius=50',
    category: '3d-memoji',
  },
  {
    id: 'stylish-amara',
    name: 'Model Amara',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Amara&backgroundColor=d1d4f9&radius=50',
    category: '3d-memoji',
  },
  {
    id: 'gamer-zack',
    name: 'Pro Gamer',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Zack&backgroundColor=c0aede&radius=50',
    category: 'streetwear',
  },
  {
    id: 'boss-sasha',
    name: 'Boss Sasha',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Sasha&backgroundColor=ffd5dc&radius=50',
    category: '3d-memoji',
  },
  {
    id: 'creator-kofi',
    name: 'Creator Kofi',
    url: 'https://api.dicebear.com/9.x/personas/svg?seed=Kofi&backgroundColor=b6e3f4&radius=50',
    category: '3d-memoji',
  },
  {
    id: 'neon-milo',
    name: 'Neon Milo',
    url: 'https://api.dicebear.com/9.x/micah/svg?seed=Milo&backgroundColor=ffdfbf&radius=50',
    category: 'streetwear',
  },
  {
    id: 'cyber-bot',
    name: 'Cyber Bot',
    url: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Shadow&backgroundColor=d1d4f9&radius=50',
    category: 'anime',
  },
  {
    id: 'matrix-glitch',
    name: 'Matrix Bot',
    url: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Matrix&backgroundColor=b6e3f4&radius=50',
    category: 'anime',
  },
  {
    id: 'star-eyes',
    name: 'Star Eyes',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=StarEyes&backgroundColor=ffdfbf&radius=50',
    category: 'emoji',
  },
  {
    id: 'cool-glasses',
    name: 'Cool Shades',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=CoolShades&backgroundColor=ffd5dc&radius=50',
    category: 'emoji',
  },
  {
    id: 'hype-dylan',
    name: 'Hype Dylan',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Dylan&backgroundColor=ffdfbf&radius=50',
    category: 'streetwear',
  },
  {
    id: 'anime-mai',
    name: 'Anime Mai',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Mai&backgroundColor=b6e3f4&radius=50',
    category: 'anime',
  },
  {
    id: 'vibe-jordan',
    name: 'Golden Jordan',
    url: 'https://api.dicebear.com/9.x/personas/svg?seed=Jordan&backgroundColor=ffd5dc&radius=50',
    category: '3d-memoji',
  },
  {
    id: 'super-fire',
    name: 'Fire Vibe',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=FireVibe&backgroundColor=ffdfbf&radius=50',
    category: 'emoji',
  },
];

/**
 * Generates an instant high-quality fallback avatar based on handle or name seed.
 */
export function getFallbackAvatar(seed: string): string {
  const cleanSeed = (seed || 'social').trim().replace(/[@+]/g, '');
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(cleanSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
}

/**
 * Returns user-specified avatar or automatic seeded fallback.
 */
export function getEffectiveAvatar(avatarUrl?: string | null, seed?: string): string {
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return avatarUrl.trim();
  }
  return getFallbackAvatar(seed || 'user');
}

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Crops to center square and resizes to 120x120px WebP/JPEG.
 * Resulting string is ~8-12 KB, which stores easily inside Firestore for free.
 */
export async function compressImageFile(
  file: File,
  targetSize = 120,
  quality = 0.78
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (JPG, PNG, WebP).'));
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Failed to initialize canvas context.'));
          }

          // Center crop calculation (square)
          const srcW = img.naturalWidth || img.width;
          const srcH = img.naturalHeight || img.height;
          const minDim = Math.min(srcW, srcH);
          const startX = (srcW - minDim) / 2;
          const startY = (srcH - minDim) / 2;

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw cropped & resized square
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Attempt modern WebP compression first
          let dataUrl = canvas.toDataURL('image/webp', quality);
          // If browser does not support WebP encoding (e.g. older Safari), fallback to JPEG
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Calculate approximate payload size in KB
          const approxBytes = Math.round((dataUrl.length * 3) / 4);
          const sizeKb = Math.round((approxBytes / 1024) * 10) / 10;

          // If still over 25 KB, run a secondary pass with targetSize=96 and lower quality
          if (sizeKb > 25) {
            const smallerCanvas = document.createElement('canvas');
            smallerCanvas.width = 96;
            smallerCanvas.height = 96;
            const smallCtx = smallerCanvas.getContext('2d');
            if (smallCtx) {
              smallCtx.drawImage(canvas, 0, 0, 96, 96);
              dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.65);
            }
          }

          const finalBytes = Math.round((dataUrl.length * 3) / 4);
          const finalKb = Math.round((finalBytes / 1024) * 10) / 10;

          resolve({
            dataUrl,
            sizeKb: finalKb,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Curated high-aesthetic cover banners for social ads.
 */
export interface PresetCoverBanner {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const PRESET_COVER_BANNERS: PresetCoverBanner[] = [
  {
    id: 'friends-vibes',
    name: 'Social & Friends',
    category: 'Friends',
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'snap-streaks',
    name: 'Snap Streaks Flame',
    category: 'Friends',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'streetwear-fashion',
    name: 'Fashion & Style',
    category: 'Fashion',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'tech-developer',
    name: 'Tech & Gaming',
    category: 'Tech',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'modern-business',
    name: 'Store & Commerce',
    category: 'Business',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pro-services',
    name: 'Professional Services',
    category: 'Services',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
  },
];

/**
 * Returns the effective cover photo/banner for an ad.
 * Supports custom uploaded images or falls back to category-tuned banners.
 */
export function getEffectiveAdCover(ad: {
  imageUrl?: string | null;
  category?: string;
  platform?: string;
  adId?: string;
}): string {
  if (ad.imageUrl && ad.imageUrl.trim().length > 0) {
    return ad.imageUrl.trim();
  }

  const covers: Record<string, string> = {
    'Friends': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
    'Business': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
    'Tech': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
    'Fashion': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    'Services': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
  };

  return covers[ad.category || 'Friends'] || covers['Friends'];
}

/**
 * Generates an appealing description if older ads did not have one saved.
 */
export function getEffectiveAdDescription(ad: {
  description?: string | null;
  category?: string;
  platform?: string;
}): string {
  if (ad.description && ad.description.trim().length > 0) {
    return ad.description.trim();
  }

  const isSnap = ad.platform === 'snapchat';
  switch (ad.category) {
    case 'Business':
      return isSnap
        ? 'Browse our latest arrivals, exclusive snap deals, and place orders directly. Tap to add and view our daily story catalog!'
        : 'Chat directly on WhatsApp for customer orders, instant quotes, price inquiries, and fast support.';
    case 'Tech':
      return isSnap
        ? 'Sharing daily tech hacks, coding snippets, and gadget setups on Snapchat stories. Add me to connect!'
        : 'Connect on WhatsApp for tech consultations, developer networking, and project inquiries.';
    case 'Fashion':
      return isSnap
        ? 'Daily outfit drops, styling inspo, and thrift deals on my Snap story. Let’s connect and trade fits!'
        : 'Message on WhatsApp to browse our latest fashion collection, verify sizes, and place fast delivery orders.';
    case 'Services':
      return isSnap
        ? 'Follow my service journey, portfolio highlights, and behind-the-scenes on Snapchat stories.'
        : 'Book appointments, request quotes, and chat directly with our professional team on WhatsApp.';
    case 'Friends':
    default:
      return isSnap
        ? 'Looking for active daily streaks, fun snap exchanges, and friendly vibes! Send a snap to get started 🔥'
        : 'Connecting with new friends and active groups on WhatsApp. Say hello and let’s chat!';
  }
}

/**
 * Compresses an uploaded cover banner image to 600x340px (16:9 ratio).
 * Keeps file size ultra-compact (~20-25 KB) so it stores inside Firestore for free.
 */
export async function compressCoverImageFile(
  file: File,
  targetWidth = 640,
  targetHeight = 360,
  quality = 0.75
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (JPG, PNG, WebP).'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Failed to initialize canvas context.'));
          }

          // Center crop to 16:9 ratio
          const srcW = img.naturalWidth || img.width;
          const srcH = img.naturalHeight || img.height;
          const targetAspect = targetWidth / targetHeight;
          const srcAspect = srcW / srcH;

          let cropW = srcW;
          let cropH = srcH;
          let cropX = 0;
          let cropY = 0;

          if (srcAspect > targetAspect) {
            // Source is wider than target
            cropW = srcH * targetAspect;
            cropX = (srcW - cropW) / 2;
          } else {
            // Source is taller than target
            cropH = srcW / targetAspect;
            cropY = (srcH - cropH) / 2;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropW,
            cropH,
            0,
            0,
            targetWidth,
            targetHeight
          );

          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          const approxBytes = Math.round((dataUrl.length * 3) / 4);
          const sizeKb = Math.round((approxBytes / 1024) * 10) / 10;

          resolve({
            dataUrl,
            sizeKb,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
