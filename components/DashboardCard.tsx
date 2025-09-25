
import React from 'react';

interface DashboardCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, color, onClick }) => {
  const content = (
    <>
      <div className={`p-4 rounded-full ${color} mr-4`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-pm-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-pm-gray-800">{value}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="bg-white p-6 rounded-lg shadow-md flex items-center w-full text-left transition-transform transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-pm-blue focus:ring-offset-2"
        aria-label={`${title}: ${value}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
      {content}
    </div>
  );
};

export default DashboardCard;
