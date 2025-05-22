import React, { useEffect, useRef } from 'react';
import Transition from './Transition';
import Button from './Button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  transitionType?: 'fade' | 'slide-up' | 'slide-down' | 'zoom';
}

/**
 * 动画对话框组件
 */
const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnEsc = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
  overlayClassName = '',
  transitionType = 'zoom'
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null); // To store the element that triggered the dialog

  // 尺寸映射
  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  // 处理 ESC 键关闭对话框
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (isOpen && closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, closeOnEsc, onClose]);

  // Focus trapping and restoration, and body scroll lock
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement; // Store focused element
      document.body.style.overflow = 'hidden';
      
      // Focus first focusable element in dialog or dialog itself
      setTimeout(() => { // Timeout to ensure elements are rendered
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          dialogRef.current?.focus(); // Fallback to dialog itself if no interactive elements
        }
      }, 100); // Small delay for transition

      const handleFocusTrap = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
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
      // Ensure body overflow is reset if dialog is closed by other means than effect cleanup
      document.body.style.overflow = ''; 
    }
  }, [isOpen]);


  // 处理点击对话框外部关闭
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      closeOnOverlayClick &&
      dialogRef.current &&
      !dialogRef.current.contains(event.target as Node)
    ) {
      onClose();
    }
  };

  return (
    <Transition
      show={isOpen}
      type="fade"
      duration={200}
    >
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 ${overlayClassName}`}
        onClick={handleOverlayClick}
      >
        <Transition
          show={isOpen}
          type={transitionType}
          duration={300}
        >
          <div
            ref={dialogRef}
            className={`
              bg-material-surface dark:bg-material-darkSurface 
              rounded-md shadow-md-dp24 
              w-full ${sizeMap[size]} 
              p-6 ${className}
            `}
            onClick={(e) => e.stopPropagation()}
            role="dialog" 
            aria-modal="true"
            aria-labelledby={title ? 'dialog-title' : undefined}
            tabIndex={-1} // Make dialog itself focusable for fallback
          >
            {/* 标题栏 */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between mb-5"> {/* Spacing: title to content (20px) */}
                {title && (
                  <h3 id="dialog-title" className="text-md-h6 font-md-medium text-material-onSurface dark:text-material-darkOnSurface">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  // Replaced button with UI Button for consistency, though it was mostly fine
                  <Button
                    variant="text"
                    onClick={onClose}
                    className="!p-1 !min-w-0 rounded-full text-material-onSurface/75 dark:text-material-darkOnSurface/75 hover:text-material-onSurface dark:hover:text-material-darkOnSurface"
                    aria-label="Close dialog"
                  >
                    <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                )}
              </div>
            )}

            {/* 内容区域 - padding is handled by the main p-6, specific content styling is up to children */}
            <div className="text-material-onSurface/85 dark:text-material-darkOnSurface/85"> {/* Default content text color */}
              {children}
            </div>

            {/* 底部区域 - spacing from content to actions (24px) */}
            {footer && (
              <div className="mt-6">
                {footer}
              </div>
            )}
          </div>
        </Transition>
      </div>
    </Transition>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonProps?: Partial<React.ComponentProps<typeof Button>>;
  cancelButtonProps?: Partial<React.ComponentProps<typeof Button>>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  transitionType?: 'fade' | 'slide-up' | 'slide-down' | 'zoom';
}

/**
 * 确认对话框组件
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认', // Default title for confirm dialogs
  children,
  confirmText = '确认',
  cancelText = '取消',
  confirmButtonProps = { variant: 'text', color: 'primary' }, // Default to Material text button
  cancelButtonProps = { variant: 'text' }, // Default to Material text button
  size = 'sm',
  className = '',
  transitionType = 'zoom'
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      className={className}
      transitionType={transitionType}
      footer={
        <div className="flex justify-end space-x-2">
          <Button
            onClick={onClose}
            {...cancelButtonProps} // variant="text" by default
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            {...confirmButtonProps} // variant="text" color="primary" by default
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      {children}
    </Dialog>
  );
};

export default Dialog;
