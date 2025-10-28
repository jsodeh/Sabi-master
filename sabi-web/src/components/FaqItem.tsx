'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItemProps {
  question: string;
  answer: string;
}

const FaqItem = ({ question, answer }: FaqItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl text-left">
      <button
        className="w-full flex justify-between items-center p-6"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold leading-7 text-white">{question}</h3>
        <ChevronDown
          className={`h-6 w-6 text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="text-base leading-7 text-gray-400">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default FaqItem;
