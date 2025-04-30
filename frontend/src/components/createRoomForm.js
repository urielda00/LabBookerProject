import React, { useState } from "react";
import iconMapping from "../utils/iconMapping";
import Message from "./Error_successMessage";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import api from "../utils/axiosConfig"; // Import the centralized Axios instance
import { useTranslation } from "react-i18next";
const CreateRoomForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    capacity: "",
    description: "",
    amenities: [],
    image: null,
  });
  const { t } = useTranslation();
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showAmenitiesDropdown, setShowAmenitiesDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // List of amenities based on iconMapping
  const availableAmenities = Object.keys(iconMapping);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleImageChange = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors("");
    setSuccessMessage("");

    if (!formData.name || !formData.type || !formData.capacity) {
      setErrors("Please fill in the name, type, and capacity fields.");
      setLoading(false);
      return;
    }

    if (selectedAmenities.length < 3) {
      setErrors("Please select at least three amenities.");
      setLoading(false);
      return;
    }

    const amenities = selectedAmenities.map((name) => ({ name, icon: name }));
    const formPayload = new FormData();
    formPayload.append("name", formData.name);
    formPayload.append("type", formData.type);
    formPayload.append("capacity", formData.capacity);
    formPayload.append("description", formData.description);
    formPayload.append("amenities", JSON.stringify(amenities));
    if (formData.image) formPayload.append("image", formData.image);

    try {
      const response = await api.post("/room/rooms", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 201) {
        setSuccessMessage("Room created successfully!");
        onSuccess("Room created successfully!");
        setFormData({
          name: "",
          type: "",
          capacity: "",
          description: "",
          amenities: [],
          image: null,
        });
        setSelectedAmenities([]);
      }
    } catch (err) {
      setErrors(
        err.response?.data?.message ||
          "An error occurred while creating the room"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-xl dark:shadow-gray-950/50 p-4 sm:p-6 md:p-8 lg:p-10 transition-colors duration-300"
    >
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6 sm:mb-8">
        {t("createRoom.title")}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 sm:space-y-8 md:space-y-10"
      >
        {/* Section: Basic Details */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-600">
            {t("createRoom.sections.basic")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Room Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t("createRoom.fields.name")}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={t("createRoom.fields.namePlaceHolder")}
              />
            </div>

            {/* Room Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t("createRoom.fields.type")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="rtl:pr-8 w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                <option value="" disabled className="dark:bg-gray-700">
                  {t("createRoom.fields.selectType")}
                </option>
                <option value="Open" className="dark:bg-gray-700">
                  {t("createRoom.fields.types.open")}
                </option>
                <option value="Small Seminar" className="dark:bg-gray-700">
                  {t("createRoom.fields.types.small")}
                </option>
                <option value="Large Seminar" className="dark:bg-gray-700">
                  {t("createRoom.fields.types.large")}
                </option>
              </select>
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t("createRoom.fields.capacity")}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={t("createRoom.fields.capacityPlaceHolder")}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {t("createRoom.fields.description")}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={t("createRoom.fields.descriptionPlaceHolder")}
              />
            </div>
          </div>
        </div>

        {/* Section: Amenities */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-600">
            {t("createRoom.sections.amenities")}
          </h3>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAmenitiesDropdown((prev) => !prev)}
              className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <span className="text-sm sm:text-base">
                {selectedAmenities.length > 0
                  ? t("createRoom.fields.selectedAmenities", {
                      count: selectedAmenities.length,
                    })
                  : t("createRoom.fields.selectAmenities")}
              </span>

              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {showAmenitiesDropdown && (
              <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-950/50 p-3 sm:p-4 max-h-48 sm:max-h-60 overflow-y-auto">
                <input
                  type="text"
                  placeholder={t("createRoom.fields.searchAmenities")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ">
                  {availableAmenities
                    .filter((amenity) =>
                      amenity.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((amenity) => (
                      <label
                        key={amenity}
                        className="flex items-center space-x-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer text-sm text-gray-800 dark:text-gray-200"
                      >
                        <span className="w-5 h-5">{iconMapping[amenity]}</span>
                        <span className="capitalize flex-1">{amenity}</span>
                        <input
                          type="checkbox"
                          checked={selectedAmenities.includes(amenity)}
                          onChange={() => handleAmenityToggle(amenity)}
                          className="form-checkbox h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-500 rounded dark:bg-gray-600"
                        />
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section: Image Upload */}
        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-600">
            {t("createRoom.sections.upload")}
          </h3>
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          />
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

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-gray-700 text-blue-500 dark:text-blue-400 rounded-lg shadow-md hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400 text-sm sm:text-base transition-all duration-300 border border-gray-200 dark:border-gray-600"
          >
            {loading ? t("createRoom.buttons.submitting"): t("createRoom.buttons.submit")}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateRoomForm;
