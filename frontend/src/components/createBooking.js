import React, { useState } from "react";
import Message from "./Error_successMessage";
import CustomDatepicker from "../utils/datePicker";
import { motion } from "framer-motion";
import { FaTimes } from "react-icons/fa"; // For remove icon
import api from "../utils/axiosConfig"; // Import the centralized Axios instance
import { useTranslation } from "react-i18next";
const CreateBookingByNamesForm = ({ onSuccess }) => {
  // Main form data
  const [formData, setFormData] = useState({
    roomName: "",
    username: "",
    colleagues: [],
    date: "",
    startTime: "",
    endTime: "",
  });

  // Single colleague email input
  const [colleagueEmail, setColleagueEmail] = useState("");

  const { t } = useTranslation();
  // States for availability
  const [availability, setAvailability] = useState(null);
  const [displaySlots, setDisplaySlots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);

  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [roomType, setRoomType] = useState(null);
  const [maxAdditionalUsers, setMaxAdditionalUsers] = useState(0);
  const [requiredUsers, setRequiredUsers] = useState(0);

  const token = localStorage.getItem("token");

  // Function to fetch room details manually
  const fetchRoomDetails = async () => {
    if (!formData.roomName.trim()) {
      setFormError("Please enter a room name before fetching details.");
      return;
    }

    try {
      const response = await api.get(`/room/rooms/${formData.roomName.trim()}`);
      if (response.status === 200) {
        const room = response.data;
        setRoomType(room.type);

        // Set required and max additional users based on room type
        switch (room.type) {
          case "Open":
            setRequiredUsers(0);
            setMaxAdditionalUsers(0);
            break;
          case "Small Seminar":
            setRequiredUsers(2);
            setMaxAdditionalUsers(2);
            break;
          case "Large Seminar":
            setRequiredUsers(3);
            setMaxAdditionalUsers(3);
            break;
          default:
            setRequiredUsers(0);
            setMaxAdditionalUsers(0);
        }

        // Clear colleague emails if room type changes
        setColleagueEmail("");
        setFormData((prev) => ({ ...prev, colleagues: [] }));
        setFormError("");
        setSuccessMessage(t("createBookingByNames.roomFetched"));
      }
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          t("createBookingByNames.fetchRoomError")
      );
      setRoomType(null);
      setRequiredUsers(0);
      setMaxAdditionalUsers(0);
      setFormData((prev) => ({ ...prev, colleagues: [] }));
    }
  };

  // Handle form changes for roomName, username, etc.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setSuccessMessage("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Add a single colleague
  const handleAddColleague = () => {
    const email = colleagueEmail.trim();
    if (!email) {
      setFormError(t("createBookingByNames.invalidEmail"));
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError(t("createBookingByNames.invalidEmail"));
      return;
    }

    // Check if maximum number of colleagues is reached
    if (formData.colleagues.length >= maxAdditionalUsers) {
      setFormError(
        t("createBookingByNames.maxUsers", { count: maxAdditionalUsers })
      );
      return;
    }

    // Check for duplicate emails
    if (formData.colleagues.includes(email)) {
      setFormError(t("createBookingByNames.duplicateEmail"));
      return;
    }

    // Add colleague
    setFormData((prev) => ({
      ...prev,
      colleagues: [...prev.colleagues, email],
    }));
    setColleagueEmail("");
    setFormError("");
    setSuccessMessage(t("createBookingByNames.colleagueAdded"));
  };

  // Remove a colleague
  const handleRemoveColleague = (emailToRemove) => {
    setFormData((prev) => ({
      ...prev,
      colleagues: prev.colleagues.filter((email) => email !== emailToRemove),
    }));
    setFormError("");
    setSuccessMessage(t("createBookingByNames.colleagueRemoved"));
  };

  // Fetch monthly availability by roomName
  const fetchAvailability = async () => {
    if (!formData.roomName) {
      setFormError(t("createBookingByNames.roomRequired"));
      return;
    }
    setLoadingAvailability(true);
    setFormError("");
    setSuccessMessage("");
    setAvailability(null);
    setAvailableDates([]);
    setDisplaySlots([]);

    try {
      // Adjust the endpoint as per your backend
      const response = await api.get(
        `/room/rooms-by-name/${formData.roomName}/monthly-availability`
      );
      if (response.status === 200) {
        setAvailability(response.data.availability || []);
        // Extract date strings
        const dateStrings = (response.data.availability || []).map(
          (day) => day.date
        );
        setAvailableDates(dateStrings);
        setSuccessMessage(t("createBookingByNames.success.availabilityFetched"));
      }
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          t("createBookingByNames.errors.fetchAvailabilityError", {
            roomName: formData.roomName,
          })
      );
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Callback when a date is selected and applied from the CustomDatepicker
  const handleDateSelected = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    console.log("Selected Date (Local):", dateStr); // Debugging log

    setFormData((prev) => ({
      ...prev,
      date: dateStr,
      startTime: "",
      endTime: "",
    }));

    if (availability) {
      const dayAvailability = availability.find((day) => day.date === dateStr);
      if (dayAvailability) {
        // Determine if the selected date is today
        const today = new Date();
        const isToday = dateStr === today.toISOString().split("T")[0];
        let updatedSlots = dayAvailability.slots;

        if (isToday) {
          const currentTime = today.getHours() * 60 + today.getMinutes(); // Current time in minutes
          // Map over slots to add 'isPast' flag
          updatedSlots = dayAvailability.slots.map((slot) => {
            const [endHour, endMinute] = slot.endTime.split(":").map(Number);
            const slotEndTimeInMinutes = endHour * 60 + endMinute;
            const isPast = slotEndTimeInMinutes <= currentTime;
            return { ...slot, isPast };
          });
        } else {
          // For future dates, none of the slots are past
          updatedSlots = dayAvailability.slots.map((slot) => ({
            ...slot,
            isPast: false,
          }));
        }

        setDisplaySlots(updatedSlots);
      } else {
        setDisplaySlots([]);
      }
    }
  };

  // When a timeslot is clicked, update formData if available and not past
  const handleSlotSelect = (slot) => {
    if (slot.status !== "Available" || slot.isPast) return;
    setFormData((prev) => ({
      ...prev,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
    setFormError("");
  };

  // Validate form
const validateForm = () => {
  if (!formData.roomName.trim())
    return t("createBookingByNames.errors.roomRequired");
  if (!formData.username.trim())
    return t("createBookingByNames.errors.usernameRequired");
  if (!formData.date)
    return t("createBookingByNames.errors.dateRequired");
  if (!formData.startTime || !formData.endTime)
    return t("createBookingByNames.errors.timeRequired");

  if (
    roomType === "Small Seminar" &&
    formData.colleagues.length !== requiredUsers
  ) {
    return t("createBookingByNames.errors.smallSeminarRequirement");
  }
  if (
    roomType === "Large Seminar" &&
    formData.colleagues.length !== requiredUsers
  ) {
    return t("createBookingByNames.errors.largeSeminarRequirement");
  }

  return "";
};

  // Create booking (by name) => POST to e.g. /api/book/booking/create-by-names
  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      setSuccessMessage("");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");

    try {
      // e.g. POST /booking/create-by-names
      const response = await api.post(
        "/book/booking/create-by-names",
        {
          username: formData.username.trim(),
          roomName: formData.roomName.trim(),
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          additionalUsers: formData.colleagues,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 201) {
        setSuccessMessage(
          response.data.message || t("createBookingByNames.bookingCreated")
        );
        onSuccess?.(response.data.message);

        // Reset form
        setFormData({
          roomName: "",
          username: "",
          colleagues: [],
          date: "",
          startTime: "",
          endTime: "",
        });
        setColleagueEmail("");
        setAvailability(null);
        setDisplaySlots([]);
        setAvailableDates([]);
        setRoomType(null);
        setRequiredUsers(0);
        setMaxAdditionalUsers(0);
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          t("createBookingByNames.createBookingError")
      );
    } finally {
      setIsSubmitting(false);
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
        {t("createBookingByNames.title")}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 sm:space-y-8 md:space-y-10"
      >
        {/* Section: Basic Details */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
            {t("createBookingByNames.sectionDetails")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("createBookingByNames.roomNameLabel")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  name="roomName"
                  value={formData.roomName}
                  onChange={handleChange}
                  className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
                  placeholder="e.g. Large Seminar Room A"
                />
                <button
                  type="button"
                  onClick={fetchRoomDetails}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors bg-white dark:bg-gray-700 text-green-500 dark:text-green-400 hover:bg-green-500 dark:hover:bg-green-600 hover:text-white focus:ring-2 focus:ring-green-400 text-sm sm:text-base whitespace-nowrap"
                >
                  {t("createBookingByNames.fetchDetails")}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("createBookingByNames.usernameLabel")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base bg-white dark:bg-gray-700 dark:text-gray-200"
                placeholder="e.g. jdoe"
              />
            </div>
          </div>
        </div>

        {/* Section: Additional Users */}
        {roomType && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {roomType === "Open" ? (
                  t("createBookingByNames.additionalNotAllowed")
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span>
                      {t("createBookingByNames.addUserLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      (Exactly {requiredUsers} user
                      {requiredUsers > 1 ? "s" : ""}{" "}
                      {t("createBookingByNames.required")})
                    </span>
                  </div>
                )}
              </label>

              {roomType !== "Open" && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={colleagueEmail}
                      onChange={(e) => {
                        setColleagueEmail(e.target.value);
                        setFormError("");
                        setSuccessMessage("");
                      }}
                      className={`w-full p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base
                        ${
                          formData.colleagues.length === requiredUsers
                            ? "border-green-500 dark:border-green-600"
                            : "border-gray-300 dark:border-gray-600"
                        }
                        bg-white dark:bg-gray-700 dark:text-gray-200`}
                      placeholder="Enter user email"
                      disabled={formData.colleagues.length >= requiredUsers}
                    />
                    <button
                      type="button"
                      onClick={handleAddColleague}
                      disabled={
                        !colleagueEmail.trim() ||
                        formData.colleagues.length >= requiredUsers
                      }
                      className={`px-4 py-2 rounded-lg shadow-md transition-colors text-sm sm:text-base whitespace-nowrap
                        ${
                          !colleagueEmail.trim() ||
                          formData.colleagues.length >= requiredUsers
                            ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            : "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 focus:ring-2 focus:ring-green-400"
                        }`}
                    >
                      {t("createBookingByNames.addUserBtn")}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <p
                      className={`text-xs sm:text-sm ${
                        formData.colleagues.length === requiredUsers
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formData.colleagues.length}/{requiredUsers} user
                      {requiredUsers > 1 ? "s" : ""} added
                    </p>
                    {formData.colleagues.length !== requiredUsers && (
                      <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                        {requiredUsers - formData.colleagues.length} more user
                        {requiredUsers - formData.colleagues.length > 1
                          ? "s"
                          : ""}{" "}
                        required
                      </p>
                    )}
                  </div>

                  {formData.colleagues.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Added emails:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.colleagues.map((email, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => handleRemoveColleague(email)}
                              className="ml-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 focus:outline-none"
                            >
                              <FaTimes size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section: Availability */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
            {t("createBookingByNames.checkAvailability")}
          </h3>
          <button
            type="button"
            onClick={fetchAvailability}
            disabled={loadingAvailability || !roomType}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
              loadingAvailability || !roomType
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-white dark:bg-gray-700 text-green-500 dark:text-green-400 hover:bg-green-500 dark:hover:bg-green-600 hover:text-white focus:ring-2 focus:ring-green-400"
            }`}
          >
            {loadingAvailability
              ? "Loading..."
              : t("createBookingByNames.fetchAvailability")}
          </button>

          {availableDates.length > 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("createBookingByNames.selectDate")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="max-w-full overflow-x-auto">
                <CustomDatepicker
                  onDateChange={handleDateSelected}
                  availableDates={availableDates}
                  theme="green"
                  className="dark:bg-gray-700"
                />
              </div>
            </div>
          )}

          {/* Time Slots */}
          {formData.date && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("createBookingByNames.selectTimeSlot")}{" "}
                <span className="text-red-500">*</span>
              </label>
              {displaySlots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                  {displaySlots.map((slot, index) => {
                    const isSelected =
                      formData.startTime === slot.startTime &&
                      formData.endTime === slot.endTime;
                    let slotStatus = "Available";
                    if (slot.status !== "Available") {
                      slotStatus = "Booked";
                    } else if (slot.isPast) {
                      slotStatus = "Past";
                    }

                    if (slotStatus !== "Available") {
                      return (
                        <div
                          key={index}
                          className="relative px-3 py-2 sm:px-4 sm:py-3 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-500 rounded-lg flex items-center justify-center text-xs sm:text-sm"
                        >
                          <span className="line-through">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <div className="absolute bottom-0 right-1 sm:right-2">
                            <span
                              className={`text-[8px] sm:text-[10px] uppercase font-semibold ${
                                slotStatus === "Booked"
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {slotStatus}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleSlotSelect(slot)}
                        type="button"
                        className={`px-3 py-2 sm:px-4 sm:py-3 border rounded-lg transition text-xs sm:text-sm ${
                          isSelected
                            ? "bg-green-500 dark:bg-green-600 text-white border-green-500"
                            : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-gray-600"
                        }`}
                        disabled={slotStatus !== "Available"}
                      >
                        {slot.startTime} - {slot.endTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <p className="text-red-500 dark:text-red-400 text-sm">
                    {t("createBookingByNames.noAvailableSlots", {
                      date: formData.date,
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="text-center">
          {formError && (
            <Message
              message={formError}
              type="error"
              onClose={() => setFormError("")}
              className="dark:bg-red-900/20 dark:text-red-300"
            />
          )}
          {successMessage && (
            <Message
              message={successMessage}
              type="success"
              onClose={() => setSuccessMessage("")}
              className="dark:bg-green-900/20 dark:text-green-300"
            />
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (roomType !== "Open" &&
                formData.colleagues.length !== requiredUsers)
            }
            className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base ${
              isSubmitting ||
              (roomType !== "Open" &&
                formData.colleagues.length !== requiredUsers)
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-white dark:bg-gray-700 text-green-500 dark:text-green-400 hover:bg-green-500 dark:hover:bg-green-600 hover:text-white focus:ring-2 focus:ring-green-400"
            }`}
          >
            {isSubmitting
              ? t("createBookingByNames.submitCreating")
              : roomType !== "Open" &&
                formData.colleagues.length !== requiredUsers
              ? t("createBookingByNames.addMoreUsers", {
                  count: requiredUsers - formData.colleagues.length,
                })
              : t("createBookingByNames.createBooking")}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateBookingByNamesForm;
