import React, { useState } from 'react';

const Calculator = ({ onUnlock, hasUnreadMessages }) => {
  const [display, setDisplay] = useState('0');
  const [awaitingPin, setAwaitingPin] = useState(false);
  const [gate2Buffer, setGate2Buffer] = useState('');

  const handlePress = (val) => {
    if (awaitingPin) {
      const newBuffer = gate2Buffer + val;
      setGate2Buffer(newBuffer);
      setDisplay(newBuffer);
      if (newBuffer === '5911') {
        onUnlock();
      }
      // If the buffer gets too long without matching, reset gate 2
      if (newBuffer.length >= 4 && newBuffer !== '5911') {
        setAwaitingPin(false);
        setGate2Buffer('');
        setDisplay(newBuffer);
      }
      return;
    }

    if (val === 'AC') {
      if (display !== '0') {
        setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
      } else {
        setDisplay('0');
        setAwaitingPin(false);
        setGate2Buffer('');
      }
      return;
    }

    if (val === '=') {
      if (display === '2503') {
        setDisplay('0');
        setAwaitingPin(true);
        setGate2Buffer('');
        return;
      }
      try {
        // Safe evaluation alternative for basic math
        const sanitized = display.replace(/[^-()\d/*+.]/g, '');
        // eslint-disable-next-line no-eval
        setDisplay(String(eval(sanitized)));
      } catch (e) {
        setDisplay('Error');
      }
      return;
    }

    setDisplay(display === '0' ? val : display + val);
  };

  const buttons = [
    ['AC', '+/-', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ];

  return (
    <div className="calculator-container">
      <div className="display">{display}</div>
      <div className="keypad">
        {buttons.map((row, i) => (
          <div key={i} className="row">
            {row.map(btn => {
              let label = btn;
              if (btn === 'AC' && hasUnreadMessages) {
                label = 'C.';
              } else if (btn === 'AC' && display !== '0') {
                label = 'C';
              }
              
              let displayLabel = label;
              if (btn === '*') displayLabel = '×';
              if (btn === '/') displayLabel = '÷';

              const isOperator = ['/', '*', '-', '+', '='].includes(btn);
              const isZero = btn === '0';
              const isTopFn = ['AC', '+/-', '%', 'C.', 'C'].includes(label);

              return (
                <button
                  key={btn}
                  className={`btn ${isOperator ? 'operator' : ''} ${isTopFn ? 'top-fn' : ''} ${isZero ? 'zero' : ''}`}
                  onClick={() => handlePress(btn)}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calculator;
