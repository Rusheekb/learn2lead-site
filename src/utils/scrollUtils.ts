import { useEffect } from 'react';

// Smooth scrolling utility that works with React Router
export const smoothScrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
};

// Handle navigation that combines routing and scrolling
export const handleSectionNavigation = (
  sectionId: string,
  currentPath: string,
  navigate: (path: string) => void
) => {
  if (currentPath !== '/') {
    // Navigate to home page first, then scroll
    navigate(`/?section=${sectionId}`);
  } else {
    // Already on home page, just scroll
    smoothScrollToSection(sectionId);
  }
};

// Hook for handling URL params on page load
export const useScrollToSection = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section) {
      // Small delay to ensure DOM is ready
      setTimeout(() => smoothScrollToSection(section), 100);
    }
  }, []);
};