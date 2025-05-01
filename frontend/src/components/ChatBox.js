import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiMessageCircle, FiX } from 'react-icons/fi';
import { io } from 'socket.io-client';
import api from '../utils/axiosConfig';
import { format } from 'date-fns';
import Picker from 'emoji-picker-react';
import { useTranslation } from 'react-i18next';

const socket = io('http://localhost:5000', {
  path: '/ws',
  transports: ['websocket', 'polling'],
});

export default function ChatBox({ user }) {
  const { t } = useTranslation();

  // State
  const [messages, setMessages] = useState({ all: [], admin: [] });
  const [channel, setChannel] = useState('all');
  const [newMsg, setNewMsg] = useState('');
  const [chatEnabled, setChatEnabled] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);

  // Refs
  const boxRef = useRef(null);
  const emojiRef = useRef(null);
  const chatBoxRef = useRef(null);
  const hasMounted = useRef(false);
  const prevIsOpen = useRef(isOpen);

  const LIMIT = 50;

  // click-outside helper
  const useOnClickOutside = (ref, handler) => {
    useEffect(() => {
      const listener = e => {
        if (!ref.current || ref.current.contains(e.target)) return;
        handler();
      };
      document.addEventListener('mousedown', listener);
      return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
  };
  useOnClickOutside(chatBoxRef, () => setIsOpen(false));
  useOnClickOutside(emojiRef, () => setShowEmoji(false));

  // Auto-open on desktop
  useEffect(() => {
    const mobile = () => window.innerWidth < 640;
    setIsOpen(!mobile());
    const onResize = () => mobile() && setIsOpen(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load chatEnabled
  useEffect(() => {
    api.get('/message/settings')
      .then(res => setChatEnabled(res.data.enabled))
      .catch(() => setChatEnabled(false));
  }, []);

  // Fetch messages
  useEffect(() => {
    api.get('/message', { params: { channel, limit: LIMIT } })
      .then(res => {
        setMessages(prev => ({ ...prev, [channel]: res.data.messages }));
        setHasMore(res.data.messages.length === LIMIT);
      })
      .catch(console.error);
  }, [channel]);

  // Mark read helper
  const markRead = useCallback(() => {
    api.post('/message/mark-read', { channel }).catch(console.error);
    setMessages(prev => ({
      ...prev,
      [channel]: prev[channel].map(m => ({
        ...m,
        readBy: m.readBy.includes(user._id)
          ? m.readBy
          : [...m.readBy, user._id],
      })),
    }));
  }, [channel, user._id]);

  // Mark read on open/close
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (isOpen) markRead();
    } else if (prevIsOpen.current && !isOpen) {
      markRead();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, channel, markRead]);

  // Auto-scroll new messages if open
  useEffect(() => {
    if (isOpen && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages[channel], isOpen]);

  // Real-time incoming
  useEffect(() => {
    const handler = msg => {
      setMessages(prev => ({
        ...prev,
        [msg.channel]: [...prev[msg.channel], msg],
      }));
      if (isOpen && msg.channel === channel) markRead();
    };
    socket.on('chatMessage', handler);
    return () => socket.off('chatMessage', handler);
  }, [isOpen, channel, markRead]);

  // Load more on scroll-top
  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    const list = messages[channel];
    if (!list.length) return;
    try {
      const res = await api.get('/message', {
        params: { channel, limit: LIMIT, before: list[0].createdAt },
      });
      setMessages(prev => ({
        ...prev,
        [channel]: [...res.data.messages, ...prev[channel]],
      }));
      setHasMore(res.data.messages.length === LIMIT);
      if (boxRef.current) {
        boxRef.current.scrollTop = boxRef.current.scrollHeight;
      }
    } catch (e) {
      console.error(e);
    }
  }, [channel, hasMore, messages]);

  // Send message
  const send = useCallback(async () => {
    if (!newMsg.trim()) return;
    const canType = user.role === 'admin' || (chatEnabled && channel === 'all');
    if (!canType) return;
    try {
      await api.post('/message/send', { content: newMsg, channel });
      setNewMsg('');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message);
    }
  }, [newMsg, user.role, chatEnabled, channel]);

  // Emoji handler
  const onEmojiClick = useCallback(data => {
    setNewMsg(t => t + data.emoji);
    setShowEmoji(false);
  }, []);

  // Derived counts
  const unreadInAll   = messages.all.filter(m => !m.readBy.includes(user._id)).length;
  const unreadInAdmin = messages.admin.filter(m => !m.readBy.includes(user._id)).length;
  const totalUnread   = unreadInAll + unreadInAdmin;

  const currentMessages   = messages[channel];
  const unreadInCurrent   = channel === 'all' ? unreadInAll : unreadInAdmin;
  const firstUnreadIdx    = currentMessages.findIndex(m => !m.readBy.includes(user._id));
  const canType           = user.role === 'admin' || (chatEnabled && channel === 'all');

  // Scroll to separator on open
  useEffect(() => {
    if (isOpen && firstUnreadIdx >= 0 && boxRef.current) {
      setTimeout(() => {
        const sep = boxRef.current.querySelector('.new-messages-separator');
        if (sep) sep.scrollIntoView({ block: 'start' });
        else boxRef.current.scrollTop = boxRef.current.scrollHeight;
      }, 0);
    }
  }, [isOpen, channel, firstUnreadIdx]);

  if (chatEnabled === null) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50" ref={chatBoxRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`fixed right-4 bottom-4 h-12 w-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-xl transition-all ${isOpen ? 'invisible' : 'visible'}`}
        aria-label={isOpen ? t('chat.close') : t('chat.open')}
      >
        <FiMessageCircle className="h-6 w-6" />
        {!isOpen && totalUnread > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 rounded-full h-3 w-3 border-2 border-white" />
        )}
      </button>

      {/* Chat Container */}
      <div
        className={`bg-white dark:bg-gray-800 shadow-2xl rounded-t-xl flex flex-col border border-gray-200 dark:border-gray-700 transition-all ${
          isOpen ? 'translate-y-0 opacity-100 h-[75vh] max-h-[80vh]' : 'translate-y-full opacity-0 h-0'
        }`}
        style={{ width: 'calc(100vw - 2rem)', maxWidth: '28rem' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">
              {channel === 'admin' ? t('chat.adminChat') : t('chat.publicChat')}
            </h3>
            <div className="flex gap-2 bg-white/10 rounded-full p-1">
              {['all','admin'].map(ch => {
                const unreadHere = ch === 'all' ? unreadInAll : unreadInAdmin;
                const isActive    = channel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`relative px-3 py-1 text-sm rounded-full transition-colors ${
                      isActive ? 'bg-white text-blue-600' : 'hover:bg-white/20'
                    }`}
                  >
                    {t(ch === 'all' ? 'chat.public' : 'chat.admin')}
                    {unreadHere > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 rounded-full h-2 w-2 border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label={t('chat.close')}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={boxRef}
          onScroll={() => boxRef.current && boxRef.current.scrollTop === 0 && hasMore && loadMore()}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
        >
          {currentMessages.map((msg, i) => (
            <React.Fragment key={msg._id}>
              {/* Separator */}
              {i === firstUnreadIdx && unreadInCurrent > 0 && (
                <div className="new-messages-separator bg-gray-50 dark:bg-gray-900 text-center py-1">
                  <span className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 rounded-full shadow-sm">
                    {t('chat.unreadMessages', { count: unreadInCurrent })}
                  </span>
                </div>
              )}

              {/* Single message */}
              <div
                className={`flex ${
                  msg.sender._id === user._id ? 'justify-end' : 'justify-start'
                } items-start gap-3`}
              >
                {/* Avatar */}
                {msg.sender._id !== user._id && (
                  <div className="flex-shrink-0">
                    {msg.sender.profilePicture ? (
                      <img
                        src={msg.sender.profilePicture}
                        alt={msg.sender.username}
                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow"
                        onError={e => { e.currentTarget.src = '/default-avatar.png'; }}
                      />
                    ) : ( 
                      <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white shadow">
                        {msg.sender.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                {/* Bubble */}
                <div
                  className={`max-w-[85%] p-3 rounded-xl relative ${
                    msg.sender._id === user._id
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                  } shadow-sm`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {msg.sender._id === user._id ? t('chat.you') : msg.sender.username}
                      </span>
                      {msg.sender.role === 'admin' && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded-full">
                          {t('chat.admin')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs opacity-75 shrink-0">
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </span>
                  </div>
                  <p className="break-words text-sm" dir="auto">
                    {msg.content.split(/(@[\\w\\d_]+)/g).map((part, idx) =>
                      part.startsWith('@') ? (
                        <span
                          key={idx}
                          className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded"
                          style={{ direction: 'ltr', unicodeBidi: 'isolate', display: 'inline-block' }}
                        >
                          {part}
                        </span>
                      ) : (
                        <React.Fragment key={idx}>{part}</React.Fragment>
                      )
                    )}
                  </p>
                </div>
                {/* Own avatar */}
                {msg.sender._id === user._id && (
                  <div className="flex-shrink-0">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow"
                        onError={e => { e.currentTarget.src = '/default-avatar.png'; }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white shadow">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Input */}
        {(channel === 'all' || user.role === 'admin') && (
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="relative flex items-center gap-2">
              <div ref={emojiRef}>
                <button
                  onClick={() => setShowEmoji(v => !v)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  aria-label={t('chat.emojiPicker')}
                >
                  😊
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <Picker
                      onEmojiClick={onEmojiClick}
                      pickerStyle={{
                        width: '100%',
                        maxWidth: '320px',
                        boxShadow: 'none',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  </div>
                )}
              </div>
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={channel === 'admin' ? t('chat.adminPlaceholder') : t('chat.publicPlaceholder')}
                disabled={!canType}
                className="flex-1 rounded-full px-4 py-2.5 border dark:border-gray-600 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={!canType}
                className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:opacity-50 transition-colors"
              >
                <FiMessageCircle className="h-5 w-5 rotate-45" />
              </button>
            </div>
            {errorMsg && (
              <p className="mt-2 text-center text-red-500 text-xs">
                {t(`chat.errors.${errorMsg}`, { defaultValue: errorMsg })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
