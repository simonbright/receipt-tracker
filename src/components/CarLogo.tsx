import { useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

const CAR_KEY = 'receipt-tracker-car-logo';

export const CARS = [
  {
    id: 'supra',
    name: 'Toyota Supra',
    bg: 'from-red-600 via-red-700 to-red-950',
    ring: 'ring-red-400/50',
    shadow: 'shadow-red-900/30',
  },
  {
    id: 'bmw',
    name: 'BMW',
    bg: 'from-slate-600 via-slate-800 to-slate-950',
    ring: 'ring-slate-400/50',
    shadow: 'shadow-slate-900/40',
  },
  {
    id: 'porsche',
    name: 'Porsche',
    bg: 'from-amber-400 via-yellow-500 to-amber-700',
    ring: 'ring-yellow-200/60',
    shadow: 'shadow-amber-900/30',
  },
  {
    id: 'maserati',
    name: 'Maserati',
    bg: 'from-blue-800 via-blue-900 to-slate-950',
    ring: 'ring-blue-400/40',
    shadow: 'shadow-blue-950/40',
  },
  {
    id: 'aston',
    name: 'Aston Martin',
    bg: 'from-emerald-800 via-emerald-900 to-slate-950',
    ring: 'ring-emerald-400/40',
    shadow: 'shadow-emerald-950/40',
  },
] as const;

type CarId = (typeof CARS)[number]['id'];

function CarEmblem({ id }: { id: CarId }) {
  const className = 'w-full h-full';

  switch (id) {
    case 'supra':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <defs>
            <linearGradient id="supra-body" x1="8" y1="32" x2="56" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff" />
              <stop offset="1" stopColor="#fca5a5" />
            </linearGradient>
          </defs>
          {/* Supra-style fastback silhouette */}
          <path
            d="M10 38c0-8 6-14 14-16l4-4h8l4 4c8 2 14 8 14 16v4H10v-4z"
            fill="url(#supra-body)"
            opacity="0.95"
          />
          <path
            d="M10 38c0-8 6-14 14-16l4-4h8l4 4c8 2 14 8 14 16"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M22 22l6-6h8l6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <rect x="26" y="24" width="12" height="5" rx="1" fill="white" fillOpacity="0.35" />
          <circle cx="20" cy="42" r="4" fill="#1e1e1e" stroke="white" strokeWidth="1.5" />
          <circle cx="44" cy="42" r="4" fill="#1e1e1e" stroke="white" strokeWidth="1.5" />
          <path d="M48 34l4-2v6l-4-2" fill="white" fillOpacity="0.7" />
        </svg>
      );

    case 'bmw':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="24" fill="#1a1a1a" stroke="white" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="20" stroke="white" strokeWidth="1" opacity="0.3" />
          <path d="M32 12v40M12 32h40" stroke="white" strokeWidth="2" />
          <path d="M32 12a20 20 0 0 1 0 40V32H12a20 20 0 0 1 20-20z" fill="#60a5fa" />
          <path d="M32 12a20 20 0 0 0 0 40V32h20a20 20 0 0 0-20-20z" fill="#93c5fd" />
          <path d="M32 32H12a20 20 0 0 0 20 20V32z" fill="white" />
          <path d="M32 32v20a20 20 0 0 0 20-20H32z" fill="#e2e8f0" />
        </svg>
      );

    case 'porsche':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <path
            d="M32 6l22 10v32L32 58 10 48V16z"
            fill="#1c1917"
            fillOpacity="0.25"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M32 6l22 10v32L32 58 10 48V16z"
            fill="url(#porsche-shield)"
          />
          <defs>
            <linearGradient id="porsche-shield" x1="32" y1="6" x2="32" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fef3c7" stopOpacity="0.3" />
              <stop offset="1" stopColor="#92400e" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M32 14c-6 4-10 10-10 16h20c0-6-4-12-10-16z"
            fill="#dc2626"
            stroke="white"
            strokeWidth="1.5"
          />
          <path d="M22 30h20M24 24h16M26 36h12" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="32" cy="22" r="3" fill="#fef3c7" />
        </svg>
      );

    case 'maserati':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <path
            d="M32 8l18 8v32l-18 8-18-8V16z"
            fill="white"
            fillOpacity="0.08"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Trident */}
          <path
            d="M32 16v28M32 16c-6 0-10 4-10 8M32 16c6 0 10 4 10 8"
            stroke="#e2e8f0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M22 24h20M24 30h16M26 36h12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          <path
            d="M32 44l-8 6h16l-8-6z"
            fill="#e2e8f0"
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="14" r="2" fill="#e2e8f0" />
        </svg>
      );

    case 'aston':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          {/* Wings */}
          <path
            d="M32 28c-14 0-22-6-26-12 4 8 12 14 26 14s22-6 26-14c-4 6-12 12-26 12z"
            fill="white"
            fillOpacity="0.15"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M6 16c6 6 14 10 26 10s20-4 26-10M8 20c5 4 12 7 24 7s19-3 24-7M10 24c4 3 10 5 22 5s18-2 22-5"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M32 38v12M28 50h8"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="28" y="38" width="8" height="10" rx="1" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5" />
          <path d="M32 42v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function CarLogo() {
  const [index, setIndex] = useState(() => readStorage(CAR_KEY, 0) % CARS.length);
  const [pop, setPop] = useState(false);
  const car = CARS[index];

  const handleClick = () => {
    setPop(true);
    setTimeout(() => setPop(false), 200);
    setIndex((prev) => {
      const next = (prev + 1) % CARS.length;
      writeStorage(CAR_KEY, next);
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Tap to change logo"
      aria-label="App logo. Tap to change."
      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${car.bg} flex items-center justify-center p-2.5 ring-2 ${car.ring} shadow-lg ${car.shadow} transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 ${pop ? 'scale-110 rotate-3' : ''}`}
    >
      <CarEmblem id={car.id} />
    </button>
  );
}
