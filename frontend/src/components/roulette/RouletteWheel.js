import React from 'react';
import { Box } from '@mui/material';

const RouletteWheel = ({ wheelRotation, winningNumber }) => {
  const generateWheelNumbers = () => {
    const numberPositions = [
      0, 32, 15, 19, 4, 21, 2, 25,
      17, 34, 6, 27, 13, 36, 11, 30,
      8, 23, 10, 5, 24, 16, 33, 1,
      20, 14, 31, 9, 22, 18, 29, 7,
      28, 12, 35, 3, 26
    ]; // Standard European wheel

    return numberPositions.map((number, index) => {
      const angle = (360 / 37) * index;
      const isRed = [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3].includes(number);
      const isGreen = number === 0;

      return (
        <Box
          key={number}
          sx={{
            position: 'absolute',
            transform: `rotate(${angle}deg) translate(0, -130px) rotate(${-angle}deg)`,
            transformOrigin: 'center center',
            color: isGreen ? '#388E3C' : isRed ? '#D32F2F' : '#424242',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            width: '24px',
            marginLeft: '-12px', // Half of width to center align
          }}
        >
          {number}
        </Box>
      );
    });
  };

  return (
    <Box
      sx={{
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        border: '10px solid #8B4513', // Brown border to resemble wood
        backgroundImage: `conic-gradient(
          from 0deg,
          #388E3C 0deg 9.7297297297deg,
          #D32F2F 9.7297297297deg 19.4594594595deg,
          #424242 19.4594594595deg 29.1891891892deg,
          #D32F2F 29.1891891892deg 38.9189189189deg,
          #424242 38.9189189189deg 48.6486486486deg,
          #D32F2F 48.6486486486deg 58.3783783784deg,
          #424242 58.3783786486deg 68.1081081081deg,
          #D32F2F 68.1081081081deg 77.8378378378deg,
          #424242 77.8378378378deg 87.5675675676deg,
          #D32F2F 87.5675675676deg 97.2972972973deg,
          #424242 97.2972972973deg 107.027027027deg,
          #D32F2F 107.027027027deg 116.756756757deg,
          #424242 116.756756757deg 126.486486486deg,
          #D32F2F 126.486486486deg 136.216216216deg,
          #424242 136.216216216deg 145.945945946deg,
          #D32F2F 145.945945946deg 155.675675676deg,
          #424242 155.675675676deg 165.405405405deg,
          #D32F2F 165.405405405deg 175.135135135deg,
          #424242 175.135135135deg 184.864864865deg,
          #D32F2F 184.864864865deg 194.594594595deg,
          #424242 194.594594595deg 204.324324324deg,
          #D32F2F 204.324324324deg 214.054054054deg,
          #424242 214.054054054deg 223.783783784deg,
          #D32F2F 223.783783784deg 233.513513514deg,
          #424242 233.513513514deg 243.243243243deg,
          #D32F2F 243.243243243deg 252.972972973deg,
          #424242 252.972972973deg 262.702702703deg,
          #D32F2F 262.702702703deg 272.432432432deg,
          #424242 272.432432432deg 282.162162162deg,
          #D32F2F 282.162162162deg 291.891891892deg,
          #424242 291.891891892deg 301.621621622deg,
          #D32F2F 301.621621622deg 311.351351351deg,
          #424242 311.351351351deg 321.081081081deg,
          #D32F2F 321.081081081deg 330.810810811deg,
          #424242 330.810810811deg 340.540540541deg,
          #D32F2F 340.540540541deg 350.27027027deg,
          #388E3C 350.27027027deg 360deg
        )`,
        marginLeft: 2,
        position: 'relative',
        overflow: 'hidden',
        transform: `rotate(${wheelRotation}deg)`,
        transition: winningNumber !== null ? 'transform 10s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
    }}
    >
      {/* Ball Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -140px)',
          width: '10px',
          height: '10px',
          backgroundColor: 'white',
          borderRadius: '50%',
          zIndex: 1,
        }}
      ></Box>
      {/* Wheel Numbers */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {generateWheelNumbers()}
      </Box>
    </Box>
  );
};

export default RouletteWheel;

