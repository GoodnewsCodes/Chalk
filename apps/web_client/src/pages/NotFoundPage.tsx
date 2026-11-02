import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const NotFoundPage: React.FC = () => {
  const { isDark } = useApp();

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      <div
        className={`max-w-md w-full p-8 sm:p-10 rounded-3xl border space-y-6 ${isDark
          ? 'bg-[#141E19] border-[#3C4043]'
          : 'bg-[#F8F9FA] border-[#DADCE0]'
          }`}
      >
        <div
          className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${isDark
            ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
            : 'bg-[#ECFDF5] text-[#059669]'
            }`}
        >
          <Compass size={24} weight="regular" />
        </div>

        <div className="space-y-2">
          <div
            className={`font-mono text-xs uppercase tracking-wider ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
              }`}
          >
            Error 404 • Route Not Found
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
            That classroom doesn't exist
          </h1>
          <p
            className={`text-sm leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
              }`}
          >
            The lecture link or course URL you followed may have expired or moved to another room code.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/hub"
            className={`btn-google w-full sm:w-auto px-5 py-2.5 rounded-full font-medium text-xs inline-flex items-center justify-center gap-2 ${isDark
              ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
              : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
          >
            <ArrowLeft size={15} weight="regular" />
            <span>Back to Classroom Hub</span>
          </Link>
          <Link
            to="/"
            className={`btn-google w-full sm:w-auto px-5 py-2.5 rounded-full border font-medium text-xs inline-flex items-center justify-center ${isDark
              ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
              : 'border-[#DADCE0] text-[#202124] hover:bg-white'
              }`}
          >
            Overview Page
          </Link>
        </div>
      </div>
    </div>
  );
};

