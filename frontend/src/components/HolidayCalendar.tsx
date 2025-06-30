
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PartyPopper, Calendar as CalendarIcon, Globe, MapPin } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

interface Holiday {
  id: string;
  name: string;
  date: Date;
  type: 'local' | 'international';
  description?: string;
  isSelected: boolean;
}

interface HolidayCalendarProps {
  selectedHolidays: string[];
  onHolidayToggle: (holidayId: string, isSelected: boolean) => void;
}

// Sample holidays data - in a real app, this would come from an API
const sampleHolidays: Holiday[] = [
  {
    id: 'new-year-2025',
    name: 'New Year\'s Day',
    date: new Date(2025, 0, 1),
    type: 'international',
    description: 'Start the year with fresh promotions',
    isSelected: true
  },
  {
    id: 'valentine-2025',
    name: 'Valentine\'s Day',
    date: new Date(2025, 1, 14),
    type: 'international',
    description: 'Perfect for romantic promotions',
    isSelected: true
  },
  {
    id: 'thingyan-2025',
    name: 'Thingyan (Water Festival)',
    date: new Date(2025, 3, 13),
    type: 'local',
    description: 'Myanmar New Year celebration',
    isSelected: true
  },
  {
    id: 'mothers-day-2025',
    name: 'Mother\'s Day',
    date: new Date(2025, 4, 11),
    type: 'international',
    description: 'Celebrate mothers with special offers',
    isSelected: false
  },
  {
    id: 'independence-day-2025',
    name: 'Independence Day (Myanmar)',
    date: new Date(2025, 0, 4),
    type: 'local',
    description: 'Myanmar Independence Day',
    isSelected: true
  },
  {
    id: 'christmas-2025',
    name: 'Christmas Day',
    date: new Date(2025, 11, 25),
    type: 'international',
    description: 'Holiday season promotions',
    isSelected: true
  }
];

export const HolidayCalendar = ({ selectedHolidays, onHolidayToggle }: HolidayCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [holidays] = useState<Holiday[]>(sampleHolidays);

  // Get holidays for the selected date
  const holidaysForSelectedDate = holidays.filter(holiday => 
    selectedDate && isSameDay(holiday.date, selectedDate)
  );

  // Get all holidays for the current month/year view
  const currentYear = selectedDate?.getFullYear() || new Date().getFullYear();
  const currentMonth = selectedDate?.getMonth() || new Date().getMonth();
  const holidaysInView = holidays.filter(holiday => 
    holiday.date.getFullYear() === currentYear
  );

  // Function to check if a date has holidays
  const hasHolidays = (date: Date) => {
    return holidays.some(holiday => isSameDay(holiday.date, date));
  };

  // Custom day component to show holiday indicators
  const modifiers = {
    holiday: holidays.map(h => h.date)
  };

  const modifiersStyles = {
    holiday: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      fontWeight: 'bold'
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <PartyPopper className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Holiday Calendar</h2>
          <p className="text-gray-600">Select which holidays you want to create posts for</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5" />
              <span>Calendar View</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border"
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span>Holidays</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Holiday Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? (
                `Holidays on ${format(selectedDate, 'MMMM d, yyyy')}`
              ) : (
                'Select a date'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {holidaysForSelectedDate.length > 0 ? (
              <div className="space-y-4">
                {holidaysForSelectedDate.map((holiday) => (
                  <div key={holiday.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      checked={selectedHolidays.includes(holiday.id)}
                      onCheckedChange={(checked) => 
                        onHolidayToggle(holiday.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{holiday.name}</h3>
                        <Badge variant={holiday.type === 'local' ? 'default' : 'secondary'}>
                          {holiday.type === 'local' ? (
                            <><MapPin className="w-3 h-3 mr-1" /> Local</>
                          ) : (
                            <><Globe className="w-3 h-3 mr-1" /> International</>
                          )}
                        </Badge>
                      </div>
                      {holiday.description && (
                        <p className="text-sm text-gray-600">{holiday.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PartyPopper className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No holidays on this date</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Holidays List */}
      <Card>
        <CardHeader>
          <CardTitle>All Holidays ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holidaysInView.map((holiday) => (
              <div key={holiday.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  checked={selectedHolidays.includes(holiday.id)}
                  onCheckedChange={(checked) => 
                    onHolidayToggle(holiday.id, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{holiday.name}</h3>
                    <Badge variant={holiday.type === 'local' ? 'default' : 'secondary'} className="text-xs">
                      {holiday.type === 'local' ? 'Local' : 'International'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{format(holiday.date, 'MMMM d, yyyy')}</p>
                  {holiday.description && (
                    <p className="text-xs text-gray-500">{holiday.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
