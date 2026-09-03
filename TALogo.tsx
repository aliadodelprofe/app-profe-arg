import React from 'react';
import headerLogoImg from '../assets/images/regenerated_image_1785346511921.png';
import footerLogoImg from '../assets/images/regenerated_image_1785346513551.png';

interface TALogoProps {
  className?: string;
  glow?: boolean;
  variant?: 'header' | 'footer';
  src?: string;
}

/**
  * Official Tomás & Astrid Logo Image
  */
export const TALogo: React.FC<TALogoProps> = ({
  className,
  glow = true,
  variant = 'header',
  src
}) => {
  const imgSrc = src || (variant === 'footer' ? footerLogoImg : headerLogoImg);
  const baseClasses = "object-contain aspect-auto shrink-0 transition-transform group-hover:scale-105 duration-300";
  const glowClass = glow ? 'drop-shadow-[0_0_10px_rgba(231,217,207,0.5)]' : '';
  const sizeClasses = className || "h-11 sm:h-12 w-auto";

  return (
    <img
      src={imgSrc}
      alt="Tomás & Astrid Logo"
      className={`${baseClasses} ${glowClass} ${sizeClasses}`}
    />
  );
};

export const TALogoFull: React.FC<{ className?: string }> = ({
  className = "h-11",
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <TALogo className="h-11 sm:h-12 w-auto" glow />
    </div>
  );
};





