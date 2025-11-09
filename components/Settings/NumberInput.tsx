// src/components/Settings/NumberInput.tsx
import React from 'react';
import './NumberInput.css';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  unitOptions?: { value: string; label: string }[];
  onUnitChange?: (unit: string) => void;
  selectedUnit?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  unit,
  unitOptions,
  onUnitChange,
  selectedUnit,
}) => {
  return (
    <div className="number-input-container">
      <span className="number-label">{label}</span>
      <div className="number-controls">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          className="number-field"
        />
        {unitOptions && onUnitChange ? (
          <select
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="unit-select"
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          unit && <span className="unit-text">{unit}</span>
        )}
      </div>
    </div>
  );
};

export default NumberInput;