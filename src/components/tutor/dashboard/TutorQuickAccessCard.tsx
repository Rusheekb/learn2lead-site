
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
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-gray-600 mt-2">{description}</p>
      <Link
        to={link}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-tutoring-blue px-4 py-2 text-sm font-medium text-white hover:bg-tutoring-blue/90 w-full"
        aria-label={ariaLabel || buttonText}
      >
        {buttonText}
      </Link>
    </div>
  );
};

export default TutorQuickAccessCard;
