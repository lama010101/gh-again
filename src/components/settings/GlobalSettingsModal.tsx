import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SettingsTab from '@/components/profile/SettingsTab';
import { toast } from '@/components/ui/sonner';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  soundEffects: boolean;
  music: boolean;
  notifications: boolean;
  sound_enabled: boolean;
  notification_enabled: boolean;
  distance_unit: 'km' | 'mi';
  language: string;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Mock user settings for the modal
  const mockSettings: UserSettings = {
    theme: 'system',
    soundEffects: true,
    music: true,
    notifications: true,
    sound_enabled: true,
    notification_enabled: true,
    distance_unit: 'km',
    language: 'en',
  };

  // Simulate loading settings
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false); // Reset error state on open
      // Simulate API call with potential error
      const timer = setTimeout(() => {
        if (Math.random() > 0.9) { // Simulate 10% chance of error
          setHasError(true);
          toast.error('Failed to load settings. Please try again.');
        } else {
          setSettings(mockSettings);
        }
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSettingsUpdated = () => {
    // Refresh settings if needed
    console.log('Settings updated');
    toast.success('Settings updated successfully!');
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : hasError ? (
          <div className="text-center text-red-500 py-8">
            <p>Error loading settings. Please close and reopen the modal.</p>
            <Button onClick={() => setHasError(false)} className="mt-4">Retry</Button>
          </div>
        ) : (
          <div className="py-4">
            <SettingsTab 
              userId={user.id}
              settings={settings || mockSettings}
              isLoading={isLoading}
              onSettingsUpdated={handleSettingsUpdated}
            />
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isSaving}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSettingsModal;
