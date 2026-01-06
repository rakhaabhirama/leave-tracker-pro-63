import React from 'react';
import logoKemenkumham from '@/assets/logo-kemenkumham.png';
import logoImigrasi from '@/assets/logo-imigrasi.png';

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
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={logoImigrasi} 
        alt="Logo Direktorat Jenderal Imigrasi"
        className={`${sizeClasses[size]} object-contain`}
      />
      <img 
        src={logoKemenkumham} 
        alt="Logo Kementerian Imigrasi dan Pemasyarakatan RI"
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
};

export default ImigrasiLogo;
