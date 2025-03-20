import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, Shield } from "lucide-react";

import collegeLogo from "../assets/azraileLogo.png";
import Header from "../assets/header-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <BookOpen className="w-8 h-8 text-primary" />,
      title: "Easy Booking",
      description: "Seamless room reservation in just a few clicks",
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Collaborative Spaces",
      description: "Find the perfect study environment",
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Secure Access",
      description: "Verified and controlled room management",
    },
  ];

  return (
    <div
  className="relative min-h-screen w-full flex items-center justify-center bg-cover bg-center pt-16 pb-20" // Added pb-20
  style={{ backgroundImage: `url(${Header})` }}
>
  {/* Dark overlay */}
  <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

  <div className="relative z-10 container mx-auto px-4 md:px-8 lg:px-16 h-full flex flex-col items-center justify-center">
    {/* Content container with bottom margin */}
    <div className="grid md:grid-cols-2 gap-12 items-center mb-8"> 
          {/* Left Column - Content */}
          <div className="text-white text-center md:text-left">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            >
              <span className="bg-gradient-primaryToRight text-transparent bg-clip-text">
                LabBooker
              </span>{" "}
              Revolutionizing Study Spaces
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl mb-8 text-grayLight"
            >
              Simplify your lab room booking experience with our intuitive
              platform designed for Azrieli College of Engineering students.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-col sm:flex-row justify-center md:justify-start gap-4"
            >
              <button
                onClick={() => navigate("/signup")}
                className="
                  px-6 py-3 
                  bg-gradient-primaryToRight 
                  text-white 
                  rounded-lg 
                  font-semibold 
                  hover:bg-gradient-primaryToLeft 
                  transition-all 
                  duration-300 
                  transform hover:scale-105
                  flex items-center justify-center
                  gap-2
                "
              >
                <BookOpen className="w-5 h-5" />
                Create Account
              </button>
              <button
                onClick={() => navigate("/login")}
                className="
                  px-6 py-3 
                  border border-white 
                  text-white 
                  rounded-lg 
                  font-semibold 
                  hover:bg-white hover:text-grayDark 
                  transition-all 
                  duration-300 
                  transform hover:scale-105
                  flex items-center justify-center
                  gap-2
                "
              >
                <Shield className="w-5 h-5" />
                Login
              </button>
            </motion.div>
          </div>

          {/* Right Column - Features */}
          <div className="grid grid-cols-1 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 * (index + 1) }}
                className="
                  bg-white/10 backdrop-blur-sm 
                  p-6 rounded-xl 
                  border border-white/20
                  hover:border-primary
                  transition-all duration-300
                "
              >
                <div className="flex items-center mb-4">
                  {feature.icon}
                  <h3 className="ml-4 text-xl font-semibold text-white">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-grayLight">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        
      </div>
      {/* College Logo */}
        <div className="absolute bottom-0 md:bottom-8 left-1/2 transform -translate-x-1/2"> 
      <img
        src={collegeLogo}
        alt="Azrieli College Logo"
        className="w-32 h-32 object-contain opacity-70 hover:opacity-100 transition-opacity"
      />
    </div>
    </div>
  );
};

export default HeroSection;
