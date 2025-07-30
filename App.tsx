
import React, { useState, createContext, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { getAiTutorResponse, findLearningMaterials } from './services/geminiService';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    jspdf: any;
  }
}

// --- TYPES & CONSTANTS ---
type LearningGoal = 'Improve Math' | 'Learn History' | 'Master Science' | 'Code a Website';
type View = 'login' | 'dashboard' | 'recommendations' | 'insights' | 'quiz' | 'ai_study' | 'settings';
type LearningStyle = 'Visual' | 'Audio' | 'Mixed';
type QuizType = 'practice' | 'final';

interface User {
  name: string;
  goal: LearningGoal;
  learningStyle: LearningStyle;
}

const LEARNING_GOALS: LearningGoal[] = ['Improve Math', 'Learn History', 'Master Science', 'Code a Website'];
const SIDEBAR_LINKS: { name: View; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { name: 'dashboard', label: 'Home', icon: HomeIcon },
  { name: 'recommendations', label: 'Recommends', icon: RecommendsIcon },
  { name: 'insights', label: 'Insights', icon: InsightsIcon },
];

const questionTemplate = {
  question: "",
  answers: [""],
  correctAnswerIndex: 0,
  topic: "",
  tags: [""]
};

const ALL_QUIZ_DATA: Record<LearningGoal, typeof questionTemplate[]> = {
    'Improve Math': [
        { question: "What is the value of 8 x 3?", answers: ["18", "21", "24", "27"], correctAnswerIndex: 2, topic: "Algebra Basics", tags: ["NeedSuns", "Medluns"]},
        { question: "What is the square root of 144?", answers: ["10", "11", "12", "13"], correctAnswerIndex: 2, topic: "Basic Arithmetic", tags: ["NeedSuns", "Roots"]},
        { question: "Solve for x: 2x + 5 = 15", answers: ["3", "5", "7", "10"], correctAnswerIndex: 1, topic: "Simple Equations", tags: ["Medluns", "Algebra"]},
        { question: "A triangle has angles 45°, 45°, and x. What is x?", answers: ["45°", "90°", "180°", "60°"], correctAnswerIndex: 1, topic: "Geometry", tags: ["Angles", "Triangles"]},
        { question: "What is 20% of 300?", answers: ["40", "50", "60", "70"], correctAnswerIndex: 2, topic: "Percentages", tags: ["Math", "Basics"]},
        { question: "If a car travels 180 miles in 3 hours, what is its average speed?", answers: ["50 mph", "60 mph", "70 mph", "90 mph"], correctAnswerIndex: 1, topic: "Rates", tags: ["Speed", "Math"]},
        { question: "What is the next number in the sequence: 2, 5, 11, 23, ...?", answers: ["47", "46", "34", "42"], correctAnswerIndex: 0, topic: "Number Series", tags: ["Logic", "Patterns"]},
        { question: "What is the area of a circle with a radius of 5 units?", answers: ["10π", "25π", "5π", "100π"], correctAnswerIndex: 1, topic: "Geometry", tags: ["Circles", "Area"]},
        { question: "Simplify the fraction 12/30.", answers: ["2/5", "3/7", "4/10", "1/3"], correctAnswerIndex: 0, topic: "Fractions", tags: ["Simplifying", "Basics"]},
        { question: "What is 3/4 as a decimal?", answers: ["0.34", "0.75", "0.25", "3.4"], correctAnswerIndex: 1, topic: "Fractions & Decimals", tags: ["Basics", "Conversion"]},
    ],
    'Learn History': [
        { question: "Who was the first President of the United States?", answers: ["Thomas Jefferson", "Abraham Lincoln", "George Washington", "John Adams"], correctAnswerIndex: 2, topic: "US History", tags: ["Presidents", "Founding Fathers"]},
        { question: "In which year did World War II end?", answers: ["1943", "1945", "1950", "1939"], correctAnswerIndex: 1, topic: "World History", tags: ["WWII", "20th Century"]},
        { question: "The ancient pyramids are located in which country?", answers: ["Greece", "Mexico", "Egypt", "Italy"], correctAnswerIndex: 2, topic: "Ancient Civilizations", tags: ["Egypt", "Pyramids"]},
        { question: "The Renaissance began in which European country?", answers: ["France", "Spain", "England", "Italy"], correctAnswerIndex: 3, topic: "European History", tags: ["Renaissance", "Art History"]},
        { question: "Who wrote the 'Declaration of Independence'?", answers: ["George Washington", "Thomas Jefferson", "Benjamin Franklin", "John Hancock"], correctAnswerIndex: 1, topic: "US History", tags: ["American Revolution", "Documents"]},
        { question: "The Magna Carta was signed in what year?", answers: ["1066", "1215", "1492", "1776"], correctAnswerIndex: 1, topic: "Medieval History", tags: ["England", "Law"]},
        { question: "Who was the leader of the Soviet Union during the Cuban Missile Crisis?", answers: ["Vladimir Lenin", "Joseph Stalin", "Nikita Khrushchev", "Mikhail Gorbachev"], correctAnswerIndex: 2, topic: "Cold War", tags: ["USSR", "20th Century"]},
        { question: "The city of Constantinople is known today by what name?", answers: ["Athens", "Rome", "Ankara", "Istanbul"], correctAnswerIndex: 3, topic: "Byzantine Empire", tags: ["Cities", "Turkey"]},
        { question: "Which empire was ruled by Genghis Khan?", answers: ["Ottoman Empire", "Roman Empire", "Mongol Empire", "Persian Empire"], correctAnswerIndex: 2, topic: "Asian History", tags: ["Mongols", "Conquerors"]},
        { question: "What event triggered the start of World War I?", answers: ["Invasion of Poland", "Bombing of Pearl Harbor", "Assassination of Archduke Franz Ferdinand", "The sinking of the Lusitania"], correctAnswerIndex: 2, topic: "World History", tags: ["WWI", "20th Century"]},
    ],
    'Master Science': [
        { question: "What is the chemical symbol for water?", answers: ["O2", "H2O", "CO2", "NaCl"], correctAnswerIndex: 1, topic: "Chemistry", tags: ["Molecules", "Basics"]},
        { question: "Which planet is known as the Red Planet?", answers: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswerIndex: 1, topic: "Astronomy", tags: ["Solar System", "Planets"]},
        { question: "What is the powerhouse of the cell?", answers: ["Nucleus", "Ribosome", "Mitochondrion", "Cell Wall"], correctAnswerIndex: 2, topic: "Biology", tags: ["Cells", "Organelles"]},
        { question: "What force pulls objects towards the center of the Earth?", answers: ["Magnetism", "Friction", "Tension", "Gravity"], correctAnswerIndex: 3, topic: "Physics", tags: ["Forces", "Gravity"]},
        { question: "What process do plants use to make their own food?", answers: ["Respiration", "Transpiration", "Photosynthesis", "Germination"], correctAnswerIndex: 2, topic: "Biology", tags: ["Plants", "Photosynthesis"]},
        { question: "What does DNA stand for?", answers: ["Deoxyribonucleic Acid", "Denitro Acid", "Deoxyribo Nutrient Acid", "Dinucleic Acid"], correctAnswerIndex: 0, topic: "Genetics", tags: ["Biology", "DNA"]},
        { question: "What is the speed of light?", answers: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"], correctAnswerIndex: 0, topic: "Physics", tags: ["Light", "Constants"]},
        { question: "Which of these is not a state of matter?", answers: ["Solid", "Liquid", "Gas", "Plasma", "Ink"], correctAnswerIndex: 4, topic: "Chemistry", tags: ["States of Matter", "Basics"]},
        { question: "What is the hardest natural substance on Earth?", answers: ["Gold", "Iron", "Diamond", "Quartz"], correctAnswerIndex: 2, topic: "Geology", tags: ["Minerals", "Materials"]},
        { question: "How many bones are in the adult human body?", answers: ["206", "212", "300", "198"], correctAnswerIndex: 0, topic: "Anatomy", tags: ["Biology", "Human Body"]},
    ],
    'Code a Website': [
        { question: "What does HTML stand for?", answers: ["HyperText Markup Language", "Hyperlink and Text Markup Language", "Home Tool Markup Language", "Hyperlinking Textual MARKUP Language"], correctAnswerIndex: 0, topic: "Web Fundamentals", tags: ["HTML", "Basics"]},
        { question: "Which CSS property is used to change the text color of an element?", answers: ["font-color", "text-color", "color", "background-color"], correctAnswerIndex: 2, topic: "CSS", tags: ["Styling", "CSS"]},
        { question: "Which tag is used to define an unordered list in HTML?", answers: ["<list>", "<li>", "<ol>", "<ul>"], correctAnswerIndex: 3, topic: "HTML", tags: ["Lists", "HTML"]},
        { question: "In JavaScript, how do you declare a constant variable?", answers: ["var", "let", "const", "constant"], correctAnswerIndex: 2, topic: "JavaScript", tags: ["Variables", "ES6"]},
        { question: "What is the correct syntax for referring to an external script called 'app.js'?", answers: ["<script href='app.js'>", "<script name='app.js'>", "<script src='app.js'>", "<script file='app.js'>"], correctAnswerIndex: 2, topic: "JavaScript", tags: ["HTML", "Scripts"]},
        { question: "What does 'git clone' do?", answers: ["Deletes a repository", "Creates a new repository", "Creates a copy of an existing repository", "Lists all repositories"], correctAnswerIndex: 2, topic: "Version Control", tags: ["Git", "Basics"]},
        { question: "What is an API?", answers: ["Advanced Programming Interface", "Application Programming Interface", "Automated Program Interaction", "Application Process Integration"], correctAnswerIndex: 1, topic: "Web Concepts", tags: ["API", "Backend"]},
        { question: "In CSS, what is the 'box model'?", answers: ["A model for 3D shapes", "A layout model for HTML elements", "A type of JavaScript framework", "A color selection tool"], correctAnswerIndex: 1, topic: "CSS", tags: ["Layout", "Box Model"]},
        { question: "What data type would you use for 'true' or 'false' in JavaScript?", answers: ["String", "Number", "Boolean", "Object"], correctAnswerIndex: 2, topic: "JavaScript", tags: ["Data Types", "Basics"]},
        { question: "Which HTTP method is typically used to request data from a server?", answers: ["POST", "GET", "DELETE", "PUT"], correctAnswerIndex: 1, topic: "Web Concepts", tags: ["HTTP", "Network"]},
    ]
};


// --- APP CONTEXT ---
interface AppContextType {
  user: User | null;
  view: View;
  darkMode: boolean;
  login: (name: string, goal: LearningGoal, style: LearningStyle) => void;
  setView: (view: View) => void;
  toggleDarkMode: () => void;
  logout: () => void;
  updateLearningStyle: (style: LearningStyle) => void;
  lastQuizScore: { correct: number; total: number } | null;
  setLastQuizScore: (score: { correct: number; total: number } | null) => void;
  voiceAssistantEnabled: boolean;
  toggleVoiceAssistant: () => void;
  toast: string | null;
  showToast: (message: string, duration?: number) => void;
  quizType: QuizType;
  startQuiz: (type: QuizType) => void;
}

const AppContext = createContext<AppContextType | null>(null);
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppProvider");
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('login');
  const [darkMode, setDarkMode] = useState(false);
  const [lastQuizScore, setLastQuizScore] = useState<{ correct: number; total: number } | null>(null);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [quizType, setQuizType] = useState<QuizType>('practice');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const showToast = useCallback((message: string, duration: number = 3000) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);
    
  const login = useCallback((name: string, goal: LearningGoal, style: LearningStyle) => {
    setUser({ name, goal, learningStyle: style });
    setView('dashboard');
  }, []);
  
  const logout = useCallback(() => {
    setUser(null);
    setView('login');
    setDarkMode(false);
    setVoiceAssistantEnabled(false);
    setLastQuizScore(null);
  }, []);

  const updateLearningStyle = useCallback((style: LearningStyle) => {
    setUser(currentUser => currentUser ? { ...currentUser, learningStyle: style } : null);
  }, []);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), []);
  
  const toggleVoiceAssistant = useCallback(() => {
    setVoiceAssistantEnabled(prev => !prev);
  }, []);

  const startQuiz = useCallback((type: QuizType) => {
    setQuizType(type);
    setView('quiz');
  }, []);

  const contextValue = useMemo(() => ({
      user, 
      view, 
      darkMode, 
      login, 
      setView, 
      toggleDarkMode, 
      logout, 
      updateLearningStyle, 
      lastQuizScore, 
      setLastQuizScore, 
      voiceAssistantEnabled, 
      toggleVoiceAssistant, 
      toast, 
      showToast,
      quizType,
      startQuiz
  }), [user, view, darkMode, login, setView, toggleDarkMode, logout, updateLearningStyle, lastQuizScore, voiceAssistantEnabled, toggleVoiceAssistant, toast, showToast, quizType, startQuiz]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};


