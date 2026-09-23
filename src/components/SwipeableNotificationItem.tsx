import React, { useState, useRef, useEffect } from 'react';
import { AppNotification } from '../types';
import { Trash2, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../lib/device';

interface SwipeableNotificationItemProps {
  item: AppNotification;
  onClick: () => void;
  onDelete: () => void;
  formatTimeAgo: (timestamp: number) => string;
  getIcon: (type: string) => React.ReactNode;
}

export const SwipeableNotificationItem: React.FC<SwipeableNotificationItemProps> = ({
  item,
  onClick,
  onDelete,
  formatTimeAgo,
  getIcon,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isVerticalScrollRef = useRef<boolean | null>(null);
  const hasTriggeredThresholdHapticRef = useRef(false);

  const THRESHOLD = 85; // px to trigger delete

  // Touch handlers (Mobile & PWA)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    currentXRef.current = 0;
    isVerticalScrollRef.current = null;
    hasTriggeredThresholdHapticRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isDeleting) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Detect if user is scrolling vertically
    if (isVerticalScrollRef.current === null) {
      if (Math.abs(diffY) > 8 && Math.abs(diffY) > Math.abs(diffX)) {
        isVerticalScrollRef.current = true;
        setIsDragging(false);
        setOffsetX(0);
        return;
      } else if (Math.abs(diffX) > 8) {
        isVerticalScrollRef.current = false;
      }
    }

    if (isVerticalScrollRef.current) return;

    // Only allow swiping left (negative diffX), limit max swipe
    if (diffX < 0) {
      const resistedOffset = Math.max(diffX, -160);
      setOffsetX(resistedOffset);
      currentXRef.current = resistedOffset;

      if (Math.abs(resistedOffset) >= THRESHOLD && !hasTriggeredThresholdHapticRef.current) {
        triggerHaptic('medium');
        hasTriggeredThresholdHapticRef.current = true;
      } else if (Math.abs(resistedOffset) < THRESHOLD) {
        hasTriggeredThresholdHapticRef.current = false;
      }
    } else {
      // Slight resistance right
      setOffsetX(Math.min(diffX * 0.15, 20));
      currentXRef.current = 0;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isDeleting) return;
    setIsDragging(false);

    if (Math.abs(currentXRef.current) >= THRESHOLD) {
      executeDelete();
    } else {
      // Spring back
      setOffsetX(0);
      currentXRef.current = 0;
    }
  };

  // Mouse drag handlers (Desktop Web)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDeleting) return;
    // Only left click
    if (e.button !== 0) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = 0;
    hasTriggeredThresholdHapticRef.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isDeleting) return;
    const diffX = e.clientX - startXRef.current;

    if (diffX < 0) {
      const resistedOffset = Math.max(diffX, -160);
      setOffsetX(resistedOffset);
      currentXRef.current = resistedOffset;

      if (Math.abs(resistedOffset) >= THRESHOLD && !hasTriggeredThresholdHapticRef.current) {
        hasTriggeredThresholdHapticRef.current = true;
      }
    } else {
      setOffsetX(Math.min(diffX * 0.15, 20));
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || isDeleting) return;
    setIsDragging(false);

    if (Math.abs(currentXRef.current) >= THRESHOLD) {
      executeDelete();
    } else {
      setOffsetX(0);
      currentXRef.current = 0;
    }
  };

  const executeDelete = () => {
    setIsDeleting(true);
    triggerHaptic('warning');
    setOffsetX(-350);
    setTimeout(() => {
      onDelete();
    }, 250);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If user dragged more than 10px, do not trigger item click
    if (Math.abs(currentXRef.current) > 10) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const isPastThreshold = Math.abs(offsetX) >= THRESHOLD;

  return (
    <div
      className={`relative overflow-hidden rounded-xl select-none transition-all duration-300 ${
        isDeleting ? 'max-h-0 opacity-0 mb-0 py-0 scale-95' : 'max-h-36 mb-2'
      }`}
    >
      {/* Background Action: Red Delete Reveal */}
      <div 
        className={`absolute inset-0 flex items-center justify-end px-5 rounded-xl transition-colors duration-200 ${
          isPastThreshold ? 'bg-rose-600 text-white' : 'bg-rose-500/80 text-white/90'
        }`}
      >
        <div 
          className="flex items-center gap-1.5 transition-transform duration-150 font-black text-xs uppercase tracking-wider"
          style={{
            transform: `scale(${isPastThreshold ? 1.1 : 0.95})`,
          }}
        >
          <Trash2 className="w-4 h-4 animate-pulse" />
          <span>{isPastThreshold ? 'Release to Delete' : 'Delete'}</span>
        </div>
      </div>

      {/* Foreground Draggable Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
        className={`relative z-10 flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer touch-pan-y ${
          item.read
            ? 'bg-white hover:bg-slate-50 border border-slate-200/70 shadow-2xs opacity-85'
            : 'bg-orange-50/70 hover:bg-orange-50 border border-orange-200/80 shadow-xs'
        }`}
      >
        {/* Type Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(item.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4
              className={`text-xs leading-tight line-clamp-1 ${
                item.read ? 'text-slate-800 font-bold' : 'text-slate-900 font-black'
              }`}
            >
              {item.title}
            </h4>
            <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium ml-1">
              {formatTimeAgo(item.createdAt)}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">
            {item.message}
          </p>

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
            {item.linkTab ? (
              <span className="text-[10px] font-black text-orange-600 flex items-center gap-1 hover:underline">
                <span className="capitalize">View in {item.linkTab}</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Swipe left to remove</span>
            )}

            {/* Direct delete button for accessibility and quick deletion */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                executeDelete();
              }}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors ml-auto active:scale-95"
              title="Delete notification"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
