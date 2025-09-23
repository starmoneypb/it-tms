'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Youtube, 
  Facebook,
  Globe,
  Cloud
} from 'lucide-react';

interface NetworkIcon {
  id: string;
  icon: React.ReactNode;
  position: { x: number; y: number };
  color: string;
  hoverColor: string;
  label: string;
}

const NetworkLogoHub: React.FC = () => {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Define network icons with responsive positions and colors
  const getNetworkIcons = (): NetworkIcon[] => {
    // Responsive radius based on screen size
    const radius = typeof window !== 'undefined' && window.innerWidth < 768 ? 80 : 120;
    const iconSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 24;
    
    return [
      {
        id: 'github',
        icon: <Github size={iconSize} />,
        position: { x: 0, y: -radius },
        color: 'text-gray-400',
        hoverColor: 'text-white',
        label: 'GitHub'
      },
      {
        id: 'twitter',
        icon: <Twitter size={iconSize} />,
        position: { x: radius * 0.707, y: -radius * 0.707 },
        color: 'text-blue-400',
        hoverColor: 'text-blue-300',
        label: 'Twitter'
      },
      {
        id: 'linkedin',
        icon: <Linkedin size={iconSize} />,
        position: { x: radius, y: 0 },
        color: 'text-blue-500',
        hoverColor: 'text-blue-400',
        label: 'LinkedIn'
      },
      {
        id: 'instagram',
        icon: <Instagram size={iconSize} />,
        position: { x: radius * 0.707, y: radius * 0.707 },
        color: 'text-pink-400',
        hoverColor: 'text-pink-300',
        label: 'Instagram'
      },
      {
        id: 'youtube',
        icon: <Youtube size={iconSize} />,
        position: { x: 0, y: radius },
        color: 'text-red-400',
        hoverColor: 'text-red-300',
        label: 'YouTube'
      },
      {
        id: 'facebook',
        icon: <Facebook size={iconSize} />,
        position: { x: -radius * 0.707, y: radius * 0.707 },
        color: 'text-blue-600',
        hoverColor: 'text-blue-500',
        label: 'Facebook'
      },
      {
        id: 'globe',
        icon: <Globe size={iconSize} />,
        position: { x: -radius, y: 0 },
        color: 'text-green-400',
        hoverColor: 'text-green-300',
        label: 'Web'
      },
      {
        id: 'cloud',
        icon: <Cloud size={iconSize} />,
        position: { x: -radius * 0.707, y: -radius * 0.707 },
        color: 'text-cyan-400',
        hoverColor: 'text-cyan-300',
        label: 'Cloud'
      }
    ];
  };

  const [networkIcons, setNetworkIcons] = useState<NetworkIcon[]>([]);

  useEffect(() => {
    setNetworkIcons(getNetworkIcons());
    
    const handleResize = () => {
      setNetworkIcons(getNetworkIcons());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate SVG path for connecting lines
  const getConnectionPath = (icon: NetworkIcon) => {
    const centerX = 0;
    const centerY = 0;
    const iconX = icon.position.x;
    const iconY = icon.position.y;
    
    // Create a curved path
    const controlX = (centerX + iconX) / 2;
    const controlY = (centerY + iconY) / 2 - 20;
    
    return `M ${centerX} ${centerY} Q ${controlX} ${controlY} ${iconX} ${iconY}`;
  };

  return (
    <div className="flex justify-center mb-8 relative">
      <div className="relative">
        {/* Network Container */}
        <div className="relative w-80 h-80 md:w-96 md:h-96 animate-fade-in-up">
          
          {/* SVG Container for connecting lines */}
          <div className="absolute inset-0 pointer-events-none">
            <svg 
              width="100%" 
              height="100%" 
              className="absolute inset-0"
              style={{ overflow: 'visible' }}
            >
              {networkIcons.map((icon) => (
                <path
                  key={`line-${icon.id}`}
                  d={getConnectionPath(icon)}
                  stroke={hoveredIcon === icon.id ? icon.hoverColor.replace('text-', '#') : 'rgba(255, 255, 255, 0.1)'}
                  strokeWidth="2"
                  fill="none"
                  className={`transition-all duration-300 ${
                    hoveredIcon === icon.id 
                      ? 'drop-shadow-lg' 
                      : ''
                  }`}
                  style={{
                    filter: hoveredIcon === icon.id 
                      ? `drop-shadow(0 0 8px ${icon.hoverColor.replace('text-', '#')})` 
                      : 'none'
                  }}
                />
              ))}
            </svg>
          </div>

          {/* Central Logo */}
          <div className="relative z-10 flex justify-center items-center">
            <div className="relative">
              <div className="relative animate-float-slow">
                <Image
                  src="/logo.svg"
                  alt="UniSight Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20 opacity-90 hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </div>
          </div>

          {/* Network Icons */}
          <div className="absolute inset-0 pointer-events-none">
            {networkIcons.map((icon, index) => (
              <div
                key={icon.id}
                className={`absolute pointer-events-auto cursor-pointer transition-all duration-500 ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
                style={{
                  left: `50%`,
                  top: `50%`,
                  transform: `translate(calc(-50% + ${icon.position.x}px), calc(-50% + ${icon.position.y}px))`,
                  transitionDelay: `${index * 100}ms`
                }}
                onMouseEnter={() => setHoveredIcon(icon.id)}
                onMouseLeave={() => setHoveredIcon(null)}
              >
                {/* Icon Container */}
                <div className={`
                  relative p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 
                  hover:border-white/30 transition-all duration-300 group/icon
                  ${hoveredIcon === icon.id ? 'scale-110 shadow-lg' : 'scale-100'}
                `}>
                  {/* Icon Glow Effect */}
                  <div className={`
                    absolute inset-0 rounded-2xl opacity-0 group-hover/icon:opacity-100 
                    transition-opacity duration-300 blur-lg
                    ${icon.id === 'github' ? 'bg-gray-500/20' : ''}
                    ${icon.id === 'twitter' ? 'bg-blue-400/20' : ''}
                    ${icon.id === 'linkedin' ? 'bg-blue-500/20' : ''}
                    ${icon.id === 'instagram' ? 'bg-pink-400/20' : ''}
                    ${icon.id === 'youtube' ? 'bg-red-400/20' : ''}
                    ${icon.id === 'facebook' ? 'bg-blue-600/20' : ''}
                    ${icon.id === 'globe' ? 'bg-green-400/20' : ''}
                    ${icon.id === 'cloud' ? 'bg-cyan-400/20' : ''}
                  `}></div>
                  
                  {/* Icon */}
                  <div className={`
                    relative z-10 transition-colors duration-300
                    ${hoveredIcon === icon.id ? icon.hoverColor : icon.color}
                  `}>
                    {icon.icon}
                  </div>
                  
                  {/* Tooltip */}
                  <div className={`
                    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 
                    bg-black/80 text-white text-xs rounded-md opacity-0 group-hover/icon:opacity-100 
                    transition-opacity duration-300 pointer-events-none whitespace-nowrap
                  `}>
                    {icon.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkLogoHub;
