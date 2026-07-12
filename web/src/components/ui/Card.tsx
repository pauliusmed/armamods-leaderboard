import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export function Card({ children, className = '', onClick, hoverEffect = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#172635] border border-white/5 relative group transition-all duration-200
        ${hoverEffect ? 'hover:border-tactical-orange/40 cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Tactical Corner Details */}
      <div className="absolute top-0 right-0 w-[4px] h-[4px] border-t border-r border-white/20 group-hover:border-tactical-orange transition-colors"></div>
      <div className="absolute bottom-0 left-0 w-[4px] h-[4px] border-b border-l border-white/20 group-hover:border-tactical-orange transition-colors"></div>
      
      {/* Scanning effect on hover */}
      <div className="absolute inset-0 bg-linear-to-b from-tactical-orange/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`px-6 py-5 relative overflow-hidden border-b border-white/5 ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export const CardContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className = '' }, ref) => {
    return (
      <div ref={ref} className={`p-6 ${className}`}>
        {children}
      </div>
    );
  }
);
