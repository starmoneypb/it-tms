'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface RedScreenEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number;
}

export default function RedScreenEffect({ 
  isVisible, 
  onComplete, 
  duration = 800 
}: RedScreenEffectProps) {
  const [showEffect, setShowEffect] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowEffect(true);
      const timer = setTimeout(() => {
        setShowEffect(false);
        setTimeout(() => {
          onComplete?.();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && showEffect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 0.7, 0.4, 0.7, 0.3, 0.6, 0.2, 0.4, 0.1, 0],
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: duration / 1000,
            times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
            ease: "easeInOut"
          }}
          className="fixed inset-0 z-[9998] pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, rgba(220, 38, 38, 0.8), rgba(185, 28, 28, 0.6), rgba(153, 27, 27, 0.4))',
            backdropFilter: 'blur(1px)'
          }}
        >
          {/* Pulsing red overlay */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 0.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-red-600/20"
          />
          
          {/* Screen shake effect */}
          <motion.div
            animate={{ 
              x: [0, -2, 2, -1, 1, 0],
              y: [0, 1, -1, 0.5, -0.5, 0]
            }}
            transition={{ 
              duration: 0.15,
              repeat: 3,
              ease: "easeInOut"
            }}
            className="absolute inset-0"
          />

          {/* Crack lines effect */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={`crack-${i}`}
              initial={{ 
                pathLength: 0,
                opacity: 0
              }}
              animate={{ 
                pathLength: 1,
                opacity: [0, 0.6, 0.3, 0]
              }}
              transition={{ 
                duration: 0.8,
                delay: i * 0.1,
                ease: "easeOut"
              }}
              className="absolute inset-0"
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                <motion.path
                  d={`M${10 + i * 15},${20 + Math.sin(i) * 30} Q${30 + i * 10},${50 + i * 5} ${50 + i * 8},${80 + Math.cos(i) * 20} L${70 + i * 12},${90 + i * 3}`}
                  stroke="rgba(220, 38, 38, 0.6)"
                  strokeWidth="0.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          ))}

          {/* Warning flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 1, 0, 1, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 0.6,
              delay: 0.1,
              ease: "easeInOut"
            }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className="text-white/90 text-center">
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.3,
                  repeat: 2,
                  ease: "easeInOut"
                }}
                className="text-6xl mb-2"
              >
                ⚠️
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold tracking-wider"
              >
                CRITICAL ISSUE
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
