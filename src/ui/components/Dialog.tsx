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

  // 处理对话框打开时禁止滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
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
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeMap[size]} ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                {title && (
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                    onClick={onClose}
                  >
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* 内容区域 */}
            <div className="px-6 py-4">
              {children}
            </div>

            {/* 底部区域 */}
            {footer && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
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
  title = '确认',
  children,
  confirmText = '确认',
  cancelText = '取消',
  confirmButtonProps,
  cancelButtonProps,
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
            variant="outline"
            onClick={onClose}
            {...cancelButtonProps}
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            {...confirmButtonProps}
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
