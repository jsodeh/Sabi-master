'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-brand-green rounded-lg"></div>
            <span className="text-xl font-bold">Sabi</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-300 hover:text-white">Pricing</a>
            <a href="#" className="text-gray-300 hover:text-white">Blog</a>
            <a href="#" className="text-gray-300 hover:text-white">Docs</a>
            <a href="#" className="text-gray-300 hover:text-white">Forum</a>
          </nav>
          <div className="hidden md:flex items-center space-x-4">
            <button className="text-gray-300 hover:text-white transition-colors duration-300">Sign In</button>
            <button className="bg-white text-black font-semibold px-4 py-2 rounded-md hover:bg-gray-200 transition-colors duration-300">Download</button>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden bg-brand-dark/90 backdrop-blur-sm">
          <nav className="flex flex-col items-center space-y-4 py-8">
            <a href="#" className="text-gray-300 hover:text-white">Pricing</a>
            <a href="#" className="text-gray-300 hover:text-white">Blog</a>
            <a href="#" className="text-gray-300 hover:text-white">Docs</a>
            <a href="#" className="text-gray-300 hover:text-white">Forum</a>
            <button className="text-gray-300 hover:text-white transition-colors duration-300">Sign In</button>
            <button className="bg-white text-black font-semibold px-4 py-2 rounded-md hover:bg-gray-200 transition-colors duration-300">Download</button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
