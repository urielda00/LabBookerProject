// BookingPage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { SidebarLayout } from "../components/SidebarLayout";
import BookingOperations from "../components/bookingOperations";
import CretaeBooking from "../components/createBooking";
import UpdateBooking from "../components/updateBooking";
import DeleteBooking from "../components/deleteBooking";
import { useTranslation } from "react-i18next";
const BookingPage = () => {
  const [operation, setOperation] = useState("create");
  const [bookingId, setBookingId] = useState("");
  const [bookingDetails, setBookingDetails] = useState(null);
  const { t } = useTranslation();
  const handleSuccess = (message) => {
    console.log(message);
    setBookingId("");
    setBookingDetails(null);
  };

  return (
    <SidebarLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen w-full flex flex-col items-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 overflow-x-hidden dark:bg-gray-900 transition-colors duration-300"
      >
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8"
        >
          {t("bookingPage.title")}
        </motion.h1>

        {/* Booking Operations */}
        <div className="w-full max-w-4xl">
          <BookingOperations
            setOperation={setOperation}
            setBookingId={setBookingId}
            setBookingDetails={setBookingDetails}
            operation={operation}
          />
        </div>

        {/* Forms */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl mt-4 sm:mt-6"
        >
          {operation === "create" && (
            <CretaeBooking operation={operation} onSuccess={handleSuccess} />
          )}
          {operation === "update" && (
            <UpdateBooking
              operation={operation}
              bookingId={bookingId}
              bookingDetails={bookingDetails}
              setBookingId={setBookingId}
              setBookingDetails={setBookingDetails}
              onSuccess={handleSuccess}
            />
          )}
          {operation === "delete" && (
            <DeleteBooking operation={operation} onSuccess={handleSuccess} />
          )}
        </motion.div>
      </motion.div>
    </SidebarLayout>
  );
};

export default BookingPage;
