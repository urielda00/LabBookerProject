import React, { useState, useEffect } from "react";
import i18n from "../i18n";
import { Globe, Moon, Sun } from "lucide-react";

const LanguageSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const storedMode = localStorage.getItem("theme");

    if (storedMode === "dark" || (!storedMode && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const toggleDarkMode = () => {
    const root = document.documentElement;
    const newMode = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark");
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newMode);
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button - Always Dark */}
      <button
        onClick={toggleDropdown}
        className="
          group
          flex items-center gap-2
          px-3 py-2
          rounded-lg
          bg-gray-800
          text-gray-200
          hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500/40
          transition-all duration-200 ease-in-out
          shadow-sm
        "
        aria-label="Change Language or Theme"
      >
        <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Respects Theme */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-2
            w-48
            bg-white dark:bg-gray-800
            rounded-xl
            shadow-lg 
            ring-1 ring-black/5 dark:ring-white/10
            transform opacity-100 scale-100
            transition-all duration-200 ease-in-out
            z-50
          "
        >
          <div className="p-2 space-y-1">
            {/* Language Options */}
            <button
              onClick={() => changeLanguage("en")}
              className="
                flex items-center w-full px-3 py-2
                text-sm text-gray-700 dark:text-gray-200
                rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-150
              "
            >
              <span className="mr-2">🇺🇸</span>
              English
            </button>
            <button
              onClick={() => changeLanguage("he")}
              className="
                flex items-center w-full px-3 py-2
                text-sm text-gray-700 dark:text-gray-200
                rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-150
              "
            >
              <span className="mr-2">🇮🇱</span>
              עברית
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="
                flex items-center justify-between w-full
                px-3 py-2
                text-sm text-gray-700 dark:text-gray-200
                rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-150
              "
            >
              <span>{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
              <span className="p-1 rounded-md bg-gray-100 dark:bg-gray-700">
                {isDarkMode ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;