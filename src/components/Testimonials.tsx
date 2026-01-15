import React from 'react';
import { Star } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      quote:
        'My tutor helps me learn a lot of new topics to keep me ahead in my classes. They always explains new topics in a way that I can understand. In science I learned about the periodic table and in the end of class we played a quiz game to have fun and learn! They make class fun by playing educational games to help me learn but also have fun!',
      author: 'Anonymous Student',
      role: 'Middle School Student',
      rating: 5,
    },
    {
      quote:
        "My tutor is really good at teaching and understanding with what I'm struggling with. She comes up with several teaching methods if one is not working for me and she makes sure I'm growing.",
      author: 'Anonymous Student',
      role: 'High School Student',
      rating: 5,
    },
    {
      quote: "Since my son began high school ELA tutoring in the summer of 2024, his reading and writing skills have improved remarkably. The tutor tailors lessons to his learning style, providing detailed feedback and adapting to our homeschool curriculum. Her expertise in grammar, writing, and SAT prep has been invaluable. Thanks to her guidance, ELA has transformed from his least favorite subject to one he genuinely enjoys.",
      author: 'Anonymous Parent',
      role: 'Parent',
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Students Say
          </h2>
          <p className="text-lg text-gray-600">
            Success stories from our community of learners
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-md">
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-yellow-400 fill-current"
                  />
                ))}
              </div>
              <p className="text-gray-600 italic mb-6">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold text-gray-900">
                  {testimonial.author}
                </p>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
