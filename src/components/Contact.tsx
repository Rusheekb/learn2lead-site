import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { contactSchema, validateForm } from '@/lib/validation';

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = validateForm(contactSchema, formData);
    if (!result.success) {
      setErrors(result.errors);
      toast.error(result.firstError);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: result.data,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
      setErrors({});
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast.error(error.message || 'Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${name}-error`} className="mt-1 text-sm text-destructive" role="alert">
        {errors[name]}
      </p>
    ) : null;

  const inputClass = (name: string) =>
    errors[name] ? 'border-destructive focus-visible:ring-destructive' : '';

  return (
    <section id="contact" aria-labelledby="contact-heading" className="py-20 bg-tutoring-lightGray">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 id="contact-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Get in Touch
          </h2>
          <p className="text-lg text-muted-foreground">
            Have questions? We'd love to hear from you.
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 bg-tutoring-blue p-10 text-white">
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>

              <div className="space-y-6">
                <div className="flex items-start">
                  <Mail className="h-6 w-6 mr-4 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Email Us</p>
                    <p className="mt-1">learn2leadtutoring@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="h-6 w-6 mr-4 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Call Us</p>
                    <p className="mt-1">(925) 854-7020</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="h-6 w-6 mr-4 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="mt-1">Dallas Area</p>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h4 className="font-medium mb-4">Follow Us</h4>
                <p>Coming Soon...</p>
              </div>
            </div>

            <div className="w-full md:w-1/2 p-10">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Send Us a Message
              </h3>

              <form
                className="space-y-6"
                aria-label="Contact form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                      Name <span className="text-destructive" aria-hidden="true">*</span>
                    </label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleChange}
                      aria-required="true"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      className={inputClass('name')}
                    />
                    {fieldError('name')}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                      Email <span className="text-destructive" aria-hidden="true">*</span>
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Your email"
                      value={formData.email}
                      onChange={handleChange}
                      aria-required="true"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className={inputClass('email')}
                    />
                    {fieldError('email')}
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-1">
                    Subject <span className="text-destructive" aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="What is this regarding?"
                    value={formData.subject}
                    onChange={handleChange}
                    aria-required="true"
                    aria-invalid={!!errors.subject}
                    aria-describedby={errors.subject ? 'subject-error' : undefined}
                    className={inputClass('subject')}
                  />
                  {fieldError('subject')}
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">
                    Message <span className="text-destructive" aria-hidden="true">*</span>
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us how we can help..."
                    className={`min-h-[120px] ${inputClass('message')}`}
                    value={formData.message}
                    onChange={handleChange}
                    aria-required="true"
                    aria-invalid={!!errors.message}
                    aria-describedby={errors.message ? 'message-error' : undefined}
                  />
                  {fieldError('message')}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-tutoring-blue hover:bg-blue-700 text-white py-6"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
