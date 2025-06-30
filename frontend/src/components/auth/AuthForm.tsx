
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onAuthSuccess: () => void;
}

const AuthForm = ({ mode, onSwitchMode, onAuthSuccess }: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp, signIn } = useAuth();

  useEffect(() => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === 'signup') {
        await signUp(email, password, firstName, lastName);
      } else {
        await signIn(email, password);
        onAuthSuccess();
      }
    } catch (error) {
      console.error('Auth operation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DialogHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Bot className="h-8 w-8 text-primary" />
          </div>
        </div>
        <DialogTitle className="text-2xl">
          {mode === 'signup' ? 'Join AdGenie' : 'Welcome Back'}
        </DialogTitle>
      </DialogHeader>
      
      <Card className="border-0 shadow-none">
        <CardHeader className="text-center pb-4">
          <CardDescription>
            {mode === 'signup' 
              ? 'Get your AI marketing intern in 5 minutes' 
              : 'Sign in to your AdGenie account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                "Processing..."
              ) : mode === 'signup' ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'signup' ? (
                <>
                  Already have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => onSwitchMode('login')}>
                    Sign in
                  </Button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => onSwitchMode('signup')}>
                    Sign up
                  </Button>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AuthForm;
