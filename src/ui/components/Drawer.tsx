import React, { useEffect, useRef, useCallback } from 'react';
import Transition from './Transition'; // Assuming Transition.tsx is in the same directory
import Button from './Button'; // Assuming Button.tsx is in the same directory

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  children: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string; // For the drawer panel itself
  overlayClassName?: string;
  width?: string | number;
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  position = 'right',
  children,
  title,
  footer,
  className = '',
  overlayClassName = '',
  width = '360px', // Default width, can be '80vw' for smaller screens via props
  closeOnEsc = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null); // To store the element that triggered the drawer

  const handleEscKey = useCallback(
    (event: KeyboardEvent) => {
      if (isOpen && closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    },
    [isOpen, closeOnEsc, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [handleEscKey]);

  // Focus trapping and restoration, and body scroll lock
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement; // Store focused element
      document.body.style.overflow = 'hidden';

      // Focus first focusable element in drawer or drawer itself
      setTimeout(() => { // Timeout to ensure elements are rendered
        const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          drawerRef.current?.focus(); // Fallback to drawer itself
        }
      }, 100); // Small delay for transition

      const handleFocusTrap = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (!focusableElements || focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (event.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else { // Tab
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };
      
      document.addEventListener('keydown', handleFocusTrap);
      return () => {
        document.removeEventListener('keydown', handleFocusTrap);
        document.body.style.overflow = '';
        if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
          triggerRef.current.focus(); // Restore focus
        }
      };
    } else {
      // Ensure body overflow is reset if drawer is closed by other means
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      closeOnOverlayClick &&
      drawerRef.current &&
      !drawerRef.current.contains(event.target as Node) &&
      event.target === event.currentTarget // Ensure click is on overlay itself
    ) {
      onClose();
    }
  };
  
  const panelPositionClasses = position === 'left' ? 'left-0' : 'right-0';
  const panelTransformEnter = position === 'left' ? '-translate-x-full' : 'translate-x-full';
  const panelTransformLeave = position === 'left' ? '-translate-x-full' : 'translate-x-full'; // For exit, it should go back
  const panelTransformActive = 'translate-x-0';

  const drawerEnterDuration = 250; // Material: 225ms (narrow) / 300ms (wide)
  const drawerExitDuration = 200;  // Material: 195ms (narrow) / 250ms (wide)
  // Using a single duration for Transition component, will use enterDuration for now or average.
  // For simplicity, let's use a common duration for both panel and overlay.
  const commonDuration = 250;


  return (
    <>
      {/* Overlay/Scrim */}
      <Transition
        show={isOpen}
        type="fade"
        duration={commonDuration} // Sync with panel or use specific for scrim (e.g., 300ms is fine)
      >
        <div
          className={`fixed inset-0 z-40 bg-black bg-opacity-50 ${overlayClassName}`}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      </Transition>

      {/* Drawer Panel */}
      {/* 
        Ideally, Transition component would support different enter/exit durations.
        For now, using commonDuration.
        The customClasses apply specific easings.
      */}
      <Transition
        show={isOpen}
        type="custom" 
        duration={commonDuration} 
        customClasses={{
          enter: `transform ${panelTransformEnter} timing-md-decelerate`,
          enterActive: `transform ${panelTransformActive} timing-md-decelerate`,
          exit: `transform ${panelTransformActive} timing-md-accelerate`,
          exitActive: `transform ${panelTransformLeave} timing-md-accelerate`,
        }}
      >
        <div
          ref={drawerRef}
          className={`fixed top-0 bottom-0 ${panelPositionClasses} z-50 flex flex-col 
                     bg-material-surface dark:bg-material-darkSurface 
                     shadow-md-dp16 
                     ${className}`}
          style={{ width: typeof width === 'number' ? `${width}px` : width }}
          role="dialog" // Role is dialog for modal drawers
          aria-modal="true"
          aria-labelledby={title ? 'drawer-title' : undefined}
          tabIndex={-1} // Make drawer itself focusable for fallback
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-material-onSurface/12 dark:border-material-darkOnSurface/12">
              {title && (
                <h2 id="drawer-title" className="text-md-h6 text-material-onSurface dark:text-material-darkOnSurface">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <Button
                  variant="text" 
                  onClick={onClose}
                  className="!p-1 !min-w-0 rounded-full text-material-onSurface/75 dark:text-material-darkOnSurface/75 hover:text-material-onSurface dark:hover:text-material-darkOnSurface"
                  aria-label="Close drawer"
                >
                  <span className="w-6 h-6 leading-6 text-center text-xl">&times;</span> 
                </Button>
              )}
            </div>
          )}

          {/* Content Area */}
          <div className="flex-grow p-4 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-material-onSurface/12 dark:border-material-darkOnSurface/12">
              {footer}
            </div>
          )}
        </div>
      </Transition>
    </>
  );
};

export default Drawer;
