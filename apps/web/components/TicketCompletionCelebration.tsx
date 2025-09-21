"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CheckCircle, Star, Trophy, Sparkles } from "lucide-react";

interface TicketCompletionCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
  ticketCode?: string;
}

// Confetti piece component
const ConfettiPiece = ({ delay, color }: { delay: number; color: string }) => (
  <motion.div
    className={`absolute w-2 h-2 ${color} rounded-full`}
    initial={{ 
      y: -100, 
      x: Math.random() * 400 - 200,
      rotate: 0,
      opacity: 1 
    }}
    animate={{ 
      y: 600, 
      x: Math.random() * 400 - 200 + Math.sin(Date.now() + delay) * 100,
      rotate: 360,
      opacity: 0 
    }}
    transition={{ 
      duration: 3,
      delay: delay / 1000,
      ease: "easeOut"
    }}
  />
);

// Star burst component
const StarBurst = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute"
    initial={{ scale: 0, rotate: 0 }}
    animate={{ 
      scale: [0, 1.5, 0], 
      rotate: 360,
      x: Math.random() * 400 - 200,
      y: Math.random() * 300 - 150
    }}
    transition={{ 
      duration: 2,
      delay: delay / 1000,
      ease: "easeOut"
    }}
  >
    <Star className="text-yellow-400" size={20} />
  </motion.div>
);

// Sparkle component
const SparkleEffect = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute"
    initial={{ scale: 0, opacity: 1 }}
    animate={{ 
      scale: [0, 1, 0], 
      opacity: [1, 1, 0],
      x: Math.random() * 600 - 300,
      y: Math.random() * 400 - 200
    }}
    transition={{ 
      duration: 1.5,
      delay: delay / 1000,
      ease: "easeOut"
    }}
  >
    <Sparkles className="text-blue-300" size={16} />
  </motion.div>
);

export default function TicketCompletionCelebration({ 
  isVisible, 
  onComplete, 
  ticketCode 
}: TicketCompletionCelebrationProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowContent(true);
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setShowContent(false);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const confettiColors = [
    "bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400", 
    "bg-purple-400", "bg-pink-400", "bg-indigo-400", "bg-orange-400"
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          {/* Background overlay with subtle gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-green-900/30"
          />

          {/* Confetti particles */}
          {Array.from({ length: 50 }).map((_, i) => (
            <ConfettiPiece
              key={`confetti-${i}`}
              delay={i * 50}
              color={confettiColors[i % confettiColors.length]}
            />
          ))}

          {/* Star burst effects */}
          {Array.from({ length: 12 }).map((_, i) => (
            <StarBurst key={`star-${i}`} delay={i * 100} />
          ))}

          {/* Sparkle effects */}
          {Array.from({ length: 20 }).map((_, i) => (
            <SparkleEffect key={`sparkle-${i}`} delay={i * 75} />
          ))}

          {/* Main celebration content */}
          <motion.div
            initial={{ scale: 0, y: 50 }}
            animate={{ 
              scale: showContent ? 1 : 0, 
              y: showContent ? 0 : 50 
            }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              delay: 0.2
            }}
            className="relative z-10 text-center px-8 py-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl max-w-md mx-4"
          >
            {/* Success icon with pulse animation */}
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-6"
            >
              <div className="relative inline-block">
                <CheckCircle className="text-green-400 mx-auto" size={80} />
                {/* Glowing ring effect */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.1, 0.3]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-green-400/20 blur-xl"
                />
              </div>
            </motion.div>

            {/* Congratulations text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-4"
            >
              <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                🎉 Congratulations! 🎉
              </h2>
              <p className="text-xl text-white/90 font-semibold">
                Ticket Completed!
              </p>
            </motion.div>

            {/* Ticket info */}
            {ticketCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="mb-6 px-4 py-2 bg-white/10 rounded-xl border border-white/20"
              >
                <p className="text-white/80 text-sm">Ticket</p>
                <p className="text-white font-bold text-lg">#{ticketCode}</p>
              </motion.div>
            )}

            {/* Trophy with bounce animation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                <Trophy className="text-yellow-400 mx-auto mb-3" size={48} />
              </motion.div>
              <p className="text-white/70 text-sm">
                Great work! Another task successfully completed.
              </p>
            </motion.div>

            {/* Floating particles around the card */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={`float-${i}`}
                className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                animate={{
                  x: [0, Math.sin(i) * 30, 0],
                  y: [0, Math.cos(i) * 30, 0],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                style={{
                  left: `${20 + (i % 4) * 20}%`,
                  top: `${20 + Math.floor(i / 4) * 60}%`,
                }}
              />
            ))}
          </motion.div>

          {/* Ripple effect */}
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ 
              scale: [0, 2, 4], 
              opacity: [0.5, 0.2, 0] 
            }}
            transition={{ 
              duration: 2,
              delay: 0.3,
              ease: "easeOut"
            }}
            className="absolute inset-0 rounded-full border-4 border-green-400/30"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
