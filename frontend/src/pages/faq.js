import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FAQEditor from "../components/FAQEditor";
import api from "../utils/axiosConfig";

const DEFAULT_SECTIONS = {
  general: [],
  support: [],
  booking: [],
  account: [],
  privacy: [],
  feedback: [],
};

const FAQ = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("general");
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
    fetchFAQ();
  }, []);

  const fetchFAQ = async () => {
    try {
      const response = await api.get("/faq");
      setSections({ ...DEFAULT_SECTIONS, ...response.data.sections });
      setLastUpdated(response.data.lastUpdated);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setSections(DEFAULT_SECTIONS);
      } else {
        setError("Failed to load FAQ");
      }
      setLoading(false);
    }
  };

  const handleSave = async (updatedSections) => {
    try {
      await api.put("/faq", { sections: updatedSections });
      await fetchFAQ();
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  const toggleQuestion = (id) => {
    setActiveQuestion(activeQuestion === id ? null : id);
  };

  const handleScroll = (direction) => {
    const questions = sections[activeSection];
    if (direction === "up" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (
      direction === "down" &&
      currentQuestionIndex + 3 < questions.length
    ) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse text-xl text-gray-600 dark:text-gray-400">
          Loading FAQs...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500 dark:text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-between px-6 sm:px-8 md:px-12 py-12"
    >
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

      <div className="mt-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg sm:text-xl">
            Have questions? Find your answers here.
          </p>
          {(user?.role === "admin" || user?.role === "manager") && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="mt-6 px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {isEditing ? "Cancel Editing" : "Edit FAQ"}
            </button>
          )}
        </motion.div>

        {error && (
          <div className="text-center text-red-500 dark:text-red-400 mb-8">
            {error}
          </div>
        )}

        {isEditing ? (
          <FAQEditor
            initialSections={sections}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:flex lg:flex-col w-full lg:w-1/4">
              {Object.keys(sections).map((section) => (
                <button
                  key={section}
                  onClick={() => {
                    setActiveSection(section);
                    setCurrentQuestionIndex(0);
                  }}
                  className={`px-4 py-3 text-center font-semibold text-lg rounded-lg transition-all ${
                    activeSection === section
                      ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
            </div>

            <div className="lg:w-px lg:h-auto lg:bg-gray-300 dark:lg:bg-gray-600 w-full h-px bg-gray-300 dark:bg-gray-600"></div>

            <div className="relative flex-1">
              <button
                onClick={() => handleScroll("up")}
                disabled={currentQuestionIndex === 0}
                className="absolute top-[-10px] left-1/2 transform -translate-x-1/2 p-2 bg-blue-500 dark:bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FaChevronUp size={24} />
              </button>

              <motion.div
                layout
                className="space-y-8 pt-10 pb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {sections[activeSection]
                  .slice(currentQuestionIndex, currentQuestionIndex + 3)
                  .map(({ id, question, answer }) => (
                    <motion.div
                      key={id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="accordion py-6 px-8 border-b border-solid border-gray-300 dark:border-gray-600 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 hover:bg-gradient-to-l hover:from-gray-200 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 shadow-md hover:shadow-lg transition-colors duration-300"
                    >
                      <button
                        onClick={() => toggleQuestion(id)}
                        className="accordion-toggle group inline-flex items-center justify-between leading-8 text-gray-900 dark:text-gray-100 w-full transition duration-500 text-left hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <h5 className="text-xl sm:text-2xl font-semibold">
                          {question}
                        </h5>
                        <svg
                          className={`text-gray-500 dark:text-gray-400 transition duration-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 ${
                            activeQuestion === id ? "rotate-180" : "rotate-0"
                          }`}
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16.5 8.25L12.4142 12.3358C11.7475 13.0025 11.4142 13.3358 11 13.3358C10.5858 13.3358 10.2525 13.0025 9.58579 12.3358L5.5 8.25"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      </button>
                      <AnimatePresence>
                        {activeQuestion === id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full px-0 overflow-hidden"
                          >
                            <p className="text-base text-gray-800 dark:text-gray-300 leading-6 mt-4">
                              {answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
              </motion.div>

              <button
                onClick={() => handleScroll("down")}
                disabled={
                  currentQuestionIndex + 3 >= sections[activeSection].length
                }
                className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 p-2 bg-blue-500 dark:bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FaChevronDown size={24} />
              </button>
            </div>
          </div>
        )}

        {!isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Didn’t find your question?{" "}
              <button
                onClick={() => navigate('/contact')}

                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Contact Customer Support
              </button>
            </p>
          </motion.div>
        )}

        {!isEditing && lastUpdated && (
          <div className="pt-6 border-t border-gray-400 dark:border-gray-700 mt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Last updated:{" "}
              {new Date(lastUpdated).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default FAQ;
