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
import { Link } from 'react-router-dom';


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
    <div className={`${statusConfig.color} rounded-lg p-4 mb-6 shadow-sm mt-4`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-full">
          <statusConfig.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <div className="min-w-0 max-w-[calc(100%-theme(space.5))]">
            <h3 className="font-medium truncate text-sm sm:text-base">
              {statusConfig.label}
            </h3>
            <p className="text-xs sm:text-sm opacity-80 mt-0.5 truncate">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="flex flex-row flex-wrap gap-3 sm:gap-4 ml-0 sm:ml-2">
          <button
            className="flex items-center gap-2 text-sm hover:opacity-80 px-2 py-1"
            onClick={fetchStatus}
          >
            <Activity className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Refresh</span>
          </button>

          <Link 
  to="/status-page" 
  target="_blank"
  className="flex items-center gap-2 text-sm hover:opacity-80 px-2 py-1"
>
  <History className="w-4 h-4 flex-shrink-0" />
  <span className="whitespace-nowrap">History</span>
</Link>

        </div>
      </div>

      {/* Affected Services */}
      {status.status !== "operational" && (
        <div className="mt-4 pt-4 border-t border-opacity-20">
          <h4 className="text-sm font-medium mb-2">Affected Services:</h4>
          <div className="flex flex-col gap-2">
            {Object.entries(status.services || {}).map(([service, details]) => {
              const IconComponent = SERVICE_ICONS[service] || Activity;
              return (
                <div
                  key={service}
                  className="flex items-start gap-3 text-sm p-2 bg-white rounded-lg shadow-sm"
                >
                  <IconComponent className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="capitalize font-medium truncate">
                        {service}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                          details?.status === "operational"
                            ? "bg-green-200 text-green-800"
                            : "bg-red-200 text-red-800"
                        }`}
                      >
                        {details?.status || "unknown"}
                      </span>
                    </div>
                    {details?.latency && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        Latency: {details.latency}ms
                      </div>
                    )}
                    {details?.details && (
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        {Object.entries(details.details).map(([key, value]) => (
                          <div key={key} className="truncate">
                            {key}: {value}
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
        <div className="mt-4 pt-4 border-t border-opacity-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="text-center sm:text-left">
              <p className="opacity-75">30-day Uptime</p>
              <p className="font-medium truncate">
                {history.uptime30d || "N/A"}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="opacity-75">Last Incident</p>
              <p className="font-medium truncate">
                {history.lastIncident
                  ? new Date(history.lastIncident).toLocaleDateString()
                  : "None"}
              </p>
            </div>
            <div className="text-center sm:text-left">
              <p className="opacity-75">Incidents (30d)</p>
              <p className="font-medium truncate">
                {history.incidentsLastMonth || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugMode && (
        <div className="mt-4 pt-4 border-t border-opacity-20">
          <h4 className="text-sm font-medium mb-2">Debug Information:</h4>
          <pre className="text-xs bg-black bg-opacity-10 p-2 rounded overflow-x-auto">
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
      )}
    </div>
  );
};

export default SystemStatusBanner;
