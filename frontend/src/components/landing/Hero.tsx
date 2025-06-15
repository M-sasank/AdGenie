
import { Button, Chip } from "@nextui-org/react";
import { Zap } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="container mx-auto px-6 py-24 text-center">
      <Chip 
        variant="flat" 
        color="default"
        className="mb-8 bg-gray-100 text-gray-700 px-4 py-2 font-medium"
        radius="full"
      >
        🤖 Your Personal Marketing Intern
      </Chip>
      <h1 className="text-6xl md:text-7xl font-bold mb-8 text-gray-900 tracking-tight leading-none">
        Never Miss a Marketing
        <br />
        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
          Opportunity Again
        </span>
      </h1>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
        AdGenie automatically creates and posts perfect Instagram content for your business. 
        Weather changes? Holiday approaching? Your AI marketing intern is already on it.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <Button 
          size="lg" 
          onClick={onGetStarted} 
          color="primary"
          className="font-medium px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          radius="full"
          startContent={<Zap className="h-5 w-5" />}
        >
          Start Your 7-Day Free Trial
        </Button>
        <Button 
          size="lg" 
          variant="bordered" 
          className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-8 py-4 text-lg"
          radius="full"
        >
          Watch Demo
        </Button>
      </div>
      <p className="text-sm text-gray-500 font-medium">
        Setup in 5 minutes • No credit card required • Cancel anytime
      </p>
    </section>
  );
};

export default Hero;
