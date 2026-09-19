import React from 'react';
import { SNAPCHAT_LOGO_DATA, WHATSAPP_LOGO_DATA } from '../lib/logos';

interface PlatformIconProps {
  platform: 'snapchat' | 'whatsapp';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  badge?: boolean;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 'md',
  className = '',
  badge = false,
}) => {
  const isSnap = platform === 'snapchat';
  const logoSrc = isSnap ? SNAPCHAT_LOGO_DATA : WHATSAPP_LOGO_DATA;

  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-11 h-11',
    '2xl': 'w-16 h-16',
  };

  const containerSizeMap = {
    xs: 'w-6 h-6 rounded-lg p-1',
    sm: 'w-8 h-8 rounded-xl p-1.5',
    md: 'w-10 h-10 rounded-xl p-1.5',
    lg: 'w-13 h-13 rounded-2xl p-2',
    xl: 'w-16 h-16 rounded-2xl p-2.5',
    '2xl': 'w-20 h-20 rounded-3xl p-3',
  };

  if (!badge) {
    return (
      <img
        src={logoSrc}
        alt={isSnap ? 'Snapchat' : 'WhatsApp'}
        referrerPolicy="no-referrer"
        className={`${sizeMap[size]} object-contain flex-shrink-0 inline-block align-middle ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 shadow-2xs transition-transform ${
        isSnap
          ? 'bg-yellow-400 text-slate-950 border border-yellow-300 shadow-yellow-400/25'
          : 'bg-emerald-500 text-white border border-emerald-400 shadow-emerald-500/25'
      } ${containerSizeMap[size]} ${className}`}
    >
      <img
        src={logoSrc}
        alt={isSnap ? 'Snapchat' : 'WhatsApp'}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain filter drop-shadow-xs"
      />
    </div>
  );
};

