import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import studentsWorkingImage from '@/assets/students-working1.png';

const Hero = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/pricing');
  };

  const handleLearnMore = () => {
    const featuresSection = document.getElementById('services');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" aria-labelledby="hero-heading" className="pt-28 pb-16 md:pt-32 md:pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Left column - Text content */}
          <div className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-10 animate-fade-in">
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
              Unlock Your
              <span className="text-tutoring-blue"> Academic Potential</span>
            </h1>

            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Personalized tutoring designed to help you achieve your academic
              goals. Our expert tutors are here to guide you every step of the
              way!
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleGetStarted}
                className="bg-tutoring-blue hover:bg-blue-700 text-white py-6 px-6 rounded-lg text-lg"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={handleLearnMore}
                variant="outline"
                className="border-tutoring-blue text-tutoring-blue hover:bg-tutoring-lightBlue py-6 px-6 rounded-lg text-lg"
              >
                Learn More
              </Button>
            </div>

            <div className="mt-8 flex items-center space-x-4">
              <p className="text-sm text-gray-500">
                Trusted by students across Dallas Area
              </p>
            </div>
          </div>

          {/* Right column - Image/graphic */}
          <div className="w-full md:w-1/2 animate-fade-in-right">
            <div className="relative">
              <div className="absolute -left-10 -top-10 w-64 h-64 bg-tutoring-teal/10 rounded-full blur-3xl"></div>
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-tutoring-blue/10 rounded-full blur-3xl"></div>

              <div className="relative p-4 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="rounded-xl overflow-hidden">
                  <img 
                    src={studentsWorkingImage} 
                    alt="Students learning together in a collaborative environment"
                    className="w-full h-96 object-cover rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
