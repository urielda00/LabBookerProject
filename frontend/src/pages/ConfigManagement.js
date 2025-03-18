// import React, { useState, useEffect } from 'react';

// const ConfigDashboard = () => {
//   const [config, setConfig] = useState({
//     booking: {
//       openDaysBefore: 3,
//       slotDurationHours: 3,
//       maxBookingsPerWeek: 2,
//       minBookingTimeBeforeHours: 2,
//     },
//     cancellation: {
//       minCancellationTimeBeforeMinutes: 30,
//     },
//     penalty: {
//       maxMissedBookingsPerMonth: 2,
//       blockDurationWeeks: 2,
//     }
//   });
  
//   const [originalConfig, setOriginalConfig] = useState({});
//   const [status, setStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
//   const [errors, setErrors] = useState({});

//   // Store original config for comparison
//   useEffect(() => {
//     setOriginalConfig(JSON.parse(JSON.stringify(config)));
//   }, []);

//   // Fixed handleChange function for nested state
//   const handleChange = (section, field, value) => {
//     // Validate input is a number
//     const numValue = Number(value);
    
//     // Clear any previous errors for this field
//     setErrors(prev => {
//       const newErrors = {...prev};
//       if (newErrors[`${section}.${field}`]) delete newErrors[`${section}.${field}`];
//       return newErrors;
//     });
    
//     // Validate minimum values
//     if (numValue < 0) {
//       setErrors(prev => ({
//         ...prev,
//         [`${section}.${field}`]: "Value cannot be negative"
//       }));
//       return;
//     }

//     setConfig(prev => ({
//       ...prev,
//       [section]: {
//         ...prev[section],
//         [field]: numValue
//       }
//     }));
    
//     // Reset saved status when changes are made
//     if (status === 'saved') setStatus('idle');
//   };

//   // Check if configuration has been modified
//   const hasChanges = () => {
//     return JSON.stringify(config) !== JSON.stringify(originalConfig);
//   };

//   // Handler for saving config
//   const handleSave = async () => {
//     // Validate all fields
//     if (Object.keys(errors).length > 0) {
//       return;
//     }
    
//     setStatus('saving');
    
//     try {
//       // Simulated API call
//       await new Promise(resolve => setTimeout(resolve, 1000));
      
//       // Update original config after successful save
//       setOriginalConfig(JSON.parse(JSON.stringify(config)));
//       setStatus('saved');
      
//       // Reset to idle after 3 seconds
//       setTimeout(() => {
//         setStatus('idle');
//       }, 3000);
//     } catch (error) {
//       setStatus('error');
//     }
//   };

//   // Reset config to original values
//   const handleReset = () => {
//     setConfig(JSON.parse(JSON.stringify(originalConfig)));
//     setErrors({});
//     setStatus('idle');
//   };

//   // Helper function to format field labels
//   const formatLabel = (key) => {
//     return key
//       .replace(/([A-Z])/g, ' $1')
//       .replace(/^./, str => str.toUpperCase())
//       .replace(/([a-zA-Z]+)([A-Z][a-z]+)$/, '$1 $2')
//       .replace(/([a-zA-Z]+)([A-Z][a-z]+)([A-Z][a-z]+)$/, '$1 $2 $3');
//   };

//   return (
//     <div className="p-6 max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
//       <h1 className="text-3xl font-bold mb-6 text-gray-800">Configuration Dashboard</h1>
      
//       {Object.entries(config).map(([section, settings]) => (
//         <div key={section} className="mb-8 p-6 bg-gray-50 rounded-lg shadow-sm">
//           <h2 className="text-xl font-semibold mb-4 capitalize text-gray-700">
//             {formatLabel(section)} Settings
//           </h2>
//           <div className="grid md:grid-cols-2 gap-6">
//             {Object.entries(settings).map(([field, value]) => (
//               <div key={field} className="flex flex-col">
//                 <label className="block text-sm font-medium mb-1 text-gray-700">
//                   {formatLabel(field)}
//                 </label>
//                 <input
//                   type="number"
//                   value={value}
//                   onChange={(e) => handleChange(section, field, e.target.value)}
//                   className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
//                     errors[`${section}.${field}`] ? 'border-red-500' : 'border-gray-300'
//                   }`}
//                   min="0"
//                 />
//                 {errors[`${section}.${field}`] && (
//                   <p className="text-red-500 text-xs mt-1">{errors[`${section}.${field}`]}</p>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       ))}
      
//       <div className="flex justify-end space-x-4 mt-6">
//         <button
//           onClick={handleReset}
//           disabled={!hasChanges() || status === 'saving'}
//           className={`px-4 py-2 rounded-md text-sm font-medium ${
//             hasChanges() && status !== 'saving' 
//               ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
//               : 'bg-gray-100 text-gray-400 cursor-not-allowed'
//           }`}
//         >
//           Cancel
//         </button>
//         <button
//           onClick={handleSave}
//           disabled={!hasChanges() || Object.keys(errors).length > 0 || status === 'saving'}
//           className={`px-4 py-2 rounded-md text-sm font-medium ${
//             hasChanges() && Object.keys(errors).length === 0 && status !== 'saving'
//               ? 'bg-blue-600 hover:bg-blue-700 text-white' 
//               : 'bg-blue-300 text-white cursor-not-allowed'
//           }`}
//         >
//           {status === 'saving' ? (
//             <span>Saving...</span>
//           ) : (
//             <span>Save Changes</span>
//           )}
//         </button>
//       </div>
      
//       {status === 'saved' && (
//         <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
//           Configuration saved successfully!
//         </div>
//       )}
      
//       {status === 'error' && (
//         <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
//           An error occurred while saving. Please try again.
//         </div>
//       )}
//     </div>
//   );
// };

// export default ConfigDashboard;