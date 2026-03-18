import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "../components/layout/HeroSection";
import Footer from '../components/layout/footer';
import Navbar from '../components/layout/Navbar';

const LandingPage = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    // If user and token exist => user is logged in
    if (storedUser && token) {
      // Auto-redirect to the homepage (or any authenticated route you choose)
      navigate("/homepage");
    } else {
      // They are not logged in => stay on landing
      setCheckingAuth(false);
    }
  }, [navigate]);

  // If we haven't confirmed whether they're logged in or not, show nothing
  if (checkingAuth) {
    return null; // or a loading spinner if you prefer
  }

  // Only render landing content if user is NOT logged in
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-gray-50 to-gray-200">
      {/* No Navbar needed if you're hiding it for non-logged in,
          or you can import a "logged-out" Navbar here */}
      <Navbar enableTransparentOnScroll />
      <HeroSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
