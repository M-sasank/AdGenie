
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import VerificationDialog from "./VerificationDialog";
import AuthForm from "./AuthForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

const AuthModal = ({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) => {
  const { 
    showVerificationDialog, 
    pendingVerificationEmail, 
    setShowVerificationDialog 
  } = useAuth();

  const handleCloseVerificationDialog = () => {
    console.log('Closing verification dialog from AuthModal');
    setShowVerificationDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <AuthForm 
            mode={mode} 
            onSwitchMode={onSwitchMode} 
            onAuthSuccess={onClose} 
          />
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      {showVerificationDialog && pendingVerificationEmail && (
        <VerificationDialog
          isOpen={showVerificationDialog}
          onClose={handleCloseVerificationDialog}
          email={pendingVerificationEmail}
        />
      )}
    </>
  );
};

export default AuthModal;
