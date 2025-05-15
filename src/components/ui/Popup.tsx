import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './Popup.module.css';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const Popup: React.FC<PopupProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  ariaLabelledBy,
  ariaDescribedBy 
}) => {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Trap focus within the modal - a more robust solution might use a library
      // For now, ensure the modal itself can be focused for screen readers
    } else {
      document.removeEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <div 
      className={styles.backdrop}
      onClick={onClose} // Close on backdrop click
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      // tabIndex={-1} // To allow focusing the modal programmatically if needed
    >
      <div 
        className={styles.panel}
        onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to backdrop
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Popup;
