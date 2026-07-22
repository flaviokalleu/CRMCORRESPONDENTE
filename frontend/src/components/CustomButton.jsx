import React from 'react';

const CustomButton = ({ className = '', ...props }) => (
    <button
        {...props}
        className={`px-4 py-2 rounded-md font-medium text-white bg-[#1e88e5] hover:bg-[#1669b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    />
);

export default CustomButton;
