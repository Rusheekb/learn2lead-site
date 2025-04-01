
import React from 'react';
import { Star } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "My daughter's confidence in math has improved dramatically since working with Learn2Lead tutors. Her grades went from C's to A's in just one semester!",
      author: "Sarah Johnson",
      role: "Parent of 8th Grader",
      rating: 5
    },
    {
      quote: "The personalized approach made all the difference. My SAT scores improved by over 200 points after just 10 sessions.",
      author: "Michael Chen",
      role: "High School Senior",
      rating: 5
    },
    {
      quote: "Learn2Lead helped me overcome my fear of science. My tutor explained complex concepts in ways that finally made sense to me.",
      author: "Emma Rodriguez",
      role: "College Freshman",
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Students Say
          </h2>
          <p className="text-lg text-gray-600">
            Hear from students and parents who have experienced the Learn2Lead difference
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-md">
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 italic mb-6">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.author}</p>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xl text-tutoring-blue font-medium mb-4">Ready to experience the difference?</p>
          <a 
            href="#contact" 
            className="inline-flex items-center justify-center bg-tutoring-blue hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition duration-300"
          >
            Schedule a Free Consultation
          </a>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
