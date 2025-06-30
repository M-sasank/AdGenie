import { Button } from "@nextui-org/react";
import { Bot } from "lucide-react";

interface HeaderProps {
  onLogin: () => void;
  onGetStarted: () => void;
  onGoToDashboard?: () => void;
  showGoToDashboard?: boolean;
}

const Header = ({ onLogin, onGetStarted, onGoToDashboard, showGoToDashboard }: HeaderProps) => {
  return (
    <header className="container mx-auto px-6 py-8 flex justify-between items-center backdrop-blur-xl bg-white/80 sticky top-0 z-50 border-b border-gray-100">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          AdGenie
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {showGoToDashboard ? (
          <Button
            onClick={onGoToDashboard}
            color="primary"
            variant="bordered"
            className="font-medium px-6 py-2.5 rounded-full border-2 border-primary shadow-sm hover:shadow-lg transition-all duration-200 text-base"
          >
            Go to Dashboard
          </Button>
        ) : (
          <>
            <Button 
              onClick={onGetStarted}
              color="primary"
              variant="solid"
              className="font-semibold px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-base"
            >
              Get Started
            </Button>
            <Button 
              variant="light" 
              onClick={onLogin}
              className="text-gray-600 hover:text-gray-900 font-medium px-6 py-2.5 rounded-full text-base"
            >
              Sign In
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
