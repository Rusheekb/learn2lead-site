
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section id="home" className="pt-28 pb-16 md:pt-32 md:pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Left column - Text content */}
          <div className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-10 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
              Unlock Your 
              <span className="text-tutoring-blue"> Academic Potential</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Personalized tutoring services designed to help students excel in their studies and develop a lifelong love for learning.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-tutoring-blue hover:bg-blue-700 text-white py-6 px-6 rounded-lg text-lg">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" className="border-tutoring-blue text-tutoring-blue hover:bg-tutoring-lightBlue py-6 px-6 rounded-lg text-lg">
                Learn More
              </Button>
            </div>
            
            <div className="mt-8 flex items-center space-x-4">
              <p className="text-sm text-gray-500">Trusted by:</p>
              <div className="flex space-x-6">
                <div className="w-16 h-6 bg-gray-200 rounded opacity-70"></div>
                <div className="w-16 h-6 bg-gray-200 rounded opacity-70"></div>
                <div className="w-16 h-6 bg-gray-200 rounded opacity-70"></div>
              </div>
            </div>
          </div>
          
          {/* Right column - Image/graphic */}
          <div className="w-full md:w-1/2 animate-fade-in-right">
            <div className="relative">
              <div className="absolute -left-10 -top-10 w-64 h-64 bg-tutoring-teal/10 rounded-full blur-3xl"></div>
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-tutoring-blue/10 rounded-full blur-3xl"></div>
              
              <div className="relative p-4 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="aspect-w-16 aspect-h-9 rounded-xl overflow-hidden bg-tutoring-lightBlue">
                  {/* Replace with your actual image or illustration */}
                  <div className="w-full h-96 flex items-center justify-center hero-gradient rounded-xl">
                    <p className="text-white text-lg font-medium">Tutoring in action</p>
                  </div>
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
