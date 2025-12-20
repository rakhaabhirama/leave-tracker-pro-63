import React from 'react';

interface ImigrasiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ImigrasiLogo: React.FC<ImigrasiLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle */}
        <circle cx="50" cy="50" r="48" fill="hsl(var(--primary))" />
        <circle cx="50" cy="50" r="44" fill="hsl(var(--primary-foreground))" />
        <circle cx="50" cy="50" r="40" fill="hsl(var(--primary))" />
        
        {/* Garuda simplified shape */}
        <g fill="hsl(var(--primary-foreground))">
          {/* Head */}
          <ellipse cx="50" cy="28" rx="6" ry="5" />
          
          {/* Body */}
          <path d="M42 33 L50 55 L58 33 Q50 38 42 33Z" />
          
          {/* Left Wing */}
          <path d="M42 35 L20 40 L22 45 L25 43 L27 48 L30 45 L32 50 L35 47 L37 52 L42 45Z" />
          
          {/* Right Wing */}
          <path d="M58 35 L80 40 L78 45 L75 43 L73 48 L70 45 L68 50 L65 47 L63 52 L58 45Z" />
          
          {/* Tail feathers */}
          <path d="M44 55 L40 75 L44 73 L46 78 L50 72 L54 78 L56 73 L60 75 L56 55Z" />
          
          {/* Shield on chest */}
          <rect x="46" y="38" width="8" height="10" rx="1" fill="hsl(var(--primary))" />
          <path d="M47 39 L53 39 L53 42 L50 45 L47 42Z" fill="hsl(var(--primary-foreground))" />
        </g>
        
        {/* Star above head */}
        <polygon 
          points="50,18 51.5,22 56,22 52.5,24.5 54,28 50,26 46,28 47.5,24.5 44,22 48.5,22" 
          fill="hsl(var(--primary-foreground))"
        />
      </svg>
    </div>
  );
};

export default ImigrasiLogo;
