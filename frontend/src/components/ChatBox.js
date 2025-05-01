import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiChevronDown } from 'react-icons/fi';
import { io } from 'socket.io-client';
import api from '../utils/axiosConfig';
import { format } from 'date-fns';

const socket = io('http://localhost:5000', {
  path: '/ws',
  transports: ['websocket', 'polling']
});

export default function ChatBox({ user }) {
  const [messages, setMessages] = useState({ all: [], admin: [] });
  const [channel, setChannel] = useState('all');
  const [newMsg, setNewMsg] = useState('');
  const [chatEnabled, setChatEnabled] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({ all: 0, admin: 0 });
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const boxRef = useRef(null);
  const LIMIT = 50;

  // Initialize chat open state based on screen size
  useEffect(() => {
    const checkIsMobile = () => window.innerWidth < 640;
    setIsOpen(!checkIsMobile());
    
    const handleResize = () => {
      if (checkIsMobile()) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load chat on/off flag
  useEffect(() => {
    api.get('/message/settings')
      .then(res => setChatEnabled(res.data.enabled))
      .catch(() => setChatEnabled(false));
  }, []);

  // Fetch latest 50 messages on channel switch
  useEffect(() => {
    api.get('/message', { params: { channel, limit: LIMIT } })
      .then(res => {
        setMessages(prev => ({
          ...prev,
          [channel]: res.data.messages
        }));
        setHasMore(res.data.messages.length === LIMIT);
      })
      .catch(err => console.error('Failed to load messages', err));
  }, [channel]);

  // Stable reference to current channel's messages
  const currentMessages = messages[channel];

  // Scroll to bottom when currentMessages change
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [currentMessages]);

  // Detect scroll to top for load more
  const handleScroll = () => {
    if (!boxRef.current) return;
    setShowLoadMore(boxRef.current.scrollTop === 0 && hasMore);
  };

  // Real-time incoming messages
  useEffect(() => {
    const handler = msg => {
      setMessages(prev => ({
        ...prev,
        [msg.channel]: [...prev[msg.channel], msg]
      }));
      if (msg.channel !== channel) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.channel]: prev[msg.channel] + 1
        }));
      }
    };
    socket.on('chatMessage', handler);
    return () => socket.off('chatMessage', handler);
  }, [channel]);

  // Load more older messages
  const loadMore = async () => {
    if (!hasMore) return;
    const list = messages[channel];
    if (!list.length) return;
    const before = list[0].createdAt;
    try {
      const res = await api.get('/message', { params: { channel, limit: LIMIT, before } });
      const older = res.data.messages;
      setMessages(prev => ({
        ...prev,
        [channel]: [...older, ...prev[channel]]
      }));
      setHasMore(older.length === LIMIT);
      // after prepending, scroll to bottom
      if (boxRef.current) {
        boxRef.current.scrollTop = boxRef.current.scrollHeight;
      }
      setShowLoadMore(false);
    } catch (e) {
      console.error('Failed to load more messages', e);
    }
  };

  // Toggle drawer and reset unread count
  const toggleDrawer = () => {
    setIsOpen(prev => {
      if (!prev) setUnreadCounts({ all: 0, admin: 0 });
      return !prev;
    });
  };

  // Send a new message
  const send = async () => {
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
  };

  if (chatEnabled === null) return null;

  const isAdminChannel = channel === 'admin';
  const canType = user.role === 'admin' || (chatEnabled && channel === 'all');

  return (
    <div className="fixed bottom-0 right-0 z-50">
      {/* Toggle Handle */}
<button
  onClick={toggleDrawer}
  className={`fixed right-4 bottom-4 z-50 h-12 w-12 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 ${
    isOpen ? 'invisible' : 'visible'
  }`}
  aria-label={isOpen ? "Close chat" : "Open chat"}
>
  <div className="relative">
    <FiMessageCircle className="h-6 w-6" />
    {/* Red dot indicator */}
    {Object.values(unreadCounts).some(count => count > 0) && (
      <span className="absolute top-0 right-0 bg-red-500 rounded-full h-3 w-3 border-2 border-white dark:border-gray-800" />
    )}
  </div>
</button>

      {/* Chat Container */}
      <div
        className={`bg-white dark:bg-gray-800 shadow-xl rounded-t-lg flex flex-col border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out transform ${
          isOpen
            ? 'translate-y-0 opacity-100 h-[75vh] max-h-[80vh]'
            : 'translate-y-full opacity-0 h-0'
        }`}
        style={{
          width: 'calc(100vw - 2rem)',
          maxWidth: '28rem',
          position: 'fixed',
          right: '0.5rem',
          bottom: '0',
        }}
      >
        {/* Toggle Arrow with Circle Background */}
        <button
          onClick={toggleDrawer}
          className="absolute -top-10 right-2 z-50 h-10 w-10 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-colors"
          aria-label="Close chat"
        >
          <FiChevronDown className="h-6 w-6 drop-shadow-lg transform transition-transform" />
        </button>
  
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-blue-500 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-full">
              <FiMessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{isAdminChannel ? 'Admin Chat' : 'Public Chat'}</h3>
              <p className="text-sm opacity-90">
                {unreadCounts[channel] > 0 && `${unreadCounts[channel]} new messages`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-1 bg-white/10 rounded-full p-1">
            {['all', 'admin'].map(ch => (
              <button
                key={ch}
                onClick={() => { setChannel(ch); setUnreadCounts(prev => ({ ...prev, [ch]: 0 })); }}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  channel === ch ? 'bg-white text-blue-600' : 'bg-transparent hover:bg-white/20'
                }`}
              >
                {ch === 'all' ? 'Public' : 'Admin'}
              </button>
            ))}
          </div>
        </div>
  
          {/* Messages Container */}
          <div 
          ref={boxRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
        >
            {showLoadMore && hasMore && (
              <div className="text-center mb-2 sm:mb-4">
                <button 
                  onClick={loadMore}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1 sm:py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm"
                >
                  Load older
                </button>
              </div>
            )}
  
            {currentMessages.map(msg => {
              const isCurrentUser = msg.sender._id === user._id;
              const isAdmin = msg.sender.role === 'admin';
              
              return (
                <div 
                  key={msg._id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-start gap-2 sm:gap-3`}
                >
                  {/* Other User's Avatar */}
                  {!isCurrentUser && (
                    <div className="flex-shrink-0">
                      {msg.sender.profilePicture ? (
                        <img 
                          src={msg.sender.profilePicture} 
                          alt={msg.sender.username}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white dark:border-gray-900 shadow-sm"
                          onError={e => {
                            e.target.onerror = null;
                            e.target.src = '/default-avatar.png';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm sm:text-base font-medium shadow-sm">
                          {msg.sender.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
  
                  {/* Message Bubble */}
                  <div className={`max-w-[75%] rounded-xl sm:rounded-2xl p-2 sm:p-3 ${
                    isCurrentUser 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-bl-none'
                  }`}>
                    <div className="flex items-center gap-1 sm:gap-2 mb-1">
                      <span className={`text-xs sm:text-sm font-semibold ${isCurrentUser ? 'text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {isCurrentUser ? 'You' : msg.sender.username}
                      </span>
                      {isAdmin && (
                        <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-full">
                          Admin
                        </span>
                      )}
                      <span className={`text-[10px] sm:text-xs ${isCurrentUser ? 'text-blue-100/80' : 'text-gray-500 dark:text-gray-400'}`}>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm ${isCurrentUser ? 'text-white' : 'text-gray-800 dark:text-gray-100'} break-words`}>
                      {msg.content}
                    </p>
                  </div>
  
                  {/* Current User's Avatar */}
                  {isCurrentUser && (
                    <div className="flex-shrink-0">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.username}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white dark:border-gray-900 shadow-sm"
                          onError={e => {
                            e.target.onerror = null;
                            e.target.src = '/default-avatar.png';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm sm:text-base font-medium shadow-sm">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            )}
          </div>
  
          {/* Input Area */}
          {isOpen && (channel === 'all' || user.role === 'admin') && (
          <div className="p-2 sm:p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
            <div className="flex gap-2">
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={isAdminChannel ? 'Admin message...' : 'Type message...'}
                disabled={!canType}
                className="flex-1 rounded-full px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm dark:text-white border dark:border-gray-600 dark:bg-gray-900 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
                <button 
                  onClick={send} 
                  disabled={!canType}
                  className="p-1 sm:p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              {errorMsg && <p className="text-red-500 dark:text-red-400 text-[10px] sm:text-xs mt-1 text-center">{errorMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}