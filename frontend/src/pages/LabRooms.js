import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import RoomsSection from "../components/roomsSection";
import { BookOpen } from "lucide-react";
import api from "../utils/axiosConfig";
import { useTranslation } from "react-i18next";
const LabRooms = () => {
  const { t } = useTranslation();
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    const checkAuthentication = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          setUserInfo({
            email: parsedUser.email || "",
            username: parsedUser.username || "",
            profilePicture: parsedUser.profilePicture || "",
            id: parsedUser._id || "",
          });
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        navigate("/login");
      }
    };

    checkAuthentication();
  }, [navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        setUserInfo(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      } catch (error) {
        console.error("Failed to fetch updated profile:", error);
        // handle error or redirect
      }
    };

    fetchProfile();
  }, []);

  // Prevent rendering if not authenticated
  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <Navbar userInfo={userInfo} setUserInfo={setUserInfo} />

      {/* Main content with increased top padding and bottom margin */}
      <main className="flex-grow pt-24 pb-16 container mx-auto px-4">
        {/* Welcome Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <BookOpen className="mr-3 rtl:ml-3 text-blue-500 dark:text-blue-400" />
                {t("labRooms.title")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mt-2">
                {t("labRooms.subtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* Rooms Section */}
        <RoomsSection userInfo={userInfo} />
      </main>

      <Footer />
    </div>
  );
};

export default LabRooms;
