// RoomsSection.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MoreAboutRoomPopup from "./amenitiesPopup";
import RoomCard from "./roomCard";
import { BookOpen } from "lucide-react";
import api from "../utils/axiosConfig"; // Import the centralized Axios instance

const RoomsSection = ({ userInfo }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [popupRoomDetails, setPopupRoomDetails] = useState(null);
  const [popupAmenities, setPopupAmenities] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const navigate = useNavigate();

  const handleRulesNavigation = () => {
    navigate("/roomguidelines");
  };

  const containerRef = useRef(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get(
          "/room/rooms",
        );
        setRooms(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load rooms. Please try again later.");
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const [visibleIconsCount, setVisibleIconsCount] = useState(0);

  const toggleDescription = (room) => {
    setPopupRoomDetails(room);
    setPopupAmenities(room.amenities);
    setShowPopup(true);
  };

  return (
    <div
      className="
      w-full 
      flex flex-col 
      px-4 sm:px-6 md:px-10 
      py-6
    "
    >
      {/* Loading and Error States */}
      {loading && (
        <div
          className="
          flex-grow 
          flex justify-center items-center 
          text-center text-lg text-gray-700
        "
        >
          <BookOpen className="mr-2 animate-pulse" />
          Loading rooms...
        </div>
      )}

      {error && (
        <div
          className="
          flex-grow 
          flex justify-center items-center 
          text-center text-lg text-red-500
        "
        >
          {error}
        </div>
      )}

      {/* Rooms Grid */}
      <div
        className="
        grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 
        gap-6 
        w-full
        max-w-screen-xl 
        mx-auto
      "
      >
        {rooms.length > 0 ? (
          rooms.map((room) => {
            const extraCount = Math.max(
              0,
              room.amenities.length - visibleIconsCount,
            );
            return (
              <RoomCard
                key={room._id}
                room={room}
                userInfo={userInfo}
                extraCount={extraCount}
                containerRef={containerRef}
                visibleIconsCount={visibleIconsCount}
                toggleDescription={() => toggleDescription(room)}
                setVisibleIconsCount={setVisibleIconsCount}
                activeRoom={activeRoom}
                setActiveRoom={setActiveRoom}
              />
            );
          })
        ) : (
          <div
            className="
            text-center text-lg text-gray-700 
            col-span-full 
            flex justify-center items-center
          "
          >
            <BookOpen className="mr-2" />
            No rooms available.
          </div>
        )}
      </div>

      <MoreAboutRoomPopup
        showPopup={showPopup}
        setShowPopup={setShowPopup}
        roomDetails={popupRoomDetails}
        amenities={popupAmenities}
        handleRulesNavigation={handleRulesNavigation}
      />
    </div>
  );
};

export default RoomsSection;
