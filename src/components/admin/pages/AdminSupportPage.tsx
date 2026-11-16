import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  query,
  onSnapshot,
  limit,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { UserProfile, Transaction } from '../../../types';
import { normalizeWhatsAppNumber, formatWhatsAppDisplay } from '../../../lib/phone';
import {
  Headphones,
  MessageSquare,
  Send,
  CheckCircle2,
  RotateCcw,
  Search,
  RefreshCw,
  Wallet,
  Coins,
  Trash2,
  ExternalLink,
  UserCheck,
  User as UserIcon,
} from 'lucide-react';
import { triggerHaptic } from '../../../lib/device';

interface SupportTicketMessage {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  message: string;
  sender: 'user' | 'agent';
  status?: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
}

interface SupportChatDoc {
  userId: string;
  userName?: string;
  userEmail?: string;
  status: 'open' | 'in_progress' | 'resolved';
  lastMessage?: string;
  lastSender?: 'user' | 'agent';
  unreadByAgent?: boolean;
  updatedAt?: number;
}

interface SupportThread {
  userId: string;
  userEmail: string;
  userName: string;
  latestMessage: SupportTicketMessage;
  messages: SupportTicketMessage[];
  status: 'open' | 'in_progress' | 'resolved';
  needsReply: boolean;
}

interface AdminSupportPageProps {
  onToast: (msg: string) => void;
  users?: UserProfile[];
  transactions?: Transaction[];
  onAdjustCredits?: (targetUser: UserProfile, amount: number, reason: string) => Promise<void>;
  actionInProgress?: string | null;
}

const CANNED_REPLIES = [
  {
    label: 'Request Paystack Ref',
    text: 'Hello! Please share your Paystack payment reference or screenshot so we can verify your deposit and credit your wallet right away.',
  },
  {
    label: 'Deposit Credited',
    text: 'We have verified your deposit and credited your AddMeUp points wallet. Please refresh your Wallet tab to confirm your updated balance.',
  },
  {
    label: 'Claim Approved',
    text: 'Your add verification claim has been reviewed and approved. The points have been added to your balance!',
  },
  {
    label: 'WhatsApp Hotline',
    text: 'For urgent deposit or account follow-ups, you can also reach our official agent desk directly on WhatsApp at +234 904 046 4774.',
  },
];

