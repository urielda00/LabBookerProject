import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { motion } from "framer-motion";
import api from "../utils/axiosConfig";
import { useTranslation } from "react-i18next";

// Helper function to get default title based on slug
const getDefaultTitle = (slug) => {
  const titleMap = {
    "privacy-policy": "Privacy Policy",
    "terms-of-service": "Terms of Service",
    about: "about",
    // Add more slugs and titles as needed
  };
  return titleMap[slug] || slug.split("-").join(" ");
};

const PageEditor = ({ slug, onUpdate }) => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState({ en: "", he: "" });
  const [title, setTitle] = useState({ en: "", he: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [activeLang, setActiveLang] = useState(i18n.language);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "blockquote", "code-block"],
      ["clean"],
    ],
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await api.get(`/pages/${slug}`);
if (res.data.exists) {
  // now grabs the nested object
  setContent(res.data.translations.content);
  setTitle  (res.data.translations.title);
} else {
  setContent({ en: "", he: "" });
  setTitle({
    en: getDefaultTitle(slug),
    he: ""
  });
}

      } catch (error) {
        console.error("Error fetching page:", error);
        setContent({ en: "", he: "" });
        setTitle({ en: getDefaultTitle(slug), he: "" });
      }
    };

    if (user?.role === "admin") fetchPage();
  }, [slug, user]);

  const handleSave = async () => {
    try {
      await api.put(
        `/pages/${slug}`,
        { 
          title: {
            en: title.en,
            he: title.he
          },
          content: {
            en: content.en,
            he: content.he
          }
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error saving page:", error);
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-8"
    >
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          {t("page.edit")}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveLang("en")}
              className={`px-4 py-2 rounded ${
                activeLang === "en" 
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLang("he")}
              className={`px-4 py-2 rounded ${
                activeLang === "he"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              עברית
            </button>
          </div>

          <input
            type="text"
            value={title[activeLang]}
            onChange={(e) => setTitle(prev => ({
              ...prev,
              [activeLang]: e.target.value
            }))}
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
            placeholder={`${t("page.title")} (${activeLang.toUpperCase()})`}
          />

          <ReactQuill
            theme="snow"
            value={content[activeLang]}
            onChange={(value) => setContent(prev => ({
              ...prev,
              [activeLang]: value
            }))}
            modules={modules}
            className="bg-white rounded-lg shadow-sm dark:bg-gray-800 
              dark:text-gray-200 mb-8
              [&_.ql-toolbar]:bg-gray-50 [&_.ql-toolbar]:dark:bg-gray-700
              [&_.ql-container]:border-gray-200 [&_.ql-container]:dark:border-gray-600
              [&_.ql-editor]:dark:text-gray-200"
            placeholder={t("page.contentPlaceholder")}
          />

          <div className="flex gap-4 mt-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              {t("page.save")}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              {t("page.cancel")}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PageEditor;
