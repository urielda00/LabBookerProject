import React, { useState } from "react";
import Message from "./Error_successMessage";
import { motion } from "framer-motion";
import api from "../utils/axiosConfig"; // Import the centralized Axios instance

const validStatuses = ["Pending", "Confirmed", "Canceled"];

const UpdateBooking = ({ onSuccess }) => {
  const [username, setUsername] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [status, setStatus] = useState("Pending");
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [errors, setErrors] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const token = localStorage.getItem("token");

  const resetMessages = () => {
    setErrors("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    setUsername("");
    setUserBookings([]);
    setSelectedBookingId("");
    setStatus("Pending");
    resetMessages();
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
          setErrors(`No upcoming bookings found for username: "${username}"`);
        } else {
          setSuccessMessage(`Found ${bookings.length} upcoming booking(s)`);
        }
      }
    } catch (err) {
      setErrors(
        err.response?.data?.message ||
          `Error fetching upcoming bookings for username: ${username}`,
      );
    } finally {
      setLoadingBookings(false);
    }
  };

  // Update the handleUpdate function to prevent updating to the same status
  const handleUpdate = async () => {
    if (!username.trim()) {
      setErrors("Please enter a username first.");
      return;
    }
    if (!selectedBookingId) {
      setErrors("Please select a booking to update.");
      return;
    }

    const currentStatus = userBookings.find(
      (b) => b._id === selectedBookingId,
    )?.status;
    if (status === currentStatus) {
      setErrors("Please select a different status to update.");
      return;
    }

    resetMessages();
    setLoadingUpdate(true);

    try {
      const response = await api.patch(
        `/book/booking/${selectedBookingId}/status/by-username?username=${username}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 200) {
        setSuccessMessage(
          `Booking status successfully updated from ${currentStatus} to ${status}`,
        );
        onSuccess?.(response.data.message);
        await fetchBookings();
      }
    } catch (err) {
      setErrors(err.response?.data?.message || "Error updating booking status");
    } finally {
      setLoadingUpdate(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300"
    >
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8">
        Update Booking Status
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
              Select Booking
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
                <option value="">-- Select a booking to update --</option>
                {userBookings.map((booking) => (
                  <option
                    key={booking._id}
                    value={booking._id}
                    className="text-sm sm:text-base dark:bg-gray-700"
                  >
                    Room: {booking.roomId?.name} | Date: {booking.date} | Time:{" "}
                    {booking.startTime}-{booking.endTime}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Status Section */}
        {selectedBookingId && (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
              Update Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Current Status Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Status
                </label>
                <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        userBookings.find((b) => b._id === selectedBookingId)
                          ?.status === "Confirmed"
                          ? "bg-green-500 dark:bg-green-600"
                          : userBookings.find(
                                (b) => b._id === selectedBookingId,
                              )?.status === "Canceled"
                            ? "bg-red-500 dark:bg-red-600"
                            : "bg-yellow-500 dark:bg-yellow-600"
                      }`}
                    ></span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                      {userBookings.find((b) => b._id === selectedBookingId)
                        ?.status || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Status Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    resetMessages();
                  }}
                  className={`w-full p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base ${
                    status ===
                    userBookings.find((b) => b._id === selectedBookingId)
                      ?.status
                      ? "border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 dark:text-gray-200`}
                >
                  {validStatuses.map((s) => (
                    <option
                      key={s}
                      value={s}
                      disabled={
                        s ===
                        userBookings.find((b) => b._id === selectedBookingId)
                          ?.status
                      }
                      className="text-sm sm:text-base dark:bg-gray-700"
                    >
                      {s}{" "}
                      {s ===
                      userBookings.find((b) => b._id === selectedBookingId)
                        ?.status
                        ? "(Current)"
                        : ""}
                    </option>
                  ))}
                </select>
                {status ===
                  userBookings.find((b) => b._id === selectedBookingId)
                    ?.status && (
                  <p className="mt-1 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                    Please select a different status to update
                  </p>
                )}
              </div>
            </div>

            {/* Booking Details Summary */}
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
                        {selectedBooking.startTime} - {selectedBooking.endTime}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Booking ID
                      </span>
                      <span className="font-medium text-sm sm:text-base dark:text-gray-200">
                        {selectedBooking._id.slice(-6)}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="text-center">
          {errors && (
            <Message
              message={errors}
              type="error"
              onClose={resetMessages}
              className="dark:bg-red-900/20 dark:text-red-300"
            />
          )}
          {successMessage && (
            <Message
              message={successMessage}
              type="success"
              onClose={resetMessages}
              className="dark:bg-green-900/20 dark:text-green-300"
            />
          )}
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
              onClick={handleUpdate}
              disabled={loadingUpdate}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
                loadingUpdate
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-white dark:bg-gray-700 text-green-500 dark:text-green-400 hover:bg-green-500 dark:hover:bg-green-600 hover:text-white focus:ring-2 focus:ring-green-400"
              }`}
            >
              {loadingUpdate ? "Updating..." : "Update Booking"}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default UpdateBooking;
