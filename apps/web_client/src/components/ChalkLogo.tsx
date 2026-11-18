import React from 'react';

export interface ChalkLogoProps {
  className?: string;
  variant?: 'auto' | 'light' | 'dark';
  alt?: string;
}

/**
 * ChalkLogo renders the official Chalk brand logo.
 * Automatically adapts between light and dark themes, or can be forced to a specific variant.
 */
export const ChalkLogo: React.FC<ChalkLogoProps> = ({
  className = 'h-6 w-auto',
  variant = 'auto',
  alt = 'Chalk',
}) => {
  if (variant === 'light') {
    // Pure white logo for dark surfaces
    return (
      <img
        src="/chalk-white.png"
        alt={alt}
        className={`object-contain inline-block select-none ${className}`}
        draggable={false}
      />
    );
  }

  if (variant === 'dark') {
    // Dark charcoal logo for light surfaces
    return (
      <img
        src="/chalk-dark.png"
        alt={alt}
        className={`object-contain inline-block select-none ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <span className="inline-flex items-center">
      {/* Light mode: renders dark logo */}
      <img
        src="/chalk-dark.png"
        alt={alt}
        className={`object-contain select-none dark:hidden ${className}`}
        draggable={false}
      />
      {/* Dark mode: renders white logo */}
      <img
        src="/chalk-white.png"
        alt={alt}
        className={`object-contain select-none hidden dark:inline-block ${className}`}
        draggable={false}
      />
    </span>
  );
};

export default ChalkLogo;

