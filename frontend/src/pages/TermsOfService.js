import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageEditor from "../components/PageEditor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import api from "../utils/axiosConfig";
import { useTranslation } from "react-i18next";

const TermsOfService = () => {
  
// In your components
const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pageData, setPageData] = useState({
    title: "Terms of Service",
    content: "Loading...",
    lastUpdated: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reuse the same Markdown components from PrivacyPolicy
  const components = {
    h1: ({ node, ...props }) => (
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {props.children}
      </h1>
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4">
        {props.children}
      </h2>
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mt-6 mb-3">
        {props.children}
      </h3>
    ),
    p: ({ node, ...props }) => (
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
        {props.children}
      </p>
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-600 dark:text-gray-300">
        {props.children}
      </ul>
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-6 space-y-2 mb-4 text-gray-600 dark:text-gray-300">
        {props.children}
      </ol>
    ),
    li: ({ node, ...props }) => <li className="pl-2">{props.children}</li>,
    a: ({ node, ...props }) => (
      <a
        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {props.children}
      </a>
    ),
    strong: ({ node, ...props }) => (
      <strong className="font-semibold text-gray-900 dark:text-gray-100">
        {props.children}
      </strong>
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-600 dark:text-gray-400">
        {props.children}
      </blockquote>
    ),
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
  }, []);

  const fetchPageData = async () => {
    try {
      const response = await api.get(`/pages/terms-of-service`);
      const lang     = i18n.language; // e.g. "en" or "he"
const { translations, lastUpdated } = response.data;

setPageData({
  title:       translations.title[lang]   || translations.title.en,
  content:     translations.content[lang] || translations.content.en,
  lastUpdated,
});
      setError(null);
    } catch (err) {
      setError(t("page.errors.notFound"));
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleUpdateSuccess = () => {
    fetchPageData();
  };

  const isAdmin = user?.role === "admin";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12 relative"
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

      <div className="w-full max-w-4xl mt-10">
        {isAdmin && (
          <PageEditor slug="terms-of-service" onUpdate={handleUpdateSuccess} />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-8"
        >
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-red-500 dark:text-red-400 text-center py-8">
              {error}
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {pageData.title}
              </h1>

              <article className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={components}
                >
                  {pageData.content}
                </ReactMarkdown>
              </article>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
  {t("page.lastUpdated")}:{" "}
  {pageData.lastUpdated
    ? new Date(pageData.lastUpdated).toLocaleDateString(
        i18n.language, // Use current language
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      )
    : t("page.noUpdateDate")}
</p>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TermsOfService;
