import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Message from "./Error_successMessage";
import Modal from "./cnfrmModal"; // Make sure you have the Modal component
import api from "../utils/axiosConfig"; // Import the centralized Axios instance
import { useTranslation } from "react-i18next";
const DeleteRoomForm = ({ operation, onSuccess }) => {
  const [roomsList, setRoomsList] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [relatedBookings, setRelatedBookings] = useState([]);
  const { t } = useTranslation();
  // const [loadingBookings, setLoadingBookings] = useState(false);

  // Reset messages
  const resetMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  // Reset form
  const resetForm = () => {
    setRoomId("");
    resetMessages();
  };

  // Fetch all rooms for the dropdown
  useEffect(() => {
    const fetchAllRooms = async () => {
      setLoadingRooms(true);
      try {
        const response = await api.get("/room/rooms");
        setRoomsList(response.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load rooms list.");
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchAllRooms();
  }, []);

  const handleRoomSelect = (e) => {
    const selectedRoomId = e.target.value;
    setRoomId(selectedRoomId);
    resetMessages();
    if (selectedRoomId) {
      fetchRelatedBookings(selectedRoomId);
    } else {
      setRelatedBookings([]);
    }
  };

  // Initial delete handler - opens confirmation modal
  const handleDeleteClick = () => {
    if (!roomId) {
      setError("Please select a room first.");
      return;
    }
    setIsModalOpen(true);
  };

  const fetchRelatedBookings = async (roomName) => {
    // setLoadingBookings(true);
    try {
      const response = await api.get(`/book/bookings/by-room/${roomName}`);
      if (response.data.success) {
        setRelatedBookings(response.data.bookings);
      } else {
        setRelatedBookings([]);
      }
    } catch (err) {
      setRelatedBookings([]);
    } finally {
      // setLoadingBookings(false);
    }
  };

  // Actual delete handler after confirmation
  const handleConfirmDelete = async () => {
    setIsModalOpen(false);
    setLoading(true);
    resetMessages();

    try {
      // Delete room (this should cascade delete bookings on the backend)
      const response = await api.delete(`/room/rooms/${roomId}`);

      if (response.status === 200) {
        const deletedRoom = roomsList.find((room) => room.name === roomId);
        const successMsg = (
          <div className="space-y-2">
            <p>{t("deleteRoom.successMessage.title")}</p>
            <div className="text-sm bg-blue-50 p-3 rounded-md">
              <p className="font-medium text-blue-800">
                {t("deleteRoom.successMessage.details")}
              </p>
              <ul className="mt-1 text-blue-700">
                <li>
                  {t("deleteRoom.name")} {deletedRoom.name}
                </li>
                <li>
                  {t("deleteRoom.type")} {deletedRoom.type}
                </li>
                <li>
                  {t("deleteRoom.capacity")} {deletedRoom.capacity}
                </li>
              </ul>
              <p className="mt-2 font-medium text-blue-800">
                {t("deleteRoom.successMessage.numBookings")}{" "}
                {relatedBookings.length}
              </p>
            </div>
          </div>
        );

        setRoomsList((prev) => prev.filter((room) => room.name !== roomId));
        resetForm();
        setSuccessMessage(successMsg);
        onSuccess?.();
        setTimeout(resetMessages, 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error deleting room.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-950/50 p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8">
          {t("deleteRoom.header")}
        </h2>

        <div className="space-y-4 sm:space-y-6">
          {/* Room Selection */}
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-600">
              {t("deleteRoom.selectRoom")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t("deleteRoom.availableRooms")}{" "}
              </label>
              <select
                value={roomId}
                onChange={handleRoomSelect}
                className=" rtl:pr-8 w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                disabled={loadingRooms}
              >
                <option value="" disabled className="dark:bg-gray-700">
                  {t("deleteRoom.selecatRoom")}
                </option>
                {roomsList.map((room) => (
                  <option
                    key={room._id}
                    value={room.name}
                    className="dark:bg-gray-700"
                  >
                    {room.name} - {room.type} (Capacity: {room.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Room Details Preview */}
            {roomId && (
              <div className="mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("deleteRoom.selectedRoomDetails")}
                </h4>
                {(() => {
                  const selectedRoom = roomsList.find(
                    (room) => room.name === roomId
                  );
                  return selectedRoom ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="block text-gray-500 dark:text-gray-400">
                          {t("deleteRoom.name")}
                        </span>
                        <span className="font-medium dark:text-gray-200">
                          {selectedRoom.name}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-gray-500 dark:text-gray-400">
                          {t("deleteRoom.type")}
                        </span>
                        <span className="font-medium dark:text-gray-200">
                          {selectedRoom.type}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-gray-500 dark:text-gray-400">
                          {t("deleteRoom.capacity")}
                        </span>
                        <span className="font-medium dark:text-gray-200">
                          {selectedRoom.capacity}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Message
                    message={error}
                    type="error"
                    onClose={() => setError("")}
                  />
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Message
                    message={successMessage}
                    type="success"
                    onClose={() => setSuccessMessage("")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="rtl:gap-4 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            {roomId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm sm:text-base"
              >
                {t("deleteRoom.reset")}
              </button>
            )}
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={loading || !roomId}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base
                ${
                  loading || !roomId
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white focus:ring-2 focus:ring-red-400 border border-gray-200 dark:border-gray-600"
                }`}
            >
              {loading ? t("deleteRoom.deleting") :t("deleteRoom.delete")}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal Content */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title=""
        message={
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 sm:h-14 sm:w-14 text-red-500 dark:text-red-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-full w-full"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t("deleteRoom.confirmDeleteTitle")}
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                {t("deleteRoom.confirmDeleteText")}
              </p>
            </div>

            {roomId && roomsList.find((room) => room.name === roomId) && (
              <div className="space-y-4">
                {/* Room Details */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("deleteRoom.roomDetails")}
                    </h4>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {t("deleteRoom.name")}
                        </span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {roomsList.find((room) => room.name === roomId).name}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {t("deleteRoom.type")}
                        </span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {roomsList.find((room) => room.name === roomId).type}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {t("deleteRoom.capacity")}
                        </span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {
                            roomsList.find((room) => room.name === roomId)
                              .capacity
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Bookings */}
                {relatedBookings.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
                    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-red-100 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
                      <h4 className="text-sm font-medium text-red-700 dark:text-red-300">
                        {t("deleteRoom.associatedBookings")} ({relatedBookings.length})
                      </h4>
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="max-h-40 sm:max-h-48 overflow-y-auto space-y-2">
                        {relatedBookings.map((booking) => (
                          <div
                            key={booking._id}
                            className="p-2 sm:p-3 text-xs sm:text-sm border-l-4 border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/20"
                          >
                            <div className="text-red-700 dark:text-red-300">
                              {t("deleteRoom.date")} {booking.date} | Time: {booking.startTime} -{" "}
                              {booking.endTime}
                            </div>
                            <div className="text-red-600 dark:text-red-400 text-xs mt-1">
                              {t("deleteRoom.bookedBy")} {booking.userId?.username}
                              {booking.additionalUsers?.length > 0 && (
                                <span className="ml-2">
                                  | With:{" "}
                                  {booking.additionalUsers
                                    .map((user) => user.username)
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 sm:px-4 py-2 rounded-lg">
                <svg
                  className="w-4 h-4 inline mr-1 -mt-0.5 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {t("deleteRoom.permanentDeleteWarning")}{" "}
                {relatedBookings.length} {t("deleteRoom.associatedBookings")}
              </p>
            </div>
          </div>
        }
        confirmText={loading ? t("deleteRoom.deleting") : t("deleteRoom.delete")}
        cancelText={t("deleteRoom.cancel")}
        darkMode={true} // Pass dark mode prop if needed
      />
    </>
  );
};

export default DeleteRoomForm;
