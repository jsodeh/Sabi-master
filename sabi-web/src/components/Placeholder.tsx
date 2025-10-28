const Placeholder = ({ className }: { className?: string }) => {
  return (
    <div
      className={`aspect-[16/9] rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center ${className}`}>
      <div className="text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="m21 15-5-5L5 21"/>
        </svg>
      </div>
    </div>
  );
};

export default Placeholder;
