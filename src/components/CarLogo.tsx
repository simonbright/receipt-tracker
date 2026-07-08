import { useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

const CAR_KEY = 'receipt-tracker-car-logo';

export const CARS = [
  { id: 'supra', name: 'Toyota Supra', src: '/logos/supra.svg' },
  { id: 'bmw', name: 'BMW', src: '/logos/bmw.svg' },
  { id: 'porsche', name: 'Porsche', src: '/logos/porsche.svg' },
  { id: 'maserati', name: 'Maserati', src: '/logos/maserati.svg' },
  { id: 'aston', name: 'Aston Martin', src: '/logos/aston-martin.svg' },
] as const;

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
      className={`w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center p-2 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${pop ? 'scale-110 rotate-3' : ''}`}
    >
      <img
        src={car.src}
        alt=""
        className="w-full h-full object-contain"
        draggable={false}
      />
    </button>
  );
}
