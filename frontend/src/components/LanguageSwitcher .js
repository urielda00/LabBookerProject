import React from "react";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = React.useState(i18n.language);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setCurrentLang(lng);
  };

  return (
    <div className="flex flex-col gap-1.5 p-1.5 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="px-2.5 py-1.5 text-xs font-medium text-gray-400">
        {t("nav.language")}
      </div>
      
      <button
        onClick={() => changeLanguage("en")}
        className={`
          flex items-center justify-between
          px-3 py-2
          rounded-md
          text-sm
          transition-colors
          ${currentLang === "en" 
            ? "bg-blue-500/20 text-blue-400"
            : "text-gray-300 hover:bg-gray-700"}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🇺🇸</span>
          <span>English</span>
        </div>
        {currentLang === "en" && <Check className="w-4 h-4 text-blue-400" />}
      </button>

      <button
        onClick={() => changeLanguage("he")}
        className={`
          flex items-center justify-between
          px-3 py-2
          rounded-md
          text-sm
          transition-colors
          ${currentLang === "he" 
            ? "bg-blue-500/20 text-blue-400"
            : "text-gray-300 hover:bg-gray-700"}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🇮🇱</span>
          <span>עברית</span>
        </div>
        {currentLang === "he" && <Check className="w-4 h-4 text-blue-400" />}
      </button>
    </div>
  );
};

export default React.memo(LanguageSwitcher);