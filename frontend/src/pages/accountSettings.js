import React, { useEffect, useState, useCallback, useContext } from "react";
import { User, Bell, Shield, Upload, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import { useTranslation } from "react-i18next";

import { SidebarLayout } from "../components/SidebarLayout";
import { ThemeContext } from "../contexts/ThemeContext";
import api from "../utils/axiosConfig";
import { getCroppedImg } from "../utils/cropImageUtil";
import Message from "../components/Error_successMessage";
import VerificationModal from "../components/VerificationModal";
import LanguageSwitcher from "../components/LanguageSwitcher ";

const ProfileSettings = () => {
  const { t } = useTranslation();
  const { toggleTheme, isDark } = useContext(ThemeContext);

  const [activeTab, setActiveTab] = useState("profile");
  const [userInfo, setUserInfo] = useState({
    email: "",
    username: "",
    name: "",
    profilePicture: null,
  });

  const [editForm, setEditForm] = useState({
    email: "",
    name: "",
    image: null,
    previewUrl: "",
    removeImage: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Email verification modal state
  const [verificationModal, setVerificationModal] = useState({
    isOpen: false,
    email: "",
    code: "",
    error: "",
  });

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Fetch current user info
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        const data = response.data;
        setUserInfo(data);
        setEditForm({
          email: data.email,
          name: data.name,
          image: null,
          previewUrl: data.profilePicture || "",
          removeImage: false,
        });
      } catch (error) {
        setErrors(t("profileSettings.errors.loadProfileError"));
      }
    };
    fetchProfile();
  }, [t]);

  // Clear messages on input interactions
  const clearMessages = () => {
    if (errors) setErrors("");
    if (successMessage) setSuccessMessage("");
  };

  // Handle file selection
  const handleImageChange = (e) => {
    clearMessages();
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    const maxSize = 5 * 1024 * 1024;
    if (!validTypes.includes(file.type)) {
      setErrors(t("profileSettings.errors.invalidImageType"));
      return;
    }
    if (file.size > maxSize) {
      setErrors(t("profileSettings.errors.invalidImageSize"));
      return;
    }

    setRawImage(file);
    setShowCropper(true);
  };

  // Cropper callbacks
  const onCropChange = useCallback((newCrop) => setCrop(newCrop), []);
  const onZoomChange = useCallback((newZoom) => setZoom(newZoom), []);
  const onCropComplete = useCallback(
    (_, croppedAreaPx) => setCroppedAreaPixels(croppedAreaPx),
    []
  );

  // Confirm cropping
  const handleCropComplete = async () => {
    clearMessages();
    try {
      const croppedFile = await getCroppedImg(rawImage, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedFile);
      setEditForm((prev) => ({
        ...prev,
        image: croppedFile,
        previewUrl,
        removeImage: false,
      }));
      setShowCropper(false);
    } catch (err) {
      setErrors(t("profileSettings.errors.cropImageError"));
    }
  };

  // Cancel cropping
  const handleCropCancel = () => {
    clearMessages();
    setShowCropper(false);
    setRawImage(null);
  };

  // Remove profile picture
  const handleRemoveImage = () => {
    clearMessages();
    setEditForm((prev) => ({
      ...prev,
      image: null,
      previewUrl: "",
      removeImage: true,
    }));
  };

  // Handle email changes (initiate verification)
  const handleEmailChange = async (newEmail) => {
    clearMessages();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setErrors(t("profileSettings.errors.invalidEmail"));
      return;
    }
    try {
      const checkRes = await api.post("/user/check-email", { email: newEmail });
      if (!checkRes.data.available) {
        setErrors(t("profileSettings.errors.emailInUse"));
        return;
      }
      await api.post("/user/initiate-email-change", { newEmail });
      setVerificationModal({
        isOpen: true,
        email: userInfo.email, // or you may want to store `newEmail` here
        code: "",
        error: "",
      });
    } catch (error) {
      setErrors(t("profileSettings.errors.initiateEmailChange"));
    }
  };

  const cancelEmailChangeRequest = async () => {
    try {
      await api.post("/user/cancel-email-change");
      setSuccessMessage(t("profileSettings.success.emailChangeCancelled"));
    } catch (error) {
      setErrors(
        error.response?.data?.message ||
          t("profileSettings.errors.cancelEmailChange")
      );
    }
  };

  const handleVerifyEmail = async () => {
    clearMessages();
    try {
      await api.post("/user/verify-email-change", {
        verificationCode: verificationModal.code,
      });
      // If successful, update userInfo email:
      setUserInfo((prev) => ({
        ...prev,
        email: verificationModal.email,
      }));
      setVerificationModal({ isOpen: false, email: "", code: "", error: "" });
      setSuccessMessage(t("profileSettings.success.emailUpdated"));
      setIsEditing(false);
    } catch (error) {
      setVerificationModal((prev) => ({
        ...prev,
        error:
          error.response?.data?.message ||
          t("profileSettings.errors.invalidVerificationCode"),
      }));
    }
  };

  const handleSaveChanges = async () => {
    clearMessages();
    try {
      setLoading(true);

      if (editForm.email !== userInfo.email) {
        // This triggers the email verification flow
        await handleEmailChange(editForm.email);
        setLoading(false);
        return;
      }

      if (editForm.name !== userInfo.name) {
        if (editForm.name.length < 2 || editForm.name.length > 50) {
          setErrors(t("profileSettings.errors.invalidNameLength"));
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      if (editForm.name !== userInfo.name) {
        formData.append("name", editForm.name);
      }
      if (editForm.image) {
        formData.append("image", editForm.image);
      }
      if (editForm.removeImage) {
        formData.append("removeImage", "true");
      }

      const hasNameChange = editForm.name !== userInfo.name;
      const hasImageChange = editForm.image || editForm.removeImage;

      if (!hasNameChange && !hasImageChange) {
        setErrors(t("profileSettings.errors.noChanges"));
        setLoading(false);
        return;
      }

      const response = await api.put("/user/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { user: updatedUser } = response.data;
      setUserInfo(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setEditForm((prev) => ({
        ...prev,
        image: null,
        removeImage: false,
        previewUrl: updatedUser.profilePicture || "",
      }));
      setRawImage(null);
      setIsEditing(false);
      setSuccessMessage(t("profileSettings.success.profileUpdated"));
    } catch (error) {
      setErrors(
        error.response?.data?.message ||
          t("profileSettings.errors.updateProfile")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    clearMessages();
    if (isEditing) {
      // reset form
      setEditForm({
        email: userInfo.email,
        name: userInfo.name,
        image: null,
        previewUrl: userInfo.profilePicture || "",
        removeImage: false,
      });
    }
    setIsEditing(!isEditing);
  };

  return (
    <SidebarLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full flex flex-col items-center min-h-screen px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 md:py-10 overflow-x-hidden
                   dark:bg-gray-900 bg-gray-50 transition-colors duration-300"
      >
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8 transition-colors duration-300"
        >
          {t("profileSettings.header")}
        </motion.h1>

        {/* Tabs Navigation */}
        <div className="w-full max-w-4xl">
          <motion.div
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8"
          >
            {[
              {
                label: t("profileSettings.tabs.profile"),
                id: "profile",
                icon: User,
              },
              {
                label: t("profileSettings.tabs.appearance"),
                id: "security", // or "appearance"
                icon: Shield,
              },
              {
                label: t("profileSettings.tabs.notifications"),
                id: "notifications",
                icon: Bell,
              },
            ].map(({ label, id, icon: Icon }) => (
              <motion.button
                key={id}
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  hover: { scale: 1.05 },
                  tap: { scale: 0.95 },
                }}
                whileHover="hover"
                whileTap="tap"
                onClick={() => {
                  clearMessages();
                  setActiveTab(id);
                }}
                className={`flex items-center justify-center p-3 sm:p-6 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 group ${
                  activeTab === id
                    ? "ring-2 ring-blue-500 dark:ring-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-2">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-xs sm:text-sm md:text-base mt-1 sm:mt-0">
                    {label}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Main Content Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 md:p-10 transition-colors duration-300">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 sm:space-y-10"
              >
                {activeTab === "profile" && (
                  <div className="space-y-6 sm:space-y-10">
                    {/* Profile Picture Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <h3
                        dir="rtl"
                        className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 transition-colors duration-300"
                      >
                        {t("profileSettings.profilePictureHeader")}
                      </h3>
                      <div dir="ltr" className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                        <div className="relative">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-600">
                            {editForm.previewUrl ? (
                              <img
                                src={editForm.previewUrl}
                                alt={t("profileSettings.profilePictureAlt")}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center  justify-center text-2xl sm:text-3xl font-bold text-gray-400 dark:text-gray-300">
                                {userInfo.username?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>

                          {isEditing && (
                            <label className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-300">
                              <Upload className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                              />
                            </label>
                          )}
                        </div>

                        <div className="text-center sm:text-left">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 transition-colors duration-300">
                            {userInfo.name}
                          </h3>
                          {isEditing && (
                            <>
                              <p className="text-sm text-gray-500 dark:text-gray-400 rtl:mr-3">
                                {t("profileSettings.profilePictureHint")}
                              </p>
                              {editForm.previewUrl && (
                                <button
                                  onClick={handleRemoveImage}
                                  className="mt-2 px-3 py-1 inline-flex items-center text-sm rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-300"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  {t("profileSettings.removeButton")}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile Information Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <h3
                        dir="rtl"
                        className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 transition-colors duration-300"
                      >
                        {t("profileSettings.basicInformationHeader")}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Username Field */}
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                            {t("profileSettings.username")}
                          </label>
                          <input
                            type="text"
                            value={userInfo.username}
                            disabled
                            className="mt-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors duration-300"
                          />
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t("profileSettings.usernameInfo")}
                          </p>
                        </div>

                        {/* Name Field */}
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                            {t("profileSettings.name")}
                            {isEditing && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={isEditing ? editForm.name : userInfo.name}
                            onChange={(e) => {
                              clearMessages();
                              setEditForm((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }));
                            }}
                            disabled={!isEditing}
                            className={`mt-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              !isEditing ? "bg-gray-50" : ""
                            } dark:bg-gray-700 transition-colors duration-300 dark:text-gray-200`}
                          />
                        </div>

                        {/* Email Field */}
                        <div className="md:col-span-2 w-full">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                            {t("profileSettings.email")}
                            {isEditing && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          <input
                            type="email"
                            value={isEditing ? editForm.email : userInfo.email}
                            onChange={(e) => {
                              clearMessages();
                              setEditForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }));
                            }}
                            disabled={!isEditing}
                            className={`mt-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              !isEditing ? "bg-gray-50" : ""
                            } dark:bg-gray-700 transition-colors duration-300 dark:text-gray-200`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="text-center">
                      {errors && (
                        <Message
                          message={errors}
                          type="error"
                          onClose={() => setErrors("")}
                        />
                      )}
                      {successMessage && (
                        <Message
                          message={successMessage}
                          type="success"
                          onClose={() => setSuccessMessage("")}
                        />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 sm:space-x-3 rtl:space-x-reverse">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleEditToggle}
                            className="px-4 sm:px-6 py-2 sm:py-3 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-400 border border-gray-300 dark:border-gray-600 transition-colors duration-300"
                          >
                            {t("profileSettings.cancel")}
                          </button>
                          <button
                            onClick={handleSaveChanges}
                            disabled={loading}
                            className="px-4 sm:px-6 py-2 sm:py-3 text-sm bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 rounded-lg shadow-md hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400 transition-colors duration-300"
                          >
                            {loading
                              ? t("profileSettings.saving")
                              : t("profileSettings.saveChanges")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleEditToggle}
                          className="px-4 sm:px-6 py-2 sm:py-3 text-sm bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 rounded-lg shadow-md hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400 transition-colors duration-300"
                        >
                          {t("profileSettings.editProfile")}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-4">
                    <h3
                      dir="rtl"
                      className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2"
                    >
                      {t("profileSettings.appearanceHeader")}
                    </h3>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 sm:p-6">
                      <label className="inline-flex items-center cursor-pointer w-full justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            {t("profileSettings.darkMode")}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("profileSettings.darkModeDescription")}
                          </p>
                        </div>
                        <div dir="ltr" className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isDark}
                            onChange={toggleTheme}
                          />
                          <div
                            className="
                              relative 
                              w-11 
                              h-6 
                              bg-gray-200 
                              peer-focus:outline-none 
                              rounded-full 
                              peer 
                              dark:bg-gray-600 
                              peer-checked:bg-blue-600 
                              peer-checked:after:translate-x-full 
                              after:content-['']
                              after:absolute 
                              after:top-[2px] 
                              after:start-[2px] 
                              after:bg-white 
                              after:rounded-full 
                              after:h-5 
                              after:w-5 
                              after:transition-all
                            "
                          >
                            {/* Add RTL support if you have i18n with RTL */}
                          </div>
                        </div>
                      </label>
                    </div>
                    {/* <LanguageSwitcher/> */}
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3
                        dir="rtl"
                        className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 transition-colors duration-300"
                      >
                        {t("profileSettings.notificationsHeader")}
                      </h3>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 sm:p-6 transition-colors duration-300">
                        <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-300">
                          {t("profileSettings.notificationsComingSoonTitle")}
                        </h4>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 transition-colors duration-300">
                          {t("profileSettings.notificationsComingSoonDescription")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Verification Modal */}
        <VerificationModal
          isOpen={verificationModal.isOpen}
          email={verificationModal.email}
          code={verificationModal.code}
          error={verificationModal.error}
          onCodeChange={(code) =>
            setVerificationModal((prev) => ({ ...prev, code }))
          }
          onConfirm={handleVerifyEmail}
          onClose={() =>
            setVerificationModal({ isOpen: false, email: "", code: "", error: "" })
          }
          onCancelEmailChange={cancelEmailChangeRequest}
        />

        {/* Cropper Modal */}
        {showCropper && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl relative w-full max-w-sm sm:max-w-md transition-colors duration-300">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 transition-colors duration-300">
                {t("profileSettings.cropperTitle")}
              </h2>
              <div className="relative w-full h-48 sm:h-64 bg-gray-200 dark:bg-gray-700">
                <Cropper
                  image={rawImage && URL.createObjectURL(rawImage)}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={onCropChange}
                  onZoomChange={onZoomChange}
                  onCropComplete={onCropComplete}
                  restrictPosition={false}
                />
              </div>
              <div className="mt-2 flex justify-center">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-2/3 dark:accent-blue-500"
                />
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={handleCropCancel}
                  className="px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-400 border border-gray-300 dark:border-gray-600 transition-all duration-300"
                >
                  {t("profileSettings.cropper.cancel")}
                </button>
                <button
                  onClick={handleCropComplete}
                  className="px-6 py-3 bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 rounded-lg shadow-md hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400 transition-all duration-300"
                >
                  {t("profileSettings.cropper.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </SidebarLayout>
  );
};

export default ProfileSettings;
