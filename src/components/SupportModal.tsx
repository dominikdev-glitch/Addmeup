import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageCircle, 
  PhoneCall, 
  ShieldCheck, 
  Clock, 
  User, 
  Headphones, 
  Sparkles, 
  ExternalLink,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  doc,
  setDoc,
  query, 
  where, 
  onSnapshot, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfile } from '../types';
import { triggerHaptic } from '../lib/device';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string | null;
  profile: UserProfile | null;
  onToast: (msg: string) => void;
  defaultIssue?: string;
}

interface SupportMessage {
  id: string;
  userId: string;
  userName?: string;
  message: string;
  sender: 'user' | 'agent';
  createdAt: number;
}

// Verified Human Support Agent WhatsApp number
const SUPPORT_PHONE = '2349040464774';

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  userUid,
  profile,
  onToast,
  defaultIssue = '',
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'livechat'>('whatsapp');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputMessage, setInputMessage] = useState(defaultIssue);
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Persistent client ID so guest users and logged-in users both retain active chat history
  const [clientId] = useState<string>(() => {
    if (userUid) return userUid;
    try {
      const saved = localStorage.getItem('addmeup_support_client_id');
      if (saved) return saved;
      const created = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('addmeup_support_client_id', created);
      return created;
    } catch {
      return `guest_${Date.now()}`;
    }
  });

  const activeUserId = userUid || clientId;

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Subscribe to live in-app support messages for this user/client session
  useEffect(() => {
    if (!isOpen || !activeUserId) return;

    const messagesRef = collection(db, 'support_messages');
    const q = query(
      messagesRef,
      where('userId', '==', activeUserId),
      limit(60)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: SupportMessage[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          list.push({
            id: doc.id,
            userId: d.userId,
            userName: d.userName || 'User',
            message: d.message || '',
            sender: d.sender || 'user',
            createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : (d.createdAt || Date.now()),
          });
        });
        list.sort((a, b) => a.createdAt - b.createdAt);
        setMessages(list);
      },
      (err) => {
        console.warn('Support messages listen warning:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, activeUserId]);

  if (!isOpen) return null;

  const handleOpenWhatsApp = (customText?: string) => {
    triggerHaptic();
    const textToSend = customText || inputMessage.trim() || 'Hello AddMeUp Support, I need assistance with my account and deposit.';
    const userLabel = profile?.username ? `@${profile.username}` : (userUid ? `UID: ${userUid.slice(0, 8)}` : 'Visitor');
    const encoded = encodeURIComponent(
      `Hello AddMeUp Support,\n\nI need assistance:\n"${textToSend}"\n\nUser: ${userLabel}\nDate: ${new Date().toLocaleString('en-NG')}`
    );
    const waUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onToast('Connecting you with live human agent on WhatsApp...');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    try {
      setIsSending(true);
      triggerHaptic();

      const senderName = profile?.username || profile?.snapchatHandle || 'Visitor';
      const senderEmail = profile?.email || '';

      await addDoc(collection(db, 'support_messages'), {
        userId: activeUserId,
        userEmail: senderEmail,
        userName: senderName,
        message: text,
        sender: 'user',
        status: 'open',
        createdAt: serverTimestamp(),
      });

      setDoc(
        doc(db, 'support_chats', activeUserId),
        {
          userId: activeUserId,
          userName: senderName,
          userEmail: senderEmail,
          status: 'open',
          lastMessage: text,
          lastSender: 'user',
          unreadByAgent: true,
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch((chatErr) => console.warn('Support chat sync note:', chatErr));

      setInputMessage('');
      onToast('Message sent! You will see live replies from the agent right here.');
    } catch (err: any) {
      console.error('Failed to send support message:', err);
      onToast('Message delivery failed. You can connect via WhatsApp instantly.');
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    'My ₦ deposit did not reflect',
    'How do I earn points by adding friends?',
    'Need help with ad verification',
    'Boost my ad placement',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Live Support Desk</h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Real Agent Online
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">Direct Human Assistance</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4 pt-2.5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 pb-2.5 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'whatsapp'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>WhatsApp Agent (Instant)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('livechat')}
            className={`flex-1 pb-2.5 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'livechat'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Headphones className="w-4 h-4 text-orange-500" />
            <span>In-App Live Chat</span>
          </button>
        </div>

        {/* TAB 1: WHATSAPP DIRECT */}
        {activeTab === 'whatsapp' && (
          <div className="p-5 overflow-y-auto space-y-4">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  💬
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-950">Direct WhatsApp Human Desk</h3>
                  <p className="text-xs text-emerald-800/80 font-medium leading-relaxed">
                    Connect directly to our verified Nigerian support representative on WhatsApp for immediate resolution of deposits, claims, or account questions.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-emerald-900 font-semibold">
                <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
                  <Clock className="w-3 h-3 text-emerald-600" /> Replies under 5 mins
                </span>
                <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> +234 904 046 4774
                </span>
              </div>
            </div>

            {/* Quick Topic Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Choose an issue or type below:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInputMessage(q)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 text-slate-700 hover:text-orange-700 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Message input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Your message to agent:
              </label>
              <textarea
                rows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Describe what you need help with..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none font-medium"
              />
            </div>

            {/* Big Launch Button */}
            <button
              type="button"
              onClick={() => handleOpenWhatsApp()}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Open WhatsApp Chat with Real Agent</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
            </button>
          </div>
        )}

        {/* TAB 2: IN-APP LIVE CHAT */}
        {activeTab === 'livechat' && (
          <div className="flex-1 flex flex-col h-[400px]">
            {/* Messages Scroll Area */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {/* Welcome message */}
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  🎧
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900">AddMeUp Agent Desk</span>
                    <span className="text-[10px] text-slate-400 font-normal">Official</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    Hello! We are here to help. Type your message below and a real agent will reply right in this chat window.
                  </p>
                </div>
              </div>

              {/* Dynamic messages from Firestore */}
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        👨‍💼
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs space-y-1 shadow-2xs ${
                        isUser
                          ? 'bg-slate-900 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold ${isUser ? 'text-slate-300' : 'text-slate-500'}`}>
                          {isUser ? 'You' : 'Real Support Agent'}
                        </span>
                        <span className={`text-[9px] ${isUser ? 'text-slate-400' : 'text-slate-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-medium whitespace-pre-wrap leading-relaxed">{m.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Send Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message to agent..."
                disabled={isSending}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:bg-slate-300"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
