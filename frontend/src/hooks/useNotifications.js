import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../utils/axiosConfig";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    try {
      const response = await api.get("/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      if (error.response?.status === 401) {
        // Handle unauthorized error
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const clearAllNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.delete("/notifications/clear-all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Change to empty object instead of null
      await api.put(
        `/notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await api.delete(`/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notif) => !notif.isRead).length,
    [notifications],
  );

  return {
    notifications,
    loading,
    fetchNotifications,
    clearAllNotifications,
    markNotificationAsRead,
    deleteNotification,
    unreadCount,
  };
};
