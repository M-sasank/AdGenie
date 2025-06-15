
import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TriggerCardProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  className?: string;
}

export const TriggerCard = ({ label, description, checked, onToggle, className }: TriggerCardProps) => {
  return (
    <div
      onClick={() => onToggle(!checked)}
      className={cn(
        'p-4 rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden',
        'bg-white hover:bg-gray-50',
        checked 
          ? 'bg-gradient-to-br from-primary/8 via-primary/5 to-primary/8 border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-sm'
          : 'border border-gray-200',
        className
      )}
    >
      {checked && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      )}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
            <p className="font-medium text-gray-900">{label}</p>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <div className="ml-4 mt-1 flex-shrink-0">
            <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                checked ? "bg-primary border-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]" : "bg-transparent border-gray-300"
            )}>
                {checked && <Check className="w-4 h-4 text-white" />}
            </div>
        </div>
      </div>
    </div>
  );
};
