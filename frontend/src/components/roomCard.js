import React, { useLayoutEffect, useCallback, useRef, useState, useEffect } from "react";
import RoomImg from "../assets/room.jpg";
import iconMapping from "../utils/iconMapping";
import RoomCardBookingForm from "./roomCardBookingForm";
import { Users, X, CalendarClock, User, Clock, CheckCircle2, Lock } from "lucide-react";
import debounce from "lodash/debounce";
import { Dialog } from "@headlessui/react";
import api from "../utils/axiosConfig";

const RoomCard = ({ room, userInfo, toggleDescription, activeRoom, setActiveRoom }) => {

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

  useEffect(() => {
    const fetchDeclinedStatuses = async () => {
      const statuses = {};
      for (const booking of weeklyBookings) {
        try {
          const response = await api.get(`/book/${booking._id}/has-declined-request`, {
            params: { userId: userInfo._id }
          });
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

  const TransferRequestModal = ({ booking, onClose }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [responseError, setResponseError] = useState(null);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await api.post(`/book/${booking._id}/transfer-request`, { message });
        setSuccess(true);
        setTimeout(() => {
          onClose();
          fetchWeeklyBookings();
        }, 1500);
      } catch (err) {
        console.error("Transfer request error:", err);
        setResponseError(err.response?.data?.message || "Request failed");
        setTimeout(() => setResponseError(null), 3000);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Dialog open={true} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 mx-4 sm:mx-0">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Request Transfer
              </Dialog.Title>
              <button 
                onClick={onClose} 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
    
            <form onSubmit={handleSubmit} className="space-y-4">
              {success ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4 animate-bounce" />
                  <p className="text-lg font-semibold dark:text-gray-100">Request sent successfully!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Message to {booking.userId?.username}
                    </label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                        text-base sm:text-sm
                        dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100
                        dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Explain why you need this booking..."
                      rows="4"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 
                        dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                        w-full sm:w-auto"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 
                        focus:ring-2 focus:ring-blue-500 disabled:opacity-50
                        dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-400
                        w-full sm:w-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                </>
              )}
              {responseError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg
                  dark:bg-red-900/30 dark:text-red-300 text-sm sm:text-base">
                  {responseError}
                </div>
              )}
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  };

  const TransferRequestsModal = ({ booking, onClose }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmAction, setConfirmAction] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [responseError, setResponseError] = useState(null);
    const [responseSuccess, setResponseSuccess] = useState(null);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await api.get(`/book/${booking._id}/transfer-requests`);
                setRequests(response.data.requests);
            } catch (err) {
                console.error("Failed to fetch requests:", err);
                setResponseError("Failed to load requests");
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [booking._id]);

    const handleResponse = async (accept) => {
        try {
            const endpoint = `/book/transfer-requests/${selectedRequest._id}/${accept ? 'accept' : 'decline'}`;
            await api.patch(endpoint);
            
            setRequests(requests.filter(req => req._id !== selectedRequest._id));
            setResponseSuccess(`Request ${accept ? 'accepted' : 'declined'} successfully`);
            setTimeout(() => setResponseSuccess(null), 3000);
        } catch (err) {
            setResponseError(err.response?.data?.message || "Action failed");
            setTimeout(() => setResponseError(null), 3000);
        } finally {
            setConfirmAction(null);
            setSelectedRequest(null);
        }
    };

    return (
      <Dialog open={true} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 mx-4 sm:mx-0 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Transfer Requests ({requests.length})
              </Dialog.Title>
              <button 
                onClick={onClose} 
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
    
            {/* Status Messages */}
            {responseError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm sm:text-base">
                {responseError}
              </div>
            )}
            {responseSuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm sm:text-base">
                {responseSuccess}
              </div>
            )}
    
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No pending requests</div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request._id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium dark:text-gray-100">
                            {request.fromUser?.username}
                          </span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 break-words">
                          {request.fromUser?.email}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap break-words">
                        "{request.message}"
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-end">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setConfirmAction('decline');
                          }}
                          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 
                            dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500
                            w-full sm:w-auto"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setConfirmAction('accept');
                          }}
                          className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700
                            w-full sm:w-auto"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
    
            {/* Confirmation Dialog */}
            {confirmAction && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 sm:mx-0">
                  <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">
                    {confirmAction === 'accept' 
                      ? "Confirm Transfer" 
                      : "Confirm Decline"}
                  </h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                    {confirmAction === 'accept' 
                      ? "By accepting, you'll permanently transfer this booking. This action cannot be undone!"
                      : "Are you sure you want to decline this transfer request?"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      onClick={() => {
                        setConfirmAction(null);
                        setSelectedRequest(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 
                        dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                        w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleResponse(confirmAction === 'accept')}
                      className={`px-4 py-2 text-white rounded-lg w-full sm:w-auto ${
                        confirmAction === 'accept' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    );
};

  const handleStartBooking = useCallback(
    (roomId) => {
      setActiveRoom((prev) => (prev === roomId ? null : roomId));
    },
    [setActiveRoom],
  );

  const calculateVisibleAmenities = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const gapSize = 8;
    const amenitiesWidths = measurementAmenitiesRef.current.map((ref) =>
      ref ? ref.offsetWidth : 0,
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
      setBookingError(err.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  const debouncedCalculateRef = useRef();
  useEffect(() => {
    // Create the debounced function
    debouncedCalculateRef.current = debounce(calculateVisibleAmenities, 100);

    // Cleanup on unmount
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
    <>
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
            +{room.amenities.length} more
          </span>
        )}
      </div>
  
      {/* Main Card Container */}
      <div className="flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 hover:shadow-xl dark:hover:shadow-gray-900/50 transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 h-full">
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
                className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-xs inline-flex items-center shadow-sm whitespace-nowrap box-border cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
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
              <span className="bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 px-2 py-[6px] rounded-md text-xs inline-flex items-center shadow-sm whitespace-nowrap box-border cursor-pointer hover:bg-blue-300 dark:hover:bg-blue-700/50 transition-colors relative group flex-shrink-0">
                +{extraCount} more
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max bg-gray-700 dark:bg-gray-600 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
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
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm hover:shadow-md"
              >
                Details
              </button>
              <button
                onClick={() => handleStartBooking(room._id)}
                className={`flex-1 py-2 rounded-md text-sm transition-all duration-300 shadow-md hover:shadow-lg ${
                  activeRoom === room._id
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white"
                }`}
              >
                {activeRoom === room._id ? "Cancel" : "Book"}
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
              className="w-full bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 py-2 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-1"
            >
              <CalendarClock className="w-4 h-4" />
              View Schedule
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
    <Dialog.Panel className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border dark:border-gray-600 mx-4 sm:mx-0 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Dialog.Title className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100 flex-wrap">
          <CalendarClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span className="break-words">{room.name} Schedule</span>
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
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-200 rounded-lg text-sm sm:text-base">
            {bookingError}
          </div>
        ) : weeklyBookings.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No bookings scheduled this week
          </div>
        ) : (
          weeklyBookings.map((booking) => {
            const hasPendingRequest = booking.transferRequests?.some(
              req => req.fromUser._id === userInfo._id && req.status === 'pending'
            );
            const hasDeclined = declinedRequests[booking._id] || false;

            return (
              <div key={booking._id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3 transition-all hover:shadow-md dark:hover:shadow-gray-900/30">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
                  <div className="flex flex-col flex-grow">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-xs sm:text-sm">
                        {new Date(booking.date).toLocaleDateString()}
                      </span>
                      <span className="text-blue-500 dark:text-blue-400 hidden sm:inline">•</span>
                      <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-xs sm:text-sm">
                        {booking.startTime} - {booking.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        booking.status === 'Active' ? 'bg-green-500 dark:bg-green-400' :
                        booking.status === 'Confirmed' ? 'bg-sky-500 dark:bg-sky-400' :
                        'bg-yellow-500 dark:bg-yellow-400'
                      }`}></span>
                      <span className={`px-2 py-1 rounded-full text-xs sm:text-sm ${
                        booking.status === 'Active' ? 
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200' :
                        booking.status === 'Confirmed' ?
                          'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200'
                      }`}>
                        {booking.status}
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
                          className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors w-full sm:w-auto"
                        >
                          View Requests ({booking.transferRequests.length})
                        </button>
                      )}
                    </div>
                  ) : (
                    room.type === "Open" && (
                      <>
                        {['Pending', 'Active'].includes(booking.status) ? (
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                            <Lock className="w-4 h-4" />
                            <span>Transfer unavailable</span>
                          </div>
                        ) : hasDeclined ? (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                            <X className="w-4 h-4" />
                            <span>Declined</span>
                          </div>
                        ) : hasPendingRequest ? (
                          <button
                            className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-300 cursor-not-allowed text-xs px-2.5 py-1 rounded-full w-full sm:w-auto"
                            disabled
                          >
                            Request Sent ✓
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowTransferModal(true);
                            }}
                            className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-800/50 text-xs px-2.5 py-1 rounded-full transition-all w-full sm:w-auto"
                          >
                            Request Transfer
                          </button>
                        )}
                      </>
                    )
                  )}
                </div>

                {/* User information section */}
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <User className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    <span className="font-medium dark:text-gray-100 break-words">{booking.userId?.username}</span>
                    <span className="text-gray-500 dark:text-gray-400 break-all">• {booking.userId?.email}</span>
                  </div>
                  {booking.additionalUsers?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      <span className="font-medium dark:text-gray-100">Participants:</span>
                      {booking.additionalUsers.map((user) => (
                        <span key={user._id} className="text-gray-500 dark:text-gray-400 break-words">
                          {user.username}
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
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </>
  );
};

export default React.memo(RoomCard);
