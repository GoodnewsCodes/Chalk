import React from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Bi-modal Day/Night theme toggle represented by a single pair of Sun and Moon icons.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
}) => {
  const { isDark, setThemePreference } = useApp();

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 15;
  const paddingClass = size === 'sm' ? 'p-1' : size === 'lg' ? 'p-2' : 'p-1.5';

  return (
    <div
      role="group"
      aria-label="Theme mode"
      className={`inline-flex items-center p-0.5 rounded-full transition-colors select-none ${isDark
          ? 'bg-[#141E19]'
          : 'bg-[#F1F3F4]'
        } ${className}`}
    >
      {/* Day / Light Mode Icon Button */}
      <button
        type="button"
        aria-pressed={!isDark}
        aria-label="Switch to light mode"
        title="Light mode (Day)"
        onClick={() => setThemePreference('light')}
        className={`${paddingClass} rounded-full transition-all flex items-center justify-center cursor-pointer ${!isDark
            ? 'bg-white text-amber-500 shadow-xs'
            : 'text-[#9AA0A6] hover:text-[#E3E3E3]'
          }`}
      >
        <Sun size={iconSize} weight={!isDark ? 'fill' : 'regular'} />
        <span className="sr-only">Light mode</span>
      </button>

      {/* Night / Dark Mode Icon Button */}
      <button
        type="button"
        aria-pressed={isDark}
        aria-label="Switch to dark mode"
        title="Dark mode (Night)"
        onClick={() => setThemePreference('dark')}
        className={`${paddingClass} rounded-full transition-all flex items-center justify-center cursor-pointer ${isDark
            ? 'bg-[#1F2922] text-[#69DB7C] shadow-xs'
            : 'text-[#5F6368] hover:text-[#202124]'
          }`}
      >
        <Moon size={iconSize} weight={isDark ? 'fill' : 'regular'} />
        <span className="sr-only">Dark mode</span>
      </button>
    </div>
  );
};

export default ThemeToggle;

