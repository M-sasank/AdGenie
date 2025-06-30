
import React, { useState, useEffect } from 'react';
import { HolidayCalendar } from '@/components/HolidayCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HolidayManager = () => {
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  // Load existing holiday preferences
  useEffect(() => {
    const saved = localStorage.getItem('selectedHolidays');
    if (saved) {
      setSelectedHolidays(JSON.parse(saved));
    } else {
      // Default selections
      setSelectedHolidays(['new-year-2025', 'valentine-2025', 'thingyan-2025', 'independence-day-2025', 'christmas-2025']);
    }
  }, []);

  const handleHolidayToggle = (holidayId: string, isSelected: boolean) => {
    setSelectedHolidays(prev => {
      if (isSelected) {
        return [...prev, holidayId];
      } else {
        return prev.filter(id => id !== holidayId);
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage
      localStorage.setItem('selectedHolidays', JSON.stringify(selectedHolidays));
      
      toast.success(`Holiday preferences saved! ${selectedHolidays.length} holidays selected for automated posts.`);
    } catch (error) {
      toast.error('Failed to save holiday preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Holiday Manager</h1>
              <p className="text-gray-600">Configure which holidays should trigger automated posts</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              {selectedHolidays.length} holidays selected
            </Badge>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Save className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">How Holiday Automation Works</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  Your AI marketing assistant will automatically create and schedule posts for selected holidays. 
                  Posts are generated 1-2 days before each holiday with content tailored to your business type and brand voice. 
                  You can always review and edit posts before they go live.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Holiday Calendar */}
        <HolidayCalendar 
          selectedHolidays={selectedHolidays}
          onHolidayToggle={handleHolidayToggle}
        />
      </div>
    </div>
  );
};

export default HolidayManager;
