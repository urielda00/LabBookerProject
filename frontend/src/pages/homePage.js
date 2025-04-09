import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import { BookOpen, Calendar, Activity, Clock, MapPin } from "lucide-react";
import api from "../utils/axiosConfig";
import NextBooking from "../components/NextBooking";
import Toast from "../components/errsucModal";
import Modal from "../components/cnfrmModal";
import { useTranslation } from "react-i18next";

const HomePage = () => {
  const { t } = useTranslation();
  const [userInfo, setUserInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState({
    isVisible: false,
    type: "",
    message: "",
    isPersistent: false,
    duration: 5000,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [roomStatuses, setRoomStatuses] = useState([]);
  const [isRoomsExpanded, setIsRoomsExpanded] = useState(true);
  // const [showMissedBookingPrompt, setShowMissedBookingPrompt] = useState(false);
  // const [missedBooking, setMissedBooking] = useState(null);
  const navigate = useNavigate();

  const showToast = (type, message, options = {}) => {
    const { isPersistent = false, duration = 5000 } = options;
    setToast({
      isVisible: true,
      type,
      message,
      isPersistent,
      duration,
    });

    if (!isPersistent) {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, isVisible: false }));
      }, duration);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!storedUser || !token) {
          navigate("/login");
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        setUserInfo(parsedUser);
      } catch (error) {
        console.error("Authentication error:", error);
        navigate("/login");
      }
    };

    checkAuthentication();
  }, [navigate]);

  // Second useEffect for profile updates
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        setUserInfo(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      } catch (error) {
        console.error("Failed to fetch updated profile:", error);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch rooms and active bookings to determine room statuses
  useEffect(() => {
    const fetchRoomStatuses = async () => {
      try {
        // 1. Fetch all rooms
        const roomsResponse = await api.get("room/rooms");
        const rooms = roomsResponse.data;

        // 2. Fetch all active bookings with room details
        const activeBookingsResponse = await api.get("/book/bookings", {
          params: { status: "Active" },
        });
        const activeBookings =
          activeBookingsResponse.data.bookings || activeBookingsResponse.data;

        // 3. Map rooms with their active booking details
        const roomStatusesData = rooms.map((room) => {
          // Find active booking for this room
          const activeBooking = activeBookings.find((booking) => {
            // Handle both populated roomId object and raw ID string
            const bookingRoomId = booking.roomId?._id
              ? booking.roomId._id.toString()
              : booking.roomId.toString();
            return bookingRoomId === room._id.toString();
          });

          return {
            id: room._id,
            name: room.name,
            isActive: !!activeBooking,
            currentBooking: activeBooking
              ? { endTime: activeBooking.endTime }
              : null,
          };
        });

        setRoomStatuses(roomStatusesData);
      } catch (error) {
        console.error("Failed to fetch room statuses", error);
      }
    };

    fetchRoomStatuses();
  }, []);

  // Missed bookings check effect
  // useEffect(() => {
  //   const checkMissedBookings = async () => {
  //     try {
  //       const response = await api.get("/book/booking/missed");
  //       if (response.data.success && response.data.booking) {
  //         setMissedBooking(response.data.booking);
  //         setShowMissedBookingPrompt(true);
  //       }
  //     } catch (error) {
  //       console.error("Error checking missed bookings:", error);
  //     }
  //   };
  //   checkMissedBookings();
  // }, []);

  // const handleLateCheckIn = async (wasPresent) => {
  //   try {
  //     const response = await api.post(`/book/booking/${missedBooking._id}/late-check-in`, {
  //       wasPresent
  //     });

  //     if (response.data.success) {
  //       showToast(
  //         wasPresent ? 'success' : 'warning',
  //         wasPresent
  //           ? 'Booking has been marked as completed'
  //           : 'Booking has been marked as missed',
  //         { duration: 5000 }
  //       );
  //       setShowMissedBookingPrompt(false);
  //       setMissedBooking(null);
  //     }
  //   } catch (error) {
  //     showToast('error', 'Failed to process late check-in', { duration: 5000 });
  //   }
  // };

  // const MissedBookingPrompt = () => (
  //   <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
  //     <div className="bg-white rounded-lg p-6 max-w-md mx-4 relative transform transition-all duration-300 ease-out">
  //       <div className="mb-6">
  //         <h3 className="text-lg font-bold text-gray-900 mb-2">
  //           Missed Booking Check
  //         </h3>
  //         <p className="text-gray-600">
  //           We noticed you didn't check in to your booking for room{' '}
  //           <span className="font-semibold">{missedBooking.roomId.name}</span> on{' '}
  //           <span className="font-semibold">{missedBooking.date}</span> at{' '}
  //           <span className="font-semibold">{missedBooking.startTime}</span>.
  //         </p>
  //         <p className="mt-2 text-gray-600">
  //           Were you present for this booking?
  //         </p>
  //       </div>
  //       <div className="flex justify-end space-x-4">
  //         <button
  //           onClick={() => handleLateCheckIn(false)}
  //           className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
  //         >
  //           No, I Missed It
  //         </button>
  //         <button
  //           onClick={() => handleLateCheckIn(true)}
  //           className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors duration-200"
  //         >
  //           Yes, I Was There
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  // );

  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <Navbar userInfo={userInfo} setUserInfo={setUserInfo} />

      <main className="flex-grow pt-24 pb-16 container mx-auto px-4">
        {/* Welcome Section */}
        <section className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl mb-8">
          <div className="flex items-center justify-between rtl:space-x-reverse">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 rtl:space-x-reverse text-blue-600 dark:text-blue-400">
                <Clock className="w-6 h-6" />
                <span className="text-sm font-medium">
                  {formatTime(currentTime)}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-sm font-medium">
                  {formatDate(currentTime)}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {t("homepage.welcome", { username: userInfo.username })}
                <span className="text-blue-600 dark:text-blue-400 ml-2 rtl:ml-0 rtl:mr-2">
                  👋
                </span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-3xl">
                {t("homepage.description")}
              </p>
            </div>
            {/* <div className="hidden md:block relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl shadow-lg flex items-center justify-center">
                <Activity className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
            </div> */}
          </div>
        </section>

        {/* Room Status Section */}
        <section className="mb-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div
              className="flex items-center justify-between sm:cursor-default cursor-pointer rtl:space-x-reverse"
              onClick={() => {
                if (window.innerWidth < 640) {
                  setIsRoomsExpanded((prev) => !prev);
                }
              }}
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-300">
                  {t("homepage.labRoomStatus")}
                </h2>
              </div>
              {/* Chevron Icon - Hidden on desktop */}
              <button
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors sm:hidden"
                aria-label={
                  isRoomsExpanded ? "Collapse section" : "Expand section"
                }
              >
                <svg
                  className={`w-6 h-6 transform transition-transform ${
                    isRoomsExpanded ? "rotate-180" : ""
                  } text-gray-900 dark:text-gray-200`}
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

          {isRoomsExpanded && (
            <div className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {roomStatuses.map((room) => (
                  <div
                    key={room.id}
                    className="relative group bg-white dark:bg-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-blue-100 dark:hover:border-blue-400 mt-2"
                  >
                    <div className="flex items-start justify-between rtl:space-x-reverse">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          {room.name}
                        </h3>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              room.isActive
                                ? "bg-red-500 dark:bg-red-400"
                                : "bg-green-400 dark:bg-green-500"
                            }`}
                          />
                          <p
                            className={`text-sm font-medium ${
                              room.isActive
                                ? "text-gray-600 dark:text-red-300"
                                : "text-gray-500 dark:text-green-400"
                            }`}
                          >
                            {room.isActive ? t("homepage.occupied") : t("homepage.available")}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded-lg ${
                          room.isActive
                            ? "bg-red-100 dark:bg-red-500/20"
                            : "bg-green-100 dark:bg-green-900/20"
                        }`}
                      >
                        <Activity
                          className={`w-5 h-5 ${
                            room.isActive
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-400 dark:text-green-300"
                          }`}
                        />
                      </div>
                    </div>

                    {room.isActive && (
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                        <div className="flex items-center justify-between text-sm rtl:space-x-reverse">
                          <span className="text-gray-500 dark:text-gray-400">
                            Until
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {room.currentBooking?.endTime || "..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Next Booking Section */}
        <NextBooking
          showToast={showToast}
          setIsModalOpen={setIsModalOpen}
          setModalConfig={setModalConfig}
          userInfo={userInfo}
        />

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Book a Room Card */}
          <div
            onClick={() => navigate("/labrooms")}
            className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start space-x-6 rtl:space-x-reverse relative z-10">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {t("homepage.bookARoom")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("homepage.bookARoomDesc")}
                </p>
              </div>
            </div>
            {/* Positioned bubble in LTR at bottom-right, flips in RTL */}
            <div className="absolute -bottom-8 -right-8 rtl:-left-8 rtl:right-auto w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          </div>

          {/* My Bookings Card */}
          <div
            onClick={() => navigate("/bookings")}
            className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start space-x-6 rtl:space-x-reverse relative z-10">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {t("homepage.myBookings")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("homepage.myBookingsDesc")}
                </p>
              </div>
            </div>
            {/* Positioned bubble in LTR at bottom-right, flips in RTL */}
            <div className="absolute -bottom-8 -right-8 rtl:-left-8 rtl:right-auto w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          </div>
        </div>
      </main>

      <Footer className="mt-auto" />

      {/* Modals and Toasts */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        {...modalConfig}
      />

      {/* {showMissedBookingPrompt && missedBooking && <MissedBookingPrompt />} */}

      {toast.isVisible && (
        <div className="fixed bottom-4 right-4 z-50 rtl:right-auto rtl:left-4">
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;
