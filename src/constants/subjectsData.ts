
import { Calculator, Beaker, BookOpen, Book, Globe } from 'lucide-react';
import React from 'react';

// Define a type for the subject structure
export interface Subject {
  id: number;
  name: string;
  icon: string;
  iconComponent: React.ElementType;
  description: string;
  topics: string[];
}

export const subjects: Subject[] = [
  {
    id: 1,
    name: "Mathematics",
    icon: "calculator",
    iconComponent: Calculator,
    description: "Algebra, Geometry, Calculus, and more",
    topics: ["Algebra I", "Geometry", "Algebra II", "Pre-Calculus", "Calculus", "Statistics"]
  },
  {
    id: 2,
    name: "Science",
    icon: "beaker",
    iconComponent: Beaker,
    description: "Biology, Chemistry, Physics, and more",
    topics: ["Biology", "Chemistry", "Physics", "Environmental Science", "Astronomy"]
  },
  {
    id: 3,
    name: "English",
    icon: "bookOpen",
    iconComponent: BookOpen,
    description: "Literature, Writing, Grammar, and more",
    topics: ["Literature", "Creative Writing", "Grammar", "Vocabulary", "Essay Writing"]
  },
  {
    id: 4,
    name: "History",
    icon: "book",
    iconComponent: Book,
    description: "World History, U.S. History, and more",
    topics: ["World History", "U.S. History", "European History", "Ancient Civilizations"]
  },
  {
    id: 5,
    name: "Foreign Languages",
    icon: "globe",
    iconComponent: Globe,
    description: "Spanish, French, Mandarin, and more",
    topics: ["Spanish", "French", "Mandarin", "German", "Latin"]
  }
];
