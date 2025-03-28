import { useEffect, useState, useCallback } from "react";
import api from "../utils/axiosConfig";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  Activity,
  Cloud,
  Server,
  HardDrive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";


const SERVICE_ICONS = {
  database: Server,
  redis: HardDrive,
  cloudinary: Cloud,
};

const STATUS_LEVELS = {
  operational: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
    label: "All Systems Operational",
  },
  degraded: {
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertTriangle,
    label: "Partial Service Degradation",
  },
  outage: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Major Service Outage",
  },
};

const SystemStatusBanner = () => {
  const [status, setStatus] = useState({
    status: "loading",
    services: {},
    timestamp: new Date().toISOString(),
  });
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugMode] = useState(localStorage.getItem("debugMode") === "true");
  const navigate = useNavigate();

  const fetchStatus = useCallback(async () => {
    try {
      if (debugMode) console.log("[FRONTEND] Starting health check...");

      const [statusRes, historyRes] = await Promise.all([
        api.get("/health/healthy"),
        api.get("/health/healthy/history"),
      ]);

      setStatus({
        status: statusRes.data.status || "operational",
        services: statusRes.data.services || {},
        timestamp: statusRes.data.timestamp,
      });

      setHistory(historyRes.data);
    } catch (error) {
      console.error("[FRONTEND] Health check failed:", error);
      setStatus({
        status: "outage",
        services: {},
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [debugMode]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 300000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) return null;

  const statusConfig = STATUS_LEVELS[status.status] || STATUS_LEVELS.outage;
  const lastUpdated = new Date(status.timestamp).toLocaleTimeString();

  return (
    <div className={`${statusConfig.color} dark:bg-opacity-20 rounded-xl p-4 sm:p-5 mb-6 shadow-sm mt-4 border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md`}>
      {/* Header Section */}
      <div className="grid grid-cols-[min-content_1fr_auto] items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <statusConfig.icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
          <div className="space-y-0.5 sm:space-y-1">
            <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100">
              {statusConfig.label}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <button
            onClick={fetchStatus}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 rounded-lg shadow-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <Activity className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => navigate('/status-page')}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 rounded-lg shadow-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          >
            <History className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      {/* Affected Services */}
      {status.status !== "operational" && (
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
            Affected Services
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {Object.entries(status.services || {}).map(([service, details]) => {
              const IconComponent = SERVICE_ICONS[service] || Activity;
              const isOperational = details?.status === "operational";

              return (
                <div
                  key={service}
                  className="flex items-start gap-3 p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-100 dark:border-gray-700"
                >
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 sm:mt-1 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                  <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-200 capitalize">
                        {service}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOperational
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {details?.status || "unknown"}
                      </span>
                    </div>

                    {details?.latency && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Latency:</span>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full flex-1">
                          <div
                            className={`h-full rounded-full ${
                              details.latency < 300
                                ? "bg-green-500"
                                : details.latency < 500
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(details.latency / 10, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {details.latency}ms
                        </span>
                      </div>
                    )}

                    {details?.details && (
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        {Object.entries(details.details).map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History Stats */}
      {history && (
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
            <div className="text-center flex-1 py-2 md:py-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">30-day Uptime</p>
              <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-200">
                {history.uptime30d || "N/A"}
              </p>
            </div>
            <div className="text-center flex-1 py-2 md:py-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Incident</p>
              <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-200">
                {history.lastIncident
                  ? new Date(history.lastIncident).toLocaleDateString()
                  : "None"}
              </p>
            </div>
            <div className="text-center flex-1 py-2 md:py-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Incidents (30d)</p>
              <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-200">
                {history.incidentsLastMonth || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugMode && (
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Debug Information
            </h4>
            <pre className="text-xs p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-x-auto font-mono">
              {JSON.stringify(
                {
                  status,
                  history,
                  lastFetched: new Date().toISOString(),
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatusBanner;
