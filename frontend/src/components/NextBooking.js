import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/axiosConfig";
import {
  Clock,
  Calendar,
  MapPin,
  Download,
  Calendar as CalendarIcon,
  X,
  CheckCircle,
  AlertTriangle,
  Lock,
  Activity,
} from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const NextBooking = ({
  showToast,
  setIsModalOpen,
  setModalConfig,
  userInfo,
}) => {
  const [booking, setBooking] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bookingState, setBookingState] = useState("upcoming");
  const [canCancel, setCanCancel] = useState(false);
  const [showLeaveAlert, setShowLeaveAlert] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRefetch, setShouldRefetch] = useState(true);
  const [lastCheckInReminder, setLastCheckInReminder] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const intervalRef = useRef(null);
  const bookingRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  useEffect(() => {
    bookingRef.current = booking;
  }, [booking]);

  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleCheckIn = async () => {
    if (!booking) return;
    if (userInfo.email !== booking.userId.email) return;
    try {
      setIsUpdatingStatus(true);
      setBooking((prev) => ({ ...prev, checkedIn: true }));
      setIsTransitioning(true);
      const response = await api.post(`/book/booking/${booking._id}/check-in`);
      if (response.data.success) {
        showToast("success", "Successfully checked in to the room");
        setIsTransitioning(true);
        const newTimeout = setTimeout(() => {
          setBooking((prev) => ({ ...prev, checkedIn: true }));
          setIsTransitioning(false);
          setLastCheckInReminder(null);
        }, 300);
        transitionTimeoutRef.current = newTimeout;
      }
      setShouldRefetch(true);
    } catch (error) {
      setBooking((prev) => ({ ...prev, checkedIn: true }));
      console.error("Error checking in:", error);
      showToast("error", error.response?.data?.message || "Failed to check in");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !userInfo) return;

    if (booking.userId.email !== userInfo.email) {
      showToast("error", "Only the booking owner can cancel the reservation");
      return;
    }

    try {
      setBooking(null);
      setIsTransitioning(true);
      setIsModalOpen(false);
      const response = await api.delete(`/book/booking/${booking._id}`);
      setShouldRefetch(true);

      if (response.status === 200) {
        showToast("success", "Booking cancelled successfully");
        setShouldRefetch(true);
      }
    } catch (error) {
      setBooking(booking);
      console.error("Error cancelling booking:", error);
      showToast(
        "error",
        error.response?.data?.message || "Failed to cancel booking",
      );
    }
  };

  const handleDownloadICS = useCallback(() => {
    if (!booking) return;

    const eventTitle = `Lab Booking: ${booking.roomId.name}`;
    const eventStart = new Date(`${booking.date}T${booking.startTime}:00`);
    const eventEnd = new Date(`${booking.date}T${booking.endTime}:00`);

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LabBooker//EN",
      "BEGIN:VEVENT",
      `UID:${booking._id}@labbooker.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(eventStart)}`,
      `DTEND:${formatDate(eventEnd)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:Your lab booking for room ${booking.roomId.name}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "booking.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [booking]);

  const getGoogleCalendarUrl = useCallback((booking) => {
    if (!booking) return "";

    const eventTitle = encodeURIComponent(
      `Lab Booking: ${booking.roomId.name}`,
    );
    const eventDetails = encodeURIComponent(
      `Your lab booking for room ${booking.roomId.name}`,
    );
    const formatDateForGoogle = (dateStr, timeStr) => {
      const date = new Date(`${dateStr}T${timeStr}:00`);
      return date.toISOString().replace(/[-:.]/g, "");
    };
    const start = formatDateForGoogle(booking.date, booking.startTime);
    const end = formatDateForGoogle(booking.date, booking.endTime);

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${start}/${end}&details=${eventDetails}`;
  }, []);

  const showCheckInReminderToast = useCallback(() => {
    const now = new Date();
    if (!lastCheckInReminder || now - lastCheckInReminder >= 5 * 60 * 1000) {
      showToast("warning", "You have not checked in to your booking", {
        isPersistent: false,
        duration: 10000,
      });
      setLastCheckInReminder(now);
    }
  }, [lastCheckInReminder, showToast]);

  useEffect(() => {
    const fetchNextBooking = async () => {
      if (!shouldRefetch) return;

      try {
        setIsLoading(true);
        const response = await api.get("/book/booking/next");
        if (response.data.success) {
          const newBooking = response.data.booking;
          if (
            !bookingRef.current ||
            newBooking?._id !== bookingRef.current?._id
          ) {
            setIsTransitioning(true);
            const newTimeout = setTimeout(() => {
              setBooking(newBooking);
              setIsTransitioning(false);
              setShowLeaveAlert(false);
              setLastCheckInReminder(null);
              setIsUpdatingStatus(false);
            }, 300);
            transitionTimeoutRef.current = newTimeout;
          } else {
            setBooking(newBooking);
          }
        } else {
          setBooking(null);
        }
        setShouldRefetch(false);
      } catch (error) {
        console.error("Error fetching next booking:", error);
        showToast("error", "Failed to fetch booking details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNextBooking();
  }, [shouldRefetch, showToast]);

  useEffect(() => {
    if (!booking) return;
    if (!booking.date || !booking.startTime || !booking.endTime) return;

    const updateBookingState = async () => {
      const now = new Date();
      const bookingStart = new Date(`${booking.date}T${booking.startTime}:00`);
      const bookingEnd = new Date(`${booking.date}T${booking.endTime}:00`);
      const timeToStart = bookingStart.getTime() - now.getTime();
      const timeToEnd = bookingEnd.getTime() - now.getTime();

      // 1) If booking end time is past, just clear it
      if (timeToEnd <= 0) {
        clearInterval(intervalRef.current);
        setShouldRefetch(true);
        setBooking(null);
        return;
      }

      if (timeToStart > 0) {
        setTimeRemaining(Math.floor(timeToStart / 1000));
        setBookingState("upcoming");
        setCanCancel(timeToStart > 2 * 60 * 60 * 1000);
        const totalWaitTime =
          bookingStart.getTime() - new Date(booking.createdAt).getTime();
        const elapsedWaitTime =
          now.getTime() - new Date(booking.createdAt).getTime();
        setProgress(
          Math.max(0, Math.min((elapsedWaitTime / totalWaitTime) * 100, 100)),
        );
      } else {
        setTimeRemaining(Math.floor(timeToEnd / 1000));
        setBookingState("active");
        const totalDuration = bookingEnd.getTime() - bookingStart.getTime();
        const elapsed = now.getTime() - bookingStart.getTime();
        setProgress(
          Math.max(0, Math.min((elapsed / totalDuration) * 100, 100)),
        );

        const minutesLeft = Math.floor(timeToEnd / (1000 * 60));
        if (!booking.checkedIn) {
          showCheckInReminderToast();
        } else if (minutesLeft <= 14 && minutesLeft > 2) {
          setShowLeaveAlert("warning");
        } else if (minutesLeft <= 3) {
          setShowLeaveAlert("urgent");
        }
      }
    };

    const newInterval = setInterval(updateBookingState, 1000);
    intervalRef.current = newInterval;
    updateBookingState();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [booking, showCheckInReminderToast, isUpdatingStatus]);

  useEffect(() => {
    const currentNotificationTimeout = notificationTimeoutRef.current;
    const currentTransitionTimeout = transitionTimeoutRef.current;
    const currentInterval = intervalRef.current;

    return () => {
      if (currentInterval) clearInterval(currentInterval);
      if (currentNotificationTimeout) clearTimeout(currentNotificationTimeout);
      if (currentTransitionTimeout) clearTimeout(currentTransitionTimeout);
    };
  }, []);

  useEffect(() => {
    const updateStatus = async () => {
      if (booking?.status === "active" && timeRemaining <= 0) {
        setIsTransitioning(true);
        // Force immediate refresh
        setShouldRefetch(true);
      }
    };
    updateStatus();
  }, [booking?.status, timeRemaining]);

  const ModalContent = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 text-red-500">
          <AlertTriangle className="h-full w-full" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Confirm Booking Cancellation
        </h3>
        <div className="text-gray-500">
          Are you sure you want to cancel this booking? This action cannot be
          undone.
        </div>
      </div>
      {booking && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700">
              Booking Details
            </h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-gray-500">Room</span>
                <span className="font-medium">{booking.roomId?.name}</span>
              </div>
              <div>
                <span className="block text-gray-500">Date</span>
                <span className="font-medium">{booking.date}</span>
              </div>
              <div>
                <span className="block text-gray-500">Time</span>
                <span className="font-medium">
                  {booking.startTime} - {booking.endTime}
                </span>
              </div>
              <div>
                <span className="block text-gray-500">Status</span>
                <span className="font-medium">{booking.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAlerts = () => {
    if (!booking || bookingState !== "active" || !booking.checkedIn)
      return null;
    if (showLeaveAlert === "warning") {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Your booking will end in less than 15 minutes. Please prepare to
                leave the room.
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (showLeaveAlert === "urgent") {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Your booking ends in less than 3 minutes! Please leave the room
                immediately.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-md dark:shadow-gray-900/30 mb-8 transition-colors duration-300">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-[6px] bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-gray-800 dark:text-gray-200 text-lg font-medium mb-2">
            Loading your booking
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Please wait while we fetch your details
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-xl dark:shadow-gray-900/30 mb-8 overflow-hidden transition-all duration-300 ease-in-out border border-gray-100 dark:border-gray-700">
        {/* Collapsible Header */}
        <div
          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg transition-all duration-300 hover:bg-blue-200 dark:hover:bg-blue-800/50">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-300">
                Booking Overview
              </h2>
            </div>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              <svg
                className={`w-6 h-6 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        <div
          className={`transition-all duration-300 ease-in-out ${isExpanded ? "opacity-100 max-h-[1000px]" : "opacity-0 max-h-0"}`}
        >
          <div className="p-6">
            <div className="text-center py-8 transform transition-all duration-300 hover:-translate-y-1">
              <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4 transition-colors hover:text-blue-500 dark:hover:text-blue-400" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                No Upcoming Bookings
              </h3>
              <p className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                You don't have any upcoming reservations
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-xl dark:shadow-gray-900/30 mb-8 overflow-hidden transition-all duration-300 ease-in-out border border-gray-100 dark:border-gray-700">
      {/* Collapsible Header */}
      <div
        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg transition-all duration-300 hover:bg-blue-200 dark:hover:bg-blue-800/50">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center space-x-3 group">
  <span className="group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
    {booking
      ? booking.status === "Pending"
        ? "Pending Approval"
        : bookingState === "active"
        ? "Current Session"
        : "Upcoming Reservation"
      : "Booking Overview"}
  </span>
</h2>

{booking && booking.status === "Pending" && (
  <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors">
    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
    Awaiting Confirmation
  </span>
)}
              {booking && bookingState === "active" && booking.checkedIn && (
                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors">
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  Active Now
                </span>
              )}
            </div>
          </div>
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <svg
              className={`w-6 h-6 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className={`transition-all duration-300 ease-in-out ${isExpanded ? "opacity-100 max-h-[1000px]" : "opacity-0 max-h-0"}`}
      >
        {isLoading ? (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-[6px] bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-gray-800 dark:text-gray-200 text-lg font-medium mb-2">
                Loading your booking
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Please wait while we fetch your details
              </p>
            </div>
          </div>
        ) : !booking ? (
          <div className="p-6">
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                No Upcoming Bookings
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You don't have any upcoming reservations
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`p-6 pt-4 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
          >
            {renderAlerts()}

            {/* Progress Section */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-20 h-20 hover:scale-105 transition-transform duration-300">
                <CircularProgressbar
                  value={progress}
                  text={`${Math.round(progress)}%`}
                  styles={buildStyles({
                    pathTransitionDuration: 0.5,
                    pathColor:
                      bookingState === "active" ? "#16a34a" : "#2563eb",
                    textColor:
                      bookingState === "active" ? "#15803d" : "#1e40af",
                    trailColor: "#f3f4f6",
                    textSize: "32px",
                  })}
                />
              </div>
              <div className="flex-1 ml-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600 hover:shadow-md dark:hover:shadow-gray-900/30 transition-shadow duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {bookingState === "active"
                        ? "Time Remaining"
                        : "Time Until Start"}
                    </span>
                    <span
                      className={`text-xl font-semibold ${
                        bookingState === "active"
                          ? "text-green-600 dark:text-green-400"
                          : "text-blue-600 dark:text-blue-400"
                      } hover:scale-105 transition-transform`}
                    >
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detail Cards with Hover Effects */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600 hover:shadow-md dark:hover:shadow-gray-900/30 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center space-x-3">

                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Date
                    </p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                      {booking.date}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600 hover:shadow-md dark:hover:shadow-gray-900/30 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors">
                    <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Room
                    </p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                      {booking.roomId.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600 hover:shadow-md dark:hover:shadow-gray-900/30 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {bookingState === "active" ? "Ends at" : "Starts at"}
                    </p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 hover:text-purple-700 dark:hover:text-purple-400 transition-colors">
                      {bookingState === "active"
                        ? booking.endTime
                        : booking.startTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {booking.status === "Pending" && (
  <div className="col-span-full bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
    <div className="flex items-center space-x-3 text-yellow-700 dark:text-yellow-300">
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm">
        This booking is pending approval. You'll receive a confirmation email 
        once it's approved. Cancellation may not be available during this stage.
      </p>
    </div>
  </div>
)}

              {bookingState === "upcoming" && (
                <>
                  {canCancel && booking.userId.email === userInfo.email && booking.status !== "Pending" ? (
                    <button
                      onClick={() => {
                        setModalConfig({
                          title: "Cancel Booking",
                          message: <ModalContent />,
                          onConfirm: handleCancelBooking,
                          confirmText: "Confirm Cancellation",
                          cancelText: "Keep Booking",
                        });
                        setIsModalOpen(true);
                      }}
                      className="flex items-center justify-center space-x-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/40 rounded-lg transition-all duration-300 border border-red-200 dark:border-red-800 hover:shadow-sm hover:-translate-y-0.5"
                    >
                      <X className="w-5 h-5" />
                      <span>Cancel Booking</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Lock className="w-5 h-5" />
                      <span>Cancel Unavailable</span>
                    </div>
                  )}

                  <button
                    onClick={handleDownloadICS}
                    className="flex items-center justify-center space-x-2 p-3 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download .ICS</span>
                  </button>

                  <a
                    href={getGoogleCalendarUrl(booking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    <span>Google Calendar</span>
                  </a>
                </>
              )}

              {bookingState === "active" && !booking.checkedIn && (
                <button
                  onClick={handleCheckIn}
                  disabled={userInfo.email !== booking.userId.email}
                  className={`col-span-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all duration-300 ${
                    userInfo.email !== booking.userId.email
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white hover:shadow-sm hover:-translate-y-0.5"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>
                    {userInfo.email !== booking.userId.email
                      ? "Check In Unavailable"
                      : "Confirm Arrival"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NextBooking;
