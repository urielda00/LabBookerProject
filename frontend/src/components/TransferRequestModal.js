import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import api from "../utils/axiosConfig";
import { X, CheckCircle2 } from "lucide-react";

  const TransferRequestModal = ({ booking, onClose, fetchWeeklyBookings }) => {
      const [message, setMessage] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [success, setSuccess] = useState(false);
      const [responseError, setResponseError] = useState(null);
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
          await api.post(`/book/${booking._id}/transfer-request`, { message });
          setSuccess(true);
          setTimeout(() => {
            onClose();
            fetchWeeklyBookings();
          }, 1500);
        } catch (err) {
          console.error("Transfer request error:", err);
          setResponseError(err.response?.data?.message || "Request failed");
          setTimeout(() => setResponseError(null), 3000);
        } finally {
          setIsSubmitting(false);
        }
      };
  
      return (
        <Dialog open={true} onClose={onClose} className="relative z-50">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 mx-4 sm:mx-0">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Request Transfer
                </Dialog.Title>
                <button 
                  onClick={onClose} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
      
              <form onSubmit={handleSubmit} className="space-y-4">
                {success ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-4 animate-bounce" />
                    <p className="text-lg font-semibold dark:text-gray-100">Request sent successfully!</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Message to {booking.userId?.username}
                      </label>
                      <textarea
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          text-base sm:text-sm
                          dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100
                          dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="Explain why you need this booking..."
                        rows="4"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 
                          dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                          w-full sm:w-auto"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 
                          focus:ring-2 focus:ring-blue-500 disabled:opacity-50
                          dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-400
                          w-full sm:w-auto"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Sending...' : 'Send Request'}
                      </button>
                    </div>
                  </>
                )}
                {responseError && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg
                    dark:bg-red-900/30 dark:text-red-300 text-sm sm:text-base">
                    {responseError}
                  </div>
                )}
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      );
    };

export default TransferRequestModal;