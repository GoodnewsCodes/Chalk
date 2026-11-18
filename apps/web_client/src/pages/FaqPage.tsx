import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CaretDown,
  ChalkboardTeacher,
  GraduationCap,
  MagnifyingGlass,
  Question,
  ShieldCheck,
  SignIn,
  Sparkle,
  UserPlus,
  VideoCamera,
  WifiHigh,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { ChalkLogo } from '../components/ChalkLogo';

type FaqCategory = 'all' | 'bandwidth' | 'lecturers' | 'students' | 'studio';

interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, 'all'>;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'data-savings-how',
    category: 'bandwidth',
    question: 'How does Chalk use 97% less mobile data than regular video calls?',
    answer:
      'Standard video calling apps stream heavy pixel video frames of the lecturer’s screen at 800–1,500 kbps (~540 MB per hour). Chalk streams a crisp 24 kbps Opus voice channel paired with mathematical vector coordinates (x, y pen strokes) under 4 kbps, using only ~13 MB for a full 1-hour lecture.',
  },
  {
    id: 'weak-signal-shield',
    category: 'bandwidth',
    question: 'What happens when my campus WiFi or mobile network drops to 2G/3G?',
    answer:
      'Chalk’s built-in Anti-Lag Shield (QoS Circuit Breaker) continuously monitors packet loss and round-trip latency. If your signal weakens during a rainstorm or power cut, optional camera feeds pause automatically so lecturer audio and live chalkboard strokes stay connected without freezing.',
  },
  {
    id: 'sharp-handwriting',
    category: 'bandwidth',
    question: 'Why does handwriting on the chalkboard never turn blurry?',
    answer:
      'Instead of compressing the board into a blurry video stream when bandwidth drops, Chalk sends lightweight vector coordinates that render natively on your screen at full resolution—so equations, code, and diagrams are always razor-sharp.',
  },
  {
    id: 'lecturer-create-course-first',
    category: 'lecturers',
    question: 'Can a lecturer launch Live Studio before creating a course?',
    answer:
      'Lecturers create a course cohort first in the Lecturer Dashboard before hosting a Live Studio broadcast. Creating a course generates a dedicated studio room and an enrollment code so students can join the right class, access announcements, and view recorded replays.',
  },
  {
    id: 'lecturer-enroll-students',
    category: 'lecturers',
    question: 'How do I invite students and manage my teaching cohorts?',
    answer:
      'When you create a course on your Lecturer Dashboard, Chalk generates a unique course code (such as CSC 401) and a direct invite link. Share the code with your students—once they enroll, they appear in your People roster and can attend live lectures and submit assignments.',
  },
  {
    id: 'lecturer-grading-assignments',
    category: 'lecturers',
    question: 'How do lecturers post assignments, quizzes, and grade submissions?',
    answer:
      'Inside any teaching cohort, open the Classwork tab to publish assignments, quizzes, questions, or study materials with point values and due dates. When students turn in work, it appears in your Grading & Review queue where you can score submissions and leave private feedback.',
  },
  {
    id: 'student-join-course',
    category: 'students',
    question: 'How do students join a class and attend live lectures?',
    answer:
      'After signing up as a student, enter the course code shared by your lecturer in the "Join Class with Code" box on your Student Dashboard. Whenever your lecturer starts a broadcast, a Live badge appears on your course card for one-click entry.',
  },
  {
    id: 'student-catch-me-up',
    category: 'studio',
    question: 'What is "Catch Me Up!" if I join a live lecture late?',
    answer:
      'If a power outage or network drop makes you join a class 15 minutes late, click "Catch Me Up!" inside the Live Studio header. Chalk summarizes the slides, board activity, and key lecturer notices covered before you arrived in under 2 KB of data.',
  },
  {
    id: 'studio-dvr-replays',
    category: 'studio',
    question: 'How do Chalk Replays work for offline exam revision?',
    answer:
      'Every recorded lecture is saved in Chalk’s Dual-Track Vector DVR format—combining synchronized 24 kbps voice with timestamped board strokes. A full 1-hour lecture replay is ~11 MB instead of a 400+ MB MP4 video, making it fast to download and replay offline.',
  },
  {
    id: 'studio-interactive-tools',
    category: 'studio',
    question: 'Can students speak, raise hands, or write on the chalkboard during class?',
    answer:
      'Yes! Students can raise their hands, participate in live polls, upvote Q&A questions, and send reactions. Lecturers have full Host Controls to unmute students or grant temporary chalkboard drawing permissions for collaborative problem-solving.',
  },
];

