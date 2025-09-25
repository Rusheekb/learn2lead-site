import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Footer from '@/components/Footer';

const Home = () => {
  return (
    <>
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
