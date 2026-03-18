import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomDetailsModal from './modals/RoomDetailsModal';
import RoomCard from './roomCard';
import { BookOpen } from 'lucide-react';
import api from '../utils/axiosConfig';

const RoomsSection = ({ userInfo }) => {
	const [rooms, setRooms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Modal State
	const [popupRoomDetails, setPopupRoomDetails] = useState(null);
	const [showPopup, setShowPopup] = useState(false);

	// Booking State
	const [activeRoom, setActiveRoom] = useState(null);

	const navigate = useNavigate();

	useEffect(() => {
		const fetchRooms = async () => {
			try {
				const response = await api.get('/room/rooms');
				setRooms(response.data);
			} catch (err) {
				setError('Failed to load rooms. Please try again later.');
			} finally {
				setLoading(false);
			}
		};

		fetchRooms();
	}, []);

	const handleOpenDetails = (room) => {
		setPopupRoomDetails(room);
		setShowPopup(true);
	};

	const handleRulesNavigation = () => {
		navigate('/roomguidelines');
	};

	if (loading) {
		return (
			<div className='flex-grow flex justify-center items-center text-center text-lg text-gray-700 py-10'>
				<BookOpen className='mr-2 animate-pulse' /> Loading rooms...
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex-grow flex justify-center items-center text-center text-lg text-red-500 py-10'>
				{error}
			</div>
		);
	}

	return (
		<div className='w-full flex flex-col px-4 sm:px-6 md:px-10 py-6'>
			<div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 w-full max-w-screen-xl mx-auto'>
				{rooms.length > 0 ? (
					rooms.map((room) => (
						<RoomCard
							key={room._id}
							room={room}
							userInfo={userInfo}
							activeRoom={activeRoom}
							setActiveRoom={setActiveRoom}
							toggleDescription={() => handleOpenDetails(room)}
						/>
					))
				) : (
					<div className='text-center text-lg text-gray-700 col-span-full flex justify-center items-center'>
						<BookOpen className='mr-2' /> No rooms available.
					</div>
				)}
			</div>

			<RoomDetailsModal
				isOpen={showPopup}
				onClose={() => setShowPopup(false)}
				room={popupRoomDetails}
				onRulesClick={handleRulesNavigation}
			/>
		</div>
	);
};

export default RoomsSection;
