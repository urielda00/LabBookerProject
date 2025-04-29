import React from "react";
import { motion } from "framer-motion";
import { Plus, Edit, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";
const RoomOperations = ({
  setOperation,
  setRoomId,
  setRoomDetails,
  operation,
}) => {
  const handleOperationChange = (newOperation) => {
    setOperation(newOperation);
    if (newOperation !== "create") {
      setRoomId("");
      setRoomDetails(null);
    }
  };
  const { t } = useTranslation();
  const buttonVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  };

  const operations = [
    { label: t("roomPage.operations.create"), operation: "create", icon: Plus },
    { label: t("roomPage.operations.update"), operation: "update", icon: Edit },
    { label: t("roomPage.operations.delete"), operation: "delete", icon: Trash },
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8"
    >
      {operations.map(({ label, operation: currentOperation, icon: Icon }) => (
        <motion.button
          key={currentOperation}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleOperationChange(currentOperation)}
          className={`min-h-[64px] sm:min-h-0 flex flex-col sm:flex-row items-center justify-center p-4 sm:p-6 
            bg-white dark:bg-gray-800 
            text-gray-800 dark:text-gray-200 
            font-semibold rounded-xl shadow-md hover:shadow-xl 
            transition-all duration-300 
            border border-gray-100 dark:border-gray-700 
            hover:border-blue-200 dark:hover:border-blue-600 
            group ${
              operation === currentOperation
                ? "ring-2 ring-blue-500 dark:ring-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                : ""
            }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="text-xs sm:text-sm md:text-base text-center sm:text-left">
              {label}
            </span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};

export default RoomOperations;
