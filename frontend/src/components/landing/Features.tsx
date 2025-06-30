import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { Target, Bot, TrendingUp } from "lucide-react";
import AnimatedShowcase from "@/components/AnimatedShowcase";

const Features = () => {
  return (
    <section id="how-adgenie-works" className="container mx-auto px-6 py-24 bg-muted/30">
      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
          How AdGenie Works
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
          Set it up once, then watch your AI marketing intern work 24/7
        </p>
      </div>

      <div className="mb-20">
        <AnimatedShowcase />
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-20">
        <Card className="shadow-lg bg-white p-8 hover:shadow-xl transition-all duration-300" radius="lg">
          <CardHeader className="pb-6 flex-col items-start">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">5-Minute Setup</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Tell us about your business, connect Instagram, and activate your triggers
            </p>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Business profile setup
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Instagram connection
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Smart trigger activation
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card className="shadow-lg bg-white p-8 hover:shadow-xl transition-all duration-300" radius="lg">
          <CardHeader className="pb-6 flex-col items-start">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Creates Content</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Your marketing intern generates perfect posts based on weather, holidays, and trends
            </p>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                Weather-triggered posts
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                Holiday celebrations
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                Custom brand voice
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card className="shadow-lg bg-white p-8 hover:shadow-xl transition-all duration-300" radius="lg">
          <CardHeader className="pb-6 flex-col items-start">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Auto-Posting</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Sit back and watch engagement grow as your intern posts at perfect moments
            </p>
          </CardHeader>
          <CardBody>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                Automatic Instagram posting
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                Perfect timing
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                Manual boost button
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </section>
  );
};

export default Features;
