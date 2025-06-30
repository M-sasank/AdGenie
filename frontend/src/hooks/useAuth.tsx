import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { signUp, signIn, signOut, confirmSignUp, getCurrentUser } from 'aws-amplify/auth';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  email: string;
  firstName: string;
  lastName: string;
  sub: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  showVerificationDialog: boolean;
  pendingVerificationEmail: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  setShowVerificationDialog: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      console.log('Current user found:', currentUser);
      const userData = {
        email: currentUser.signInDetails?.loginId || '',
        firstName: currentUser.username || '',
        lastName: '',
        sub: currentUser.userId,
      };
      setUser(userData);
    } catch (error) {
      console.log('No authenticated user found');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      console.log('Starting sign up process for:', email);
      
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
          },
          autoSignIn: false,
        },
      });
      
      console.log('Sign up successful:', result);
      
      // Set pending verification email and show dialog
      setPendingVerificationEmail(email);
      setShowVerificationDialog(true);
      
      toast.success('Account created! Please check your email for verification code.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      console.log('Starting sign in process for:', email);
      
      const result = await signIn({
        username: email,
        password,
      });
      
      console.log('Sign in result:', result);
      
      if (result.isSignedIn) {
        const currentUser = await getCurrentUser();
        setUser({
          email: currentUser.signInDetails?.loginId || email,
          firstName: currentUser.username || '',
          lastName: '',
          sub: currentUser.userId,
        });
        
        toast.success('Welcome back to AdGenie!');
        
        // Redirect to dashboard after successful sign in
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      toast.success('Signed out successfully');
      // Redirect to home page after sign out
      navigate('/');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    try {
      console.log('Confirming sign up for:', email, 'with code:', code);
      
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      
      console.log('Email verification successful');
      toast.success('Email verified successfully! You can now sign in.');
      
      // Close verification dialog and clear pending email
      setShowVerificationDialog(false);
      setPendingVerificationEmail(null);
    } catch (error: any) {
      console.error('Confirm sign up error:', error);
      toast.error(error.message || 'Failed to verify email');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      showVerificationDialog,
      pendingVerificationEmail,
      signUp: handleSignUp,
      signIn: handleSignIn,
      signOut: handleSignOut,
      confirmSignUp: handleConfirmSignUp,
      setShowVerificationDialog,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
