
import React from 'react';
import { Link } from 'react-router-dom';

interface TutorQuickAccessCardProps {
  title: string;
  description: string;
  buttonText: string;
  link: string;
  ariaLabel?: string;
}

const TutorQuickAccessCard: React.FC<TutorQuickAccessCardProps> = ({
  title,
  description,
  buttonText,
  link,
  ariaLabel,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
      <h3 className="font-medium dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{description}</p>
      <Link
        to={link}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-tutoring-blue dark:bg-tutoring-teal px-4 py-2 text-sm font-medium text-white hover:bg-tutoring-blue/90 dark:hover:bg-tutoring-teal/90 w-full"
        aria-label={ariaLabel || buttonText}
      >
        {buttonText}
      </Link>
    </div>
  );
};

export default TutorQuickAccessCard;
