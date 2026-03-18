import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/axiosConfig';

// Determine Socket URL based on environment
const SOCKET_URL = process.env.REACT_APP_API_BASE_URL
	? process.env.REACT_APP_API_BASE_URL.replace(/\/api\/?$/, '')
	: '';

// Initialize socket instance (Singleton pattern)
const socket = io(SOCKET_URL, {
	path: '/ws',
	transports: ['websocket', 'polling'],
});

export const useChat = (user, isOpen) => {
	const [messages, setMessages] = useState({ all: [], admin: [] });
	const [channel, setChannel] = useState('all');
	const [chatEnabled, setChatEnabled] = useState(null);
	const [hasMore, setHasMore] = useState(true);
	const [viewedChannels, setViewedChannels] = useState({
		all: false,
		admin: false,
	});

	const hasMounted = useRef(false);
	const LIMIT = 50;

	// 1. Fetch Chat Settings on mount
	useEffect(() => {
		api
			.get('/message/settings')
			.then((res) => setChatEnabled(res.data.enabled))
			.catch(() => setChatEnabled(false));
	}, []);

	// 2. Fetch messages when channel changes
	useEffect(() => {
		api
			.get('/message', { params: { channel, limit: LIMIT } })
			.then((res) => {
				setMessages((prev) => ({ ...prev, [channel]: res.data.messages }));
				setHasMore(res.data.messages.length === LIMIT);
			})
			.catch(console.error);
	}, [channel]);

	// 3. Mark messages as read
	const markRead = useCallback(
		(ch = channel) => {
			if (!user?._id) return;

			api.post('/message/mark-read', { channel: ch }).catch(console.error);

			setMessages((prev) => ({
				...prev,
				[ch]: prev[ch].map((m) => ({
					...m,
					readBy: m.readBy.includes(user._id) ? m.readBy : [...m.readBy, user._id],
				})),
			}));
		},
		[channel, user?._id]
	);

	// 4. Socket Event Listeners
	useEffect(() => {
		const handler = (msg) => {
			setMessages((prev) => ({
				...prev,
				[msg.channel]: [...prev[msg.channel], msg],
			}));

			// Mark read immediately if chat is open on that channel
			if (isOpen && msg.channel === channel) {
				markRead(channel);
			} else {
				// Otherwise indicate unviewed activity
				setViewedChannels((prev) => ({ ...prev, [msg.channel]: false }));
			}
		};

		socket.on('chatMessage', handler);
		return () => socket.off('chatMessage', handler);
	}, [isOpen, channel, markRead]);

	// 5. Handle channel viewed state
	useEffect(() => {
		if (isOpen) {
			setViewedChannels((prev) => ({ ...prev, [channel]: true }));
		}
	}, [isOpen, channel]);

	// Handle marking read when closing chat
	useEffect(() => {
		if (!hasMounted.current) {
			hasMounted.current = true;
			return;
		}
		if (!isOpen) {
			Object.entries(viewedChannels).forEach(([ch, seen]) => {
				if (seen) markRead(ch);
			});
			if (viewedChannels.all || viewedChannels.admin) {
				setViewedChannels({ all: false, admin: false });
			}
		}
	}, [isOpen, viewedChannels, markRead]);

	// 6. Load older messages
	const loadMoreMessages = useCallback(async () => {
		if (!hasMore) return;
		const list = messages[channel];
		if (!list.length) return;

		try {
			const res = await api.get('/message', {
				params: { channel, limit: LIMIT, before: list[0].createdAt },
			});

			setMessages((prev) => ({
				...prev,
				[channel]: [...res.data.messages, ...prev[channel]],
			}));
			setHasMore(res.data.messages.length === LIMIT);

			return true;
		} catch (e) {
			console.error(e);
			return false;
		}
	}, [channel, hasMore, messages]);

	// 7. Send message action
	const sendMessage = useCallback(
		async (content) => {
			if (!content.trim()) return;
			await api.post('/message/send', { content, channel });
		},
		[channel]
	);

	// 8. Derived Data
	const unreadInAll = messages.all.filter((m) => !m.readBy.includes(user?._id)).length;
	const unreadInAdmin = messages.admin.filter((m) => !m.readBy.includes(user?._id)).length;

	return {
		messages,
		channel,
		chatEnabled,
		hasMore,
		viewedChannels,
		unreadInAll,
		unreadInAdmin,
		setChannel,
		markRead,
		loadMoreMessages,
		sendMessage,
	};
};
