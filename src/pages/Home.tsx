import { Helmet } from 'react-helmet-async';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Footer from '@/components/Footer';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>Learn2Lead – Home</title>
        <meta
          name="description"
          content="Personalized K‑12 tutoring for academic success"
        />
      </Helmet>
      <NavBar />
      <header className="pt-28 pb-16 md:pt-32 md:pb-24">
        <Hero />
      </header>
      <section>
        <Features />
      </section>
      <Footer />
    </>
  );
};

export default Home;
