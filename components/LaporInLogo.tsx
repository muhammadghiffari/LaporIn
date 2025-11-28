'use client';

import React from 'react';

interface LaporInLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * LaporIn Logo Component - Same design as splash screen
 * Cyan/blue rounded square with curved lines extending from center
 */
export default function LaporInLogo({ 
  size = 120, 
  showText = false,
  className = '' 
}: LaporInLogoProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Container dengan design LaporIn */}
      <div
        className="relative flex items-center justify-center rounded-2xl shadow-lg"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: '#00D4FF',
          border: '3px solid #0099CC',
          boxShadow: '0 10px 20px rgba(0, 212, 255, 0.3), 0 0 0 5px rgba(0, 212, 255, 0.1)',
        }}
      >
        {/* Central horizontal element */}
        <div
          className="absolute rounded"
          style={{
            width: `${size * 0.33}px`,
            height: `${size * 0.067}px`,
            backgroundColor: 'white',
          }}
        />
        
        {/* SVG for curved lines */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <style>{`
              .logo-line {
                stroke: white;
                stroke-width: 2.5;
                fill: none;
                stroke-linecap: round;
              }
              .logo-spiral {
                stroke: white;
                stroke-width: 2.5;
                fill: none;
              }
            `}</style>
          </defs>
          
          {/* Top-left curve */}
          <path
            d={`M ${size / 2} ${size / 2} Q ${size / 2 - size * 0.125} ${size / 2 - size * 0.083} ${size / 2 - size * 0.167} ${size / 2 - size * 0.167}`}
            className="logo-line"
          />
          
          {/* Top-right curve */}
          <path
            d={`M ${size / 2} ${size / 2} Q ${size / 2 + size * 0.125} ${size / 2 - size * 0.083} ${size / 2 + size * 0.167} ${size / 2 - size * 0.167}`}
            className="logo-line"
          />
          
          {/* Bottom-left curve */}
          <path
            d={`M ${size / 2} ${size / 2} Q ${size / 2 - size * 0.125} ${size / 2 + size * 0.083} ${size / 2 - size * 0.167} ${size / 2 + size * 0.167}`}
            className="logo-line"
          />
          
          {/* Bottom-right curve */}
          <path
            d={`M ${size / 2} ${size / 2} Q ${size / 2 + size * 0.125} ${size / 2 + size * 0.083} ${size / 2 + size * 0.167} ${size / 2 + size * 0.167}`}
            className="logo-line"
          />
          
          {/* Spirals at corners */}
          {[
            { x: size / 2 - size * 0.167, y: size / 2 - size * 0.167 },
            { x: size / 2 + size * 0.167, y: size / 2 - size * 0.167 },
            { x: size / 2 - size * 0.167, y: size / 2 + size * 0.167 },
            { x: size / 2 + size * 0.167, y: size / 2 + size * 0.167 },
          ].map((corner, i) => (
            <g key={i}>
              {[0, 1, 2].map((j) => {
                const radius = 4 - j * 1.2;
                const startAngle = (j * Math.PI) / 2;
                return (
                  <path
                    key={j}
                    d={`M ${corner.x} ${corner.y} A ${radius} ${radius} 0 0 1 ${corner.x + radius * Math.cos(startAngle + Math.PI)} ${corner.y + radius * Math.sin(startAngle + Math.PI)}`}
                    className="logo-spiral"
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      
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

