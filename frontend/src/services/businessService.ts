
interface BusinessData {
  businessName: string;
  location: string;
  businessType: string;
  brandVoice: string;
  peakTime: string;
  products: string;
  triggers?: {
    weather: {
      hotSunny: boolean;
      rainy: boolean;
      coolPleasant: boolean;
    };
    timeBased: {
      mondayCoffee: boolean;
      paydaySales: boolean;
      weekendSpecials: boolean;
    };
    holidays: {
      localFestivals: boolean;
      internationalHolidays: boolean;
    };
    manual: {
      boostNow: boolean;
    };
  };
  instagramConnected?: boolean;
  userId?: string;
}

interface BusinessResponse {
  success: boolean;
  data?: BusinessData & { id: string; createdAt: string };
  error?: string;
}

// Mock API service - replace with actual backend calls
export const businessService = {
  async createBusiness(data: BusinessData): Promise<BusinessResponse> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful response
      const businessData = {
        ...data,
        id: `business_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      // Store in localStorage for now
      localStorage.setItem('businessData', JSON.stringify(businessData));
      
      return {
        success: true,
        data: businessData
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create business profile'
      };
    }
  },

  async getBusiness(userId: string): Promise<BusinessResponse> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get from localStorage for now
      const stored = localStorage.getItem('businessData');
      if (stored) {
        const data = JSON.parse(stored);
        return {
          success: true,
          data
        };
      }
      
      return {
        success: false,
        error: 'No business profile found'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch business profile'
      };
    }
  },

  async updateTriggers(userId: string, triggers: BusinessData['triggers']): Promise<BusinessResponse> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const stored = localStorage.getItem('businessData');
      if (stored) {
        const data = JSON.parse(stored);
        const updatedData = { ...data, triggers };
        localStorage.setItem('businessData', JSON.stringify(updatedData));
        
        return {
          success: true,
          data: updatedData
        };
      }
      
      return {
        success: false,
        error: 'Business profile not found'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update triggers'
      };
    }
  }
};
