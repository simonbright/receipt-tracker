import { useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

const CAR_KEY = 'receipt-tracker-car-logo';

export const CARS = [
  { id: 'supra', name: 'Toyota Supra', bg: 'bg-red-600', ring: 'ring-red-300' },
  { id: 'bmw', name: 'BMW', bg: 'bg-slate-800', ring: 'ring-slate-400' },
  { id: 'porsche', name: 'Porsche', bg: 'bg-yellow-500', ring: 'ring-yellow-200' },
  { id: 'maserati', name: 'Maserati', bg: 'bg-blue-900', ring: 'ring-blue-300' },
  { id: 'aston', name: 'Aston Martin', bg: 'bg-emerald-900', ring: 'ring-emerald-300' },
] as const;

type CarId = (typeof CARS)[number]['id'];

function CarEmblem({ id }: { id: CarId }) {
  switch (id) {
    case 'supra':
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
          <ellipse cx="16" cy="16" rx="12" ry="8" stroke="white" strokeWidth="2" />
          <path d="M8 16c2-4 6-6 8-6s6 2 8 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11 18h10M13 14l3-2 3 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="16" y="21" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" fontFamily="system-ui">S</text>
        </svg>
      );
    case 'bmw':
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
          <circle cx="16" cy="16" r="11" stroke="white" strokeWidth="2" />
          <path d="M16 5v22M5 16h22" stroke="white" strokeWidth="1.5" />
          <path d="M16 5a11 11 0 0 1 0 22V16H5a11 11 0 0 1 11-11z" fill="white" fillOpacity="0.9" />
          <path d="M16 16h11a11 11 0 0 1-11 11V16z" fill="white" fillOpacity="0.55" />
        </svg>
      );
    case 'porsche':
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
          <path d="M16 4l11 5v14l-11 5-11-5V9z" stroke="white" strokeWidth="1.8" fill="white" fillOpacity="0.12" />
          <path d="M16 10c-3 2-5 5-5 8h10c0-3-2-6-5-8z" fill="white" fillOpacity="0.85" />
          <path d="M12 18h8M14 14h4" stroke="#92400e" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'maserati':
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
          <path d="M16 4v24M10 8l6-4 6 4M10 24l6 4 6-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 8v16M11 12h10M12 16h8M13 20h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'aston':
      return (
        <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
          <path d="M4 18c4-6 8-8 12-8s8 2 12 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 18h20M8 20h16M10 22h12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 10v8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="16" cy="14" r="2" fill="white" />
        </svg>
      );
  }
}

interface CarLogoProps {
  onChange?: (name: string) => void;
}

export default function CarLogo({ onChange }: CarLogoProps) {
  const [index, setIndex] = useState(() => readStorage(CAR_KEY, 0) % CARS.length);
  const [pop, setPop] = useState(false);
  const car = CARS[index];

  const handleClick = () => {
    setPop(true);
    setTimeout(() => setPop(false), 200);
    setIndex((prev) => {
      const next = (prev + 1) % CARS.length;
      writeStorage(CAR_KEY, next);
      onChange?.(CARS[next].name);
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${car.name} — click for next`}
      aria-label={`Logo: ${car.name}. Click to change.`}
      className={`w-10 h-10 ${car.bg} rounded-xl flex items-center justify-center ring-2 ${car.ring} transition-transform duration-200 hover:scale-105 active:scale-95 ${pop ? 'scale-110' : ''}`}
    >
      <CarEmblem id={car.id} />
    </button>
  );
}

export function getSavedCarName(): string {
  return CARS[readStorage(CAR_KEY, 0) % CARS.length].name;
}
