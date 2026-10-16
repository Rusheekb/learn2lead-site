import React from 'react';
import NavBar from '@/components/NavBar';
import { Link } from 'react-router-dom';

const UPDATED = 'October 16, 2026';
const CONTACT = 'learn2leadtutoring@gmail.com';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-muted-foreground leading-relaxed">
      {children}
    </div>
  </section>
);

/** Public privacy policy (linked from the footer and Google's sign-in screen). */
const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen bg-background">
    <NavBar />
    <main className="mx-auto max-w-3xl space-y-8 px-4 pb-12 pt-28 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-tutoring-blue">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">Last updated {UPDATED}</p>
        <p className="text-muted-foreground leading-relaxed">
          Learn2Lead (“we”, “us”) provides online tutoring at learn2lead.page.
          This policy explains what we collect, why, who helps us run the
          service, and the choices you have.
        </p>
      </header>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account details:</strong> name, email address, username and
            password (stored only in encrypted, hashed form), and your role
            (student, parent, tutor or staff). If you sign in with Google, we
            receive your name, email address and profile picture from Google.
          </li>
          <li>
            <strong>Student details:</strong> for a student a parent adds, the
            student’s name, grade and, optionally, an email address for class
            emails. A student added by a parent doesn’t need an email address.
          </li>
          <li>
            <strong>Tutoring records:</strong> class schedules, attendance,
            tutor notes, homework, files shared for classes, and hours used.
          </li>
          <li>
            <strong>Messages:</strong> messages sent between students, parents,
            tutors and Learn2Lead staff in the app.
          </li>
          <li>
            <strong>Payments:</strong> purchases of tutoring hours are processed
            by Stripe. We keep a record of what was bought and when; your full
            card details go to Stripe and are never stored by us.
          </li>
          <li>
            <strong>Mobile number (optional):</strong> if you choose to get
            texts, your number, its verification, and a record of your consent.
          </li>
          <li>
            <strong>Usage and technical data:</strong> pages visited, device and
            browser information, and error reports, used to keep the site
            working and improve it.
          </li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            To run tutoring: matching students with tutors, scheduling and
            logging classes, and tracking hours.
          </li>
          <li>
            To send the emails and texts you’ve chosen: class reminders, class
            notes, message alerts, low-balance alerts and summaries. You can
            turn each kind on or off in Settings.
          </li>
          <li>
            To process payments and keep accurate records of purchases and
            hours.
          </li>
          <li>To keep accounts secure, prevent abuse, and fix problems.</li>
        </ul>
        <p>
          We don’t sell personal information, and we don’t use it for
          advertising.
        </p>
      </Section>

      <Section title="Children and families">
        <p>
          Parents can add their children to a family account. The parent
          provides the child’s details, pays for tutoring, can see the child’s
          classes, notes and messages with tutors, and controls whether the
          child has their own login. Students with a parent on their account
          never see payment information.
        </p>
        <p>
          Messages between a tutor and a student are always visible to the
          student’s parent and to Learn2Lead staff.
        </p>
        <p>
          A parent can review, change or delete their child’s information at any
          time by contacting us at {CONTACT}.
        </p>
      </Section>

      <Section title="Text messages">
        <p>
          We only send texts to numbers that have been verified and whose owner
          agreed to receive them. Message frequency varies; message and data
          rates may apply. Reply STOP to opt out at any time, or HELP for help.
        </p>
        <p>
          We don’t share mobile numbers or text-message consent with third
          parties or affiliates for marketing or promotional purposes.
        </p>
      </Section>

      <Section title="Who helps us run Learn2Lead">
        <p>
          We use trusted service providers who process data only to provide
          their service to us:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: database, accounts and file storage</li>
          <li>Stripe: payments</li>
          <li>Resend: email delivery</li>
          <li>Twilio: text-message delivery</li>
          <li>Vercel: website hosting</li>
          <li>Google: “Sign in with Google”</li>
          <li>Sentry: error reports</li>
          <li>PostHog: product analytics</li>
        </ul>
        <p>
          We may also share information when required by law or to protect the
          safety of our students, families and staff.
        </p>
      </Section>

      <Section title="Keeping and deleting data">
        <p>
          We keep account and tutoring records while an account is active and as
          needed for accurate billing records. You can ask us to delete your
          account, or a parent can ask us to delete their child’s, by emailing{' '}
          {CONTACT}.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Data is encrypted in transit, access is limited by role (for example,
          students can’t see billing and tutors see only their own students),
          and passwords are stored only in hashed form. No system is perfectly
          secure, so please keep your password private.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          If we change this policy, we’ll update the date above. Questions or
          requests: {CONTACT} or (925) 854-7020.
        </p>
      </Section>
      <p>
        <Link to="/" className="text-tutoring-blue hover:underline">
          ← Back to Learn2Lead
        </Link>
      </p>
    </main>
  </div>
);

export default PrivacyPolicy;
