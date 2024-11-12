// src/components/roulette/RouletteWheel.js

import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import { motion, useAnimation } from 'framer-motion';

const RouletteWheel = ({ wheelRotation, winningNumber }) => {
  const [currentWheelRotation, setCurrentWheelRotation] = useState(wheelRotation);
  const [isRolling, setIsRolling] = useState(false);

  // Framer Motion controls
  const wheelControls = useAnimation();

  const numberPositions = [
    0, 32, 15, 19, 4, 21, 2, 25,
    17, 34, 6, 27, 13, 36, 11, 30,
    8, 23, 10, 5, 24, 16, 33, 1,
    20, 14, 31, 9, 22, 18, 29, 7,
    28, 12, 35, 3, 26
  ]; // Standard European wheel

  const numberColors = {
    0: '#388E3C', // Green
    red: '#D32F2F',
    black: '#424242',
  };

  const degreePerSection = 360 / numberPositions.length; // ≈9.7297 degrees

  // Determine the color of each number
  const getNumberColor = (number) => {
    if (number === 0) return numberColors[0];
    const redNumbers = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3];
    return redNumbers.includes(number) ? numberColors.red : numberColors.black;
  };

  // Generate Wheel Numbers Rotating with the Wheel
  const generateWheelNumbers = () => {
    return numberPositions.map((number, index) => {
      // Adjust the angle by adding half the section to center the number
      const angle = (degreePerSection * index) + (degreePerSection / 2);
      const color = getNumberColor(number);

      return (
        <Box
          key={number}
          sx={{
            position: 'absolute',
            transform: `rotate(${angle}deg) translate(0, -200px)`, // Position numbers around the wheel
            transformOrigin: 'center center',
            color: color,
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            width: '25px',
            height: '25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            boxShadow: '0 0 3px rgba(0,0,0,0.3)',
          }}
        >
          {number}
        </Box>
      );
    });
  };

  // Dynamically create the conic-gradient for equal sections
  const generateConicGradient = () => {
    let gradient = '';
    numberPositions.forEach((number, index) => {
      const color = getNumberColor(number);
      const startDegree = degreePerSection * index;
      const endDegree = degreePerSection * (index + 1);
      gradient += `${color} ${startDegree}deg ${endDegree}deg, `;
    });
    // Remove the trailing comma and space
    return `conic-gradient(${gradient.slice(0, -2)})`;
  };

  // Handle Wheel Rotation on Winning Number
  useEffect(() => {
    if (winningNumber !== null) {
      setIsRolling(true);

      // Calculate wheel rotation to land on the winning number
      const index = numberPositions.indexOf(winningNumber);
      // Ensure index is valid
      if (index === -1) return;

      // Calculate stopAngle for clockwise rotation (Wheel)
      // To align the winning number to the top, subtract its angle from a full rotation
      const rotationOffset = degreePerSection * index + degreePerSection / 2;
      const wheelStopAngle = 360 * 5 - rotationOffset; // 5 full rotations plus the offset

      // Start animation
      wheelControls.start({
        rotate: wheelStopAngle,
        transition: { duration: 5, ease: [0.25, 0.1, 0.25, 1] },
      });

      // Update state
      setCurrentWheelRotation(wheelStopAngle);
    }
  }, [winningNumber, numberPositions, degreePerSection, wheelControls]);

  // Reset rolling state after animation completes
  useEffect(() => {
    if (isRolling) {
      const timer = setTimeout(() => {
        setIsRolling(false);
      }, 5000); // Duration matches the animation duration
      return () => clearTimeout(timer);
    }
  }, [isRolling]);

  return (
    <Box
      sx={{
        position: 'relative', // Parent container for absolute positioning
        width: '450px',
        height: '450px',
        margin: '20px auto',
      }}
    >
      {/* Wheel Container */}
      <motion.div
        animate={wheelControls}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '8px solid #8B4513',
          backgroundImage: generateConicGradient(),
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        }}
      >
        {/* Wheel Numbers */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {generateWheelNumbers()}
        </Box>
      </motion.div>

      {/* Fixed Ball Position */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%', // Center vertically
          left: '50%',
          transform: 'translate(-50%, -188px)', // Move up by 220px from the center
          width: '20px',
          height: '20px',
          backgroundColor: 'yellow',
          borderRadius: '50%',
          boxShadow: '0 0 5px rgba(0,0,0,0.5)',
          zIndex: 3,
        }}
      ></Box>
    </Box>
  );
};

RouletteWheel.propTypes = {
  wheelRotation: PropTypes.number.isRequired,
  winningNumber: PropTypes.number,
};

export default RouletteWheel;
