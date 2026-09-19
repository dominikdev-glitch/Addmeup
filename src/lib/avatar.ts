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
