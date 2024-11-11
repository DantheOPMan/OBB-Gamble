import React from 'react';
import { Box, Typography } from '@mui/material';

const RouletteTable = ({ handleBetClick, renderTotalBet, renderPlayerBet }) => {
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  const cellWidth = 50;
  const cellHeight = 60;
  const cells = [];

  // Left column with 0
  cells.push(
    <Box
      key={`number-0`}
      sx={{
        position: 'absolute',
        top: `0px`,
        left: `0px`,
        width: `${cellWidth}px`,
        height: `${cellHeight * 3}px`,
        border: '1px solid white',
        backgroundColor: '#388E3C', // Softer green for zero
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={() => handleBetClick('number', 0)}
    >
      0
      {/* Display total bets */}
      {renderTotalBet('number', 0) && (
        <Box
          sx={{
            position: 'absolute',
            top: '5px',
            left: '5px',
            backgroundColor: 'rgba(0, 0, 255, 0.7)', // Semi-transparent blue
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            zIndex: 1,
          }}
        >
          {renderTotalBet('number', 0)}
        </Box>
      )}
      {/* Display player's own bet */}
      {renderPlayerBet('number', 0)}
    </Box>
  );

  // Numbers 1-36 in 12 columns and 3 rows
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const number = col + 1 + row * 12;
      const isRed = redNumbers.includes(number);
      const isBlack = blackNumbers.includes(number);
      cells.push(
        <Box
          key={`number-${number}`}
          sx={{
            position: 'absolute',
            top: `${row * cellHeight}px`,
            left: `${(col + 1) * cellWidth}px`,
            width: `${cellWidth}px`,
            height: `${cellHeight}px`,
            border: '1px solid white',
            backgroundColor: isRed ? '#D32F2F' : isBlack ? '#424242' : 'gray',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => handleBetClick('number', number)}
        >
          {number}
          {/* Display total bets */}
          {renderTotalBet('number', number) && (
            <Box
              sx={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                backgroundColor: 'rgba(0, 0, 255, 0.7)', // Semi-transparent blue
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                zIndex: 1,
              }}
            >
              {renderTotalBet('number', number)}
            </Box>
          )}
          {/* Display player's own bet */}
          {renderPlayerBet('number', number)}
        </Box>
      );

      // Add vertical splits (between numbers in the same column)
      if (row < 2) {
        const betValue = [number, number + 12];
        cells.push(
          <Box
            key={`split-v-${number}`}
            sx={{
              position: 'absolute',
              top: `${(row + 1) * cellHeight - 5}px`,
              left: `${(col + 1) * cellWidth}px`,
              width: `${cellWidth}px`,
              height: '10px',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
            onClick={() => handleBetClick('split', betValue)}
          >
            {/* Split indicator (optional visual representation) */}
          </Box>
        );
      }

      // Add horizontal splits (between numbers in adjacent columns)
      if (col < 11) {
        const betValue = [number, number + 1];
        cells.push(
          <Box
            key={`split-h-${number}`}
            sx={{
              position: 'absolute',
              top: `${row * cellHeight}px`,
              left: `${(col + 1) * cellWidth + cellWidth - 5}px`,
              width: '10px',
              height: `${cellHeight}px`,
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
            onClick={() => handleBetClick('split', betValue)}
          >
            {/* Split indicator (optional visual representation) */}
          </Box>
        );
      }

      // Add corners
      if (col < 11 && row < 2) {
        const betValue = [number, number + 1, number + 12, number + 13];
        cells.push(
          <Box
            key={`corner-${number}`}
            sx={{
              position: 'absolute',
              top: `${(row + 1) * cellHeight - 5}px`,
              left: `${(col + 1) * cellWidth + cellWidth - 5}px`,
              width: '10px',
              height: '10px',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
            onClick={() => handleBetClick('corner', betValue)}
          >
            {/* Corner indicator (optional visual representation) */}
          </Box>
        );
      }
    }
  }

  // Bottom betting options (Dozens)
  const bottomDozens = [
    { label: '1st 12', betType: 'dozen', betValue: 'first', left: cellWidth, width: cellWidth * 4 },
    { label: '2nd 12', betType: 'dozen', betValue: 'second', left: cellWidth * 5, width: cellWidth * 4 },
    { label: '3rd 12', betType: 'dozen', betValue: 'third', left: cellWidth * 9, width: cellWidth * 4 },
  ];

  bottomDozens.forEach((option, index) => {
    cells.push(
      <Box
        key={`bottom-dozen-${index}`}
        sx={{
          position: 'absolute',
          top: `${cellHeight * 3}px`,
          left: `${option.left}px`,
          width: `${option.width}px`,
          height: `${cellHeight / 2}px`,
          border: '1px solid white',
          backgroundColor: 'gray',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => handleBetClick(option.betType, option.betValue)}
      >
        {option.label}
        {/* Display player's own bet */}
        {renderPlayerBet(option.betType, option.betValue)}
      </Box>
    );
  });

  // Side betting options (Columns)
  const sideColumns = [
    { label: '2 to 1', betType: 'column', betValue: 'first', top: 0 },
    { label: '2 to 1', betType: 'column', betValue: 'second', top: cellHeight },
    { label: '2 to 1', betType: 'column', betValue: 'third', top: cellHeight * 2 },
  ];

  sideColumns.forEach((option, index) => {
    cells.push(
      <Box
        key={`side-column-${index}`}
        sx={{
          position: 'absolute',
          top: `${option.top}px`,
          left: `${(cellWidth * 13)}px`,
          width: `${cellWidth}px`,
          height: `${cellHeight}px`,
          border: '1px solid white',
          backgroundColor: 'gray',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => handleBetClick(option.betType, option.betValue)}
      >
        {option.label}
        {/* Display player's own bet */}
        {renderPlayerBet(option.betType, option.betValue)}
      </Box>
    );
  });

  // Additional betting options at the bottom
  const additionalBets = [
    { label: '1 to 18', betType: 'half', betValue: 'low' },
    { label: 'EVEN', betType: 'evenOdd', betValue: 'even' },
    { label: 'RED', betType: 'color', betValue: 'red', bgColor: 'red' },
    { label: 'BLACK', betType: 'color', betValue: 'black', bgColor: 'black' },
    { label: 'ODD', betType: 'evenOdd', betValue: 'odd' },
    { label: '19 to 36', betType: 'half', betValue: 'high' },
  ];

  additionalBets.forEach((option, index) => {
    cells.push(
      <Box
        key={`additional-bet-${index}`}
        sx={{
          position: 'absolute',
          top: `${cellHeight * 3 + cellHeight / 2}px`,
          left: `${cellWidth + (cellWidth * index * 2)}px`,
          width: `${cellWidth * 2}px`,
          height: `${cellHeight / 2}px`,
          border: '1px solid white',
          backgroundColor: option.bgColor || 'gray',
          color: option.bgColor === 'black' ? 'white' : 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => handleBetClick(option.betType, option.betValue)}
      >
        {option.label}
        {/* Display player's own bet */}
        {renderPlayerBet(option.betType, option.betValue)}
      </Box>
    );
  });

  return (
    <Box
      sx={{
        position: 'relative',
        width: `${cellWidth * 14}px`,
        height: `${cellHeight * 4}px`,
        backgroundColor: 'green',
        margin: '0 auto',
      }}
    >
      {cells}
    </Box>
  );
};

export default RouletteTable;
