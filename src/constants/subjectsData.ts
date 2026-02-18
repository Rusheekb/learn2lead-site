import { Calculator, Beaker, BookOpen, Book, Globe, Code } from 'lucide-react';
import React from 'react';

// Resource type definition
export interface Resource {
  title: string;
  url: string;
  source: string;
  type: 'video' | 'practice' | 'article';
}

// Topic with resources
export interface TopicWithResources {
  name: string;
  resources: Resource[];
}

// Define a type for the subject structure
export interface Subject {
  id: number;
  name: string;
  icon: string;
  iconComponent: React.ElementType;
  description: string;
  topics: TopicWithResources[];
}

export const subjects: Subject[] = [
  {
    id: 1,
    name: 'Mathematics',
    icon: 'calculator',
    iconComponent: Calculator,
    description: 'Algebra, Geometry, Calculus, and more',
    topics: [
      {
        name: 'Algebra I',
        resources: [
          { title: 'Algebra Basics', url: 'https://www.khanacademy.org/math/algebra', source: 'Khan Academy', type: 'video' },
          { title: 'Algebra Practice', url: 'https://www.mathway.com/Algebra', source: 'Mathway', type: 'practice' },
          { title: 'Intro to Algebra', url: 'https://www.mathsisfun.com/algebra/', source: 'Math is Fun', type: 'article' },
        ],
      },
      {
        name: 'Geometry',
        resources: [
          { title: 'Geometry Course', url: 'https://www.khanacademy.org/math/geometry', source: 'Khan Academy', type: 'video' },
          { title: 'Interactive Geometry', url: 'https://www.geogebra.org/geometry', source: 'GeoGebra', type: 'practice' },
          { title: 'Geometry Guide', url: 'https://www.mathsisfun.com/geometry/', source: 'Math is Fun', type: 'article' },
        ],
      },
      {
        name: 'Algebra II',
        resources: [
          { title: 'Algebra 2', url: 'https://www.khanacademy.org/math/algebra2', source: 'Khan Academy', type: 'video' },
          { title: 'Advanced Algebra Practice', url: 'https://www.mathway.com/Algebra', source: 'Mathway', type: 'practice' },
          { title: 'Polynomials & Functions', url: 'https://www.purplemath.com/modules/polydefs.htm', source: 'Purple Math', type: 'article' },
        ],
      },
      {
        name: 'Pre-Calculus',
        resources: [
          { title: 'Precalculus', url: 'https://www.khanacademy.org/math/precalculus', source: 'Khan Academy', type: 'video' },
          { title: 'Desmos Graphing', url: 'https://www.desmos.com/calculator', source: 'Desmos', type: 'practice' },
          { title: 'Trig Functions Guide', url: 'https://www.mathsisfun.com/algebra/trigonometry.html', source: 'Math is Fun', type: 'article' },
        ],
      },
      {
        name: 'Calculus',
        resources: [
          { title: 'Calculus 1', url: 'https://www.khanacademy.org/math/calculus-1', source: 'Khan Academy', type: 'video' },
          { title: 'Essence of Calculus', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr', source: '3Blue1Brown', type: 'video' },
          { title: 'Derivative Calculator', url: 'https://www.derivative-calculator.net/', source: 'Derivative Calculator', type: 'practice' },
        ],
      },
      {
        name: 'Statistics',
        resources: [
          { title: 'Statistics & Probability', url: 'https://www.khanacademy.org/math/statistics-probability', source: 'Khan Academy', type: 'video' },
          { title: 'Statistics How To', url: 'https://www.statisticshowto.com/', source: 'Statistics How To', type: 'article' },
          { title: 'Stat Trek Practice', url: 'https://stattrek.com/tutorials/ap-statistics-tutorial', source: 'Stat Trek', type: 'practice' },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Science',
    icon: 'beaker',
    iconComponent: Beaker,
    description: 'Biology, Chemistry, Physics, and more',
    topics: [
      {
        name: 'Biology',
        resources: [
          { title: 'Biology', url: 'https://www.khanacademy.org/science/biology', source: 'Khan Academy', type: 'video' },
          { title: 'Biology - Crash Course', url: 'https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF', source: 'CrashCourse', type: 'video' },
          { title: 'Biology Corner', url: 'https://www.biologycorner.com/', source: 'Biology Corner', type: 'article' },
        ],
      },
      {
        name: 'Chemistry',
        resources: [
          { title: 'Chemistry', url: 'https://www.khanacademy.org/science/chemistry', source: 'Khan Academy', type: 'video' },
          { title: 'Chemistry - Crash Course', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtPHzzYuWy6fYEaX9mQQ8oGr', source: 'CrashCourse', type: 'video' },
          { title: 'PhET Chemistry Simulations', url: 'https://phet.colorado.edu/en/simulations/filter?subjects=chemistry', source: 'PhET', type: 'practice' },
        ],
      },
      {
        name: 'Physics',
        resources: [
          { title: 'Physics', url: 'https://www.khanacademy.org/science/physics', source: 'Khan Academy', type: 'video' },
          { title: 'Physics - Crash Course', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtN0ge7yDk_UA0ldZJdhwkoV', source: 'CrashCourse', type: 'video' },
          { title: 'PhET Physics Simulations', url: 'https://phet.colorado.edu/en/simulations/filter?subjects=physics', source: 'PhET', type: 'practice' },
        ],
      },
      {
        name: 'Environmental Science',
        resources: [
          { title: 'Ecology', url: 'https://www.khanacademy.org/science/biology/ecology', source: 'Khan Academy', type: 'video' },
          { title: 'Ecology - Crash Course', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtNdTKZkV_GiIYXpV9w4WxbX', source: 'CrashCourse', type: 'video' },
          { title: 'EPA Student Resources', url: 'https://www.epa.gov/students', source: 'EPA', type: 'article' },
        ],
      },
      {
        name: 'Astronomy',
        resources: [
          { title: 'Cosmology & Astronomy', url: 'https://www.khanacademy.org/science/cosmology-and-astronomy', source: 'Khan Academy', type: 'video' },
          { title: 'Astronomy - Crash Course', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtPAJr1ysd5yGIyiSFuh0mIL', source: 'CrashCourse', type: 'video' },
          { title: 'NASA Education', url: 'https://www.nasa.gov/stem/', source: 'NASA', type: 'article' },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'English',
    icon: 'bookOpen',
    iconComponent: BookOpen,
    description: 'Literature, Writing, Grammar, and more',
    topics: [
      {
        name: 'Literature',
        resources: [
          { title: 'Literature Study Guides', url: 'https://www.sparknotes.com/lit/', source: 'SparkNotes', type: 'article' },
          { title: 'Literature - Crash Course', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOeEc9ME62zTfqc0h6Pe8vb', source: 'CrashCourse', type: 'video' },
          { title: 'Project Gutenberg', url: 'https://www.gutenberg.org/', source: 'Project Gutenberg', type: 'article' },
        ],
      },
      {
        name: 'Creative Writing',
        resources: [
          { title: 'Writing Tips', url: 'https://www.masterclass.com/articles/creative-writing-tips', source: 'MasterClass', type: 'article' },
          { title: 'Writing Prompts', url: 'https://www.writersdigest.com/prompts', source: 'Writers Digest', type: 'practice' },
          { title: 'TED-Ed Writing', url: 'https://www.youtube.com/playlist?list=PLJicmE8fK0EiUEg5dwwW3BbH5Mk6w-qA5', source: 'TED-Ed', type: 'video' },
        ],
      },
      {
        name: 'Grammar',
        resources: [
          { title: 'Grammar Guide', url: 'https://owl.purdue.edu/owl/general_writing/grammar/', source: 'Purdue OWL', type: 'article' },
          { title: 'Grammar Girl', url: 'https://www.quickanddirtytips.com/grammar-girl', source: 'Grammar Girl', type: 'article' },
          { title: 'Grammar Practice', url: 'https://www.grammarly.com/blog/category/handbook/', source: 'Grammarly', type: 'practice' },
        ],
      },
      {
        name: 'Vocabulary',
        resources: [
          { title: 'Vocabulary.com', url: 'https://www.vocabulary.com/', source: 'Vocabulary.com', type: 'practice' },
          { title: 'Word of the Day', url: 'https://www.merriam-webster.com/word-of-the-day', source: 'Merriam-Webster', type: 'article' },
          { title: 'Flocabulary', url: 'https://www.flocabulary.com/', source: 'Flocabulary', type: 'video' },
        ],
      },
      {
        name: 'Essay Writing',
        resources: [
          { title: 'Essay Writing', url: 'https://owl.purdue.edu/owl/general_writing/the_writing_process/', source: 'Purdue OWL', type: 'article' },
          { title: 'Essay Structure', url: 'https://www.khanacademy.org/humanities/grammar', source: 'Khan Academy', type: 'video' },
          { title: 'Essay Examples', url: 'https://www.scribbr.com/category/essay-examples/', source: 'Scribbr', type: 'article' },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'History',
    icon: 'book',
    iconComponent: Book,
    description: 'World History, U.S. History, and more',
    topics: [
      {
        name: 'World History',
        resources: [
          { title: 'World History', url: 'https://www.khanacademy.org/humanities/world-history', source: 'Khan Academy', type: 'video' },
          { title: 'World History - Crash Course', url: 'https://www.youtube.com/playlist?list=PLBDA2E52FB1EF80C9', source: 'CrashCourse', type: 'video' },
          { title: 'World History Encyclopedia', url: 'https://www.worldhistory.org/', source: 'World History Encyclopedia', type: 'article' },
        ],
      },
      {
        name: 'U.S. History',
        resources: [
          { title: 'US History', url: 'https://www.khanacademy.org/humanities/us-history', source: 'Khan Academy', type: 'video' },
          { title: 'US History - Crash Course', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMwmepBjTSG593eG7ObzO7s', source: 'CrashCourse', type: 'video' },
          { title: 'History.com', url: 'https://www.history.com/topics', source: 'History.com', type: 'article' },
        ],
      },
      {
        name: 'European History',
        resources: [
          { title: 'European History', url: 'https://www.khanacademy.org/humanities/ap-art-history/start-here-background-on-art-history', source: 'Khan Academy', type: 'video' },
          { title: 'European History - Crash Course', url: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMsMTfmRomkVQG8AqrAmJFX', source: 'CrashCourse', type: 'video' },
          { title: 'BBC History', url: 'https://www.bbc.co.uk/history', source: 'BBC', type: 'article' },
        ],
      },
      {
        name: 'Ancient Civilizations',
        resources: [
          { title: 'Ancient History', url: 'https://www.khanacademy.org/humanities/ancient-art-civilizations', source: 'Khan Academy', type: 'video' },
          { title: 'Ancient History Encyclopedia', url: 'https://www.worldhistory.org/Ancient_History/', source: 'World History Encyclopedia', type: 'article' },
          { title: 'National Geographic History', url: 'https://www.nationalgeographic.com/history/', source: 'National Geographic', type: 'article' },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'Foreign Languages',
    icon: 'globe',
    iconComponent: Globe,
    description: 'Spanish, French, Mandarin, and more',
    topics: [
      {
        name: 'Spanish',
        resources: [
          { title: 'Learn Spanish', url: 'https://www.duolingo.com/course/es/en/Learn-Spanish', source: 'Duolingo', type: 'practice' },
          { title: 'SpanishDict', url: 'https://www.spanishdict.com/', source: 'SpanishDict', type: 'article' },
          { title: 'Easy Spanish', url: 'https://www.youtube.com/c/EasySpanish', source: 'Easy Languages', type: 'video' },
        ],
      },
      {
        name: 'French',
        resources: [
          { title: 'Learn French', url: 'https://www.duolingo.com/course/fr/en/Learn-French', source: 'Duolingo', type: 'practice' },
          { title: 'WordReference French', url: 'https://www.wordreference.com/fren/', source: 'WordReference', type: 'article' },
          { title: 'Easy French', url: 'https://www.youtube.com/c/EasyFrench', source: 'Easy Languages', type: 'video' },
        ],
      },
      {
        name: 'Mandarin',
        resources: [
          { title: 'Learn Chinese', url: 'https://www.duolingo.com/course/zh/en/Learn-Chinese', source: 'Duolingo', type: 'practice' },
          { title: 'Chinese Pod', url: 'https://www.youtube.com/c/ChinesePod', source: 'ChinesePod', type: 'video' },
          { title: 'Pleco Dictionary', url: 'https://www.pleco.com/', source: 'Pleco', type: 'article' },
        ],
      },
      {
        name: 'German',
        resources: [
          { title: 'Learn German', url: 'https://www.duolingo.com/course/de/en/Learn-German', source: 'Duolingo', type: 'practice' },
          { title: 'Easy German', url: 'https://www.youtube.com/c/EasyGerman', source: 'Easy Languages', type: 'video' },
          { title: 'German Dictionary', url: 'https://www.dict.cc/', source: 'dict.cc', type: 'article' },
        ],
      },
      {
        name: 'Latin',
        resources: [
          { title: 'Latin Course', url: 'https://www.youtube.com/playlist?list=PLI7B0WoJp3kV6fmYBKaZW0WF5zGDVUGcV', source: 'Latinum', type: 'video' },
          { title: 'Latin Dictionary', url: 'https://www.latin-dictionary.net/', source: 'Latin Dictionary', type: 'article' },
          { title: 'Latin Practice', url: 'https://www.latinitium.com/', source: 'Latinitium', type: 'practice' },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'Coding',
    icon: 'code',
    iconComponent: Code,
    description: 'Web Development, Python, Java, and more',
    topics: [
      {
        name: 'Web Development',
        resources: [
          { title: 'HTML & CSS', url: 'https://www.freecodecamp.org/learn/responsive-web-design/', source: 'freeCodeCamp', type: 'practice' },
          { title: 'Web Dev - Crash Course', url: 'https://www.youtube.com/watch?v=916GWv2Qs08', source: 'Traversy Media', type: 'video' },
          { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Learn', source: 'MDN', type: 'article' },
        ],
      },
      {
        name: 'Python',
        resources: [
          { title: 'Python for Everybody', url: 'https://www.py4e.com/', source: 'Py4E', type: 'video' },
          { title: 'Python Practice', url: 'https://www.codecademy.com/learn/learn-python-3', source: 'Codecademy', type: 'practice' },
          { title: 'Automate the Boring Stuff', url: 'https://automatetheboringstuff.com/', source: 'Al Sweigart', type: 'article' },
        ],
      },
      {
        name: 'Java',
        resources: [
          { title: 'Java Programming', url: 'https://www.youtube.com/watch?v=eIrMbAQSU34', source: 'Programming with Mosh', type: 'video' },
          { title: 'Java Practice', url: 'https://www.codingbat.com/java', source: 'CodingBat', type: 'practice' },
          { title: 'Java Tutorial', url: 'https://www.w3schools.com/java/', source: 'W3Schools', type: 'article' },
        ],
      },
      {
        name: 'JavaScript',
        resources: [
          { title: 'JavaScript Algorithms', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/', source: 'freeCodeCamp', type: 'practice' },
          { title: 'JavaScript - Crash Course', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3c', source: 'Traversy Media', type: 'video' },
          { title: 'JavaScript.info', url: 'https://javascript.info/', source: 'javascript.info', type: 'article' },
        ],
      },
      {
        name: 'Data Structures & Algorithms',
        resources: [
          { title: 'DSA Course', url: 'https://www.khanacademy.org/computing/computer-science/algorithms', source: 'Khan Academy', type: 'video' },
          { title: 'LeetCode', url: 'https://leetcode.com/', source: 'LeetCode', type: 'practice' },
          { title: 'Visualgo', url: 'https://visualgo.net/', source: 'Visualgo', type: 'practice' },
        ],
      },
    ],
  },
];

// Helper function to get subject by ID
export const getSubjectById = (id: number): Subject | undefined => {
  return subjects.find(subject => subject.id === id);
};

// Helper to get flat list of all topics across subjects
export const getAllTopics = (): { subjectName: string; topic: TopicWithResources }[] => {
  return subjects.flatMap(subject =>
    subject.topics.map(topic => ({
      subjectName: subject.name,
      topic,
    }))
  );
};
