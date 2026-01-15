import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useEffect } from 'react';

const faqs = [
  {
    question: 'What subjects do you offer tutoring for?',
    answer:
      'We offer comprehensive tutoring for all K-12 subjects including Math (from basic arithmetic to calculus), Science (biology, chemistry, physics), English (reading, writing, grammar), History, and test preparation for SAT, ACT, and AP exams.',
  },
  {
    question: 'How are tutoring sessions conducted?',
    answer:
      'All sessions are conducted online via video conferencing, making it convenient for students to learn from anywhere. Each session is one-on-one with a dedicated tutor who focuses entirely on your child\'s learning needs.',
  },
  {
    question: 'How do you match students with tutors?',
    answer:
      'We use a personalized matching system that considers learning style, academic goals, schedule preferences, and subject needs. Our algorithm ensures each student is paired with a tutor who can best support their educational journey.',
  },
  {
    question: 'What is your pricing structure?',
    answer:
      'We offer flexible subscription plans starting from 4 classes per month. Each plan includes personalized 1-on-1 sessions, progress tracking, and access to learning materials. Visit our pricing page for detailed plan information.',
  },
  {
    question: 'Can I pause or cancel my subscription?',
    answer:
      'Yes! We understand that schedules can change. You can pause your subscription for up to 90 days for vacations or breaks, and you can cancel anytime. Unused credits carry over month to month within your subscription period.',
  },
  {
    question: 'How do I track my child\'s progress?',
    answer:
      'Parents and students have access to a personalized dashboard that shows completed sessions, upcoming classes, homework assignments, and detailed progress reports. Tutors also provide regular feedback after each session.',
  },
];

const FAQ = () => {
  // Inject JSON-LD schema for FAQ
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-schema';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });

    // Remove existing script if present
    const existing = document.getElementById('faq-schema');
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('faq-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  return (
    <section id="faq" aria-labelledby="faq-heading" className="py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about our tutoring services
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
