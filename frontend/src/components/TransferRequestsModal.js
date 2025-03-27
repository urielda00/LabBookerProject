import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import api from "../utils/axiosConfig";
import { X, User } from "lucide-react";

  const TransferRequestsModal = ({ booking, onClose }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmAction, setConfirmAction] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [responseError, setResponseError] = useState(null);
    const [responseSuccess, setResponseSuccess] = useState(null);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await api.get(`/book/${booking._id}/transfer-requests`);
                setRequests(response.data.requests);
            } catch (err) {
                console.error("Failed to fetch requests:", err);
                setResponseError("Failed to load requests");
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [booking._id]);

    const handleResponse = async (accept) => {
        try {
            const endpoint = `/book/transfer-requests/${selectedRequest._id}/${accept ? 'accept' : 'decline'}`;
            await api.patch(endpoint);
            
            setRequests(requests.filter(req => req._id !== selectedRequest._id));
            setResponseSuccess(`Request ${accept ? 'accepted' : 'declined'} successfully`);
            setTimeout(() => setResponseSuccess(null), 3000);
        } catch (err) {
            setResponseError(err.response?.data?.message || "Action failed");
            setTimeout(() => setResponseError(null), 3000);
        } finally {
            setConfirmAction(null);
            setSelectedRequest(null);
        }
    };

    return (
      <Dialog open={true} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 mx-4 sm:mx-0 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Transfer Requests ({requests.length})
              </Dialog.Title>
              <button 
                onClick={onClose} 
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
    
            {/* Status Messages */}
            {responseError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm sm:text-base">
                {responseError}
              </div>
            )}
            {responseSuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm sm:text-base">
                {responseSuccess}
              </div>
            )}
    
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No pending requests</div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request._id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium dark:text-gray-100">
                            {request.fromUser?.username}
                          </span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 break-words">
                          {request.fromUser?.email}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap break-words">
                        "{request.message}"
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-end">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setConfirmAction('decline');
                          }}
                          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 
                            dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500
                            w-full sm:w-auto"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setConfirmAction('accept');
                          }}
                          className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700
                            w-full sm:w-auto"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
    
            {/* Confirmation Dialog */}
            {confirmAction && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 sm:mx-0">
                  <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">
                    {confirmAction === 'accept' 
                      ? "Confirm Transfer" 
                      : "Confirm Decline"}
                  </h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                    {confirmAction === 'accept' 
                      ? "By accepting, you'll permanently transfer this booking. This action cannot be undone!"
                      : "Are you sure you want to decline this transfer request?"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      onClick={() => {
                        setConfirmAction(null);
                        setSelectedRequest(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 
                        dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                        w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleResponse(confirmAction === 'accept')}
                      className={`px-4 py-2 text-white rounded-lg w-full sm:w-auto ${
                        confirmAction === 'accept' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    );
};

export default TransferRequestsModal;