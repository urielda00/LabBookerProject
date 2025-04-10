import React, {
  useLayoutEffect,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";
import RoomImg from "../assets/room.jpg";
import iconMapping from "../utils/iconMapping";
import RoomCardBookingForm from "./roomCardBookingForm";
import { Users, X, CalendarClock, User, Clock, Lock } from "lucide-react";
import debounce from "lodash/debounce";
import { Dialog } from "@headlessui/react";
import api from "../utils/axiosConfig";
import TransferRequestsModal from "./TransferRequestsModal";
import TransferRequestModal from "./TransferRequestModal";

const RoomCard = ({
  room,
  userInfo,
  toggleDescription,
  activeRoom,
  setActiveRoom,
}) => {
  const { t } = useTranslation();

  const [visibleAmenities, setVisibleAmenities] = useState(room.amenities);
  const [extraCount, setExtraCount] = useState(0);
  const [showWeeklyBookings, setShowWeeklyBookings] = useState(false);
  const [weeklyBookings, setWeeklyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [declinedRequests, setDeclinedRequests] = useState({});

  const containerRef = useRef(null);
  const measurementAmenitiesRef = useRef([]);
  const measurementMoreRef = useRef(null);

  // If user declined requests
  useEffect(() => {
    const fetchDeclinedStatuses = async () => {
      const statuses = {};
      for (const booking of weeklyBookings) {
        try {
          const response = await api.get(
            `/book/${booking._id}/has-declined-request`,
            { params: { userId: userInfo._id } }
          );
          statuses[booking._id] = response.data.exists;
        } catch (error) {
          console.error("Error checking declined status:", error);
          statuses[booking._id] = false;
        }
      }
      setDeclinedRequests(statuses);
    };

    if (weeklyBookings.length > 0) {
      fetchDeclinedStatuses();
    }
  }, [weeklyBookings, userInfo._id]);

  // Toggle booking form
  const handleStartBooking = useCallback(
    (roomId) => {
      setActiveRoom((prev) => (prev === roomId ? null : roomId));
    },
    [setActiveRoom]
  );

  const calculateVisibleAmenities = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const gapSize = 8;
    const amenitiesWidths = measurementAmenitiesRef.current.map((ref) =>
      ref ? ref.offsetWidth : 0
    );
    const moreWidth = measurementMoreRef.current
      ? measurementMoreRef.current.offsetWidth
      : 0;

    let availableWidth = containerWidth;
    let visibleCount = 0;

    for (let i = 0; i < amenitiesWidths.length; i++) {
      const amenityWidth = amenitiesWidths[i];
      const requiredWidth =
        amenityWidth +
        (visibleCount > 0 ? gapSize : 0) +
        (i < amenitiesWidths.length - 1 ? moreWidth : 0);

      if (availableWidth - requiredWidth >= 0) {
        availableWidth -= amenityWidth + (visibleCount > 0 ? gapSize : 0);
        visibleCount++;
      } else {
        break;
      }
    }

    const hiddenCount = amenitiesWidths.length - visibleCount;
    setVisibleAmenities(room.amenities.slice(0, visibleCount));
    setExtraCount(hiddenCount > 0 ? hiddenCount : 0);
  }, [room.amenities]);

  const fetchWeeklyBookings = async () => {
    try {
      setLoadingBookings(true);
      setBookingError(null);
      const response = await api.get(`/book/weekly?roomId=${room._id}`);
      setWeeklyBookings(response.data.bookings);
    } catch (err) {
      setBookingError(
        err.response?.data?.message || t("roomCard.failedLoadBookings")
      );
    } finally {
      setLoadingBookings(false);
    }
  };

  const debouncedCalculateRef = useRef();
  useEffect(() => {
    debouncedCalculateRef.current = debounce(calculateVisibleAmenities, 100);
    return () => {
      debouncedCalculateRef.current?.cancel();
    };
  }, [calculateVisibleAmenities]);

  useLayoutEffect(() => {
    const handleResize = () => {
      debouncedCalculateRef.current?.();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      debouncedCalculateRef.current?.cancel();
    };
  }, []);

  useLayoutEffect(() => {
    calculateVisibleAmenities();
  }, [room.amenities, calculateVisibleAmenities]);

  return (
    // Force LTR here if needed:
    <div dir="ltr">
      {/* Hidden Measurement Container */}
      <div className="absolute top-0 left-[-9999px] opacity-0 pointer-events-none whitespace-nowrap">
        {room.amenities.map((amenity, index) => (
          <div
            key={`measure-${amenity.name}-${index}`}
            ref={(el) => (measurementAmenitiesRef.current[index] = el)}
            className="inline-flex items-center px-2 py-1 text-xs box-border bg-blue-50 text-blue-700 shadow-sm whitespace-nowrap"
          >
            <span className="mr-1 text-sm">
              {React.cloneElement(iconMapping[amenity.icon], {
                className: "h-5 w-5",
              })}
            </span>
            {amenity.name}
          </div>
        ))}
        {room.amenities.length > 0 && (
          <span
            ref={measurementMoreRef}
            className="inline-flex items-center px-2 py-1 text-xs box-border bg-blue-100 text-blue-700 shadow-sm whitespace-nowrap"
          >
            +{room.amenities.length}
          </span>
        )}
      </div>

      {/* Main Card Container */}
      <div
        className="
          flex flex-col md:flex-row bg-white dark:bg-gray-800
          rounded-2xl shadow-lg dark:shadow-gray-900/30 hover:shadow-xl
          dark:hover:shadow-gray-900/50 transition-all duration-300
          overflow-hidden border border-gray-200 dark:border-gray-700 h-full
          mb-8
        "
      >
        {/* Image Section */}
        <div className="relative md:w-1/2 h-64 overflow-hidden">
          <img
            src={room.imageUrl || RoomImg}
            alt={room.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-4 left-4 bg-blue-500 dark:bg-blue-600 text-white px-3 py-1 rounded-full text-sm shadow-md">
            {room.type}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-grow md:w-1/2">
          {/* Header Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {room.name}
              </h3>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4 mr-1 text-blue-500 dark:text-blue-400" />
                <span className="text-sm">{room.capacity}</span>
              </div>
            </div>
          </div>

          {/* Amenities Section */}
          <div
            ref={containerRef}
            className="flex flex-nowrap gap-2 mb-4 mx-1 mt-auto overflow-hidden justify-center items-center"
          >
            {visibleAmenities.map((amenity, index) => (
              <div
                key={`${amenity.name}-${index}`}
                className="
                  bg-blue-50 dark:bg-blue-900/30 text-blue-700
                  dark:text-blue-300 px-2 py-1 rounded-md text-xs
                  inline-flex items-center shadow-sm whitespace-nowrap box-border
                  cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50
                  transition-colors
                "
              >
                <span className="mr-1 text-sm">
                  {React.cloneElement(iconMapping[amenity.icon], {
                    className: "h-5 w-5 text-blue-600 dark:text-blue-400",
                  })}
                </span>
                {amenity.name}
              </div>
            ))}

            {extraCount > 0 && (
              <span
                className="
                  bg-blue-100 dark:bg-blue-800/40 text-blue-700
                  dark:text-blue-300 px-2 py-[6px] rounded-md text-xs inline-flex
                  items-center shadow-sm whitespace-nowrap box-border
                  cursor-pointer hover:bg-blue-300 dark:hover:bg-blue-700/50
                  transition-colors relative group flex-shrink-0
                "
              >
                +{extraCount}
                <div
                  className="
                    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                    w-max bg-gray-700 dark:bg-gray-600 text-white text-xs
                    rounded py-1 px-2 opacity-0 group-hover:opacity-100
                    transition-opacity z-10 pointer-events-none
                  "
                >
                  {room.amenities
                    .slice(visibleAmenities.length)
                    .map((hiddenAmenity, idx) => (
                      <div key={`tooltip-${idx}`} className="flex items-center">
                        <span className="mr-1">
                          {React.cloneElement(iconMapping[hiddenAmenity.icon], {
                            className: "h-4 w-4 text-blue-400",
                          })}
                        </span>
                        {hiddenAmenity.name}
                      </div>
                    ))}
                </div>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 mt-auto">
            <div className="flex-1 flex space-x-2">
              <button
                onClick={() => toggleDescription(room._id)}
                className="
                  flex-1 bg-gray-100 dark:bg-gray-700
                  text-gray-700 dark:text-gray-300 py-2
                  rounded-md text-sm
                  hover:bg-gray-200 dark:hover:bg-gray-600
                  transition-colors shadow-sm hover:shadow-md
                "
              >
                {t("roomCard.details")}
              </button>
              <button
                onClick={() => handleStartBooking(room._id)}
                className={`
                  flex-1 py-2 rounded-md text-sm
                  transition-all duration-300 shadow-md hover:shadow-lg
                  ${
                    activeRoom === room._id
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white"
                  }
                `}
              >
                {activeRoom === room._id
                  ? t("roomCard.cancel")
                  : t("roomCard.book")}
              </button>
            </div>
          </div>

          {/* Schedule Button */}
          <div className="mt-2">
            <button
              onClick={() => {
                setShowWeeklyBookings(true);
                fetchWeeklyBookings();
              }}
              className="
                w-full bg-gray-100 dark:bg-gray-700
                text-blue-600 dark:text-blue-400
                py-2 rounded-md text-sm
                hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors shadow-sm hover:shadow-md
                flex items-center justify-center gap-1
              "
            >
              <CalendarClock className="w-4 h-4" />
              {t("roomCard.viewSchedule")}
            </button>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <RoomCardBookingForm
        room={room}
        activeRoom={activeRoom}
        userInfo={userInfo}
        handleStartBooking={handleStartBooking}
      />

      {/* Schedule Dialog */}
      <Dialog
        open={showWeeklyBookings}
        onClose={() => setShowWeeklyBookings(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className="
              w-full max-w-2xl bg-white dark:bg-gray-800
              rounded-xl shadow-2xl p-6 border dark:border-gray-600
              mx-4 sm:mx-0 flex flex-col
            "
          >
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title
                className="
                  text-xl font-bold flex items-center gap-2
                  text-gray-900 dark:text-gray-100 flex-wrap
                "
              >
                <CalendarClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span>
                  {room.name} {t("roomCard.scheduleTitle")}
                </span>
              </Dialog.Title>
              <button
                onClick={() => setShowWeeklyBookings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
              {loadingBookings ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
                </div>
              ) : bookingError ? (
                <div
                  className="
                    p-4 bg-red-50 dark:bg-red-900/30 text-red-600
                    dark:text-red-200 rounded-lg text-sm sm:text-base
                  "
                >
                  {bookingError}
                </div>
              ) : weeklyBookings.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {t("roomCard.noBookingsScheduled")}
                </div>
              ) : (
                weeklyBookings.map((booking) => {
                  const hasPendingRequest = booking.transferRequests?.some(
                    (req) =>
                      req.fromUser._id === userInfo._id &&
                      req.status === "pending"
                  );
                  const hasDeclined = declinedRequests[booking._id] || false;

                  return (
                    <div
                      key={booking._id}
                      className="
                        p-4 bg-gray-50 dark:bg-gray-700
                        rounded-lg mb-3 transition-all
                        hover:shadow-md dark:hover:shadow-gray-900/30
                      "
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
                        <div className="flex flex-col flex-grow">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span
                              className="
                                bg-blue-100 dark:bg-blue-900/30
                                px-2 py-1 rounded text-xs sm:text-sm
                              "
                            >
                              {new Date(booking.date).toLocaleDateString()}
                            </span>
                            <span className="text-blue-500 dark:text-blue-400 hidden sm:inline">
                              •
                            </span>
                            <span
                              className="
                                bg-green-100 dark:bg-green-900/30
                                px-2 py-1 rounded text-xs sm:text-sm
                              "
                            >
                              {booking.startTime} - {booking.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                booking.status === "Active"
                                  ? "bg-green-500 dark:bg-green-400"
                                  : booking.status === "Confirmed"
                                  ? "bg-sky-500 dark:bg-sky-400"
                                  : "bg-yellow-500 dark:bg-yellow-400"
                              }`}
                            ></span>
                            <span
                              className={`
                                px-2 py-1 rounded-full text-xs sm:text-sm
                                ${
                                  booking.status === "Active"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200"
                                    : booking.status === "Confirmed"
                                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
                                }
                              `}
                            >
                              {t(`roomCard.status.${booking.status}`, {
                                defaultValue: booking.status,
                              })}
                            </span>
                          </div>
                        </div>

                        {booking.userId._id === userInfo._id ? (
                          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                            {booking.transferRequests?.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowRequests(true);
                                }}
                                className="
                                  text-xs px-2.5 py-1 bg-blue-100
                                  dark:bg-blue-900/30 text-blue-600
                                  dark:text-blue-300 rounded-full
                                  hover:bg-blue-200 dark:hover:bg-blue-800/50
                                  transition-colors w-full sm:w-auto
                                "
                              >
                                {t("roomCard.viewRequests")} (
                                {booking.transferRequests.length})
                              </button>
                            )}
                          </div>
                        ) : (
                          // If booking belongs to someone else
                          room.type === "Open" && (
                            <>
                              {["Pending", "Active"].includes(
                                booking.status
                              ) ? (
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                                  <Lock className="w-4 h-4" />
                                  <span>
                                    {t("roomCard.transferUnavailable")}
                                  </span>
                                </div>
                              ) : hasDeclined ? (
                                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                                  <X className="w-4 h-4" />
                                  <span>{t("roomCard.declined")}</span>
                                </div>
                              ) : hasPendingRequest ? (
                                <button
                                  className="
                                    bg-gray-300 dark:bg-gray-600
                                    text-gray-500 dark:text-gray-300
                                    cursor-not-allowed text-xs px-2.5 py-1
                                    rounded-full w-full sm:w-auto
                                  "
                                  disabled
                                >
                                  {t("roomCard.requestSent")}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowTransferModal(true);
                                  }}
                                  className="
                                    bg-sky-100 dark:bg-sky-900/30
                                    text-sky-600 dark:text-sky-300
                                    hover:bg-sky-200 dark:hover:bg-sky-800/50
                                    text-xs px-2.5 py-1 rounded-full
                                    transition-all w-full sm:w-auto
                                  "
                                >
                                  {t("roomCard.requestTransfer")}
                                </button>
                              )}
                            </>
                          )
                        )}
                      </div>

                      {/* User info */}
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                          <User className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                          <span className="font-medium dark:text-gray-100 break-words">
                            {booking.userId?.username}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 break-all">
                            • {booking.userId?.email}
                          </span>
                        </div>
                        {booking.additionalUsers?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                            <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                            <span className="font-medium dark:text-gray-100">
                              {t("roomCard.participants")}
                            </span>
                            {booking.additionalUsers.map((u) => (
                              <span
                                key={u._id}
                                className="text-gray-500 dark:text-gray-400 break-words"
                              >
                                {u.username}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Transfer Modals */}
      {showRequests && (
        <TransferRequestsModal
          booking={selectedBooking}
          onClose={() => setShowRequests(false)}
        />
      )}
      {showTransferModal && (
        <TransferRequestModal
          booking={selectedBooking}
          fetchWeeklyBookings={fetchWeeklyBookings}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </div>
  );
};

export default React.memo(RoomCard);