export const FaqPage: React.FC = () => {
  const { isDark, currentUser, isAuthenticated } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'data-savings-how': true,
    'lecturer-create-course-first': true,
  });

  const categories: { id: FaqCategory; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All Questions', icon: Question },
    { id: 'bandwidth', label: 'Data & Bandwidth', icon: WifiHigh },
    { id: 'lecturers', label: 'For Lecturers', icon: ChalkboardTeacher },
    { id: 'students', label: 'For Students', icon: GraduationCap },
    { id: 'studio', label: 'Live Studio & Replays', icon: VideoCamera },
  ];

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className={`min-h-[100dvh] flex flex-col ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      {/* Top Navigation (Matches Landing Page Navbar) */}
      <header
        className={`sticky top-0 z-40 h-16 border-b backdrop-blur-md ${isDark
          ? 'bg-[#0F1713]/90 border-[#3C4043]/60'
          : 'bg-white/90 border-[#DADCE0]'
          }`}
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 py-1">
            <ChalkLogo className="h-11 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <Link
              to="/#calculator"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              Data Savings
            </Link>
            <Link
              to="/#how-it-works"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              How It Works
            </Link>
            <Link
              to="/#workflows"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              Features
            </Link>
            <Link
              to="/#reviews"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              Student Stories
            </Link>
            <Link
              to="/faq"
              className={
                isDark
                  ? 'text-[#69DB7C] font-semibold'
                  : 'text-[#059669] font-semibold'
              }
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeToggle />

            {isAuthenticated && currentUser ? (
              <Link
                to="/hub"
                className={`btn-google px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <span>Open Dashboard</span>
                <ArrowRight size={15} weight="regular" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth?mode=login"
                  className={`btn-google px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-1.5 ${isDark
                    ? 'text-[#E3E3E3] hover:bg-white/10'
                    : 'text-[#202124] hover:bg-black/5'
                    }`}
                >
                  <SignIn size={16} weight="regular" />
                  <span>Log in</span>
                </Link>

                <Link
                  to="/auth?mode=signup"
                  className={`btn-google px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <UserPlus size={16} weight="regular" />
                  <span>Sign up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 py-12 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-10">
        {/* Hero Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-[0.12em] ${isDark
              ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
              : 'bg-[#ECFDF5] text-[#059669]'
              }`}
          >
            <Sparkle size={14} weight="fill" />
            <span>Frequently Asked Questions</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight">
            Everything you need to know about Chalk
          </h1>

          <p
            className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
              }`}
          >
            Learn how Chalk keeps live classes crystal-clear on weak campus networks, saves 97% of mobile data, and powers lecturer and student workflows.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="space-y-4">
          <div className="relative max-w-xl mx-auto">
            <MagnifyingGlass
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions about data usage, courses, live studio, or replays..."
              aria-label="Search frequently asked questions"
              className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm focus:outline-none ${isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`btn-google px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer transition-colors ${isActive
                    ? isDark
                      ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
                      : 'bg-[#059669] text-white border-[#059669]'
                    : isDark
                      ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                      : 'bg-white border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                    }`}
                >
                  <Icon size={15} weight={isActive ? 'fill' : 'regular'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div
              className={`p-10 rounded-3xl border text-center space-y-2 ${isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
                : 'bg-[#F8F9FA] border-[#DADCE0] text-[#5F6368]'
                }`}
            >
              <p className="text-sm font-medium text-current">
                No matching questions found
              </p>
              <p className="text-xs">
                Try clearing your search filter or switching to &ldquo;All Questions&rdquo;.
              </p>
            </div>
          ) : (
            filteredFaqs.map((item) => {
              const isOpen = Boolean(openIds[item.id]);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-colors ${isDark
                    ? isOpen
                      ? 'bg-[#141E19] border-[#69DB7C]/40'
                      : 'bg-[#141E19]/70 border-[#3C4043]/80 hover:border-[#3C4043]'
                    : isOpen
                      ? 'bg-[#ECFDF5]/40 border-[#059669]/40'
                      : 'bg-white border-[#DADCE0] hover:bg-[#F8F9FA]/60'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    className="w-full px-5 sm:px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-display text-sm sm:text-base font-medium">
                      {item.question}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        } ${isDark
                          ? 'bg-white/5 text-[#69DB7C]'
                          : 'bg-black/5 text-[#059669]'
                        }`}
                    >
                      <CaretDown size={16} weight="bold" />
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      className={`px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm leading-relaxed border-t ${isDark
                        ? 'border-[#3C4043]/50 text-[#9AA0A6]'
                        : 'border-[#DADCE0]/60 text-[#5F6368]'
                        }`}
                    >
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom CTA Card */}
        <div
          className={`rounded-3xl border p-7 sm:p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${isDark
            ? 'bg-[#141E19] border-[#69DB7C]/30'
            : 'bg-[#ECFDF5]/80 border-[#059669]/25'
            }`}
        >
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#059669] dark:text-[#69DB7C]">
              <ShieldCheck size={16} weight="fill" />
              <span>Built for Campus Reliability</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight">
              Ready to experience ultra-low data classes?
            </h2>
            <p
              className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Create your free lecturer or student account in seconds, or return to the home page to test the interactive chalkboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                to="/hub"
                className={`btn-google px-6 py-3 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-2 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth?mode=signup"
                  className={`btn-google px-6 py-3 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-2 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <UserPlus size={16} />
                  <span>Sign up free</span>
                </Link>
                <Link
                  to="/"
                  className={`btn-google px-5 py-3 rounded-full border text-xs sm:text-sm font-medium inline-flex items-center gap-2 ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                    : 'bg-white border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                    }`}
                >
                  <span>Back to Home</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`mt-auto py-8 px-4 sm:px-6 lg:px-8 border-t ${isDark
          ? 'bg-[#0F1713] border-[#3C4043]/60 text-[#9AA0A6]'
          : 'bg-[#F8F9FA] border-[#DADCE0] text-[#5F6368]'
          }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <ChalkLogo className="h-8 w-auto" />
            <span>•</span>
            <span>Low-Data Virtual Classroom</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <Link to="/faq" className="hover:underline">
              FAQ
            </Link>
            {isAuthenticated ? (
              <Link to="/hub" className="hover:underline">
                Classroom Hub
              </Link>
            ) : (
              <>
                <Link to="/auth?mode=login" className="hover:underline">
                  Log In
                </Link>
                <Link to="/auth?mode=signup" className="hover:underline">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FaqPage;

