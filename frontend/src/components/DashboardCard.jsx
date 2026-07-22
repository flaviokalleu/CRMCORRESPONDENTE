// components/DashboardCard.js
import React, { memo } from 'react';
import PropTypes from 'prop-types';

const DashboardCard = ({ 
  icon, 
  title, 
  value, 
  iconColor = "text-blue-500",
  className = "",
  titleClassName = "text-blue-500 text-xl font-semibold mb-2",
  valueClassName = "text-blue-400 text-2xl font-bold",
  onClick,
  isLoading
}) => {
  return (
    <div 
      className={`bg-black p-6 rounded-lg shadow-lg flex items-center border border-blue-800 hover:border-blue-600 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-xl' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {isLoading ? (
        <div className="animate-pulse flex items-center w-full">
          <div className={`h-10 w-10 rounded-full ${iconColor} opacity-50 mr-4`}></div>
          <div className="flex-1">
            <div className="h-5 bg-black rounded w-3/4 mb-2"></div>
            <div className="h-7 bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
      ) : (
        <>
          <div className={`flex-shrink-0 ${iconColor} mr-4`}>
            {typeof icon === 'string' ? (
              <svg className="h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path d={icon} fill="currentColor" />
              </svg>
            ) : (
              <div className="h-10 w-10 flex items-center justify-center">
                {icon}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className={titleClassName}>{title}</h2>
            <p className={valueClassName}>
              {typeof value === 'number' && !isNaN(value) ? new Intl.NumberFormat().format(value) : value}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

DashboardCard.propTypes = {
  icon: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node
  ]).isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired,
  iconColor: PropTypes.string,
  className: PropTypes.string,
  titleClassName: PropTypes.string,
  valueClassName: PropTypes.string,
  onClick: PropTypes.func,
  isLoading: PropTypes.bool
};

// Usando memo para evitar re-renderizações desnecessárias
export default memo(DashboardCard);