import React, { useState } from "react";
import Message from "./Error_successMessage";
import Modal from "../components/cnfrmModal";
import { motion, AnimatePresence } from "framer-motion"; // Add AnimatePresence here
import api from "../utils/axiosConfig"; // Import the centralized Axios instance

const DeleteBookingByUsername = ({ onSuccess }) => {
  const [username, setUsername] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [errors, setErrors] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const token = localStorage.getItem("token");

  const resetMessages = () => {
    setErrors("");
    setSuccessMessage("");
  };

  // Add a more comprehensive reset function
  const resetForm = () => {
    setUsername("");
    setUserBookings([]);
    setSelectedBookingId("");
    setIsModalOpen(false);
    setLoadingDelete(false);
    setLoadingBookings(false);
    setErrors("");
  };

  const fetchBookings = async () => {
    if (!username.trim()) {
      setErrors("Please enter a username to fetch bookings.");
      return;
    }

    resetMessages();
    setLoadingBookings(true);
    setUserBookings([]);
    setSelectedBookingId("");

    try {
      const response = await api.get(
        `/book/bookings/upcoming/${username}`,
      );

      if (response.status === 200) {
        const bookings = response.data.bookings || [];
        setUserBookings(bookings);

        if (bookings.length === 0) {
          setErrors(`No bookings found for username: "${username}"`);
        } else {
          setSuccessMessage(`Found ${bookings.length} booking(s)`);
        }
      }
    } catch (err) {
      setErrors(
        err.response?.data?.message ||
          `Error fetching bookings for username: ${username}`,
      );
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleDelete = async () => {
    if (!username.trim()) {
      setErrors("Please enter a username first.");
      return;
    }
    if (!selectedBookingId) {
      setErrors("Please select a booking to delete.");
      return;
    }

    // Open the modal instead of showing alert
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsModalOpen(false);
    resetMessages();
    setLoadingDelete(true);

    try {
      const response = await api.delete(
        `/book/booking/${selectedBookingId}/by-username?username=${username}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 200) {
        // Store booking details before reset for success message
        const deletedBooking = userBookings.find(
          (b) => b._id === selectedBookingId,
        );
        const successMsg = (
          <div className="space-y-2">
            <p>Booking successfully deleted!</p>
            <div className="text-sm bg-green-50 p-3 rounded-md">
              <p className="font-medium text-green-800">
                Deleted Booking Details:
              </p>
              <ul className="mt-1 text-green-700">
                <li>Room: {deletedBooking.roomId?.name}</li>
                <li>Date: {deletedBooking.date}</li>
                <li>
                  Time: {deletedBooking.startTime} - {deletedBooking.endTime}
                </li>
              </ul>
            </div>
          </div>
        );

        // Reset the form
        resetForm();

        // Show success message
        setSuccessMessage(successMsg);
        onSuccess?.(response.data.message);

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      }
    } catch (err) {
      setIsModalOpen(false);
      setErrors(err.response?.data?.message || "Error deleting booking");
      setTimeout(() => setErrors(""), 5000);
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8">
          Delete Booking
        </h2>

        <form
          className="space-y-6 sm:space-y-8 md:space-y-10"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Username Section */}
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
              User Details
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    resetMessages();
                  }}
                  className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
                  placeholder="Enter username to fetch bookings"
                />
              </div>
              <button
                type="button"
                onClick={fetchBookings}
                disabled={loadingBookings || !username.trim()}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base whitespace-nowrap ${
                  loadingBookings || !username.trim()
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 text-green-500 dark:text-green-400 hover:bg-green-500 dark:hover:bg-green-600 hover:text-white focus:ring-2 focus:ring-green-400"
                }`}
              >
                {loadingBookings ? "Fetching..." : "Fetch Bookings"}
              </button>
            </div>
          </div>

          {/* Bookings Section */}
          {userBookings.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
                Select Booking to Delete
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Bookings
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => {
                    setSelectedBookingId(e.target.value);
                    resetMessages();
                  }}
                  className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="">-- Select a booking to delete --</option>
                  {userBookings.map((booking) => (
                    <option
                      key={booking._id}
                      value={booking._id}
                      className="text-sm sm:text-base dark:bg-gray-700"
                    >
                      Room: {booking.roomId?.name} | Date: {booking.date} |
                      Time: {booking.startTime}-{booking.endTime}
                    </option>
                  ))}
                </select>
              </div>

              {/* Booking Details Summary */}
              {selectedBookingId && (
                <div className="mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Booking Details
                  </h4>
                  {(() => {
                    const selectedBooking = userBookings.find(
                      (b) => b._id === selectedBookingId,
                    );
                    return selectedBooking ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        <div className="space-y-1">
                          <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Room
                          </span>
                          <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                            {selectedBooking.roomId?.name}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Date
                          </span>
                          <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                            {selectedBooking.date}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Time
                          </span>
                          <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                            {selectedBooking.startTime} -{" "}
                            {selectedBooking.endTime}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Status
                          </span>
                          <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                            {selectedBooking.status}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              {errors && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Message
                    message={errors}
                    type="error"
                    onClose={() => setErrors("")}
                    className="dark:bg-red-900/20 dark:text-red-300"
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
                    className="dark:bg-green-900/20 dark:text-green-300"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            {userBookings.length > 0 && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base"
              >
                Reset
              </button>
            )}
            {selectedBookingId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loadingDelete}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
                  loadingDelete
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white focus:ring-2 focus:ring-red-400"
                }`}
              >
                {loadingDelete ? "Deleting..." : "Delete Booking"}
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        message={
          <div className="space-y-4 sm:space-y-6 dark:text-gray-100">
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
                Confirm Deletion
              </h3>
              <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this booking? This action cannot
                be undone.
              </div>
            </div>

            {/* Booking Details in Modal */}
            {userBookings.find((b) => b._id === selectedBookingId) && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 dark:bg-gray-600/30 border-b border-gray-200 dark:border-gray-600">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Booking Details
                  </h4>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    {(() => {
                      const selectedBooking = userBookings.find(
                        (b) => b._id === selectedBookingId,
                      );
                      return (
                        <>
                          <div className="space-y-1">
                            <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Room
                            </span>
                            <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                              {selectedBooking.roomId?.name}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Date
                            </span>
                            <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                              {selectedBooking.date}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Time
                            </span>
                            <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                              {selectedBooking.startTime} -{" "}
                              {selectedBooking.endTime}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              Status
                            </span>
                            <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                              {selectedBooking.status}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Warning Message */}
            <div className="text-center">
              <div className="text-xs sm:text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                This action cannot be undone
              </div>
            </div>
          </div>
        }
        confirmText={
          <span className="flex items-center text-sm sm:text-base">
            {loadingDelete ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Booking
              </>
            )}
          </span>
        }
        cancelText={
          <span className="text-sm sm:text-base dark:text-gray-300">
            Cancel
          </span>
        }
        modalClassName="dark:bg-gray-800"
      />
    </>
  );
};

export default DeleteBookingByUsername;
