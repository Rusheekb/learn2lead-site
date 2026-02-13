import posthog from 'posthog-js';

const POSTHOG_API_KEY = 'phc_EmulYhmshfgWxynh5hICupiq4gHtaYIAEDSqpc4d69G';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export const initPostHog = () => {
  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // Manually tracked via React Router
    capture_pageleave: true,
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing();
      }
    },
  });
};

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  posthog.identify(userId, properties);
};

export const resetUser = () => {
  posthog.reset();
};

export const captureEvent = (eventName: string, properties?: Record<string, unknown>) => {
  posthog.capture(eventName, properties);
};

export { posthog };
