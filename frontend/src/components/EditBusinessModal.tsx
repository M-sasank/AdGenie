import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";
import { Instagram, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BusinessData {
  businessID?: string;
  businessName: string;
  location: string;
  businessType: string;
  brandVoice: string;
  peakTime: string;
  products: string;
  socialMedia?: {
    instagram: {
      connected: boolean;
      tokenID?: string;
      lastConnected?: string;
      username?: string;
    };
  };
}

interface EditBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessData: BusinessData;
  onUpdate: (updatedData: BusinessData) => void;
}

const EditBusinessModal = ({ open, onOpenChange, businessData, onUpdate }: EditBusinessModalProps) => {
  const [formData, setFormData] = useState<BusinessData>(businessData);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.businessID || !user?.sub) {
      toast.error("Missing critical information. Cannot update.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await businessService.updateBusiness(
        formData.businessID,
        user.sub,
        formData
      );

      if (response.success && response.data) {
        onUpdate(response.data);
        toast.success('Business details updated successfully!');
        onOpenChange(false);
      } else {
        throw new Error(response.error || 'Failed to update business details.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof BusinessData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isInstagramConnected = formData.socialMedia?.instagram?.connected || false;
  const instagramUsername = formData.socialMedia?.instagram?.username;
  const lastConnected = formData.socialMedia?.instagram?.lastConnected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Business Details</DialogTitle>
          <DialogDescription>
            Update your business information and social media connections.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Business Information Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select value={formData.businessType} onValueChange={(value) => handleChange('businessType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="cafe">Cafe</SelectItem>
                  <SelectItem value="retail">Retail Store</SelectItem>
                  <SelectItem value="service">Service Business</SelectItem>
                  <SelectItem value="fitness">Fitness Center</SelectItem>
                  <SelectItem value="beauty">Beauty Salon</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandVoice">Brand Voice</Label>
              <Select value={formData.brandVoice} onValueChange={(value) => handleChange('brandVoice', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="sophisticated">Sophisticated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="peakTime">Peak Time</Label>
              <Select value={formData.peakTime} onValueChange={(value) => handleChange('peakTime', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select peak time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                  <SelectItem value="evening">Evening (6PM-12AM)</SelectItem>
                  <SelectItem value="late-night">Late Night (12AM-6AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="products">Products/Services</Label>
              <Textarea
                id="products"
                value={formData.products}
                onChange={(e) => handleChange('products', e.target.value)}
                placeholder="Describe your main products or services..."
                rows={3}
              />
            </div>
          </form>

          {/* Instagram Connection Section */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Instagram className="w-4 h-4 text-white" />
                </div>
                <span>Instagram Connection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstagramConnected ? (
                <div className="space-y-3">
                  {/* Connected State */}
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">Instagram Connected</p>
                      {instagramUsername && (
                        <p className="text-xs text-green-700">Account: {instagramUsername}</p>
                      )}
                      {lastConnected && (
                        <p className="text-xs text-green-600">
                          Connected: {new Date(lastConnected).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Disconnected State */}
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Instagram Not Connected</p>
                      <p className="text-xs text-gray-600">Connect your Instagram account during onboarding to enable auto-posting.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Helper Text */}
              <p className="text-xs text-gray-500">
                {isInstagramConnected 
                  ? "Instagram connection is managed during the onboarding process."
                  : "You can connect your Instagram account by completing the onboarding flow."
                }
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
            {isLoading ? 'Updating...' : 'Update Details'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBusinessModal;
