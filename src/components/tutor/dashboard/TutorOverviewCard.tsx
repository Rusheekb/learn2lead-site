
import React from 'react';
import { Link } from 'react-router-dom';

interface TutorOverviewCardProps {
  title: string;
  value: string;
  description: string;
  link: string;
}

const TutorOverviewCard: React.FC<TutorOverviewCardProps> = ({
  title,
  value,
  description,
  link,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className="text-3xl font-bold mt-2 dark:text-gray-100">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{description}</p>
      <Link
        to={link}
        className="text-tutoring-blue hover:text-tutoring-teal dark:text-tutoring-teal dark:hover:text-tutoring-blue text-sm mt-4 inline-block"
      >
        View Details →
      </Link>
    </div>
  );
};

export default TutorOverviewCard;
