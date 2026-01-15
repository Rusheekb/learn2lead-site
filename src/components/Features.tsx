import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  Award,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Features = () => {
  const navigate = useNavigate();
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  const features = [
    {
      icon: <BookOpen className="h-8 w-8 text-tutoring-teal" />,
      title: 'Personalized Learning',
      description:
        'Customized study plans tailored to your unique learning style and goals.',
      details:
        'Our adaptive learning system analyzes your progress and adjusts the curriculum to match your pace and learning style.',
    },
    {
      icon: <Users className="h-8 w-8 text-tutoring-teal" />,
      title: 'Expert Tutors',
      description:
        'Learn from experienced educators with proven track records of student success.',
      details:
        'All our tutors are certified educators with years of experience in their respective fields.',
    },
    {
      icon: <Award className="h-8 w-8 text-tutoring-teal" />,
      title: 'Comprehensive Subjects',
      description:
        'Coverage of all major academic subjects and test preparation materials.',
      details:
        'From basic mathematics to advanced physics, we cover all subjects with detailed study materials.',
    },
    {
      icon: <Clock className="h-8 w-8 text-tutoring-teal" />,
      title: 'Progress Tracking',
      description:
        'Regular assessments and detailed progress reports to monitor your growth.',
      details:
        'Get weekly progress reports and performance analytics to track your improvement.',
    },
    {
      icon: <Users className="h-8 w-8 text-tutoring-teal" />,
      title: '1 on 1 Sessions',
      description:
        'Personalized one-on-one tutoring sessions focused entirely on your learning needs and pace.',
      details:
        'Schedule flexible sessions with dedicated tutors who provide undivided attention.',
    },
    {
      icon: <Award className="h-8 w-8 text-tutoring-teal" />,
      title: 'College Prep',
      description:
        'Specialized programs for college admissions and standardized tests.',
      details:
        'Comprehensive preparation for SAT, ACT, and other college entrance exams.',
    },
  ];

  const handleFeatureClick = (index: number) => {
    setExpandedFeature(expandedFeature === index ? null : index);
  };

  const handleGetStarted = () => {
    navigate('/pricing');
  };

  return (
    <section id="services" aria-labelledby="services-heading" className="py-20 bg-tutoring-lightGray">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 id="services-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Comprehensive Learning Services
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Everything you need to excel in your academic journey
          </p>
          <Button
            onClick={handleGetStarted}
            className="bg-tutoring-blue hover:bg-blue-700 text-white py-6 px-6 rounded-lg text-lg"
          >
            View Our Programs
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl shadow-md feature-card-hover cursor-pointer transition-all duration-300"
              onClick={() => handleFeatureClick(index)}
            >
              <div className="flex justify-between items-start">
                <div className="mb-4">{feature.icon}</div>
                {expandedFeature === index ? (
                  <ChevronUp className="h-5 w-5 text-tutoring-teal" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-tutoring-teal" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
              {expandedFeature === index && (
                <p className="mt-4 text-gray-600 text-sm">{feature.details}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 bg-tutoring-blue p-10 text-white">
              <h3 className="text-2xl font-bold mb-4">Subjects We Cover</h3>
              <p className="mb-6">
                Our comprehensive tutoring programs cover a wide range of
                subjects to support students at every level.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Mathematics',
                  'English',
                  'Foreign Languages',
                  'Computer Science',
                  'Science',
                  'History',
                  'Test Prep',
                  'Writing',
                ].map((subject, idx) => (
                  <div key={idx} className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>{subject}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-1/2 p-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Our Approach
              </h3>
              <p className="text-gray-600 mb-6">
                We believe that every student has unique learning needs. Our
                methodology combines:
              </p>

              <ul className="space-y-4">
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Assessment</h4>
                    <p className="text-sm text-gray-600">
                      Understanding your current level and goals
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Personalization
                    </h4>
                    <p className="text-sm text-gray-600">
                      Creating a custom learning plan
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Guidance</h4>
                    <p className="text-sm text-gray-600">
                      Regular sessions with expert tutors
                    </p>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-tutoring-teal/20 flex items-center justify-center mr-3">
                    <span className="text-tutoring-teal font-medium">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Progress Tracking
                    </h4>
                    <p className="text-sm text-gray-600">
                      Regular assessments to measure improvement
                    </p>
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
