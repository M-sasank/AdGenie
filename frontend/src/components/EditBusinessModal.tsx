
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";

interface BusinessData {
  businessName: string;
  location: string;
  businessType: string;
  brandVoice: string;
  peakTime: string;
  products: string;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call to update business data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update localStorage for now
      const stored = localStorage.getItem('businessData');
      if (stored) {
        const data = JSON.parse(stored);
        const updatedData = { ...data, ...formData };
        localStorage.setItem('businessData', JSON.stringify(updatedData));
        onUpdate(formData);
        toast.success('Business details updated successfully!');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Failed to update business details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof BusinessData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Business Details</DialogTitle>
          <DialogDescription>
            Update your business information to improve AI-generated content.
          </DialogDescription>
        </DialogHeader>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Details'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBusinessModal;
