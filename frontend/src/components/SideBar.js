import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  User,
  Home,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const DASHBOARD_PATHS = [
  "/dashboard",
  "/usermanagement",
  "/roomOperationpage",
  "/bookingOperationpage",
  "/configmanagement",
];

export function Sidebar({ isExpanded, toggleSidebar, isMobile }) {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdminOrManager = ["admin", "manager"].includes(user?.role);
  const [showDashboardSubmenu, setShowDashboardSubmenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-open submenu if current path is in DASHBOARD_PATHS
  useEffect(() => {
    if (DASHBOARD_PATHS.includes(location.pathname)) {
      setShowDashboardSubmenu(true);
    }
  }, [location.pathname]);

  const handleToggleDashboardSubmenu = () => {
    if (!isExpanded) toggleSidebar();
    setShowDashboardSubmenu((prev) => !prev);
  };

  const handleNavigation = (path) => {
    if (!isExpanded) toggleSidebar();
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  const ProtectedMenuItem = ({ path, label, allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!allowedRoles.includes(user?.role)) return null;

    return (
      <li
        className={`px-12 py-2 cursor-pointer transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
          isActive(path)
            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : "text-gray-700 dark:text-gray-300"
        }`}
        onClick={() => navigate(path)}
      >
        {label}
      </li>
    );
  };

  return (
    <div
      className="fixed top-0 left-0 h-screen z-40 transition-all duration-300 bg-white border-r border-gray-200 shadow-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-800/50"
      style={{
        width: isExpanded ? 225 : 80,
        transform:
          isMobile && !isExpanded ? "translateX(calc(-100% + 80px))" : "none",
      }}
    >
      {/* Toggle Button positioned within the sidebar */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-5 bg-white p-1.5 rounded-full shadow-md border border-gray-200 hover:bg-gray-100 z-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
      >
        {isExpanded ? (
          <ChevronLeft className="w-5 h-5 dark:text-gray-200" />
        ) : (
          <ChevronRight className="w-5 h-5 dark:text-gray-200" />
        )}
      </button>

      <div className="h-full flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700" dir="ltr">
          <h2
            className={`text-xl font-bold text-gray-800 transition-opacity dark:text-gray-200 ${
              isExpanded ? "opacity-100" : "opacity-0"
            }`}
          >
            LabBooker
          </h2>
        </div>

        {/* Navigation Items */}
        <ul className="flex-1 py-4">
          {isAdminOrManager && (
            <li>
              <div
                className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                  showDashboardSubmenu ? "bg-gray-100 dark:bg-gray-700/30" : ""
                }`}
                onClick={handleToggleDashboardSubmenu}
              >
                <LayoutDashboard className="w-6 h-6 text-blue-500 min-w-[24px] dark:text-blue-400" />
                <span
                  className={`ml-3 transition-opacity dark:text-gray-200 rtl:mr-3 ${
                    isExpanded ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {t("sidebar.dashboard")}
                </span>
                <ChevronDown
                  className={`ml-auto w-4 h-4 transition-transform dark:text-gray-200  ${
                    showDashboardSubmenu ? "rotate-180" : ""
                  } ${isExpanded ? "opacity-100" : "opacity-0"}`}
                />
              </div>

              {showDashboardSubmenu && isExpanded && (
                <ul className="bg-gray-50 py-2 dark:bg-gray-700/30">
                  <ProtectedMenuItem
                    path="/dashboard"
                    label={t("sidebar.overview")}
                    allowedRoles={["admin", "manager"]}
                  />
                  <ProtectedMenuItem
                    path="/usermanagement"
                    label={t("sidebar.manageUsers")}
                    allowedRoles={["admin"]}
                  />
                  <ProtectedMenuItem
                    path="/roomOperationpage"
                    label={t("sidebar.manageRooms")}
                    allowedRoles={["admin", "manager"]}
                  />
                  <ProtectedMenuItem
                    path="/bookingOperationpage"
                    label={t("sidebar.manageBookings")}
                    allowedRoles={["admin", "manager"]}
                  />
                  {/* <ProtectedMenuItem
                    path="/configmanagement"
                    label="Configurations"
                    allowedRoles={["admin"]}
                  /> */}
                </ul>
              )}
            </li>
          )}

          {[
            { icon: User, label: t("sidebar.profile"), path: "/accountSettings" },
            { icon: Home, label: t("sidebar.home"), path: "/homepage" },
          ].map((item) => (
            <li
              key={item.path}
              className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 ${
                isActive(item.path)
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "text-gray-800 dark:text-gray-200"
              }`}
              onClick={() => handleNavigation(item.path)}
            >
              <item.icon className="w-6 h-6 text-blue-500 min-w-[24px] dark:text-blue-400" />
              <span
                className={`ml-3 transition-opacity rtl:mr-3 ${
                  isExpanded ? "opacity-100" : "opacity-0"
                }`}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div
            className="flex items-center px-4 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50"
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              navigate("/login");
            }}
          >
            <LogOut className="w-6 h-6 text-red-500 min-w-[24px] dark:text-red-400" />
            <span
              className={`ml-3 transition-opacity dark:text-gray-200 rtl:mr-3 ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              {t("sidebar.logout")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
