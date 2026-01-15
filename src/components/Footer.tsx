import React from 'react';
import { smoothScrollToSection } from '@/utils/scrollUtils';

const Footer = () => {
  return (
    <footer role="contentinfo" className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-xl font-bold mb-4">
              Learn<span className="text-tutoring-teal">2</span>Lead
            </h3>
            <p className="text-gray-400 mb-4">
              Empowering students to achieve academic excellence and develop
              strong leadership skills.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2" role="list">
              <li>
                <button
                  onClick={() => smoothScrollToSection('services')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => smoothScrollToSection('testimonials')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Testimonials
                </button>
              </li>
              <li>
                <button
                  onClick={() => smoothScrollToSection('blog')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Blog
                </button>
              </li>
              <li>
                <button
                  onClick={() => smoothScrollToSection('contact')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Contact
                </button>
              </li>
            </ul>
          </nav>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Phone: (925) 854-7020</li>
              <li>Email: learn2leadtutoring@gmail.com</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <p className="text-gray-400">Coming Soon...</p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 Learn2Lead. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
