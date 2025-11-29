'use client';

import React from 'react';
import Image from 'next/image';
import AppIcon from '@/app/assets/logo/icon.png';

interface LaporInLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * LaporIn Logo Component - Using icon.png
 */
export default function LaporInLogo({ 
  size = 120, 
  showText = false,
  className = '' 
}: LaporInLogoProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Image
        src={AppIcon}
        alt="LaporIn"
        width={size}
        height={size}
        className="rounded-2xl shadow-lg object-contain"
      />
      
      {showText && (
        <>
          <div className="mt-4" />
          <h2
            className="font-bold tracking-wider"
            style={{
              fontSize: `${size * 0.35}px`,
              color: '#00D4FF',
              letterSpacing: '2px',
            }}
          >
            LAPORIN
          </h2>
        </>
      )}
    </div>
  );
}

