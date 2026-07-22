import React from 'react';

const CustomTextField = ({ label, className = '', ...props }) => (
    <div className="w-full my-2">
        {label && <label className="block mb-1 text-sm text-white">{label}</label>}
        <input
            {...props}
            className={`w-full px-3 py-2 rounded-md border border-gray-600 bg-[#1e1e1e] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
    </div>
);

export default CustomTextField;