// --- ICONS ---
function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
}
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function RecommendsIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function InsightsIcon(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
}
function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.82l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.82l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function LogOutIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
}
function SendIcon(props: React.SVGProps<SVGSVGElement>) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
}
function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
}
function ChatBubbleIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
}
function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>;
}
function MicrophoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>;
}
function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 11.75a29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>;
}
function CodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
}
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
}

// --- REUSABLE COMPONENTS ---
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; }> = ({ checked, onChange }) => {
  return (
    <button onClick={onChange} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
};

const ProgressDonutChart = () => {
    const data = [{ name: 'Completed', value: 75 }, { name: 'Remaining', value: 25 }];
    const COLORS = ['#4ADE80', '#374151'];
    return (
        <ResponsiveContainer width="100%" height={150}>
            <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} fill="#8884d8" paddingAngle={5} dataKey="value">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-current text-gray-800 dark:text-white font-bold text-xl">75%</text>
            </PieChart>
        </ResponsiveContainer>
    );
};

const Toast: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-navy-dark text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-fade-in-out">
        <MicrophoneIcon className="w-5 h-5 text-green-400"/>
        <span>{message}</span>
    </div>
  );
};

// --- HOOKS ---
const useVoiceAssistant = () => {
  const { setView, logout, toggleDarkMode, darkMode, voiceAssistantEnabled, showToast, startQuiz } = useAppContext();
  const recognitionRef = useRef<any>(null);
  const terminalErrorRef = useRef(false);

  const processCommand = useCallback((command: string) => {
    console.log(`Processing command: ${command}`);
    if (command.includes('go to home') || command.includes('go to dashboard')) {
      setView('dashboard');
      showToast('Navigating to Dashboard');
    } else if (command.includes('go to recommendations')) {
      setView('recommendations');
      showToast('Navigating to Recommendations');
    } else if (command.includes('go to insights')) {
      setView('insights');
      showToast('Navigating to Insights');
    } else if (command.includes('go to settings')) {
      setView('settings');
      showToast('Navigating to Settings');
    } else if (command.includes('start quiz')) {
      startQuiz('practice');
      showToast('Starting a new practice quiz');
    } else if (command.includes('open study buddy')) {
      setView('ai_study');
      showToast('Opening AI Study Buddy');
    } else if (command.includes('dark mode on') || command.includes('enable dark mode')) {
      if (!darkMode) {
        toggleDarkMode();
        showToast('Dark Mode enabled.');
      } else {
        showToast('Dark Mode is already on.');
      }
    } else if (command.includes('dark mode off') || command.includes('disable dark mode')) {
      if (darkMode) {
        toggleDarkMode();
        showToast('Dark Mode disabled.');
      } else {
        showToast('Dark Mode is already off.');
      }
    } else if (command.includes('log out') || command.includes('sign out')) {
      logout();
      showToast('Logging out...');
    } else {
      showToast(`Command not recognized: "${command}"`);
    }
  }, [setView, logout, toggleDarkMode, darkMode, showToast, startQuiz]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (voiceAssistantEnabled) {
        showToast("Voice recognition not supported in your browser.");
      }
      return;
    }
    
    if (voiceAssistantEnabled) {
      terminalErrorRef.current = false; // Reset error on start
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if(lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim().toLowerCase();
            processCommand(transcript);
        }
      };
      
      recognition.onerror = (event: any) => {
        if (event.error === 'aborted') {
          return;
        }
        console.error('Speech recognition error:', event.error);
        if (event.error === 'network') {
            showToast('Voice assistant stopped due to a network error.');
            terminalErrorRef.current = true;
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showToast('Voice permission is not granted.');
          terminalErrorRef.current = true;
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current && !terminalErrorRef.current) {
            try {
                recognition.start();
            } catch (err) {
                console.error("Error restarting recognition:", err);
            }
        }
      };

      try {
        recognition.start();
        showToast("Voice assistant is active.");
      } catch(e) {
          console.error("Could not start voice recognition:", e);
      }
      
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
        showToast("Voice assistant is off.");
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [voiceAssistantEnabled, processCommand, showToast]);
};


