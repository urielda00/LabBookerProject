// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import your translation JSON files
import translationEN from "./locales/en/translation.json";
import translationHE from "./locales/he/translation.json";

const resources = {
  en: { translation: translationEN },
  he: { translation: translationHE },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Specify the default (fallback) language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

i18n.on("languageChanged", (lng) => {
  if (lng === "he") {
    document.documentElement.setAttribute("dir", "rtl");
  } else {
    document.documentElement.setAttribute("dir", "ltr");
  }
});

export default i18n;
