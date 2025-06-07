
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { signUp, signIn, signOut, confirmSignUp, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { toast } from 'sonner';

interface User {
  email: string;
  firstName: string;
  lastName: string;
  sub: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser({
        email: currentUser.signInDetails?.loginId || '',
        firstName: currentUser.username || '',
        lastName: '',
        sub: currentUser.userId,
      });
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
          },
        },
      });
      
      console.log('Sign up successful:', result);
      toast.success('Account created! Please check your email for verification.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await signIn({
        username: email,
        password,
      });
      
      if (result.isSignedIn) {
        const currentUser = await getCurrentUser();
        setUser({
          email: currentUser.signInDetails?.loginId || email,
          firstName: currentUser.username || '',
          lastName: '',
          sub: currentUser.userId,
        });
        
        toast.success('Welcome back to AdGenie!');
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
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      toast.success('Email verified successfully! You can now sign in.');
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
      signUp: handleSignUp,
      signIn: handleSignIn,
      signOut: handleSignOut,
      confirmSignUp: handleConfirmSignUp,
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
