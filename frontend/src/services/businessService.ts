const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

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
  socialMedia?: {
    instagram: {
      connected: boolean;
      tokenID?: string;
      lastConnected?: string;
      username?: string;
    };
  };
  userId?: string;
  businessID?: string;
  createdAt?: string;
}

interface BusinessResponse {
  success: boolean;
  data?: BusinessData;
  error?: string;
}

// API service connected to the backend
export const businessService = {
  async createBusiness(data: Omit<BusinessData, 'businessID' | 'createdAt'>): Promise<BusinessResponse> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/businesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create business profile');
      }
      
      const responseData = await response.json();
      
      // Return the original data plus the new businessID from the backend
      return {
        success: true,
        data: { ...data, businessID: responseData.businessID },
      };
    } catch (error: any) {
      console.error('Create Business Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create business profile',
      };
    }
  },

  async getBusiness(userId: string): Promise<BusinessResponse> {
    if (!userId) {
      return { success: false, error: 'User ID is required.' };
    }
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/businesses?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch business profile');
      }

      const responseData = await response.json();

      if (responseData.businesses && responseData.businesses.length > 0) {
        // The backend returns businessID, let's ensure it's mapped correctly.
        const business = responseData.businesses[0];
        return {
          success: true,
          data: business,
        };
      } else {
        // Successfully fetched, but no business found for the user.
        return {
          success: true,
          data: undefined, // Explicitly undefined
        };
      }
    } catch (error: any) {
      console.error('Get Business Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch business profile',
      };
    }
  },

  async updateBusiness(businessId: string, userId: string, data: BusinessData): Promise<BusinessResponse> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/businesses/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update business details.');
      }

      const updatedData = await response.json();
      return { success: true, data: updatedData };
    } catch (error: any) {
      console.error('Update Business Error:', error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred while updating business details.',
      };
    }
  },

  // This function still uses mock data. It needs to be updated to use the PUT /businesses/{businessID} endpoint.
  async updateTriggers(businessID: string, triggers: BusinessData['triggers']): Promise<BusinessResponse> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.warn("updateTriggers is using mock data and localStorage.");
      const stored = localStorage.getItem('businessData');
      if (stored) {
        const data = JSON.parse(stored);
        // This check is flawed because we don't store by businessID in localStorage, but it's a mock.
        if (data.businessID === businessID) {
          const updatedData = { ...data, triggers };
          localStorage.setItem('businessData', JSON.stringify(updatedData));
          
          return {
            success: true,
            data: updatedData
          };
        }
      }
      
      return {
        success: false,
        error: 'Business profile not found for trigger update (mock)'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update triggers (mock)'
      };
    }
  }
};
