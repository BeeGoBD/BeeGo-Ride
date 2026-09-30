import React from 'react';
import { DescopeAuthModal } from './DescopeAuthModal';
import { DescopeUserProfile } from '../services/descopeService';
import { UserRole } from '../types';

interface DescopeAuthScreenProps {
  intendedRole?: UserRole;
  onAuthenticated: (profile: DescopeUserProfile, role?: UserRole) => void;
  onClose?: () => void;
}

export const DescopeAuthScreen: React.FC<DescopeAuthScreenProps> = ({
  intendedRole = 'passenger',
  onAuthenticated,
  onClose,
}) => {
  return (
    <div className="w-full h-full min-h-[100dvh] bg-[#F1F3F5] flex items-center justify-center p-0 sm:p-4 font-sans select-none">
      <DescopeAuthModal
        intendedRole={intendedRole}
        onAuthenticated={onAuthenticated}
        onCancel={onClose}
        isStandalonePage={true}
      />
    </div>
  );
};
