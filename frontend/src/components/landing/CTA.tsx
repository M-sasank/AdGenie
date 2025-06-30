
import { Button } from "@nextui-org/react";
import { Instagram } from "lucide-react";

interface CTAProps {
  onGetStarted: () => void;
}

const CTA = ({ onGetStarted }: CTAProps) => {
  return (
    <section className="container mx-auto px-6 py-24 text-center bg-gray-50">
      <h2 className="text-5xl font-bold mb-6 text-gray-900 tracking-tight">
        Ready to Activate Your Marketing Intern?
      </h2>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
        Join thousands of businesses that never miss a marketing opportunity
      </p>
      <Button 
        size="lg" 
        onClick={onGetStarted} 
        color="primary"
        className="font-medium px-12 py-6 shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
        radius="full"
        startContent={<Instagram className="h-6 w-6" />}
      >
        Start Free Trial
      </Button>
    </section>
  );
};
export default CTA;
