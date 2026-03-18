import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

import collegeLogoPNG from "../../assets/collegeLogoWhite.png";
import collegeLogoPNG2x from "../../assets/collegeLogoWhite@2x.png";
import collegeLogoWEBP from "../../assets/collegeLogoWhite.webp";
import collegeLogoWEBP2x from "../../assets/collegeLogoWhite@2x.webp";
import Header from "../../assets/header-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    {
      icon: <BookOpen />,
      title: t("hero.features.easyBooking.title"),
      description: t("hero.features.easyBooking.description"),
    },
    {
      icon: <Users />,
      title: t("hero.features.collaborativeSpaces.title"),
      description: t("hero.features.collaborativeSpaces.description"),
    },
    {
      icon: <Shield />,
      title: t("hero.features.secureAccess.title"),
      description: t("hero.features.secureAccess.description"),
    },
  ];

  return (
    <div dir ="ltr"
      className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center pt-16"
      style={{ backgroundImage: `url(${Header})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

      <div className="relative z-10 container mx-auto px-4 md:px-8 lg:px-16 h-full flex flex-col items-center justify-between">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          {/* Left Column */}
          <div className="text-white text-left">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6"
            >
              {t("hero.headline")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-base md:text-xl mb-6 md:mb-8 text-grayLight max-w-[500px]"
            >
              {t("hero.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-gradient-primaryToRight text-sm md:text-base text-white rounded-lg font-semibold hover:bg-gradient-primaryToLeft transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
                {t("hero.createAccount")}
              </button>
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto px-4 py-2.5 md:px-6 md:py-3 border border-white text-sm md:text-base text-white rounded-lg font-semibold hover:bg-white hover:text-grayDark transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 md:w-5 md:h-5" />
                {t("hero.login")}
              </button>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 * (index + 1) }}
                className="bg-white/10 backdrop-blur-sm p-4 md:p-6 rounded-lg md:rounded-xl border border-white/20 hover:border-primary transition-all duration-300"
              >
                <div className="flex items-center mb-3 md:mb-4">
                  {React.cloneElement(feature.icon, {
                    className: "w-6 h-6 md:w-8 md:h-8 text-primary",
                  })}
                  <h3 className="ml-3 md:ml-4 text-lg md:text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-sm md:text-base text-grayLight">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* College Logo */}
        <div className="w-full flex justify-center mt-8">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 overflow-visible">
            <picture>
              <source
                srcSet={`${collegeLogoWEBP} 512w, ${collegeLogoWEBP2x} 1024w`}
                type="image/webp"
                sizes="(max-width: 640px) 128px,
                       (max-width: 768px) 160px,
                       (max-width: 1024px) 192px,
                       256px"
              />
              <source
                srcSet={`${collegeLogoPNG} 512w, ${collegeLogoPNG2x} 1024w`}
                type="image/png"
                sizes="(max-width: 640px) 128px,
                       (max-width: 768px) 160px,
                       (max-width: 1024px) 192px,
                       256px"
              />
              <img
                src={collegeLogoPNG}
                alt="Azrieli College Logo"
                className="w-full h-full object-contain opacity-90 hover:opacity-100 transform-gpu origin-center transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{
                  imageRendering: "crisp-edges",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))",
                  willChange: "transform, opacity",
                }}
                loading="eager"
                width="512"
                height="512"
              />
            </picture>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
