import React, { useState } from "react";
import { AlertCircle, Send, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../utils/axiosConfig";

const IssueReport = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    issueType: "",
    description: "",
    email: "",
    bookingReference: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", content: "" });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/issues/create", formData);
      setMessage({
        type: "success",
        content: "Issue reported successfully! We'll look into it shortly.",
      });
      setFormData({
        issueType: "",
        description: "",
        email: "",
        bookingReference: "",
      });
    } catch (err) {
      setMessage({
        type: "error",
        content: err.response?.data?.msg || "Error reporting issue",
      });
    }
    setLoading(false);
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12 relative"
    >
      {/* Back Button */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 left-4 sm:left-6"
      >
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
      </motion.div>

      {/* Main Content */}
      <div className="w-full max-w-3xl mt-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Report an Issue
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
                  Having problems? Let us know and we'll help you sort it out.
                </p>
              </div>
            </div>
          </div>

          {/* Message Alert */}
          <AnimatePresence>
            {message.content && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
                  message.type === "success"
                    ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                    : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
                }`}
              >
                <AlertCircle
                  className={`h-5 w-5 flex-shrink-0 ${
                    message.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                />
                <span
                  className={`text-sm ${
                    message.type === "success"
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {message.content}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700"
        >
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Issue Type *
                </label>
                <select
                  name="issueType"
                  value={formData.issueType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-all"
                  required
                >
                  <option value="" className="text-gray-500 dark:text-gray-400">
                    Select Issue Type
                  </option>
                  <option value="booking" className="dark:text-gray-100">
                    Booking Problem
                  </option>
                  <option value="technical" className="dark:text-gray-100">
                    Technical Error
                  </option>
                  <option value="other" className="dark:text-gray-100">
                    Other
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-all resize-none"
                  placeholder="Please provide details about your issue..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-all"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Booking Reference
                  </label>
                  <input
                    type="text"
                    name="bookingReference"
                    value={formData.bookingReference}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-all"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 bg-blue-600 dark:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium
                  hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Submit Report</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <div className="px-6 sm:px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span className="text-red-500">*</span>
              Indicates required fields
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default IssueReport;