export const AdminSupportPage: React.FC<AdminSupportPageProps> = ({
  onToast,
  users = [],
  transactions = [],
  onAdjustCredits,
  actionInProgress = null,
}) => {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [chatDocs, setChatDocs] = useState<Map<string, SupportChatDoc>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'needs_reply' | 'all' | 'resolved'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Quick wallet credit drawer state
  const [showCreditAdjuster, setShowCreditAdjuster] = useState(false);
  const [customPoints, setCustomPoints] = useState('50');
  const [creditReason, setCreditReason] = useState('Support deposit verification adjustment');

  // Inline confirmation for clearing a conversation (no window.confirm in iframe)
  const [confirmClearUid, setConfirmClearUid] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Real-time subscription to support_messages
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'support_messages'), limit(300));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: SupportTicketMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d?.userId) return;
          list.push({
            id: docSnap.id,
            userId: d.userId,
            userEmail: d.userEmail || '',
            userName: d.userName || 'Visitor',
            message: d.message || '',
            sender: d.sender || 'user',
            status: d.status || 'open',
            createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : (Number(d.createdAt) || Date.now()),
          });
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to support messages:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Real-time subscription to support_chats (ticket status: open | in_progress | resolved)
  useEffect(() => {
    const q = query(collection(db, 'support_chats'), limit(250));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextMap = new Map<string, SupportChatDoc>();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          nextMap.set(docSnap.id, {
            userId: d.userId || docSnap.id,
            userName: d.userName,
            userEmail: d.userEmail,
            status: d.status || 'open',
            lastMessage: d.lastMessage,
            lastSender: d.lastSender,
            unreadByAgent: d.unreadByAgent,
            updatedAt: Number(d.updatedAt || 0),
          });
        });
        setChatDocs(nextMap);
      },
      (err) => {
        console.warn('Support chats metadata listener note:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Build grouped threads with resolution & reply-needed state
  const threads: SupportThread[] = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userEmail: string;
      userName: string;
      latestMessage: SupportTicketMessage;
      messages: SupportTicketMessage[];
    }>();

    messages.forEach((msg) => {
      const existing = map.get(msg.userId);
      if (!existing) {
        map.set(msg.userId, {
          userId: msg.userId,
          userEmail: msg.userEmail,
          userName: msg.userName && msg.userName !== 'AddMeUp Support' ? msg.userName : 'User',
          latestMessage: msg,
          messages: [msg],
        });
      } else {
        existing.messages.push(msg);
        if (msg.createdAt > existing.latestMessage.createdAt) {
          existing.latestMessage = msg;
        }
        if (msg.userEmail && !existing.userEmail) {
          existing.userEmail = msg.userEmail;
        }
        if (msg.sender === 'user' && msg.userName && msg.userName !== 'AddMeUp Support') {
          existing.userName = msg.userName;
        }
      }
    });

    const result: SupportThread[] = Array.from(map.values()).map((entry) => {
      const meta = chatDocs.get(entry.userId);
      const isResolved = meta?.status === 'resolved';
      const needsReply = !isResolved && entry.latestMessage.sender === 'user';
      const derivedStatus: 'open' | 'in_progress' | 'resolved' = isResolved
        ? 'resolved'
        : entry.latestMessage.sender === 'agent'
        ? 'in_progress'
        : 'open';

      return {
        ...entry,
        userName: entry.userName || meta?.userName || 'Visitor',
        userEmail: entry.userEmail || meta?.userEmail || '',
        status: derivedStatus,
        needsReply,
      };
    });

    // Prioritize awaiting replies by newest activity
    result.sort((a, b) => {
      if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1;
      return b.latestMessage.createdAt - a.latestMessage.createdAt;
    });

    return result;
  }, [messages, chatDocs]);

  const kpis = useMemo(() => {
    const total = threads.length;
    const needsReply = threads.filter((t) => t.needsReply).length;
    const inProgress = threads.filter((t) => t.status === 'in_progress').length;
    const resolved = threads.filter((t) => t.status === 'resolved').length;
    return { total, needsReply, inProgress, resolved };
  }, [threads]);

  // Filtered threads
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (statusFilter === 'needs_reply' && !t.needsReply) return false;
      if (statusFilter === 'resolved' && t.status !== 'resolved') return false;

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchEmail = (t.userEmail || '').toLowerCase().includes(q);
        const matchName = t.userName.toLowerCase().includes(q);
        const matchUid = t.userId.toLowerCase().includes(q);
        const matchMsg = t.messages.some((m) => m.message.toLowerCase().includes(q));
        if (!matchEmail && !matchName && !matchUid && !matchMsg) return false;
      }
      return true;
    });
  }, [threads, statusFilter, searchFilter]);

  // Active thread
  const activeThread = useMemo(() => {
    if (selectedUserId) {
      const exact = threads.find((t) => t.userId === selectedUserId);
      if (exact) return exact;
    }
    return filteredThreads[0] || threads[0] || null;
  }, [threads, filteredThreads, selectedUserId]);

  const activeMessages = useMemo(() => {
    if (!activeThread) return [];
    const copy = [...activeThread.messages];
    copy.sort((a, b) => a.createdAt - b.createdAt);
    return copy;
  }, [activeThread]);

  // Auto-scroll chat history on selection or new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeThread?.userId, activeMessages.length]);

  // Reset inline states when switching threads
  useEffect(() => {
    setShowCreditAdjuster(false);
    setConfirmClearUid(null);
  }, [activeThread?.userId]);

  // Match active thread to full UserProfile & deposit history
  const matchedUser: UserProfile | null = useMemo(() => {
    if (!activeThread || users.length === 0) return null;
    const tid = activeThread.userId;
    const temail = (activeThread.userEmail || '').trim().toLowerCase();

    return (
      users.find(
        (u) =>
          u.uid === tid ||
          u.canonicalUid === tid ||
          u.linkedOriginalUid === tid ||
          (temail && (u.email || '').trim().toLowerCase() === temail)
      ) || null
    );
  }, [activeThread, users]);

  const matchedUserDeposits = useMemo(() => {
    if (!matchedUser || transactions.length === 0) {
      return { count: 0, totalNgn: 0, latestRef: '' };
    }
    const candidateIds = new Set(
      [matchedUser.uid, matchedUser.canonicalUid, matchedUser.linkedOriginalUid].filter(Boolean)
    );
    const deps = transactions.filter(
      (tx) => candidateIds.has(tx.userId) && tx.type === 'deposit' && Number(tx.amountNgn || 0) > 0
    );
    const totalNgn = deps.reduce((sum, tx) => sum + Number(tx.amountNgn || 0), 0);
    return {
      count: deps.length,
      totalNgn,
      latestRef: deps[0]?.referenceId || '',
    };
  }, [matchedUser, transactions]);

  const handleSendAgentReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || !activeThread) return;

    try {
      setIsSendingReply(true);
      triggerHaptic('light');

      await addDoc(collection(db, 'support_messages'), {
        userId: activeThread.userId,
        userEmail: activeThread.userEmail || matchedUser?.email || '',
        userName: 'AddMeUp Support',
        message: text,
        sender: 'agent',
        status: 'in_progress',
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, 'support_chats', activeThread.userId),
        {
          userId: activeThread.userId,
          userName: matchedUser?.username || activeThread.userName,
          userEmail: activeThread.userEmail || matchedUser?.email || '',
          status: 'in_progress',
          lastMessage: text,
          lastSender: 'agent',
          unreadByAgent: false,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      setReplyText('');
      onToast(`Reply sent to ${matchedUser?.username || activeThread.userName}`);
    } catch (err: any) {
      console.error('Error sending agent reply:', err);
      onToast('Failed to send reply: ' + (err.message || 'unknown error'));
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSetTicketStatus = async (thread: SupportThread, nextStatus: 'resolved' | 'open') => {
    try {
      triggerHaptic('medium');
      await setDoc(
        doc(db, 'support_chats', thread.userId),
        {
          userId: thread.userId,
          userName: thread.userName,
          userEmail: thread.userEmail,
          status: nextStatus,
          unreadByAgent: nextStatus === 'open',
          updatedAt: Date.now(),
          ...(nextStatus === 'resolved' ? { resolvedAt: Date.now() } : {}),
        },
        { merge: true }
      );
      onToast(
        nextStatus === 'resolved'
          ? `Ticket for ${thread.userName} marked resolved`
          : `Ticket for ${thread.userName} reopened`
      );
    } catch (err: any) {
      onToast(`Could not update ticket status: ${err.message}`);
    }
  };

  const handleClearThread = async (thread: SupportThread) => {
    try {
      setIsClearing(true);
      triggerHaptic('warning');
      await Promise.all(
        thread.messages.map((m) => deleteDoc(doc(db, 'support_messages', m.id)))
      );
      await deleteDoc(doc(db, 'support_chats', thread.userId)).catch(() => {});
      setConfirmClearUid(null);
      setSelectedUserId(null);
      onToast(`Cleared conversation history for ${thread.userName}`);
    } catch (err: any) {
      onToast(`Failed to clear conversation: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleQuickAdjust = async (amount: number) => {
    if (!matchedUser || !onAdjustCredits || Number.isNaN(amount) || amount === 0) return;
    await onAdjustCredits(
      matchedUser,
      amount,
      creditReason.trim() || 'Support desk wallet adjustment'
    );
    setShowCreditAdjuster(false);
  };

  const handleOpenCustomerWhatsApp = () => {
    if (!activeThread) return;
    const customerName = matchedUser?.username || activeThread.userName || 'Friend';
    const text = encodeURIComponent(
      `Hello ${customerName}, this is AddMeUp Customer Support following up on your live inquiry.`
    );
    const phone = matchedUser?.whatsappNumber
      ? normalizeWhatsAppNumber(matchedUser.whatsappNumber)
      : '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatMsgTime = (ts: number) => {
    const d = new Date(ts);
    const isToday = d.toDateString() === new Date().toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Total Conversations</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1.5 tabular-nums font-mono">
            {kpis.total}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Needs Reply</p>
          <p
            className={`text-2xl sm:text-3xl font-black mt-1.5 tabular-nums font-mono ${
              kpis.needsReply > 0 ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            {kpis.needsReply}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Agent Replied</p>
          <p className="text-2xl sm:text-3xl font-black text-sky-400 mt-1.5 tabular-nums font-mono">
            {kpis.inProgress}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Resolved Tickets</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1.5 tabular-nums font-mono">
            {kpis.resolved}
          </p>
        </div>
      </div>

      {/* Main Inbox + Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px]">
        {/* Left: Inbox Queue */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col">
          {/* Segmented Filter Controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setStatusFilter('needs_reply')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                statusFilter === 'needs_reply'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Waiting ({kpis.needsReply})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({kpis.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resolved')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resolved ({kpis.resolved})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search name, email, UID, message..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Thread Rows */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[540px]">
            {loading ? (
              <div className="space-y-2.5 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 animate-pulse space-y-2"
                  >
                    <div className="h-3.5 w-1/2 bg-slate-800 rounded" />
                    <div className="h-2.5 w-3/4 bg-slate-800/60 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <Headphones className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">No tickets in this view</p>
                <p className="text-[11px] text-slate-500">
                  {statusFilter === 'needs_reply'
                    ? 'All active inquiries have been answered.'
                    : 'Incoming customer live chats will appear here automatically.'}
                </p>
                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
                  >
                    View All Tickets
                  </button>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = activeThread?.userId === thread.userId;
                const matchedProfile = users.find(
                  (u) =>
                    u.uid === thread.userId ||
                    u.canonicalUid === thread.userId ||
                    (thread.userEmail &&
                      (u.email || '').toLowerCase() === thread.userEmail.toLowerCase())
                );
                const displayName = matchedProfile?.username || thread.userName;

                return (
                  <button
                    key={thread.userId}
                    type="button"
                    onClick={() => setSelectedUserId(thread.userId)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-colors ${
                      isSelected
                        ? 'bg-slate-800/90 border-orange-500/60 text-white'
                        : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/90 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs text-white truncate">
                        {displayName}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums font-mono shrink-0">
                        {formatMsgTime(thread.latestMessage.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5 truncate">
                      <span
                        className={`font-semibold ${
                          thread.status === 'resolved'
                            ? 'text-emerald-400'
                            : thread.needsReply
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {thread.status === 'resolved'
                          ? 'Resolved'
                          : thread.needsReply
                          ? 'Needs Reply'
                          : 'Replied'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{thread.messages.length} msgs</span>
                      {matchedProfile && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums font-mono text-slate-300">
                            {matchedProfile.creditBalance} Pts
                          </span>
                        </>
                      )}
                    </div>

                    <p
                      className={`text-xs truncate ${
                        isSelected ? 'text-slate-100 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {thread.latestMessage.sender === 'agent' ? 'Agent: ' : ''}
                      {thread.latestMessage.message}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Conversation & Customer Context */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden">
          {activeThread ? (
            <>
              {/* Customer Context Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm sm:text-base text-white truncate">
                        {matchedUser?.username || activeThread.userName}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {matchedUser ? 'Verified Member' : 'Guest Session'} · {activeThread.userId.slice(0, 12)}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                      <span>{activeThread.userEmail || matchedUser?.email || 'No email on session'}</span>
                      {matchedUser?.snapchatHandle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-semibold">
                            Snap: @{matchedUser.snapchatHandle.replace(/^@/, '')}
                          </span>
                        </>
                      )}
                      {matchedUser?.whatsappNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-300 font-mono">
                            {formatWhatsAppDisplay(matchedUser.whatsappNumber)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenCustomerWhatsApp}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </button>

                    {matchedUser && onAdjustCredits && (
                      <button
                        type="button"
                        onClick={() => setShowCreditAdjuster((v) => !v)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                          showCreditAdjuster
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Adjust Points</span>
                      </button>
                    )}

                    {activeThread.status === 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => handleSetTicketStatus(activeThread, 'open')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetTicketStatus(activeThread, 'resolved')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 border border-slate-700 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {confirmClearUid === activeThread.userId ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isClearing}
                          onClick={() => handleClearThread(activeThread)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                        >
                          {isClearing ? 'Clearing...' : 'Confirm Clear'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearUid(null)}
                          className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold whitespace-nowrap shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClearUid(activeThread.userId)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Clear conversation messages"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Wallet & Deposit Summary Strip */}
                {matchedUser ? (
                  <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 pt-2.5 border-t border-slate-800/80 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-slate-400">Wallet Balance:</span>
                      <span className="font-bold text-white tabular-nums font-mono">
                        {matchedUser.creditBalance} Pts
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-400">Verified Deposits:</span>
                      <span className="font-bold text-emerald-300 tabular-nums font-mono">
                        {matchedUserDeposits.count} (₦{matchedUserDeposits.totalNgn.toLocaleString('en-NG')})
                      </span>
                    </div>

                    {matchedUserDeposits.latestRef && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Latest Ref:</span>
                        <span className="font-mono text-slate-200">{matchedUserDeposits.latestRef}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400">
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Guest browser session — ask user for their registered email if checking a deposit.</span>
                  </div>
                )}

                {/* Inline Credit Adjustment Tool */}
                {showCreditAdjuster && matchedUser && onAdjustCredits && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        Adjust Points for {matchedUser.username}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[10, 25, 50, 100].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            disabled={actionInProgress === matchedUser.uid}
                            onClick={() => handleQuickAdjust(amt)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold tabular-nums font-mono transition-colors disabled:opacity-50"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="number"
                        value={customPoints}
                        onChange={(e) => setCustomPoints(e.target.value)}
                        placeholder="Points (+ or -)"
                        className="w-full sm:w-32 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        placeholder="Audit reason (e.g. Paystack Ref verified)"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        disabled={actionInProgress === matchedUser.uid}
                        onClick={() => handleQuickAdjust(Number(customPoints))}
                        className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                      >
                        Apply Custom
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Transcript */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-950/60 min-h-[340px] max-h-[440px]">
                {activeMessages.map((m) => {
                  const isAgent = m.sender === 'agent';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                        <span className="font-bold text-slate-300">
                          {isAgent
                            ? 'Support Agent'
                            : matchedUser?.username || m.userName || 'Customer'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums font-mono">{formatMsgTime(m.createdAt)}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          isAgent
                            ? 'bg-orange-600 text-white rounded-tr-xs font-medium'
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Canned Replies + Composer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
                    Quick replies:
                  </span>
                  {CANNED_REPLIES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setReplyText(preset.text)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white whitespace-nowrap shrink-0 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendAgentReply} className="flex items-end gap-2.5">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAgentReply();
                      }
                    }}
                    placeholder={`Reply to ${matchedUser?.username || activeThread.userName}... (Enter to send, Shift+Enter for new line)`}
                    disabled={isSendingReply}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-800 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none font-medium"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {isSendingReply ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send Reply</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-2">
              <Headphones className="w-11 h-11 text-slate-700" />
              <p className="text-sm font-bold text-slate-300">No support ticket selected</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a conversation from the inbox on the left to inspect wallet history and reply in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
