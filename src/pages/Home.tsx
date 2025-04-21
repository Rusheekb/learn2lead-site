
import React from 'react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Unlock Your Academic Potential
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
              Personalized tutoring designed to help you achieve your academic goals. Our expert tutors are here to guide you every step of the way!
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={handleGetStarted}
                className="bg-tutoring-blue hover:bg-blue-700"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="border-tutoring-blue text-tutoring-blue hover:bg-tutoring-lightBlue"
                onClick={() => {
                  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Comprehensive Learning Services</h2>
            <p className="text-xl text-gray-600 mb-12 text-center">Everything you need to excel in your academic journey</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Personalized Learning",
                  description: "Customized study plans tailored to your unique learning style and goals."
                },
                {
                  title: "Expert Tutors",
                  description: "Learn from experienced educators with proven track records of student success."
                },
                {
                  title: "Comprehensive Subjects",
                  description: "Coverage of all major academic subjects and test preparation materials."
                },
                {
                  title: "Progress Tracking",
                  description: "Regular assessments and detailed progress reports to monitor your growth."
                },
                {
                  title: "1 on 1 Sessions",
                  description: "Personalized one-on-one tutoring sessions focused entirely on your learning needs and pace."
                },
                {
                  title: "College Prep",
                  description: "Specialized programs for college admissions and standardized tests."
                }
              ].map((service, index) => (
                <article key={index} className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Subjects Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Subjects We Cover</h2>
            <p className="text-xl text-gray-600 mb-12 text-center">
              Our comprehensive tutoring programs cover a wide range of subjects to support students at every level.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "Mathematics",
                "English",
                "Foreign Languages",
                "Computer Science",
                "Science",
                "History",
                "Test Prep",
                "Writing"
              ].map((subject, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
                  <span className="text-gray-900 font-medium">{subject}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Approach Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Approach</h2>
            <p className="text-xl text-gray-600 mb-12 text-center">
              We believe that every student has unique learning needs. Our methodology combines:
            </p>
            <div className="max-w-3xl mx-auto">
              <ol className="space-y-6">
                {[
                  "Assessment: Understanding your current level and goals",
                  "Personalization: Creating a custom learning plan",
                  "Guidance: Regular sessions with expert tutors",
                  "Progress Tracking: Regular assessments to measure improvement"
                ].map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-tutoring-blue text-white font-bold mr-4">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
