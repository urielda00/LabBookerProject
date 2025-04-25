import React, { useState } from "react";
import Message from "./Error_successMessage";
import { motion } from "framer-motion";
import api from "../utils/axiosConfig";
import { useTranslation } from "react-i18next";

const validStatuses = ["Pending", "Confirmed", "Canceled"];

const UpdateBooking = ({ onSuccess }) => {
  const { t } = useTranslation();
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
      setErrors(t("updateBooking.errors.usernameRequired"));
      return;
    }

    resetMessages();
    setLoadingBookings(true);
    setUserBookings([]);
    setSelectedBookingId("");

    try {
      const response = await api.get(`/book/bookings/upcoming/${username}`);
      if (response.status === 200) {
        const bookings = response.data.bookings || [];
        setUserBookings(bookings);

        if (bookings.length === 0) {
          setErrors(t("updateBooking.noBookings", { username }));
        } else {
          setSuccessMessage(
            t("updateBooking.foundBookings", { count: bookings.length })
          );
        }
      }
    } catch (err) {
      setErrors(
        err.response?.data?.message ||
          t("updateBooking.fetchError", { username })
      );
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleUpdate = async () => {
    if (!username.trim()) {
      setErrors(t("updateBooking.errors.usernameRequired"));
      return;
    }
    if (!selectedBookingId) {
      setErrors(t("updateBooking.errors.bookingRequired"));
      return;
    }

    const currentStatus = userBookings.find(
      (b) => b._id === selectedBookingId
    )?.status;

    if (status === currentStatus) {
      setErrors(t("updateBooking.errors.sameStatus"));
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
        }
      );

      if (response.status === 200) {
        setSuccessMessage(
          t("updateBooking.successUpdate", {
            from: currentStatus,
            to: status,
          })
        );
        onSuccess?.(response.data.message);
        await fetchBookings();
      }
    } catch (err) {
      setErrors(
        err.response?.data?.message || t("updateBooking.errors.updateFailed")
      );
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
        {t("updateBooking.title")}
      </h2>

      <form
        className="space-y-6 sm:space-y-8 md:space-y-10"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
            {t("updateBooking.sectionUser")}
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("updateBooking.username")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  resetMessages();
                }}
                className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
                placeholder={t("updateBooking.usernamePlaceholder")}
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
              {loadingBookings
                ? t("updateBooking.fetching")
                : t("updateBooking.fetch")}
            </button>
          </div>
        </div>

        {userBookings.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
              {t("updateBooking.sectionSelect")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("updateBooking.availableBookings")}
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => {
                  setSelectedBookingId(e.target.value);
                  resetMessages();
                }}
                className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="">{t("updateBooking.selectBooking")}</option>
                {userBookings.map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    Room: {booking.roomId?.name} | Date: {booking.date} | Time:{" "}
                    {booking.startTime}-{booking.endTime}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {selectedBookingId && (
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
              {t("updateBooking.sectionUpdate")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("updateBooking.currentStatus")}
                </label>
                <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        userBookings.find((b) => b._id === selectedBookingId)
                          ?.status === "Confirmed"
                          ? "bg-green-500 dark:bg-green-600"
                          : userBookings.find(
                              (b) => b._id === selectedBookingId
                            )?.status === "Canceled"
                          ? "bg-red-500 dark:bg-red-600"
                          : "bg-yellow-500 dark:bg-yellow-600"
                      }`}
                    />
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                      {userBookings.find((b) => b._id === selectedBookingId)
                        ?.status || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("updateBooking.newStatus")}{" "}
                  <span className="text-red-500">*</span>
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
                    >
                      {s}
                      {s ===
                      userBookings.find((b) => b._id === selectedBookingId)
                        ?.status
                        ? ` (${t("updateBooking.statusRequiredNote")})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          {errors && (
            <Message message={errors} type="error" onClose={resetMessages} />
          )}
          {successMessage && (
            <Message
              message={successMessage}
              type="success"
              onClose={resetMessages}
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          {userBookings.length > 0 && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base"
            >
              {t("updateBooking.reset")}
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
              {loadingUpdate
                ? t("updateBooking.updating")
                : t("updateBooking.update")}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default UpdateBooking;
