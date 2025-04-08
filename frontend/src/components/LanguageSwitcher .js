// LanguageSwitcher.jsx
import React, { useState } from "react";
import { Globe } from "lucide-react"; // If you use lucide-react for icons
import i18n from "../i18n"; // Adjust the path to your i18n config

const LanguageSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false); // close dropdown after selecting
  };

  return (
    <div className="relative">
      {/* Globe Icon Button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white transition"
      >
        <Globe className="w-5 h-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-32 bg-white text-black rounded-md shadow-lg z-50"
          onMouseLeave={() => setIsOpen(false)} // optional auto-close on mouse leave
        >
          <ul className="flex flex-col py-2">
            <li>
              <button
                onClick={() => changeLanguage("en")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                English
              </button>
            </li>
            <li>
              <button
                onClick={() => changeLanguage("he")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                עברית
              </button>
            </li>
            {/* Add more languages if needed */}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
