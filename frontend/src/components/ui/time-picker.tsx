
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  label?: string;
  value?: string;
  onChange?: (time: string) => void;
  className?: string;
  isRange?: boolean;
}

export const TimePicker = ({ 
  label = "Time", 
  value = "",
  onChange,
  className = "",
  isRange = false
}: TimePickerProps) => {
  const [startHour, setStartHour] = React.useState("09");
  const [startMinute, setStartMinute] = React.useState("00");
  const [startPeriod, setStartPeriod] = React.useState("AM");
  const [endHour, setEndHour] = React.useState("05");
  const [endMinute, setEndMinute] = React.useState("00");
  const [endPeriod, setEndPeriod] = React.useState("PM");

  // Parse existing value on mount
  React.useEffect(() => {
    if (value && isRange) {
      // Parse format like "9:00 AM - 5:00 PM"
      const rangeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
      const match = value.match(rangeRegex);
      if (match) {
        setStartHour(match[1].padStart(2, '0'));
        setStartMinute(match[2]);
        setStartPeriod(match[3].toUpperCase());
        setEndHour(match[4].padStart(2, '0'));
        setEndMinute(match[5]);
        setEndPeriod(match[6].toUpperCase());
      }
    } else if (value && !isRange) {
      // Parse single time format like "9:00 AM"
      const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
      const match = value.match(timeRegex);
      if (match) {
        setStartHour(match[1].padStart(2, '0'));
        setStartMinute(match[2]);
        setStartPeriod(match[3].toUpperCase());
      }
    }
  }, [value, isRange]);

  // Update parent when time changes
  React.useEffect(() => {
    if (isRange) {
      const timeString = `${parseInt(startHour)}:${startMinute} ${startPeriod} - ${parseInt(endHour)}:${endMinute} ${endPeriod}`;
      if (onChange) {
        onChange(timeString);
      }
    } else {
      const timeString = `${parseInt(startHour)}:${startMinute} ${startPeriod}`;
      if (onChange) {
        onChange(timeString);
      }
    }
  }, [startHour, startMinute, startPeriod, endHour, endMinute, endPeriod, onChange, isRange]);

  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return { value: h.toString().padStart(2, '0'), label: h.toString() };
  });

  const minutes = Array.from({ length: 60 }, (_, i) => {
    const m = i;
    return { value: m.toString().padStart(2, '0'), label: m.toString().padStart(2, '0') };
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 text-center">{label}</label>
      )}
      
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex flex-col items-center space-y-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm border border-gray-200">
            <Clock className="w-5 h-5 text-gray-600" />
          </div>
          
          {/* Time Selection */}
          <div className="flex flex-col items-center space-y-4 w-full max-w-md">
            {/* Start Time */}
            <div className="flex items-center justify-center space-x-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-full">
              <Select value={startHour} onValueChange={setStartHour}>
                <SelectTrigger className="w-20 h-12 text-center font-medium border-gray-300 focus:border-gray-900">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {hours.map((h) => (
                    <SelectItem key={h.value} value={h.value} className="hover:bg-gray-50">
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-gray-400 font-medium text-lg">:</span>

              <Select value={startMinute} onValueChange={setStartMinute}>
                <SelectTrigger className="w-20 h-12 text-center font-medium border-gray-300 focus:border-gray-900">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="max-h-40 bg-white border border-gray-200 shadow-lg">
                  {minutes.filter((_, i) => i % 15 === 0).map((m) => (
                    <SelectItem key={m.value} value={m.value} className="hover:bg-gray-50">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={startPeriod} onValueChange={setStartPeriod}>
                <SelectTrigger className="w-20 h-12 text-center font-medium border-gray-300 focus:border-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="AM" className="hover:bg-gray-50">AM</SelectItem>
                  <SelectItem value="PM" className="hover:bg-gray-50">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Range separator and End Time */}
            {isRange && (
              <>
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="w-8 h-px bg-gray-300"></div>
                    <span className="text-sm font-medium bg-white px-3 py-1 rounded-full border border-gray-200">to</span>
                    <div className="w-8 h-px bg-gray-300"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center space-x-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-full">
                  <Select value={endHour} onValueChange={setEndHour}>
                    <SelectTrigger className="w-20 h-12 text-center font-medium border-gray-300 focus:border-gray-900">
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      {hours.map((h) => (
                        <SelectItem key={h.value} value={h.value} className="hover:bg-gray-50">
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-gray-400 font-medium text-lg">:</span>

                  <Select value={endMinute} onValueChange={setEndMinute}>
                    <SelectTrigger className="w-20 h-12 text-center font-medium border-gray-300 focus:border-gray-900">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent className="max-h-40 bg-white border border-gray-200 shadow-lg">
                      {minutes.filter((_, i) => i % 15 === 0).map((m) => (
                        <SelectItem key={m.value} value={m.value} className="hover:bg-gray-50">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={endPeriod} onValueChange={setEndPeriod}>
                    <SelectTrigger className="w-20 h-12 text-center font-medium border-gray-300 focus:border-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="AM" className="hover:bg-gray-50">AM</SelectItem>
                      <SelectItem value="PM" className="hover:bg-gray-50">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
