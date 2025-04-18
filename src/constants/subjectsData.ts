
import { Calculator, Beaker, BookOpen, Book, Globe } from 'lucide-react';
import React from 'react';

export const subjects = [
  {
    id: 1,
    name: "Mathematics",
    icon: <Calculator className="h-8 w-8 text-tutoring-blue" />,
    description: "Algebra, Geometry, Calculus, and more",
    topics: ["Algebra I", "Geometry", "Algebra II", "Pre-Calculus", "Calculus", "Statistics"]
  },
  {
    id: 2,
    name: "Science",
    icon: <Beaker className="h-8 w-8 text-green-500" />,
    description: "Biology, Chemistry, Physics, and more",
    topics: ["Biology", "Chemistry", "Physics", "Environmental Science", "Astronomy"]
  },
  {
    id: 3,
    name: "English",
    icon: <BookOpen className="h-8 w-8 text-yellow-600" />,
    description: "Literature, Writing, Grammar, and more",
    topics: ["Literature", "Creative Writing", "Grammar", "Vocabulary", "Essay Writing"]
  },
  {
    id: 4,
    name: "History",
    icon: <Book className="h-8 w-8 text-red-600" />,
    description: "World History, U.S. History, and more",
    topics: ["World History", "U.S. History", "European History", "Ancient Civilizations"]
  },
  {
    id: 5,
    name: "Foreign Languages",
    icon: <Globe className="h-8 w-8 text-blue-500" />,
    description: "Spanish, French, Mandarin, and more",
    topics: ["Spanish", "French", "Mandarin", "German", "Latin"]
  }
];