// --- PAGE COMPONENTS ---

const LoginScreen: React.FC = () => {
  const { login } = useAppContext();
  const [name, setName] = useState('Katabo');
  const [goal, setGoal] = useState<LearningGoal>('Improve Math');
  const [learningStyle, setLearningStyle] = useState<LearningStyle>('Visual');
  const learningStyles: LearningStyle[] = ['Visual', 'Audio', 'Mixed'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name.trim(), goal, learningStyle);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="w-full max-w-md p-8 space-y-8 bg-light-card dark:bg-dark-card rounded-2xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <BookOpenIcon className="w-8 h-8 text-primary" />
            <span className="font-bold text-gray-500 dark:text-gray-400">ADAPTIVE LEARNING ASSISTANT</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Learn Smarter.</h1>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Grow Faster.</h1>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-gray-100 dark:bg-navy-dark border border-transparent rounded-lg focus:ring-primary focus:border-primary text-gray-900 dark:text-white"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label htmlFor="goal" className="text-sm font-medium text-gray-700 dark:text-gray-300">Learning Goal</label>
            <div className="relative mt-1">
              <select
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as LearningGoal)}
                className="appearance-none block w-full px-4 py-3 bg-gray-100 dark:bg-navy-dark border border-transparent rounded-lg focus:ring-primary focus:border-primary text-gray-900 dark:text-white"
              >
                {LEARNING_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Learning Style</label>
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-gray-100 dark:bg-navy-dark p-1">
              {learningStyles.map(style => (
                <button
                  type="button"
                  key={style}
                  onClick={() => setLearningStyle(style)}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    learningStyle === style
                      ? 'bg-white dark:bg-dark-card shadow text-primary'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors duration-300">
            Start Learning
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
    const { user, startQuiz, lastQuizScore, voiceAssistantEnabled, toggleVoiceAssistant, setView } = useAppContext();

    const ProgressCard = () => (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Progress Tracker</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your overall topic mastery.</p>
            </div>
            <ProgressDonutChart />
        </div>
    );

    const ContinueLearningCard = () => (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm h-full flex flex-col">
            <h3 className="font-semibold text-gray-800 dark:text-white">Continue Learning</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">{user?.goal}</p>
            <div className="flex-grow"></div>
            <button
                onClick={() => startQuiz('practice')}
                className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
            >
                Start Practice Quiz ({user?.learningStyle})
            </button>
        </div>
    );
    
    const StudyBuddyCard = () => (
        <button
            onClick={() => setView('ai_study')}
            className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm text-left hover:ring-2 hover:ring-primary transition-all h-full"
        >
             <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg inline-block mb-4">
                <ChatBubbleIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Study Buddy Chat</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ask your AI tutor anything.</p>
        </button>
    );
    
    const LastQuizCard = () => {
        const percentage = lastQuizScore ? Math.round((lastQuizScore.correct / lastQuizScore.total) * 100) : 0;
    
        return (
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm h-full flex flex-col">
                <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-800 dark:text-white">Last Quiz Performance</h3>
                    <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg">
                        <TrophyIcon className="w-6 h-6 text-green-500 dark:text-green-400" />
                    </div>
                </div>
                
                <div className="flex-grow flex flex-col justify-center">
                    {lastQuizScore ? (
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Your Score
                            </p>
                            <p className="text-3xl font-bold text-gray-700 dark:text-gray-200 mt-1">
                                {lastQuizScore.correct}
                                <span className="text-lg font-medium text-gray-500 dark:text-gray-400"> / {lastQuizScore.total} correct</span>
                            </p>
                            <div className="w-full bg-gray-200 dark:bg-navy-dark rounded-full h-2.5 mt-3">
                                <div 
                                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                            <p className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">{percentage}%</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400">Take a quiz to see your score.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const VoiceAssistantCard = () => (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Voice Assistant</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enable voice commands.</p>
                </div>
                 <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg">
                    <MicrophoneIcon className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                </div>
            </div>
             <div className="mt-4 flex justify-end">
                <ToggleSwitch checked={voiceAssistantEnabled} onChange={toggleVoiceAssistant} />
            </div>
        </div>
    );


    return (
        <div className="p-8 h-full overflow-y-auto bg-light-bg dark:bg-dark-bg">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Hi, {user?.name}</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><ContinueLearningCard /></div>
                <ProgressCard />
                <LastQuizCard />
                <StudyBuddyCard />
                <VoiceAssistantCard />
            </div>
        </div>
    );
};

const QuizView: React.FC = () => {
    const { setView, setLastQuizScore, user, quizType } = useAppContext();
    const [currentQuizQuestions, setCurrentQuizQuestions] = useState<(typeof questionTemplate)[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isStarted, setIsStarted] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [isHintLoading, setIsHintLoading] = useState(false);
    const [score, setScore] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);

    useEffect(() => {
        const shuffleArray = (array: any[]) => {
            const newArr = [...array];
            for (let i = newArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
            }
            return newArr;
        };

        const goal = user?.goal || 'Improve Math';
        const questionsForGoal = ALL_QUIZ_DATA[goal] || ALL_QUIZ_DATA['Improve Math'];
        
        if (quizType === 'practice') {
            setCurrentQuizQuestions(shuffleArray(questionsForGoal).slice(0, 5));
        } else { // 'final' quiz
            setCurrentQuizQuestions(shuffleArray(questionsForGoal));
        }
        
        // Reset state for new quiz
        setScore(0);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setIsCorrect(null);
        setHint(null);
        setQuizFinished(false);
        setIsStarted(false);

    }, [user, quizType]);

    const currentQuestion = currentQuizQuestions[currentQuestionIndex];

    const handleNext = () => {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < currentQuizQuestions.length) {
            setCurrentQuestionIndex(nextIndex);
            setSelectedAnswer(null);
            setIsSubmitted(false);
            setIsCorrect(null);
            setHint(null);
            setIsHintLoading(false);
        } else {
            setLastQuizScore({ correct: score, total: currentQuizQuestions.length });
            setQuizFinished(true);
        }
    };

    const handleHint = async () => {
        if (hint) return;
        setIsHintLoading(true);
        const prompt = `Give a short, one-sentence hint for the question: "${currentQuestion.question}". Don't give the answer.`;
        try {
            const hintResponse = await getAiTutorResponse(prompt, []);
            setHint(hintResponse);
        } catch (error) {
            console.error("Failed to get hint:", error);
            setHint("Sorry, couldn't fetch a hint right now.");
        } finally {
            setIsHintLoading(false);
        }
    };

    const handleSubmit = () => {
        if (selectedAnswer === null) return;
        const correct = selectedAnswer === currentQuestion.correctAnswerIndex;
        if (correct) {
            setScore(prev => prev + 1);
        }
        setIsCorrect(correct);
        setIsSubmitted(true);
    };

    const getAnswerButtonClass = (index: number) => {
        if (!isSubmitted) {
            return selectedAnswer === index
                ? 'bg-primary text-white'
                : 'bg-navy-light hover:bg-gray-600';
        }
        if (index === currentQuestion.correctAnswerIndex) {
            return 'bg-green-500 text-white';
        }
        if (index === selectedAnswer && !isCorrect) {
            return 'bg-red-500 text-white';
        }
        return 'bg-navy-light opacity-60';
    };

    if (!currentQuizQuestions.length || !currentQuestion) {
        return (
            <div className="p-8 bg-navy dark:bg-dark-card h-full flex flex-col justify-center items-center text-white">
                <p>Loading {quizType} quiz for {user?.goal}...</p>
            </div>
        );
    }

    if (quizFinished) {
        const percentage = Math.round((score / currentQuizQuestions.length) * 100);
        return (
            <div className="p-8 bg-navy dark:bg-dark-card h-full flex flex-col justify-center items-center text-white text-center">
                <TrophyIcon className="w-24 h-24 text-yellow-400 mb-4" />
                <h1 className="text-4xl font-bold mb-2">{quizType === 'final' ? 'Challenge Complete!' : 'Quiz Complete!'}</h1>
                <p className="text-xl text-gray-300 mb-6">You've finished the {quizType} quiz on {user?.goal}.</p>
                <div className="bg-navy-light p-8 rounded-2xl w-full max-w-sm">
                    <p className="text-lg text-gray-400">Your Score</p>
                    <p className="text-6xl font-bold my-2">{percentage}%</p>
                    <p className="text-lg">{score} out of {currentQuizQuestions.length} correct</p>
                    <div className="w-full bg-navy-dark rounded-full h-2.5 mt-6">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>
                <button
                    onClick={() => setView('dashboard')}
                    className="mt-8 w-full max-w-sm py-3 bg-secondary hover:bg-green-600 rounded-lg font-bold"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 bg-navy dark:bg-dark-card h-full flex flex-col">
            <header className="flex justify-between items-center text-white">
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 hover:text-gray-300">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="capitalize">{quizType} Quiz: {user?.goal}</span>
                </button>
                <span className="text-sm font-medium">{currentQuestionIndex + 1} of {currentQuizQuestions.length}</span>
            </header>

            <div className="flex-grow flex flex-col justify-center items-center text-white text-center">
                <div className="w-full max-w-2xl">
                    <h1 className="text-2xl font-bold mb-2">Topic: {currentQuestion.topic}</h1>
                    <div className="flex gap-2 justify-center mb-6">
                        {currentQuestion.tags.map(tag => (
                            <span key={tag} className="bg-gray-600 px-3 py-1 text-xs rounded-full">{tag}</span>
                        ))}
                    </div>
                    
                    <p className="text-3xl font-semibold mb-8">{currentQuestion.question}</p>

                    {hint && (
                        <div className="my-4 p-4 bg-navy-light rounded-lg text-left text-gray-300">
                            <p><span className="font-bold">Hint:</span> {hint}</p>
                        </div>
                    )}

                    <div className="space-y-4 mb-8">
                        {currentQuestion.answers.map((answer, index) => (
                            <button 
                                key={index}
                                onClick={() => !isSubmitted && setSelectedAnswer(index)}
                                disabled={isSubmitted || !isStarted}
                                className={`w-full text-left p-4 rounded-lg transition-colors ${getAnswerButtonClass(index)} ${
                                    isStarted ? 'cursor-pointer' : 'cursor-not-allowed'
                                }`}
                            >
                                {answer}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        {isStarted ? (
                            isSubmitted ? (
                                <button onClick={handleNext} className="w-full py-3 bg-secondary hover:bg-green-600 rounded-lg font-bold">
                                    {currentQuestionIndex === currentQuizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                                </button>
                            ) : (
                                <>
                                    <button onClick={handleHint} disabled={isHintLoading} className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50">
                                        {isHintLoading ? 'Getting hint...' : 'Hint'}
                                    </button>
                                    <button onClick={handleSubmit} disabled={selectedAnswer === null} className="flex-1 py-3 bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50">
                                        Submit
                                    </button>
                                    <button onClick={handleNext} className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg">
                                        Skip
                                    </button>
                                </>
                            )
                        ) : (
                            <button onClick={() => setIsStarted(true)} className="w-full py-3 bg-secondary hover:bg-green-600 rounded-lg font-bold">
                                Start
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const BotMessageCard: React.FC<{ text: string }> = ({ text }) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const parts = [];
    const links: { title: string; url: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        links.push({ title: match[1], url: match[2] });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    const mainText = parts.join('').trim();

    return (
        <div>
            {mainText && <p className="whitespace-pre-wrap">{mainText}</p>}
            {links.length > 0 && (
                <div className="mt-4 pt-3 border-t border-navy-dark/50 space-y-2">
                    <h4 className="font-semibold text-sm text-gray-300">Related Materials:</h4>
                    {links.map((link, i) => (
                        <a 
                            key={i} 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block bg-navy p-3 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <p className="font-semibold text-white truncate">{link.title}</p>
                            <p className="text-xs text-blue-400 truncate">{link.url}</p>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};


const AiStudyBuddy: React.FC = () => {
    const { setView } = useAppContext();
    const [messages, setMessages] = useState([
        { from: 'ai', text: 'Hi there! What subject can I help you with today? Ask me to explain a concept!' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [messages]);

    const handleSend = async (promptText = input) => {
        if (!promptText.trim() || isLoading) return;
        
        const userMessage = { from: 'user', text: promptText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const chatHistory = messages.map(msg => ({
            role: msg.from === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const aiResponseText = await getAiTutorResponse(promptText, chatHistory);
        const aiMessage = { from: 'ai', text: aiResponseText };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
    };
    
    const handlePromptClick = (prompt: string) => {
        setInput(prompt);
        handleSend(prompt);
    }
    
    const suggestionPrompts = ["Can you explain the Pythagorean Theorem?", "What are quadratic equations?", "Explain probability basics."];

    return (
        <div className="bg-navy-dark h-full flex flex-col text-white">
            <header className="p-4 flex items-center justify-between border-b border-navy-light">
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 hover:text-gray-300">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span className="font-semibold">AI STUDY BUDDY</span>
                </button>
            </header>
            
            <div ref={chatContainerRef} className="flex-grow p-6 space-y-6 overflow-y-auto">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.from === 'user' ? 'justify-end' : ''}`}>
                        {msg.from === 'ai' && <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center font-bold">AI</div>}
                        <div className={`p-4 rounded-2xl max-w-lg ${msg.from === 'ai' ? 'bg-navy-light' : 'bg-primary'}`}>
                           {msg.from === 'ai' ? (
                               <BotMessageCard text={msg.text} />
                           ) : (
                               <p className="whitespace-pre-wrap">{msg.text}</p>
                           )}
                           {msg.from === 'ai' && index > 0 && (
                               <div className="flex justify-end">
                                   <button onClick={() => navigator.clipboard.writeText(msg.text)} className="mt-3 opacity-50 hover:opacity-100">
                                       <CopyIcon className="w-4 h-4" />
                                   </button>
                               </div>
                           )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center font-bold">AI</div>
                        <div className="p-4 rounded-2xl max-w-lg bg-navy-light">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-75"></span>
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-150"></span>
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-pulse delay-300"></span>
                            </div>
                        </div>
                    </div>
                )}
                 {messages.length <= 1 && (
                    <div className="bg-navy-light p-4 rounded-lg">
                        <p className="text-sm text-gray-400 mb-3">Suggestion prompts</p>
                        <div className="space-y-2">
                            {suggestionPrompts.map(p => (
                                <button key={p} onClick={() => handlePromptClick(p)} className="w-full text-left p-3 rounded-md hover:bg-navy transition-colors text-sm">{p}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-navy-light">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Ask me anything about your studies..."
                        className="w-full bg-navy-light rounded-lg py-3 pl-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary disabled:bg-gray-500 transition-colors">
                        <SendIcon className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const learningMaterialTemplate = {
    title: "",
    source: "",
    icon: <React.Fragment />,
    url: "",
    type: "",
    videos: [] as { title: string; url: string }[]
};

const ALL_LEARNING_MATERIALS: Record<LearningGoal, typeof learningMaterialTemplate[]> = {
    'Improve Math': [
        { title: "Factoring Quadratic Equations", source: "Khan Academy - Interactive", icon: <InsightsIcon/>, type: 'Interactive', url: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratics-multiplying-factoring/x2f8bb11595b61c86:factor-quadratics-strategy/v/factoring-quadratics-in-any-form', videos: [{ title: "How To Factor Trinomials Step By Step", url: "https://www.youtube.com/watch?v=s_6n_eO-zEo" }, { title: "Factoring quadratics intro | Khan Academy", url: "https://www.youtube.com/watch?v=qe5C_y61_Jc" }]},
        { title: "Probability Theory Basics", source: "Wikipedia - Article", icon: <BookOpenIcon />, type: 'Article', url: 'https://en.wikipedia.org/wiki/Probability_theory', videos: [{ title: "Math Antics - Basic Probability", url: "https://www.youtube.com/watch?v=K34T4l00_o4" }, { title: "Probability - Tree Diagrams 1", url: "https://www.youtube.com/watch?v=c5w93T63M3Y" }]},
        { title: "The Pythagorean Theorem", source: "Math is Fun - Article", icon: <BookOpenIcon />, type: 'Article', url: 'https://www.mathsisfun.com/pythagoras.html', videos: [{ title: "The Pythagorean theorem intro | Khan Academy", url: "https://www.youtube.com/watch?v=Pyh_gAS_eQA" }, { title: "What is Pythagoras' theorem? | The Dr. Binocs Show", url: "https://www.youtube.com/watch?v=O64-A90_f_4" }]},
        { title: "Solving Trigonometric Equations", source: "Brilliant.org - Interactive", icon: <RecommendsIcon/>, type: 'Interactive', url: 'https://brilliant.org/wiki/solving-trigonometric-equations/', videos: [{ title: "Solving Trig Equations | The Organic Chemistry Tutor", url: "https://www.youtube.com/watch?v=2mO_b_e07p4" }, { title: "Solving Trigonometric Equations - General Solution", url: "https://www.youtube.com/watch?v=kEcbxiLeG_c" }]},
    ],
    'Learn History': [
         { title: "The Second World War", source: "Khan Academy - Course", icon: <BookOpenIcon/>, type: 'Course', url: 'https://www.khanacademy.org/humanities/us-history/rise-to-world-power/us-wwii', videos: [{ title: "World War II: Crash Course US History #35", url: "https://www.youtube.com/watch?v=Objoad6rG6U" }, { title: "World War II - OverSimplified (Part 1)", url: "https://www.youtube.com/watch?v=spw5o-C4I1M" }]},
         { title: "The Roman Empire", source: "Wikipedia - Article", icon: <BookOpenIcon/>, type: 'Article', url: 'https://en.wikipedia.org/wiki/Roman_Empire', videos: [{ title: "The Roman Empire...: Crash Course World History #10", url: "https://www.youtube.com/watch?v=oPf27gAup9U" }, { title: "The Rise and Fall of the Roman Empire | The History Channel", url: "https://www.youtube.com/watch?v=Ee_F_42GvD4" }]},
        { title: "Ancient Egypt", source: "History.com - Topic", icon: <BookOpenIcon/>, type: 'Article', url: 'https://www.history.com/topics/ancient-egypt/ancient-egyptian-civilization', videos: [{ title: "Ancient Egypt 101 | National Geographic", url: "https://www.youtube.com/watch?v=hO1tzmi1V5g" }, { title: "The Ancient Egypt - 5 things you should know", url: "https://www.youtube.com/watch?v=ssB-5fS_Jb4" }]}
    ],
    'Master Science': [
        { title: "Photosynthesis", source: "Khan Academy - Course", icon: <BookOpenIcon />, type: 'Course', url: 'https://www.khanacademy.org/science/biology/photosynthesis-in-plants', videos: [{ title: "Photosynthesis: Crash Course Biology #8", url: "https://www.youtube.com/watch?v=sQK3Yr4Sc_k" }, { title: "Travel Deep Inside a Leaf | California Academy of Sciences", url: "https://www.youtube.com/watch?v=g78utcLQrJ4" }]},
        { title: "Theory of General Relativity", source: "Space.com - Article", icon: <InsightsIcon />, type: 'Article', url: 'https://www.space.com/17661-theory-general-relativity.html', videos: [{ title: "What Is General Relativity? | PBS Space Time", url: "https://www.youtube.com/watch?v=DYq774z4dws" }, { title: "General Relativity Explained in 7 Levels of Difficulty | WIRED", url: "https://www.youtube.com/watch?v=A_Jo_14i_sA" }]},
        { title: "Cellular Respiration", source: "Wikipedia - Article", icon: <BookOpenIcon />, type: 'Article', url: 'https://en.wikipedia.org/wiki/Cellular_respiration', videos: [{ title: "Cellular Respiration (UPDATED) | Amoeba Sisters", url: "https://www.youtube.com/watch?v=4Eo7JtQlgq4" }, { title: "ATP & Respiration: Crash Course Biology #7", url: "https://www.youtube.com/watch?v=00jbG_cfGuQ" }]}
    ],
    'Code a Website': [
        { title: "HTML Full Course for Beginners", source: "freeCodeCamp - Tutorial", icon: <CodeIcon />, type: 'Tutorial', url: 'https://www.freecodecamp.org/news/html-full-course-for-beginners/', videos: [{ title: "HTML Crash Course For Absolute Beginners | Traversy Media", url: "https://www.youtube.com/watch?v=kUMe1FH4CHE" }, { title: "HTML Full Course - Build a Website Tutorial | freeCodeCamp.org", url: "https://www.youtube.com/watch?v=pQN-pnXPaVg" }]},
        { title: "CSS Tutorial – Full Course for Beginners", source: "freeCodeCamp - Tutorial", icon: <CodeIcon />, type: 'Tutorial', url: 'https://www.freecodecamp.org/news/css-tutorial-full-course-for-beginners/', videos: [{ title: "CSS Crash Course For Absolute Beginners | Traversy Media", url: "https://www.youtube.com/watch?v=yfoY53QXEnI" }, { title: "CSS Full Course | freeCodeCamp.org", url: "https://www.youtube.com/watch?v=1Rs2ND1ryYc" }]},
        { title: "JavaScript Tutorial for Beginners", source: "javascript.info - Course", icon: <CodeIcon />, type: 'Course', url: 'https://javascript.info/', videos: [{ title: "Learn JavaScript - Full Course for Beginners | freeCodeCamp.org", url: "https://www.youtube.com/watch?v=PkZNo7MFNFg" }, { title: "JavaScript Tutorial for Beginners | Mosh Hamedani", url: "https://www.youtube.com/watch?v=W6NZfCO5eDE" }]},
        { title: "React Official Tutorial", source: "react.dev - Docs", icon: <CodeIcon />, type: 'Docs', url: 'https://react.dev/learn', videos: [{ title: "React Tutorial for Beginners | Mosh Hamedani", url: "https://www.youtube.com/watch?v=bMknfKXIFA8" }, { title: "React Course For Beginners | freeCodeCamp.org", url: "https://www.youtube.com/watch?v=SqcY0GlETPk" }]},
    ]
};

const getIconForType = (type: string) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('code') || lowerType.includes('tutorial') || lowerType.includes('docs')) return <CodeIcon className="w-6 h-6" />;
    if (lowerType.includes('interactive')) return <RecommendsIcon className="w-6 h-6" />;
    if (lowerType.includes('video')) return <YouTubeIcon className="w-6 h-6 text-red-500" />;
    if (lowerType.includes('article') || lowerType.includes('course')) return <BookOpenIcon className="w-6 h-6" />;
    return <InsightsIcon className="w-6 h-6" />;
};


const Recommendations: React.FC = () => {
    const { startQuiz, user } = useAppContext();
    const [isPracticeChecked, setIsPracticeChecked] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [dynamicMaterials, setDynamicMaterials] = useState<(typeof learningMaterialTemplate)[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const learningMaterials = user ? ALL_LEARNING_MATERIALS[user.goal] : [];

    const availableFilters = useMemo(() => {
        if (!learningMaterials) return ['All'];
        const types = new Set(learningMaterials.map(item => item.type));
        return ['All', ...Array.from(types)];
    }, [learningMaterials]);
    
    const handleSearch = () => {
        setSearchTerm(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    useEffect(() => {
        const fetchDynamicMaterials = async () => {
            if (!searchTerm.trim() || !user) {
                setDynamicMaterials([]);
                return;
            }

            const lowercasedQuery = searchTerm.toLowerCase().trim();
            const hasStaticResults = (learningMaterials || []).some(material => {
                const titleMatch = material.title.toLowerCase().includes(lowercasedQuery);
                const sourceMatch = material.source.toLowerCase().includes(lowercasedQuery);
                const videoMatch = material.videos?.some(video => video.title.toLowerCase().includes(lowercasedQuery));
                return titleMatch || sourceMatch || videoMatch;
            });

            if (hasStaticResults) {
                setDynamicMaterials([]);
                return;
            }

            setIsSearching(true);
            setDynamicMaterials([]);
            try {
                const newMaterials = await findLearningMaterials(searchTerm, user.goal);
                const formattedMaterials = newMaterials.map((mat: any) => ({
                    ...learningMaterialTemplate,
                    title: mat.title,
                    source: mat.source,
                    url: mat.url,
                    type: mat.type,
                    icon: getIconForType(mat.type),
                }));
                setDynamicMaterials(formattedMaterials);
            } catch (error) {
                console.error("Failed to fetch dynamic materials:", error);
            } finally {
                setIsSearching(false);
            }
        };

        fetchDynamicMaterials();
    }, [searchTerm, user?.goal, learningMaterials]);

    const finalMaterials = useMemo(() => {
        let results = learningMaterials ? [...learningMaterials] : [];

        if (activeFilter !== 'All') {
            results = results.filter(material => material.type === activeFilter);
        }
        
        const lowercasedQuery = searchTerm.toLowerCase().trim();
        if (lowercasedQuery) {
            results = results.filter(material => {
                const titleMatch = material.title.toLowerCase().includes(lowercasedQuery);
                const sourceMatch = material.source.toLowerCase().includes(lowercasedQuery);
                const videoMatch = material.videos?.some(video => video.title.toLowerCase().includes(lowercasedQuery));
                return titleMatch || sourceMatch || videoMatch;
            });
        }
        
        if (results.length === 0 && lowercasedQuery) {
            return dynamicMaterials;
        }

        return results;
    }, [learningMaterials, activeFilter, searchTerm, dynamicMaterials]);
    
    const showNoResultsMessage = !isSearching && finalMaterials.length === 0 && (searchTerm.trim() !== '' || activeFilter !== 'All');

    return (
        <div className="p-8 bg-light-bg dark:bg-dark-bg h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">Recommendations</h1>
            <p className="text-md text-gray-500 dark:text-gray-400 mb-6">For your goal: <span className="font-semibold text-gray-700 dark:text-gray-300">{user?.goal}</span></p>

            <div className="mb-6 space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by title, source, or video..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-light-card dark:bg-dark-card py-3 pl-4 pr-12 rounded-lg border border-transparent focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800 dark:text-white"
                    />
                    <button 
                        onClick={handleSearch}
                        aria-label="Search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-card-hover transition-colors"
                    >
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {availableFilters.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                activeFilter === filter
                                    ? 'bg-primary text-white'
                                    : 'bg-light-card dark:bg-dark-card text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-card-hover'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {isSearching ? (
                    <div className="text-center py-16">
                        <p className="text-gray-600 dark:text-gray-400 font-semibold">Searching for materials...</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">The AI is finding the best resources for you.</p>
                    </div>
                ) : showNoResultsMessage ? (
                     <div className="text-center py-16">
                        <p className="text-gray-600 dark:text-gray-400 font-semibold">No materials found.</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">Try adjusting your search or filter.</p>
                    </div>
                ) : (
                    finalMaterials.map((item, index) => (
                        <div key={index} className="bg-light-card dark:bg-dark-card p-4 rounded-xl shadow-sm transition-all">
                            <a 
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:bg-gray-50 dark:hover:bg-dark-card-hover -m-4 p-4 rounded-t-xl transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gray-100 dark:bg-navy-dark rounded-lg text-gray-500 dark:text-gray-300">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-white">{item.title}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.source}</p>
                                        </div>
                                    </div>
                                    <ChevronDownIcon className="-rotate-90 w-6 h-6 text-gray-400" />
                                </div>
                            </a>
                            
                            {item.videos && item.videos.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-300 mb-2">Related Videos:</h4>
                                    <div className="space-y-2">
                                        {item.videos.map((video, videoIndex) => (
                                            <a
                                                key={videoIndex}
                                                href={video.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-dark transition-colors"
                                            >
                                                <YouTubeIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{video.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
             <div className="mt-8 flex items-center justify-between p-4 bg-light-card dark:bg-dark-card rounded-xl">
                <div className="flex items-center gap-3">
                    <input 
                        id="practice-check" 
                        type="checkbox" 
                        checked={isPracticeChecked}
                        onChange={() => setIsPracticeChecked(p => !p)}
                        className="h-5 w-5 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <label 
                        htmlFor="practice-check" 
                        className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                        Start a practice quiz on these topics
                    </label>
                </div>
                <button 
                    onClick={() => startQuiz('practice')}
                    disabled={!isPracticeChecked}
                    className="bg-secondary text-white font-semibold px-6 py-2 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Start
                </button>
            </div>
        </div>
    );
}

const Insights: React.FC = () => {
    const { startQuiz, user } = useAppContext();
    
    // Mock data for the new charts
    const scoresOverTimeData = [
        { name: 'May 1', score: 65 },
        { name: 'May 8', score: 70 },
        { name: 'May 15', score: 60 },
        { name: 'May 22', score: 80 },
        { name: 'May 29', score: 75 },
        { name: 'Jun 5', score: 85 },
        { name: 'Jun 12', score: 90 },
    ];

    const topicProficiencyData = [
        { topic: 'Algebra', proficiency: 85 },
        { topic: 'Geometry', proficiency: 55 },
        { topic: 'Probability', proficiency: 70 },
        { topic: 'Fractions', proficiency: 95 },
        { topic: 'Rates', proficiency: 40 },
    ].sort((a, b) => a.proficiency - b.proficiency); // Sort to have weakest at the bottom
    
    const studyStreakData = Array.from({ length: 35 }).map(() => ({
        intensity: Math.floor(Math.random() * 4) // 0: none, 1: low, 2: mid, 3: high
    }));
    
    const getStreakColor = (intensity: number) => {
        switch (intensity) {
            case 1: return 'bg-green-200 dark:bg-green-900';
            case 2: return 'bg-green-400 dark:bg-green-700';
            case 3: return 'bg-green-600 dark:bg-green-500';
            default: return 'bg-gray-200 dark:bg-dark-card-hover';
        }
    };
    
    const topicCoverageData = [
      { name: 'Algebra', value: 40 },
      { name: 'Geometry', value: 25 },
      { name: 'Probability', value: 15 },
      { name: 'Other', value: 20 },
    ];
    const PIE_COLORS = ['#3B82F6', '#FBBF24', '#10B981', '#6B7280'];

    return (
        <div className="p-8 bg-light-bg dark:bg-dark-bg h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Progress Insights</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-4">📈 Scores Over Time</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={scoresOverTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="name" stroke="currentColor" className="text-xs text-gray-500 dark:text-gray-400" />
                            <YAxis stroke="currentColor" className="text-xs text-gray-500 dark:text-gray-400" />
                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '0.75rem' }} labelStyle={{ color: '#F8FAFC' }} itemStyle={{ color: '#94A3B8' }} />
                            <Line type="monotone" dataKey="score" name="Quiz Score" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4, className: "fill-primary" }} activeDot={{ r: 6, className: "fill-primary" }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-4">📊 Weak vs Strong Topics</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={topicProficiencyData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis type="number" domain={[0, 100]} stroke="currentColor" className="text-xs text-gray-500 dark:text-gray-400" />
                            <YAxis type="category" dataKey="topic" width={80} stroke="currentColor" className="text-xs text-gray-500 dark:text-gray-400" tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '0.75rem' }} labelStyle={{ color: '#F8FAFC' }} itemStyle={{ color: '#94A3B8' }} cursor={{fill: 'rgba(148, 163, 184, 0.1)'}}/>
                            <Bar dataKey="proficiency" name="Proficiency" barSize={20}>
                                {topicProficiencyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.proficiency >= 75 ? '#22C55E' : entry.proficiency >= 50 ? '#FBBF24' : '#EF4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-4">🗓️ Calendar Heatmap: Study Streak</h3>
                    <div className="grid grid-cols-7 gap-1.5">
                        {studyStreakData.map((day, i) => (
                            <div key={i} className={`w-full aspect-square rounded-md ${getStreakColor(day.intensity)}`}></div>
                        ))}
                    </div>
                </div>

                <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-4">🥧 Pie Chart: Coverage by Topic</h3>
                     <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={topicCoverageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false}
                                 label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                    return (
                                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                 }}
                            >
                                {topicCoverageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '0.75rem' }} />
                            <Legend iconType="circle" iconSize={10} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="lg:col-span-2 bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-sm text-center flex flex-col items-center">
                    <TrophyIcon className="w-16 h-16 text-yellow-400 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Mastery Challenge</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6 text-center max-w-md">Take the final quiz to test your overall knowledge on <span className="font-semibold">{user?.goal}</span>.</p>
                    <button
                        onClick={() => startQuiz('final')}
                        className="w-full max-w-xs py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Take Final Quiz
                    </button>
                </div>
            </div>
        </div>
    );
};

const Settings: React.FC = () => {
    const { 
        darkMode, 
        toggleDarkMode, 
        user, 
        updateLearningStyle, 
        voiceAssistantEnabled, 
        toggleVoiceAssistant,
        logout,
        lastQuizScore,
    } = useAppContext();
    const learningStyles: LearningStyle[] = ['Visual', 'Audio', 'Mixed'];

    const handleExportProgress = () => {
        if (!user) return;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("Adaptive Learning Progress Report", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Report for: ${user.name}`, 105, 30, { align: 'center' });

        // User Profile Table
        const profileData = [
            ['Name', user.name],
            ['Learning Goal', user.goal],
            ['Learning Style', user.learningStyle]
        ];
        doc.autoTable({
            startY: 40,
            head: [['Profile Attribute', 'Value']],
            body: profileData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // #4F46E5
        });

        // Last Quiz Score Table
        if (lastQuizScore) {
            const scoreData = [
                ['Correct Answers', lastQuizScore.correct.toString()],
                ['Total Questions', lastQuizScore.total.toString()],
                ['Percentage', `${Math.round((lastQuizScore.correct / lastQuizScore.total) * 100)}%`]
            ];
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 15,
                head: [['Quiz Performance Metric', 'Score']],
                body: scoreData,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] }, // #10B981
            });
        } else {
             doc.autoTable({
                startY: doc.autoTable.previous.finalY + 15,
                head: [['Quiz Performance Metric', 'Score']],
                body: [['No quiz data available.', 'N/A']],
                theme: 'grid',
                headStyles: { fillColor: [107, 114, 128] }, // gray
            });
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            const footerText = `Exported on: ${new Date().toLocaleDateString()}`;
            doc.text(footerText, 14, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
        }

        doc.save(`progress_report_${user.name.replace(/\s/g, '_')}.pdf`);
    };

    const handleClearData = () => {
        if (window.confirm("Are you sure you want to clear all your data? This action cannot be undone and will log you out.")) {
            logout();
        }
    };

    return (
        <div className="p-8 bg-light-bg dark:bg-dark-bg h-full">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Settings</h1>
            <div className="max-w-md space-y-6">
                 <div className="bg-light-card dark:bg-dark-card p-5 rounded-xl shadow-sm space-y-5 divide-y divide-gray-200 dark:divide-gray-600">
                    <div className="flex items-center justify-between">
                        <label className="font-medium text-gray-700 dark:text-gray-200">Dark Mode</label>
                        <ToggleSwitch checked={darkMode} onChange={toggleDarkMode} />
                    </div>
                     <div className="flex items-center justify-between pt-5">
                        <label className="font-medium text-gray-700 dark:text-gray-200">Voice Input</label>
                        <ToggleSwitch checked={voiceAssistantEnabled} onChange={toggleVoiceAssistant} />
                    </div>
                     <div className="flex items-center justify-between pt-5">
                        <label className="font-medium text-gray-700 dark:text-gray-200">Learning Style</label>
                        <div className="flex items-center bg-gray-100 dark:bg-navy-dark rounded-lg p-1">
                          {learningStyles.map(style => (
                            <button
                              key={style}
                              onClick={() => user && updateLearningStyle(style)}
                              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                user?.learningStyle === style
                                ? 'bg-white dark:bg-dark-card-hover shadow text-primary'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                              }`}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-5">
                        <label className="font-medium text-gray-700 dark:text-gray-200">Language</label>
                        <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <span>English</span>
                            <ChevronDownIcon className="-rotate-90 w-5 h-5"/>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleClearData}
                        className="flex-1 py-3 bg-gray-200 dark:bg-navy-dark text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-navy-light transition-colors"
                    >
                        Clear Data
                    </button>
                    <button 
                        onClick={handleExportProgress}
                        className="flex-1 py-3 bg-gray-200 dark:bg-navy-dark text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-navy-light transition-colors"
                    >
                        Export Progress
                    </button>
                </div>
            </div>
        </div>
    );
}


// --- LAYOUT COMPONENTS ---

const Sidebar: React.FC = () => {
  const { view, setView, logout, user } = useAppContext();
  return (
    <aside className="w-64 bg-navy flex flex-col p-6 text-gray-300 flex-shrink-0">
      <div className="flex items-center gap-3 mb-10">
        <BookOpenIcon className="w-8 h-8 text-white" />
        <span className="font-bold">ASSISTANT</span>
      </div>
      <nav className="flex-grow space-y-2">
        {SIDEBAR_LINKS.map(link => (
          <a
            key={link.name}
            href="#"
            onClick={(e) => { e.preventDefault(); setView(link.name); }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
              view === link.name
                ? 'bg-primary text-white'
                : 'hover:bg-navy-light'
            }`}
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </a>
        ))}
      </nav>
      <div className="space-y-4">
        <a href="#" onClick={(e) => { e.preventDefault(); setView('settings'); }} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${view === 'settings' ? 'bg-primary text-white' : 'hover:bg-navy-light'}`}>
          <SettingsIcon className="w-5 h-5" />
          <span>Settings</span>
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-navy-light">
          <LogOutIcon className="w-5 h-5" />
          <span>{user?.name}</span>
        </a>
      </div>
    </aside>
  );
};


const MainContent: React.FC = () => {
    const { view } = useAppContext();

    switch (view) {
        case 'dashboard': return <Dashboard />;
        case 'recommendations': return <Recommendations />;
        case 'insights': return <Insights />;
        case 'quiz': return <QuizView />;
        case 'ai_study': return <AiStudyBuddy />;
        case 'settings': return <Settings />;
        default: return <Dashboard />;
    }
};

const AppLayout: React.FC = () => {
  const { toast } = useAppContext();
  useVoiceAssistant();

  return (
    <div className="flex h-screen w-screen bg-light-bg dark:bg-dark-bg overflow-hidden">
        <Sidebar />
        <main className="flex-grow h-screen overflow-y-auto">
            <MainContent />
        </main>
        {toast && <Toast message={toast} />}
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  return (
    <AppProvider>
      <AppController />
    </AppProvider>
  );
}

const AppController = () => {
    const { view } = useAppContext();
    return view === 'login' ? <LoginScreen /> : <AppLayout />;
}
