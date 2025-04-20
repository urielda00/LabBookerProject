// RoomPage.jsx
import React, { useState } from "react";
import RoomOperations from "../components/roomOperations";
import CreateRoomForm from "../components/createRoomForm";
import UpdateRoomForm from "../components/updateRoomForm";
import DeleteRoomForm from "../components/deleteRoomForm";
import { SidebarLayout } from "../components/SidebarLayout";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
const RoomPage = () => {
  const [operation, setOperation] = useState("create");
  const [roomId, setRoomId] = useState("");
  const [roomDetails, setRoomDetails] = useState(null);
  const { t } = useTranslation();
  const handleSuccess = (message) => {
    console.log(message);
    setRoomId("");
    setRoomDetails(null);
  };

  return (
    <SidebarLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full flex flex-col min-h-screen items-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 overflow-x-hidden dark:bg-gray-900 transition-colors duration-300"
      >
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8 transition-colors duration-300"
        >
          {t("roomPage.header")}
        </motion.h1>

        {/* Room Operations */}
        <div className="w-full max-w-4xl">
          <RoomOperations
            setOperation={setOperation}
            setRoomId={setRoomId}
            setRoomDetails={setRoomDetails}
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
            <CreateRoomForm
              operation={operation}
              onSuccess={handleSuccess}
              className="dark:text-gray-200"
            />
          )}
          {operation === "update" && (
            <UpdateRoomForm
              operation={operation}
              roomId={roomId}
              roomDetails={roomDetails}
              setRoomId={setRoomId}
              setRoomDetails={setRoomDetails}
              onSuccess={handleSuccess}
              className="dark:text-gray-200"
            />
          )}
          {operation === "delete" && (
            <DeleteRoomForm
              operation={operation}
              onSuccess={handleSuccess}
              className="dark:text-gray-200"
            />
          )}
        </motion.div>
      </motion.div>
    </SidebarLayout>
  );
};

export default RoomPage;
