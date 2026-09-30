/**
 * Modern Descope Login + Registration System
 * Replaces legacy custom auth modals with Descope Authentication.
 * Project ID: P3K3sjhRrAXAhdRspvsCwuFMj26e
 */
import React from 'react';
import { DescopeAuthModal } from './DescopeAuthModal';
import { DescopeUserProfile } from '../services/descopeService';
import { PassengerProfile } from '../services/passengerAuth';
import { UserRole } from '../types';

export type AuthMode = 'signup' | 'login';

interface PassengerAuthModalProps {
  initialMode?: 'signup' | 'login';
  intendedRole?: UserRole;
  onAuthenticated: (profile: PassengerProfile, role?: UserRole) => void;
  onCancel: () => void;
}

export const PassengerAuthModal: React.FC<PassengerAuthModalProps> = ({
  initialMode = 'signup',
  intendedRole = 'passenger',
  onAuthenticated,
  onCancel,
}) => {
  return (
    <DescopeAuthModal
      initialMode={initialMode}
      intendedRole={intendedRole}
      onAuthenticated={(descopeUser, role) => {
        const passengerProfile: PassengerProfile = {
          id: descopeUser.id,
          name: descopeUser.name,
          email: descopeUser.email,
          role: 'passenger',
          isEmailVerified: descopeUser.isEmailVerified,
        };
        onAuthenticated(passengerProfile, role);
      }}
      onCancel={onCancel}
    />
  );
};

export default PassengerAuthModal;
