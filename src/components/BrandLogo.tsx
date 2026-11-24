import React from 'react';

interface BrandLogoProps {
  variant?: 'dark' | 'light';
  showTagline?: boolean;
  compact?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'dark',
  showTagline = true,
  compact = false,
}) => {
  const isLight = variant === 'light';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Kytura Naturals Botanical Lotus & Leaf Emblem */}
      <svg
        width={compact ? 38 : 48}
        height={compact ? 34 : 42}
        viewBox="0 0 64 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Outer green botanical leaves */}
        <path
          d="M32 6C26 12 24 20 32 28C40 20 38 12 32 6Z"
          fill={isLight ? '#8ACE69' : '#8ACE69'}
          stroke={isLight ? '#8ACE69' : '#39008B'}
          strokeWidth="1.5"
        />
        <path
          d="M17 15C11 22 13 31 25 36C25 25 22 18 17 15Z"
          fill="#8ACE69"
          stroke={isLight ? '#AA87FF' : '#39008B'}
          strokeWidth="1.4"
        />
        <path
          d="M47 15C53 22 51 31 39 36C39 25 42 18 47 15Z"
          fill="#8ACE69"
          stroke={isLight ? '#AA87FF' : '#39008B'}
          strokeWidth="1.4"
        />
        {/* Purple lotus petals */}
        <path
          d="M32 16C26 24 26 35 32 43C38 35 38 24 32 16Z"
          fill={isLight ? '#AA87FF' : '#5000AF'}
          stroke={isLight ? '#FFFFFF' : '#39008B'}
          strokeWidth="1.5"
        />
        <path
          d="M9 26C10 37 19 44 30 45C24 36 18 29 9 26Z"
          fill={isLight ? '#5000AF' : '#39008B'}
          stroke={isLight ? '#AA87FF' : '#39008B'}
          strokeWidth="1.5"
        />
        <path
          d="M55 26C54 37 45 44 34 45C40 36 46 29 55 26Z"
          fill={isLight ? '#5000AF' : '#39008B'}
          stroke={isLight ? '#AA87FF' : '#39008B'}
          strokeWidth="1.5"
        />
        {/* Subtle bottom botanical arc */}
        <path
          d="M14 47C22 51 42 51 50 47"
          stroke={isLight ? '#8ACE69' : '#538710'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-tight ${
            compact ? 'text-xl' : 'text-[22px] sm:text-2xl'
          } ${isLight ? 'text-white' : 'text-[#39008B]'}`}
        >
          Kytura Naturals
        </span>
        {showTagline && (
          <span
            className={`mt-1 text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] ${
              isLight ? 'text-[#AA87FF]' : 'text-[#5000AF]/80'
            }`}
          >
            BOTANICAL WELLNESS · NATURAL LIVING
          </span>
        )}
      </div>
    </div>
  );
};
