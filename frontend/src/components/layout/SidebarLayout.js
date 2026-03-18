import  { useState, useEffect } from "react";
import { Sidebar } from "./SideBar";

export function SidebarLayout({ children }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const toggleSidebar = () => setIsExpanded((prev) => !prev);

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsMobile(true);
        // On mobile, default to sidebar closed
        setIsExpanded(false);
      } else {
        setIsMobile(false);
        setIsExpanded(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute sidebar width (256px expanded, 80px collapsed)
  const sidebarWidth = isExpanded ? 225 : 80;
  // On mobile, if sidebar is closed, use 0 margin (full width content)
  const contentMargin = isMobile
    ? isExpanded
      ? sidebarWidth
      : 80
    : sidebarWidth;

  return (
    <>
      {/* Render the fixed sidebar */}
      <Sidebar
        isExpanded={isExpanded}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />
      {/* Main content area with dynamic left margin */}
      <div
        className="transition-all duration-300"
        style={{
          marginLeft: contentMargin,
          transitionProperty: "margin-left", // Smooth transition for margin changes
        }}
      >
        {children}
      </div>
    </>
  );
}
