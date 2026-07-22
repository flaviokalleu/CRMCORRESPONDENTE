// src/components/TokenExpiredAlert.jsx
import React from 'react';

const TokenExpiredAlert = () => {
  return (
    <div className="fixed inset-0 w-full h-full bg-black/80 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-md p-5 text-center">
        <h2>Your session has expired. Please log in again.</h2>
        <button
          className="mt-3 px-4 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          onClick={() => window.location.href = '/login'}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default TokenExpiredAlert;
