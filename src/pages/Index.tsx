import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if there's a section parameter in the URL
    const params = new URLSearchParams(location.search);
    const section = params.get('section');

    if (section) {
      // Remove the section parameter from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Scroll to the section
      const element = document.getElementById(section);
      if (element) {
        // Add a small delay to ensure the page is fully loaded
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  const handleStudentLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Hero />
      <Features />
      <Testimonials />

      {/* Student Portal Section */}
      <section className="py-16 bg-tutoring-lightBlue">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Access Your Student Portal
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Already a Learn2Lead student? Sign in to access your personalized
            dashboard, learning materials, and track your progress.
          </p>
          <Button
            onClick={handleStudentLogin}
            className="bg-tutoring-blue hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Student Login
          </Button>
        </div>
      </section>

        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
