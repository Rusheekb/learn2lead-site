
import React from 'react';
import { BookOpen, Users, Award, Clock, CheckCircle } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <BookOpen className="h-8 w-8 text-tutoring-teal" />,
      title: "Personalized Learning",
      description: "Customized lesson plans to meet your specific learning needs and goals."
    },
    {
      icon: <Users className="h-8 w-8 text-tutoring-teal" />,
      title: "Expert Tutors",
      description: "Learn from experienced, passionate educators with proven track records."
    },
    {
      icon: <Award className="h-8 w-8 text-tutoring-teal" />,
      title: "Results-Driven",
      description: "Our systematic approach delivers tangible improvements in academic performance."
    },
    {
      icon: <Clock className="h-8 w-8 text-tutoring-teal" />,
      title: "Flexible Scheduling",
      description: "Book sessions that fit your schedule, with in-person and online options."
    }
  ];

  return (
    <section id="services" className="py-20 bg-tutoring-lightGray">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our Tutoring Services
          </h2>
          <p className="text-lg text-gray-600">
            Comprehensive academic support for students of all ages and skill levels
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-xl shadow-md feature-card-hover"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 bg-tutoring-blue p-10 text-white">
              <h3 className="text-2xl font-bold mb-4">Subjects We Cover</h3>
              <p className="mb-6">Our comprehensive tutoring programs cover a wide range of subjects to support students at every level.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["Mathematics", "Science", "English", "History", "Foreign Languages", "Test Prep", "Computer Science", "Writing"].map((subject, idx) => (
                  <div key={idx} className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>{subject}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-full md:w-1/2 p-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Approach</h3>
              <p className="text-gray-600 mb-6">
                We believe that every student has unique learning needs. Our methodology combines:
              </p>
              
              <ul className="space-y-4">
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Assessment</h4>
                    <p className="text-sm text-gray-600">Understanding your current level and goals</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Personalization</h4>
                    <p className="text-sm text-gray-600">Creating a custom learning plan</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Guidance</h4>
                    <p className="text-sm text-gray-600">Regular sessions with expert tutors</p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Progress Tracking</h4>
                    <p className="text-sm text-gray-600">Regular assessments to measure improvement</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
