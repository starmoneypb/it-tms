'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  FileText, 
  Activity, 
  Monitor,
  BarChart3,
  Shield,
  Zap,
  Database,
  Users
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
        id: 'document',
        icon: <FileText size={iconSize} />,
        position: { x: 0, y: -radius },
        color: 'text-blue-400',
        hoverColor: 'text-blue-300',
        label: 'Document'
      },
      {
        id: 'tracking',
        icon: <Activity size={iconSize} />,
        position: { x: radius * 0.707, y: -radius * 0.707 },
        color: 'text-green-400',
        hoverColor: 'text-green-300',
        label: 'Tracking'
      },
      {
        id: 'monitoring',
        icon: <Monitor size={iconSize} />,
        position: { x: radius, y: 0 },
        color: 'text-purple-400',
        hoverColor: 'text-purple-300',
        label: 'Monitoring'
      },
      {
        id: 'analytics',
        icon: <BarChart3 size={iconSize} />,
        position: { x: radius * 0.707, y: radius * 0.707 },
        color: 'text-orange-400',
        hoverColor: 'text-orange-300',
        label: 'Analytics'
      },
      {
        id: 'security',
        icon: <Shield size={iconSize} />,
        position: { x: 0, y: radius },
        color: 'text-red-400',
        hoverColor: 'text-red-300',
        label: 'Security'
      },
      {
        id: 'performance',
        icon: <Zap size={iconSize} />,
        position: { x: -radius * 0.707, y: radius * 0.707 },
        color: 'text-yellow-400',
        hoverColor: 'text-yellow-300',
        label: 'Performance'
      },
      {
        id: 'database',
        icon: <Database size={iconSize} />,
        position: { x: -radius, y: 0 },
        color: 'text-cyan-400',
        hoverColor: 'text-cyan-300',
        label: 'Database'
      },
      {
        id: 'collaboration',
        icon: <Users size={iconSize} />,
        position: { x: -radius * 0.707, y: -radius * 0.707 },
        color: 'text-indigo-400',
        hoverColor: 'text-indigo-300',
        label: 'Collaboration'
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

  // Calculate SVG path for electrical circuit-style connecting lines
  const getConnectionPath = (icon: NetworkIcon) => {
    // Use absolute coordinates that match the container size
    const containerSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 320 : 384; // w-80 = 320px (mobile) or w-96 = 384px (desktop)
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;
    
    // Calculate icon position relative to container center
    const iconX = centerX + icon.position.x;
    const iconY = centerY + icon.position.y;
    
    // Create electrical circuit-style path with straight lines and 90-degree turns
    // Always go horizontal first, then vertical (like in the reference image)
    // Make lines longer by extending the elbow point further out
    const elbowX = centerX + (icon.position.x * 0.8);
    const elbowY = centerY;
    
    // Create circuit path with sharp 90-degree turns
    return `M ${centerX} ${centerY} L ${elbowX} ${elbowY} L ${iconX} ${iconY}`;
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
              {/* Define gradients for shimmer effect */}
              <defs>
                {networkIcons.map((icon) => (
                  <linearGradient
                    key={`gradient-${icon.id}`}
                    id={`shimmer-${icon.id}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                    gradientUnits="objectBoundingBox"
                  >
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="25%" stopColor="transparent" />
                    <stop offset="40%" stopColor={icon.hoverColor.replace('text-', '#')} stopOpacity="0.3" />
                    <stop offset="50%" stopColor={icon.hoverColor.replace('text-', '#')} stopOpacity="1" />
                    <stop offset="60%" stopColor={icon.hoverColor.replace('text-', '#')} stopOpacity="0.3" />
                    <stop offset="75%" stopColor="transparent" />
                    <stop offset="100%" stopColor="transparent" />
                    <animateTransform
                      attributeName="gradientTransform"
                      type="translate"
                      values="-1 0; 1 0; -1 0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </linearGradient>
                ))}
                
                {/* Default shimmer gradient */}
                <linearGradient
                  id="default-shimmer"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                  gradientUnits="objectBoundingBox"
                >
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="20%" stopColor="transparent" />
                  <stop offset="40%" stopColor="rgba(255, 255, 255, 0.4)" />
                  <stop offset="50%" stopColor="rgba(255, 255, 255, 0.8)" />
                  <stop offset="60%" stopColor="rgba(255, 255, 255, 0.4)" />
                  <stop offset="80%" stopColor="transparent" />
                  <stop offset="100%" stopColor="transparent" />
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    values="-1 0; 1 0; -1 0"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </linearGradient>
                
                {/* Secondary shimmer for more electricity effect */}
                <linearGradient
                  id="secondary-shimmer"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                  gradientUnits="objectBoundingBox"
                >
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="45%" stopColor="transparent" />
                  <stop offset="50%" stopColor="rgba(147, 197, 253, 0.6)" />
                  <stop offset="55%" stopColor="transparent" />
                  <stop offset="100%" stopColor="transparent" />
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    values="-1 0; 1 0; -1 0"
                    dur="1.8s"
                    repeatCount="indefinite"
                    begin="0.5s"
                  />
                </linearGradient>
              </defs>
              
              {networkIcons.map((icon) => (
                <g key={`line-group-${icon.id}`}>
                  {/* Base circuit line */}
                  <path
                    d={getConnectionPath(icon)}
                    stroke="rgba(147, 197, 253, 0.3)"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                  
                  {/* Primary circuit line with electrical effect */}
                  <path
                    d={getConnectionPath(icon)}
                    stroke={hoveredIcon === icon.id ? `url(#shimmer-${icon.id})` : 'url(#default-shimmer)'}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
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
                  
                  {/* Circuit connection points - only show on hover */}
                  {hoveredIcon === icon.id && (
                    <>
                      <circle
                        cx={typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 192}
                        cy={typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 192}
                        r="2"
                        fill="rgba(147, 197, 253, 0.8)"
                        className="animate-pulse"
                      />
                      <circle
                        cx={typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 192 + icon.position.x}
                        cy={typeof window !== 'undefined' && window.innerWidth < 768 ? 160 : 192 + icon.position.y}
                        r="1.5"
                        fill={icon.hoverColor.replace('text-', '#')}
                        className="transition-all duration-300"
                      />
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Central Logo */}
          <div className="absolute inset-0 flex justify-center items-center z-10">
            <div className="logo-container group/logo">
              {/* Shimmer light effect */}
              <div className="logo-shimmer"></div>
              
              {/* Glowing blue border */}
              <div className="logo-border"></div>
              
              {/* Dimensional background */}
              <div className="logo-background"></div>
              
              {/* Logo image */}
              <div className="logo-image transition-all duration-500 group-hover/logo:scale-110 group-hover/logo:rotate-12">
                <Image
                  src="/logo.svg"
                  alt="UniSight Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20 opacity-90 group-hover/logo:opacity-100 transition-all duration-500"
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
                {/* Icon Container - Modern Style */}
                <div className={`
                  relative p-4 md:p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 
                  backdrop-blur-md border border-white/10 hover:border-white/20 
                  transition-all duration-300 group/icon shadow-lg hover:shadow-xl
                  ${hoveredIcon === icon.id ? 'scale-105 shadow-2xl' : 'scale-100'}
                `}>
                  {/* Modern Glow Effect */}
                  <div className={`
                    absolute inset-0 rounded-2xl opacity-0 group-hover/icon:opacity-100 
                    transition-opacity duration-300 blur-md
                    ${icon.id === 'document' ? 'bg-blue-400/15' : ''}
                    ${icon.id === 'tracking' ? 'bg-green-400/15' : ''}
                    ${icon.id === 'monitoring' ? 'bg-purple-400/15' : ''}
                    ${icon.id === 'analytics' ? 'bg-orange-400/15' : ''}
                    ${icon.id === 'security' ? 'bg-red-400/15' : ''}
                    ${icon.id === 'performance' ? 'bg-yellow-400/15' : ''}
                    ${icon.id === 'database' ? 'bg-cyan-400/15' : ''}
                    ${icon.id === 'collaboration' ? 'bg-indigo-400/15' : ''}
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
