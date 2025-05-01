import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "../components/SidebarLayout";
import { TbClockX } from "react-icons/tb";
import SystemStatusBanner from "../components/SystemStatusBanner";
import {
  Users,
  BookOpen,
  Calendar,
  Settings,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  XOctagon,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/axiosConfig";



const DashBoard = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({ email: "", username: "" });
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    recentUsers: [],
    usersByRole: [],
    growthStats: {}, // Added growthStats
  });
  const [bookingCounts, setBookingCounts] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    canceled: 0,
    missed: 0,
  });
  const [issues, setIssues] = useState([]);
  const [issueStats, setIssueStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState("");
  const [chatEnabled, setChatEnabled] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return navigate("/login");
    const parsed = JSON.parse(stored);
    setUserInfo({ id: parsed._id, email: parsed.email || "", username: parsed.username || "" });
    // fetch chat settings
    api.get('/message/settings').then(r => setChatEnabled(r.data.enabled));
  }, [navigate]);


  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) navigate("/login");
    else {
      try {
        const parsedUser = JSON.parse(user);
        setUserInfo({
          email: parsedUser.email || "",
          username: parsedUser.username || "",
        });
      } catch (error) {
        console.error("Error parsing user ", error);
      }
    }
  }, [navigate]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!["admin", "manager"].includes(user?.role)) {
      navigate("/homepage");
    }
  }, [navigate]);

  // Toggle chat on/off
  const toggleChat = () => {
    api.post('/message/settings', { requesterId: userInfo.id, enabled: !chatEnabled })
      .then(r => setChatEnabled(r.data.enabled))
      .catch(err => setErrors(err.response?.data?.message || 'Error toggling chat'));
  };
  

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/issues/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIssues(response.data);

      // Calculate stats
      const stats = response.data.reduce(
        (acc, issue) => {
          acc.total++;
          acc[issue.status]++;
          return acc;
        },
        { total: 0, pending: 0, "in-progress": 0, resolved: 0 },
      );

      setIssueStats(stats);
    } catch (error) {
      setErrors(error?.response?.data?.message || "Error fetching issues");
    }
  };

  

  const handleStatusUpdate = async (issueId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        `/issues/update-status/${issueId}`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchIssues(); // Refresh issues after update
    } catch (error) {
      setErrors(error?.response?.data?.message || "Error updating status");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrors("");
      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchBookingCounts(),
          fetchIssues(),
        ]);
      } catch (err) {
        setErrors(err?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(
        "/dashboard/stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setDashboardStats({
          totalUsers: response.data.stats.totalUsers,
          recentUsers: response.data.stats.recentUsers || [],
          usersByRole: response.data.stats.usersByRole || [],
          growthStats: response.data.stats.growthStats || {}, // Assign growthStats
        });
      }
    } catch (error) {
      setErrors(
        error?.response?.data?.message || "Error fetching dashboard data",
      );
    }
  };

  const formatGrowth = (value) => {
    if (value === undefined || value === null) return "N/A";
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "N/A";

    const arrow = numericValue > 0 ? "↑" : numericValue < 0 ? "↓" : "";
    const colorClass =
      numericValue > 0
        ? "text-green-600"
        : numericValue < 0
          ? "text-red-600"
          : "text-gray-600";

    return (
      <span className={`${colorClass} font-medium`}>
        {arrow} {Math.abs(numericValue)}% from last month
      </span>
    );
  };

  const fetchBookingCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(
        "/book/bookings/count",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const { total, pending, confirmed, canceled, missed } =
        response.data.counts;
      setBookingCounts({ total, pending, confirmed, canceled, missed });
    } catch (error) {
      setErrors(error?.response?.data?.message || "Error fetching bookings");
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErrors("");
      try {
        await Promise.all([fetchDashboardStats(), fetchBookingCounts(), fetchIssues()]);
      } catch (e) {
        setErrors(e.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const cards = [
    {
      title: "Total Users",
      value: dashboardStats.totalUsers,
      icon: Users,
      color: "green",
      trend: formatGrowth(dashboardStats.growthStats?.userGrowth),
    },
    {
      title: "Total Bookings",
      value: bookingCounts.total,
      icon: Calendar,
      color: "blue",
      trend: formatGrowth(dashboardStats.growthStats?.bookingGrowth),
    },
  ];

  return (
    <SidebarLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col p-4 sm:p-6 md:p-8 overflow-x-hidden min-h-screen dark:bg-gray-900 transition-colors duration-300"
      >
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-green-900/30 dark:to-green-800/50 px-4 sm:px-6 py-4 rounded-xl"
        >
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-0 flex-1 min-w-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-2 sm:p-3 bg-green-500 rounded-lg sm:rounded-xl shadow-md flex-shrink-0"
            >
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
                Dashboard Overview
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1 text-xs sm:text-sm truncate">
                Welcome back,{" "}
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {userInfo.username}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
            <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 min-w-0 max-w-[200px] sm:max-w-none">
              <span className="font-medium text-green-600 dark:text-green-400 truncate text-xs sm:text-sm">
                {userInfo.email}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Loading and Error States */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm"
            >
              Loading data...
            </motion.div>
          )}
          {errors && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm"
            >
              {errors}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid */}
        {!loading && !errors && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6"
          >
            {/* Left Column - Metrics */}
            <div className="xl:col-span-2 space-y-4 sm:space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {cards.map((card, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ y: -2 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                          {card.title}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                          {card.value}
                        </p>
                      </div>
                      <div
                        className={`p-2 bg-${card.color}-100 dark:bg-${card.color}-900/30 rounded-lg`}
                      >
                        <card.icon
                          className={`w-5 h-5 sm:w-6 sm:h-6 text-${card.color}-600 dark:text-${card.color}-400`}
                        />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs sm:text-sm dark:text-gray-300">
                        {card.trend}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3">
                {[
                  {
                    status: "Confirmed",
                    value: bookingCounts.confirmed,
                    icon: CheckCircle2,
                    color: "green",
                  },
                  {
                    status: "Pending",
                    value: bookingCounts.pending,
                    icon: AlertTriangle,
                    color: "yellow",
                  },
                  {
                    status: "Canceled",
                    value: bookingCounts.canceled,
                    icon: XOctagon,
                    color: "red",
                  },
                  {
                    status: "Missed",
                    value: bookingCounts.missed,
                    icon: TbClockX,
                    color: "orange",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ y: -2 }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                          {item.status}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                          {item.value}
                        </p>
                      </div>
                      <div
                        className={`p-2 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-lg`}
                      >
                        <item.icon
                          className={`w-5 h-5 sm:w-6 sm:h-6 text-${item.color}-600 dark:text-${item.color}-400`}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="xl:col-span-1">
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Management Tools
                </h3>
                {/* Replace existing toggle button with this */}
<div className="flex items-center gap-3 mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
  <span className="text-sm font-medium">Chat System</span>
  <label className="relative inline-flex items-center cursor-pointer">
    <input 
      type="checkbox" 
      checked={chatEnabled}
      onChange={toggleChat}
      className="sr-only" 
    />
    <div className={`w-11 h-6 rounded-full transition-colors ${
      chatEnabled ? 'bg-green-500' : 'bg-gray-400'
    }`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform transform ${
        chatEnabled ? 'translate-x-5 bg-white' : 'bg-gray-200'
      }`} />
    </div>
  </label>
</div>

                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {[
                    {
                      icon: UserPlus,
                      label: "Manage Users",
                      path: "/usermanagement",
                    },
                    {
                      icon: BookOpen,
                      label: "Manage Rooms",
                      path: "/roomOperationpage",
                    },
                    {
                      icon: Calendar,
                      label: "Manage Bookings",
                      path: "/bookingOperationpage",
                    },
                    // {
                    //   icon: Settings,
                    //   label: "Configurations",
                    //   path: "/configmanagement",
                    // },
                  ].map(({ icon: Icon, label, path }, index) => (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(path)}
                      className="group flex items-center gap-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-0"
                    >
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md group-hover:bg-green-200 dark:group-hover:bg-green-800">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Issues Management Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3 mb-3 sm:mb-0">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Issues Management
                </h2>
              </div>

              <button
                onClick={() => navigate("/issue-report")}
                className="text-sm sm:text-base bg-green-500 dark:bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors shadow-sm"
              >
                View All Issues
              </button>
            </div>

            {/* Issues Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[
                {
                  label: "Total Issues",
                  value: issueStats.total,
                  color: "blue",
                },
                {
                  label: "Pending",
                  value: issueStats.pending,
                  color: "yellow",
                },
                {
                  label: "In Progress",
                  value: issueStats["in-progress"],
                  color: "orange",
                },
                {
                  label: "Resolved",
                  value: issueStats.resolved,
                  color: "green",
                },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  whileHover={{ y: -2 }}
                  className={`p-3 sm:p-4 rounded-lg border ${
                    stat.color === "blue"
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
                      : stat.color === "yellow"
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800"
                        : stat.color === "orange"
                          ? "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800"
                          : "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800"
                  }`}
                >
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {stat.label}
                  </p>
                  <p
                    className={`text-lg sm:text-xl font-bold ${
                      stat.color === "blue"
                        ? "text-blue-600 dark:text-blue-400"
                        : stat.color === "yellow"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : stat.color === "orange"
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Recent Issues Table */}
            <div className="overflow-x-auto max-w-[calc(100vw-2rem)] sm:max-w-full">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {[
                      "Type",
                      "Description",
                      "Reported By",
                      "Status",
                      "Action",
                    ].map((header, index) => (
                      <th
                        key={index}
                        className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {issues.slice(0, 5).map((issue) => (
                    <tr
                      key={issue._id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm dark:text-gray-300 truncate max-w-[120px]">
                        {issue.issueType}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm dark:text-gray-300 max-w-[200px]">
                        <span className="line-clamp-1">
                          {issue.description}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm dark:text-gray-300 truncate">
                        {issue.email}
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <select
                          value={issue.status}
                          onChange={(e) =>
                            handleStatusUpdate(issue._id, e.target.value)
                          }
                          className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full border ${
                            issue.status === "pending"
                              ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200"
                              : issue.status === "in-progress"
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200"
                                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200"
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/issue-report/${issue._id}`)}
                          className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                        >
                          <span className="hidden sm:inline">View</span> Details
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <SystemStatusBanner />
      </motion.div>
    </SidebarLayout>
  );
};

export default DashBoard;