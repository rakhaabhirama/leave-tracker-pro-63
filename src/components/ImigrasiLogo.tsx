import React from 'react';
import logoKemenkumham from '@/assets/logo-kemenkumham.png';

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
    <img 
      src={logoKemenkumham} 
      alt="Logo Kementerian Imigrasi dan Pemasyarakatan RI"
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  );
};

export default ImigrasiLogo;
