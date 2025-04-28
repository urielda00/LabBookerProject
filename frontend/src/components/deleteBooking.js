import React, { useState } from "react";
import Message from "./Error_successMessage";
import Modal from "../components/cnfrmModal";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/axiosConfig";
import { useTranslation } from "react-i18next";

const DeleteBookingByUsername = ({ onSuccess }) => {
  const { t } = useTranslation();
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
      setErrors(t("deleteBooking.errors.usernameRequired"));
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
          setErrors(t("deleteBooking.errors.noBookings", { username }));
        } else {
          setSuccessMessage(
            t("deleteBooking.successTitle") + ` (${bookings.length})`
          );
        }
      }
    } catch (err) {
      setErrors(
        err.response?.data?.message ||
          t("deleteBooking.errors.fetchFailed", { username })
      );
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleDelete = () => {
    if (!username.trim()) {
      setErrors(t("deleteBooking.errors.usernameRequired"));
      return;
    }
    if (!selectedBookingId) {
      setErrors(t("deleteBooking.errors.selectRequired"));
      return;
    }

    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsModalOpen(false);
    resetMessages();
    setLoadingDelete(true);

    try {
      const response = await api.delete(
        `/book/booking/${selectedBookingId}/by-username?username=${username}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        const deletedBooking = userBookings.find(
          (b) => b._id === selectedBookingId
        );

        const successMsg = (
          <div className="space-y-2">
            <p>{t("deleteBooking.successTitle")}</p>
            <div className="text-sm bg-blue-50 p-3 rounded-md">
              <p className="font-medium text-blue-800">
                {t("deleteBooking.successDetails")}
              </p>
              <ul className="mt-1 text-blue-700">
                <li>
                  {t("deleteBooking.room")}: {deletedBooking.roomId?.name}
                </li>
                <li>
                  {t("deleteBooking.date")}: {deletedBooking.date}
                </li>
                <li>
                  {t("deleteBooking.time")}: {deletedBooking.startTime} -{" "}
                  {deletedBooking.endTime}
                </li>
              </ul>
            </div>
          </div>
        );

        resetForm();
        setSuccessMessage(successMsg);
        onSuccess?.(response.data.message);

        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      }
    } catch (err) {
      setErrors(
        err.response?.data?.message || t("deleteBooking.errors.deleteFailed")
      );
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
          {t("deleteBooking.title")}
        </h2>

        <form
          className="space-y-6 sm:space-y-8 md:space-y-10"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
              {t("deleteBooking.sectionUser")}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("deleteBooking.usernameLabel")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    resetMessages();
                  }}
                  className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
                  placeholder={t("deleteBooking.usernamePlaceholder")}
                />
              </div>
              <button
                type="button"
                onClick={fetchBookings}
                disabled={loadingBookings || !username.trim()}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base whitespace-nowrap ${
                  loadingBookings || !username.trim()
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400"
                }`}
              >
                {loadingBookings
                  ? t("deleteBooking.fetching")
                  : t("deleteBooking.fetch")}
              </button>
            </div>
          </div>

          {userBookings.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
                {t("deleteBooking.sectionSelect")}
              </h3>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("deleteBooking.availableBookings")}
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => {
                  setSelectedBookingId(e.target.value);
                  resetMessages();
                }}
                className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="">{t("deleteBooking.selectPrompt")}</option>
                {userBookings.map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    {t("deleteBooking.room")}: {booking.roomId?.name} |{" "}
                    {t("deleteBooking.date")}: {booking.date} |{" "}
                    {t("deleteBooking.time")}: {booking.startTime}-
                    {booking.endTime}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            {userBookings.length > 0 && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base"
              >
                {t("deleteBooking.reset")}
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
                {loadingDelete
                  ? t("deleteBooking.deleting")
                  : t("deleteBooking.delete")}
              </button>
            )}
          </div>
        </form>
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        confirmText={t("deleteBooking.delete")}
        cancelText={t("deleteBooking.reset")}
        message={
          <>
            <h3>{t("deleteBooking.confirmTitle")}</h3>
            <p>{t("deleteBooking.confirmMessage")}</p>
            <p className="text-sm text-red-500 mt-2">
              {t("deleteBooking.cannotUndo")}
            </p>
          </>
        }
      />
    </>
  );
};

export default DeleteBookingByUsername;
