
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
  link
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      <Link 
        to={link} 
        className="text-tutoring-blue hover:text-tutoring-teal text-sm mt-4 inline-block"
      >
        View Details →
      </Link>
    </div>
  );
};

export default TutorOverviewCard;
