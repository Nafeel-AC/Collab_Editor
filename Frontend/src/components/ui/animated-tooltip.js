"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "motion/react";

// Image component with fallback
const ImageWithFallback = ({ src, alt, ...props }) => {
  const [error, setError] = useState(false);
  
  // Use fallback avatar if image fails to load
  const handleError = () => {
    console.error("Error loading image:", src);
    setError(true);
  };
  
  // If error, use fallback avatar
  const imageSrc = error 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'User')}&background=random&size=100` 
    : src;
  
  return (
    <img 
      src={imageSrc} 
      alt={alt || "User"}
      onError={handleError}
      {...props}
    />
  );
};

export const AnimatedTooltip = ({
  items,
  size = 40 // Add size prop with default value
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0); // going to set this value on mouse move
  // rotate the tooltip
  const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), springConfig);
  // translate the tooltip
  const translateX = useSpring(useTransform(x, [-100, 100], [-50, 50]), springConfig);
  const handleMouseMove = (event) => {
    const halfWidth = event.target.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth); // set the x value, which is then used in transform and rotate
  };

  return (
    <div className="flex items-center justify-center">
      {items.map((item, idx) => (
        <div
          className="group relative -mr-2"
          key={item.id || item.name || idx}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}>
          <AnimatePresence mode="popLayout">
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 40,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: 10, scale: 0.6 }}
                style={{
                  translateX: translateX,
                  rotate: rotate,
                  whiteSpace: "nowrap",
                }}
                className="absolute z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-md bg-black px-4 py-2 text-xs shadow-xl left-1/2 top-0">
                <div
                  className="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
                <div
                  className="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
                <div className="relative z-30 text-base font-bold text-white">
                  {item.name}
                </div>
                <div className="text-xs text-white">{item.designation}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <ImageWithFallback
            onMouseMove={handleMouseMove}
            src={item.image}
            alt={item.name}
            className={`relative !m-0 rounded-full border-2 border-white object-cover object-top !p-0 transition duration-500 group-hover:z-30 group-hover:scale-105`} 
            style={{ height: `${size}px`, width: `${size}px` }}
          />
        </div>
      ))}
    </div>
  );
};
