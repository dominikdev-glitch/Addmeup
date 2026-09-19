import React from 'react';
import appLogoImg from '../assets/images/app_logo_1786806009048.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = false,
  subtitle,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl',
    lg: 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl',
    xl: 'w-14 h-14 rounded-2xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Real Image Logo Badge */}
      <div
        className={`relative ${sizeClasses[size]} overflow-hidden shadow-xs shadow-orange-500/20 flex-shrink-0 transition-transform active:scale-95 border border-orange-200/50 bg-orange-500`}
      >
        <img
          src={appLogoImg}
          alt="AddMeUp Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="text-left">
          <div className="flex items-center gap-1 leading-none">
            <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">
              AddMeUp
            </span>
          </div>
          {subtitle && (
            <p className="text-[9px] text-slate-500 font-bold tracking-tight mt-0.5 leading-none uppercase">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
