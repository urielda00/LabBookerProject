import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiMessageCircle, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import Picker from 'emoji-picker-react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../hooks/useChat';

// --- Utility Hooks ---
const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
};

export default function ChatBox({ user }) {
  const { t } = useTranslation();

  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs
  const boxRef = useRef(null);
  const emojiRef = useRef(null);
  const chatBoxRef = useRef(null);

  // Chat Logic Hook
  const {
    messages,
    channel,
    chatEnabled,
    hasMore,
    viewedChannels,
    unreadInAll,
    unreadInAdmin,
    setChannel,
    loadMoreMessages,
    sendMessage,
  } = useChat(user, isOpen);

  const currentMessages = messages[channel];
  const unreadInCurrent = channel === 'all' ? unreadInAll : unreadInAdmin;
  const canType = user.role === 'admin' || (chatEnabled && channel === 'all');

  // --- Effects ---

  // Close when clicking outside
  useOnClickOutside(chatBoxRef, () => setIsOpen(false));
  useOnClickOutside(emojiRef, () => setShowEmoji(false));

  // Auto-open on desktop, close on mobile resize
  useEffect(() => {
    const isMobile = () => window.innerWidth < 640;
    setIsOpen(!isMobile());

    const onResize = () => {
      if (isMobile()) setIsOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [currentMessages, isOpen]);

  // Scroll to first unread message
  useEffect(() => {
    const firstUnreadIdx = currentMessages.findIndex((m) => !m.readBy.includes(user._id));
    if (isOpen && firstUnreadIdx >= 0 && boxRef.current) {
      setTimeout(() => {
        const sep = boxRef.current.querySelector('.new-messages-separator');
        if (sep) {
          sep.scrollIntoView({ block: 'start' });
        } else {
          boxRef.current.scrollTop = boxRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [isOpen, channel, currentMessages, user._id]);

  // --- Handlers ---

  const handleSend = async () => {
    if (!newMsg.trim() || !canType) return;
    try {
      await sendMessage(newMsg);
      setNewMsg('');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message);
    }
  };

  const handleLoadMore = async () => {
    if (boxRef.current && boxRef.current.scrollTop === 0 && hasMore) {
      await loadMoreMessages();
      if (boxRef.current) {
        boxRef.current.scrollTop = 10;
      }
    }
  };

  const onEmojiClick = useCallback((data) => {
    setNewMsg((prev) => prev + data.emoji);
    setShowEmoji(false);
  }, []);

  if (chatEnabled === null) return null;

  return (
    <div className='fixed bottom-0 right-0 z-50' ref={chatBoxRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed right-4 bottom-4 h-12 w-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-xl transition-all ${
          isOpen ? 'invisible' : 'visible'
        }`}
        // ARIA: Indicates if the controlled element is expanded
        aria-expanded={isOpen}
        // ARIA: Connects this button to the chat window ID
        aria-controls='chat-window-container'
        aria-label={isOpen ? t('chat.close') : t('chat.open')}
      >
        <FiMessageCircle className='h-6 w-6' aria-hidden='true' />
        {!isOpen &&
          ['all', 'admin'].some(
            (ch) => messages[ch].some((m) => !m.readBy.includes(user._id)) && !viewedChannels[ch]
          ) && (
            <span className='absolute top-0 right-0 bg-red-500 rounded-full h-3 w-3 border-2 border-white dark:border-gray-800' />
          )}
      </button>

      {/* Chat Container */}
      <div
        id='chat-window-container'
        // ARIA: Defines this as a dialog window
        role='dialog'
        // ARIA: Points to the title element for the accessible name
        aria-labelledby='chat-heading'
        aria-modal='false'
        className={`bg-white dark:bg-gray-800 shadow-2xl rounded-t-xl flex flex-col border border-gray-200 dark:border-gray-700 transition-all ${
          isOpen
            ? 'translate-y-0 opacity-100 h-[75vh] max-h-[80vh]'
            : 'translate-y-full opacity-0 h-0'
        }`}
        style={{ width: 'calc(100vw - 2rem)', maxWidth: '28rem' }}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl'>
          <div className='flex items-center gap-3'>
            <h3 id='chat-heading' className='text-lg font-semibold'>
              {channel === 'admin' ? t('chat.adminChat') : t('chat.publicChat')}
            </h3>
            <div className='flex gap-2 bg-white/10 rounded-full p-1' role='tablist'>
              {['all', 'admin'].map((ch) => {
                const unreadHere = ch === 'all' ? unreadInAll : unreadInAdmin;
                const isActive = channel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    // ARIA: Indicates which tab is currently selected
                    role='tab'
                    aria-selected={isActive}
                    aria-controls={`panel-${ch}`}
                    className={`relative px-3 py-1 text-sm rounded-full transition-colors ${
                      isActive ? 'bg-white text-blue-600' : 'hover:bg-white/20'
                    }`}
                  >
                    {t(ch === 'all' ? 'chat.public' : 'chat.admin')}
                    {unreadHere > 0 && !viewedChannels[ch] && (
                      <span className='absolute -top-1 -right-1 bg-red-500 rounded-full h-2 w-2 border-2 border-white dark:border-gray-800' />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className='p-1 hover:bg-white/10 rounded-full transition-colors'
            aria-label={t('chat.close')}
          >
            <FiX className='h-5 w-5' aria-hidden='true' />
          </button>
        </div>

        {/* Messages List */}
        <div
          ref={boxRef}
          onScroll={handleLoadMore}
          // ARIA: 'log' role tells screen readers this is a dynamic feed (chat)
          role='log'
          // ARIA: 'polite' means announce new messages when user is idle, don't interrupt
          aria-live='polite'
          id={`panel-${channel}`}
          className='flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900'
        >
          {currentMessages.map((msg, i) => {
            const firstUnreadIdx = currentMessages.findIndex((m) => !m.readBy.includes(user._id));
            const isMe = msg.sender._id === user._id;

            return (
              <React.Fragment key={msg._id}>
                {/* Unread separator */}
                {i === firstUnreadIdx && unreadInCurrent > 0 && (
                  <div className='new-messages-separator bg-gray-50 dark:bg-gray-900 text-center py-1'>
                    <span className='px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 rounded-full shadow-sm'>
                      {t('chat.unreadMessages', { count: unreadInCurrent })}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <article className={`flex ${isMe ? 'justify-start' : 'justify-end'} items-start gap-3`}>
                  {/* Other User Avatar */}
                  {!isMe && (
                    <div className='flex-shrink-0'>
                      {msg.sender.profilePicture ? (
                        <img
                          src={msg.sender.profilePicture}
                          alt={msg.sender.username} // Keep alt for identification
                          className='w-9 h-9 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow'
                          onError={(e) => {
                            e.currentTarget.src = '/default-avatar.png';
                          }}
                        />
                      ) : (
                        <div 
                          className='w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white dark:border-gray-800 shadow'
                          aria-label={msg.sender.username}
                        >
                          {msg.sender.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`max-w-[85%] p-3 rounded-xl relative ${
                      isMe
                        ? 'bg-blue-500 text-white rounded-br-none dark:bg-blue-600'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                    } shadow-sm`}
                  >
                    <div className='flex items-center justify-between gap-2 mb-2'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-semibold dark:text-gray-100'>
                          {isMe ? t('chat.you') : msg.sender.username}
                        </span>
                        {msg.sender.role === 'admin' && (
                          <span className='text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-200 rounded-full'>
                            {t('chat.admin')}
                          </span>
                        )}
                      </div>
                      <time className='text-xs opacity-75 shrink-0 dark:text-gray-300'>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </time>
                    </div>
                    <p className='break-words text-sm dark:text-gray-100' dir='auto'>
                      {msg.content.split(/(@\w+)/g).map((part, idx) =>
                        part.startsWith('@') ? (
                          <span
                            key={idx}
                            className='font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 rounded'
                            style={{
                              direction: 'ltr',
                              unicodeBidi: 'isolate',
                              display: 'inline-block',
                            }}
                          >
                            {part}
                          </span>
                        ) : (
                          <React.Fragment key={idx}>{part}</React.Fragment>
                        )
                      )}
                    </p>
                  </div>

                  {/* User's Own Avatar */}
                  {isMe && (
                    <div className='flex-shrink-0'>
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={t('chat.you')}
                          className='w-9 h-9 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow'
                          onError={(e) => {
                            e.currentTarget.src = '/default-avatar.png';
                          }}
                        />
                      ) : (
                        <div className='w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white dark:border-gray-800 shadow'>
                          {user.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              </React.Fragment>
            );
          })}
        </div>

        {/* Input Area */}
        {(channel === 'all' || user.role === 'admin') && (
          <div className='p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'>
            <div className='relative flex items-center gap-2'>
              <div ref={emojiRef}>
                <button
                  onClick={() => setShowEmoji((v) => !v)}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300'
                  aria-label={t('chat.emojiPicker')}
                  // ARIA: Indicates this button opens a popup
                  aria-haspopup='true'
                  aria-expanded={showEmoji}
                >
                  <span role="img" aria-label="emoji">😊</span>
                </button>
                {showEmoji && (
                  <div className='absolute bottom-full right-0 mb-2 z-50'>
                    <Picker
                      onEmojiClick={onEmojiClick}
                      pickerStyle={{
                        width: '100%',
                        maxWidth: '320px',
                        boxShadow:
                          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#ffffff',
                        borderRadius: '0.75rem',
                      }}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    />
                  </div>
                )}
              </div>
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  channel === 'admin' ? t('chat.adminPlaceholder') : t('chat.publicPlaceholder')
                }
                // ARIA: Provides a label for screen readers since there is no visible <label>
                aria-label={t('chat.typeMessage', { defaultValue: 'Type a message' })}
                disabled={!canType}
                className='flex-1 rounded-full px-4 py-2.5 border dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 placeholder-gray-400 dark:placeholder-gray-500'
              />
              <button
                onClick={handleSend}
                disabled={!canType}
                aria-label={t('chat.send')}
                className='p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:opacity-50 transition-colors dark:bg-blue-600 dark:hover:bg-blue-700'
              >
                <FiMessageCircle className='h-5 w-5 rotate-45' aria-hidden='true' />
              </button>
            </div>
            {errorMsg && (
              <p role='alert' className='mt-2 text-center text-red-500 dark:text-red-400 text-xs'>
                {t(`chat.errors.${errorMsg}`, { defaultValue: errorMsg })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}