import React, { useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../lib/notifications';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Coins, 
  Gift, 
  ArrowRight, 
  Trash2, 
  CheckCheck,
  BellRing,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  triggerSystemNotification,
  isIOS,
  isPWAStandalone,
  isIframeEnvironment
} from '../lib/pushNotifications';
import { triggerHaptic } from '../lib/device';
import { SwipeableNotificationItem } from './SwipeableNotificationItem';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string | null;
  onNavigateTab: (tab: 'feed' | 'post' | 'verifications' | 'wallet') => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  userUid,
  onNavigateTab,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<string>('checking');
  const [pushFeedback, setPushFeedback] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);
  const [requestingPush, setRequestingPush] = useState(false);

  useEffect(() => {
    if (!isOpen || !userUid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userUid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: AppNotification[] = [];
        snapshot.forEach((doc) => {
          notifs.push(doc.data() as AppNotification);
        });
        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe to notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, userUid]);

  useEffect(() => {
    if (isOpen) {
      const perm = getNotificationPermission();
      setPushStatus(perm);
      setPushFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (item: AppNotification) => {
    if (!item.read) {
      await markNotificationAsRead(item.notificationId);
    }
    if (item.linkTab) {
      onNavigateTab(item.linkTab);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    triggerHaptic('light');
    await markAllNotificationsAsRead(notifications);
  };

  const handleDeleteItem = async (notificationId: string) => {
    // Optimistic UI update
    setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
    try {
      await deleteNotification(notificationId);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleEnablePush = async () => {
    setRequestingPush(true);
    triggerHaptic('medium');
    setPushFeedback(null);

    try {
      const result = await requestNotificationPermission();
      setPushStatus(result.permission);

      if (result.permission === 'granted') {
        triggerHaptic('success');
        setPushFeedback({
          type: 'success',
          text: 'Push notifications activated! You will receive instant alerts for claims and rewards.',
        });
        await triggerSystemNotification('Notifications Activated 🔔', {
          body: 'You will receive instant alerts for new claims, approvals, and daily rewards!',
        });
      } else if (result.permission === 'denied') {
        triggerHaptic('warning');
        setPushFeedback({
          type: 'warning',
          text: 'Notifications are blocked in your browser settings. Tap the lock/tune icon near your browser address bar to allow.',
        });
      } else if (result.needsIOSPwa) {
        setPushFeedback({
          type: 'info',
          text: 'On iOS, push alerts require AddMeUp installed to Home Screen (Tap Share ⎋ -> Add to Home Screen).',
        });
      } else if (result.isIframe) {
        setPushFeedback({
          type: 'info',
          text: 'Notifications are restricted inside the embedded preview. Please open the standalone app URL.',
        });
      } else if (result.error) {
        setPushFeedback({
          type: 'warning',
          text: result.error,
        });
      }
    } catch (e: any) {
      setPushFeedback({
        type: 'warning',
        text: e?.message || 'Could not enable notifications.',
      });
    } finally {
      setRequestingPush(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'claim_verified':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'claim_rejected':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case 'deposit_success':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Coins className="w-4 h-4" />
          </div>
        );
      case 'referral_bonus':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Gift className="w-4 h-4" />
          </div>
        );
      case 'claim_received':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in modal-safe-overlay">
      <div className="glass-card border border-white/80 rounded-2xl p-4 sm:p-5 max-w-sm sm:max-w-md w-full text-slate-800 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-2xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Notifications</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="text-[11px] text-orange-600 hover:text-orange-700 font-bold px-2 py-1 rounded-lg hover:bg-orange-50 transition-all flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Push Notification Action / Banner */}
        {pushStatus !== 'granted' && (
          <div className="my-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-orange-600 flex-shrink-0 animate-bounce" />
              <div>
                <div className="text-[11px] font-black text-slate-900 leading-tight">
                  Enable Push Notifications
                </div>
                <div className="text-[9px] text-slate-500 leading-snug">
                  Get instant lockscreen alerts for claim verifications and rewards
                </div>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={requestingPush}
              className="py-1 px-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex-shrink-0 cursor-pointer"
            >
              {requestingPush ? 'Allowing...' : 'Allow'}
            </button>
          </div>
        )}

        {/* Feedback Alert if push permission was clicked */}
        {pushFeedback && (
          <div
            className={`my-1.5 p-2 rounded-xl text-xs flex items-start gap-2 ${
              pushFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : pushFeedback.type === 'warning'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {pushFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : pushFeedback.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-[11px] font-semibold leading-snug flex-1">{pushFeedback.text}</span>
            <button
              onClick={() => setPushFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* List Header Hint */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 py-1 px-1 font-semibold border-b border-slate-100">
            <span>👈 Swipe left on any card to delete</span>
            <span>{notifications.length} update{notifications.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400">
              Loading updates...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-700">No Notifications Yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                When you earn points, receive verification requests, or get approvals, they'll appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <SwipeableNotificationItem
                key={item.notificationId}
                item={item}
                onClick={() => handleNotificationClick(item)}
                onDelete={() => handleDeleteItem(item.notificationId)}
                formatTimeAgo={formatTimeAgo}
                getIcon={getIcon}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

