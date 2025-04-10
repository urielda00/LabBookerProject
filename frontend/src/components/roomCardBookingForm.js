// RoomCardBookingForm.js
import React, { useState, useEffect } from "react";
import Message from "./Error_successMessage"; // For error/success messages
import CustomDatepicker from "../utils/datePicker"; // Your custom datepicker component
import { format } from 'date-fns';
import api from "../utils/axiosConfig"; // Import the centralized Axios instance
import { useTranslation } from "react-i18next"; // For translations

// Define booking constants
// const BOOKING_CONSTANTS = {
//   MIN_ADVANCE_MINUTES: 30, // Minimum advance booking time in minutes
//   BUSINESS_START_HOUR: 8,   // Business start hour (8 AM)
//   BUSINESS_END_HOUR: 22,    // Business end hour (10 PM)
//   MIN_DURATION_HOURS: 1,    // Minimum booking duration in hours
//   MAX_DURATION_HOURS: 4     // Maximum booking duration in hours
// };

const RoomCardBookingForm = ({
  room,
  activeRoom,
  userInfo,
  handleStartBooking,
}) => {
  // Form data holds booking information
  const [formData, setFormData] = useState({
    colleagues: [],
    date: "",
    startTime: "",
    endTime: "",
  });
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation(); // For translations
  // State for backend availability (timeslot data)
  const [availability, setAvailability] = useState(null);
  // List of timeslots for the selected date
  const [displaySlots, setDisplaySlots] = useState([]);

  const formatTime = (timeStr, isEndTime = false) => {
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isEndTime) {
      minutes += 1;
      if (minutes >= 60) {
        minutes = 0;
        hours += 1;
      }
    }
  
    return format(new Date(2020, 0, 1, hours, minutes), 'h:mm a');
  };


  // Fetch backend availability when form is active
  useEffect(() => {
    if (activeRoom === room._id) {
      api
        .get(
          `/room/rooms/${room._id}/monthly-availability`,
        )
        .then((res) => {
          // Expected response:
          // { room: room.name, availability: [ { date, slots: [{ startTime, endTime, status }] }, ... ] }
          setAvailability(res.data.availability);
        })
        .catch((error) => {
          console.error("Error fetching room availability:", error);
          const errMsg =
            (error.response &&
              error.response.data &&
              error.response.data.message) ||
            "Unable to fetch room availability. Please try again later.";
          setFormError(errMsg);
        });
    }
  }, [activeRoom, room._id]);

  // Compute available date strings from the availability data
  const availableDates = availability
    ? availability.map((day) => day.date)
    : [];

  // Initialize colleague emails based on room type
  useEffect(() => {
    const initialColleagues =
      room.type === "Large Seminar"
        ? ["", "", ""]
        : room.type === "Small Seminar"
          ? ["", ""]
          : [];
    setFormData((prev) => ({ ...prev, colleagues: initialColleagues }));
  }, [room.type]);

  // Reset form when activeRoom changes
  useEffect(() => {
    if (activeRoom !== room._id) {
      const initialColleagues =
        room.type === "Large Seminar"
          ? ["", "", ""]
          : room.type === "Small Seminar"
            ? ["", ""]
            : [];
      setFormData({
        colleagues: initialColleagues,
        date: "",
        startTime: "",
        endTime: "",
      });
      setFormError("");
      setSuccessMessage("");
      setDisplaySlots([]);
    }
  }, [activeRoom, room._id, room.type]);

  // Clear form after a successful booking submission
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        const initialColleagues =
          room.type === "Large Seminar"
            ? ["", "", ""]
            : room.type === "Small Seminar"
              ? ["", ""]
              : [];
        setFormData({
          colleagues: initialColleagues,
          date: "",
          startTime: "",
          endTime: "",
        });
        setSuccessMessage("");
      }, 3000); // Increased to 3 seconds for better user experience
      return () => clearTimeout(timer);
    }
  }, [successMessage, room.type]);

  // Handle input changes (colleague emails and other fields)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("colleague")) {
      const index = parseInt(name.split("_")[1], 10);
      setFormData((prev) => {
        const updatedColleagues = [...prev.colleagues];
        updatedColleagues[index] = value;
        return { ...prev, colleagues: updatedColleagues };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setFormError("");
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

  // Validate form fields before submission
  const validateForm = () => {
    // Check if all colleague emails are filled and valid
    // if (room.type !== "Open") {
    //   for (let i = 0; i < formData.colleagues.length; i++) {
    //     const email = formData.colleagues[i].trim();
    //     if (!email) {
    //       return `Please enter email for Colleague ${i + 1}.`;
    //     }
    //     if (!validateEmailFormat(email)) {
    //       return `Invalid email format for Colleague ${i + 1}.`;
    //     }
    //   }
    // }

    // // Check if date is selected
    // if (!formData.date) {
    //   return "Please choose an available date.";
    // }

    // Check if time slot is selected
    // if (!formData.startTime || !formData.endTime) {
    //   return "Please select a time slot.";
    // }

    // Calculate booking datetime
    // const bookingDateTime = new Date(`${formData.date}T${formData.endTime}:00`);
    // const currentDateTime = new Date();

    // // Prevent booking in the past
    // if (bookingDateTime <= currentDateTime) {
    //   return "Cannot book for past date and time.";
    // }

    // // Enforce business hours
    // const [startHour, startMinute] = formData.startTime.split(":").map(Number);
    // const [endHour, endMinute] = formData.endTime.split(":").map(Number);
    // if (startHour < BOOKING_CONSTANTS.BUSINESS_START_HOUR || endHour > BOOKING_CONSTANTS.BUSINESS_END_HOUR) {
    //   return `Bookings are only available between ${BOOKING_CONSTANTS.BUSINESS_START_HOUR}:00 and ${BOOKING_CONSTANTS.BUSINESS_END_HOUR}:00.`;
    // }

    // // Enforce minimum advance booking time
    // const minAdvanceTime = new Date(currentDateTime.getTime() + BOOKING_CONSTANTS.MIN_ADVANCE_MINUTES * 60000);
    // if (bookingDateTime < minAdvanceTime) {
    //   return `Bookings must be made at least ${BOOKING_CONSTANTS.MIN_ADVANCE_MINUTES} minutes in advance.`;
    // }

    return "";
  };

  // Submit the booking request
  const handleProceedBooking = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      setSuccessMessage("");
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      const response = await api.post(
        "/book/booking",
        {
          roomId: room._id,
          userId: userInfo._id,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          additionalUsers: formData.colleagues,
        },
      );
      if (response.status === 201) {
        setSuccessMessage(response.data.message);
        setFormError("");
      } else {
        setFormError(response.data.message);
        setSuccessMessage("");
      }
    } catch (error) {
      console.error("Error booking the room:", error);
      const errMsg =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        "An error occurred while processing your booking.";
      setFormError(errMsg);
      setSuccessMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close the booking modal and reset form states
  const closeModal = () => {
    handleStartBooking();
    const initialColleagues =
      room.type === "Large Seminar"
        ? ["", "", ""]
        : room.type === "Small Seminar"
          ? ["", ""]
          : [];
    setFormData({
      colleagues: initialColleagues,
      date: "",
      startTime: "",
      endTime: "",
    });
    setFormError("");
    setSuccessMessage("");
    setDisplaySlots([]);
  };

  if (activeRoom !== room._id) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 flex items-center justify-center z-50 animate-fadeIn">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto transition-colors duration-300">
        {/* Header */}
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 sm:pb-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t("roomBooking.bookingTitle")}  {room.name}
          </h2>
          <button
            className="text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 text-2xl sm:text-3xl transition-colors"
            onClick={closeModal}
          >
            &times;
          </button>
        </div>
  
        {/* Form Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Colleague Emails (if applicable) */}
          {room.type !== "Open" && (
            <div className="space-y-4">
              {formData.colleagues.map((colleague, index) => (
                <div key={`colleague_${index}`} className="flex flex-col">
                  <label className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-1">
                    {t("roomBooking.colleagueEmail")} {index + 1} {t("roomBooking.email")}
                  </label>
                  <input
                    type="email"
                    name={`colleague_${index}`}
                    value={colleague}
                    onChange={handleInputChange}
                    className="p-2 sm:p-3 text-sm sm:text-base border dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:bg-gray-700 dark:text-gray-200"
                    required
                    placeholder="e.g., colleague@example.com"
                  />
                </div>
              ))}
            </div>
          )}
  
          {/* Custom Datepicker */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium">
              {t("roomBooking.selectDate")}
            </label>
            <CustomDatepicker
              onDateChange={handleDateSelected}
              availableDates={availableDates}
              placeholder={t("roomBooking.chooseDatePlaceholder")}
              className="text-sm sm:text-base"
            />
          </div>
  
          {/* Time Slot Selector */}
          <div>
            <label className="block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium">
              {t("roomBooking.selectTimeSlot")}
            </label>
            {formData.date ? (
              displaySlots.length > 0 ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  {displaySlots.map((slot, index) => {
    const isSelected =
      formData.startTime === slot.startTime &&
      formData.endTime === slot.endTime;

    

    // Determine slot status
    let slotStatus = "Available";
    if (slot.status !== "Available") {
      slotStatus = "Booked";
    } else if (slot.isPast) {
      slotStatus = "Past";
    }

    // Base CSS classes
    let slotClasses =
      "relative px-4 py-3 border rounded-md flex items-center justify-center transition dark:border-gray-600 ";
    
    // Dynamic class modifications
    slotClasses += slotStatus === "Available"
      ? "text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed";

      return (
        <button
          key={index}
          onClick={() => handleSlotSelect(slot)}
          className={`${slotClasses} text-sm sm:text-base ${
            isSelected
              ? "bg-blue-700 dark:bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : ""
          }`}
        disabled={slotStatus !== "Available"}
        aria-pressed={isSelected}
        aria-label={`${formatTime(slot.startTime)} - ${formatTime(slot.endTime, true)} ${slotStatus}`}
      >
        <span className={`${slotStatus !== "Available" ? "line-through" : ""}`}>
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime, true)}
                      </span>
        
        {/* Status indicator */}
        {(slotStatus === "Booked" || slotStatus === "Past") && (
                        <div className="absolute bottom-0 right-2">
                          <span
                            className={`text-[8px] xs:text-[10px] uppercase font-semibold ${
                              slotStatus === "Booked"
                                ? "text-red-500 dark:text-red-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {slotStatus}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-red-500 dark:text-red-400 text-sm sm:text-base">
                {t("roomBooking.noTimeSlots")}
              </p>
            )
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              {t("roomBooking.selectDateFirst")}
            </p>
          )}
        </div>

        {/* Error and Success Messages */}
        {(formError || successMessage) && (
          <div className="my-4 text-center">
            {/* Message component should handle responsive text internally */}
            {formError && (
              <Message
                message={formError}
                type="error"
                onClose={() => setFormError("")}
              />
            )}
            {successMessage && (
              <Message
                message={successMessage}
                type="success"
                onClose={() => setSuccessMessage("")}
              />
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleProceedBooking}
          disabled={isSubmitting}
          className={`w-full py-2 sm:py-3 text-base sm:text-lg bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isSubmitting
              ? "opacity-50 cursor-not-allowed dark:opacity-70"
              : ""
          }`}
        >
          {isSubmitting ? t("roomBooking.bookingInProgress") : t("roomBooking.proceedButton")}
        </button>
      </div>
    </div>
  </div>
);
};

export default RoomCardBookingForm;
