import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

type PricingTierProps = {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
};

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  price,
  description,
  features,
  buttonText,
  highlighted = false,
}) => {
  return (
    <div
      className={`flex flex-col p-6 rounded-lg border ${
        highlighted ? 'border-tutoring-teal shadow-lg' : 'border-gray-200'
      }`}
    >
      <h3 className="text-xl font-bold mb-2">{name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-gray-500">/month</span>
      </div>
      <p className="text-gray-600 mb-6">{description}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <Button
          className={`w-full ${
            highlighted ? 'bg-tutoring-teal hover:bg-tutoring-teal/90' : ''
          }`}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
};

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-tutoring-blue">
                Learn<span className="text-tutoring-teal">2</span>Lead
              </h1>
              <span className="ml-2 text-gray-500">Pricing</span>
            </div>
            <div>
              <Button
                variant="ghost"
                onClick={() => (window.location.href = '/')}
              >
                Home
              </Button>
              <Button
                variant="ghost"
                onClick={() => (window.location.href = '/login')}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for your learning journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingTier
            name="Basic"
            price="$140"
            description="Perfect for beginners looking to improve in one subject"
            features={[
              'Access to one subject area',
              '1 hour of tutoring per week',
              'Basic study materials',
              'Email support',
            ]}
            buttonText="Get Started"
          />

          <PricingTier
            name="Standard"
            price="$260"
            description="Our most popular plan for dedicated students"
            features={[
              'Access to all subject areas',
              '2 hours of tutoring per week',
              'Advanced study materials',
              'Practice tests and assessments',
              'Priority email support',
            ]}
            buttonText="Choose Standard"
            highlighted={true}
          />

          <PricingTier
            name="Premium"
            price="$360"
            description="Comprehensive support for academic excellence"
            features={[
              'Access to all subject areas',
              '3 hours of tutoring per week',
              'Premium study materials',
              'Personalized study plan',
              'Practice tests and assessments',
              '1-on-1 counseling sessions',
              '24/7 priority support',
            ]}
            buttonText="Choose Premium"
          />
        </div>

        <div className="max-w-3xl mx-auto text-center mt-16">
          <h3 className="text-2xl font-semibold mb-4">
            Need something different?
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            We also offer customized plans for schools and organizations
          </p>
          <Button size="lg">Contact Us</Button>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
