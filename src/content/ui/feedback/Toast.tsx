import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FeedbackType, 
  ToastOptions, 
  ToastAction, 
  NotificationPosition,
  ToastInstance 
} from './types';

interface ToastProps extends ToastOptions {
  onClose: () => void;
  onAction: (action: ToastAction) => void;
}

interface ToastContainerProps {
  position: NotificationPosition;
  toasts: ToastInstance[];
  onToastClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  type = FeedbackType.INFO,
  duration = 5000,
  showProgress = true,
  dismissible = true,
  actions = [],
  onClose,
  onAction
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const progressRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // 自动关闭逻辑
  useEffect(() => {
    if (duration <= 0) return;

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      } else {
        handleClose();
      }
    };

    const animationId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationId);
  }, [duration]);

  // 进度条动画
  useEffect(() => {
    if (!showProgress || duration <= 0) return;

    const progressBar = progressRef.current;
    if (!progressBar) return;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      
      progressBar.style.width = `${remaining}%`;
      
      if (remaining > 0) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [showProgress, duration]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 150); // 等待动画完成
  }, [onClose]);

  const handleAction = useCallback((action: ToastAction) => {
    onAction(action);
  }, [onAction]);

  const getIcon = () => {
    switch (type) {
      case FeedbackType.SUCCESS:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case FeedbackType.ERROR:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case FeedbackType.WARNING:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case FeedbackType.LOADING:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getToastStyles = () => {
    const baseStyles = "relative overflow-hidden transition-all duration-300 ease-out";
    
    if (isVisible) {
      return cn(baseStyles, "opacity-100 translate-y-0");
    } else {
      return cn(baseStyles, "opacity-0 translate-y-2");
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case FeedbackType.SUCCESS:
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950";
      case FeedbackType.ERROR:
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
      case FeedbackType.WARNING:
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950";
      case FeedbackType.LOADING:
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950";
      default:
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950";
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case FeedbackType.SUCCESS:
        return "bg-green-500";
      case FeedbackType.ERROR:
        return "bg-red-500";
      case FeedbackType.WARNING:
        return "bg-yellow-500";
      case FeedbackType.LOADING:
        return "bg-blue-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card className={cn(
      "w-80 shadow-lg border",
      getTypeStyles(),
      getToastStyles()
    )}>
      <CardContent className="p-4">
        {/* 头部 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            {title && (
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {title}
              </h4>
            )}
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* 消息内容 */}
        {message && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {message}
          </p>
        )}

        {/* 操作按钮 */}
        {actions.length > 0 && (
          <div className="flex gap-2 mb-3">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                disabled={action.disabled}
                onClick={() => handleAction(action)}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* 进度条 */}
        {showProgress && duration > 0 && (
          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              ref={progressRef}
              className={cn(
                "h-full transition-all duration-100 ease-linear",
                getProgressColor()
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ToastContainer: React.FC<ToastContainerProps> = ({
  position,
  toasts,
  onToastClose
}) => {
  const getContainerStyles = () => {
    const baseStyles = "fixed z-50 flex flex-col gap-2 p-4 pointer-events-none";
    
    switch (position) {
      case NotificationPosition.TOP_LEFT:
        return cn(baseStyles, "top-0 left-0");
      case NotificationPosition.TOP_RIGHT:
        return cn(baseStyles, "top-0 right-0");
      case NotificationPosition.TOP_CENTER:
        return cn(baseStyles, "top-0 left-1/2 transform -translate-x-1/2");
      case NotificationPosition.BOTTOM_LEFT:
        return cn(baseStyles, "bottom-0 left-0");
      case NotificationPosition.BOTTOM_RIGHT:
        return cn(baseStyles, "bottom-0 right-0");
      case NotificationPosition.BOTTOM_CENTER:
        return cn(baseStyles, "bottom-0 left-1/2 transform -translate-x-1/2");
      case NotificationPosition.CENTER:
        return cn(baseStyles, "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2");
      default:
        return cn(baseStyles, "top-0 right-0");
    }
  };

  return (
    <div className={getContainerStyles()}>
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          {/* 这里需要根据toast实例渲染Toast组件 */}
          {/* 由于Toast组件需要完整的props，我们需要在ToastManager中处理 */}
        </div>
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
export type { ToastProps, ToastContainerProps };
