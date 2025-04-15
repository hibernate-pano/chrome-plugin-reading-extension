import React, { useState, useRef, useEffect } from 'react';
import Transition from './Transition';

export interface MenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  width?: number | string;
  className?: string;
  closeOnClick?: boolean;
  closeOnOutsideClick?: boolean;
  transitionType?: 'fade' | 'slide-up' | 'slide-down' | 'zoom';
}

/**
 * 动画菜单组件
 */
const Menu: React.FC<MenuProps> = ({
  trigger,
  children,
  position = 'bottom-left',
  width = 'auto',
  className = '',
  closeOnClick = true,
  closeOnOutsideClick = true,
  transitionType = 'fade'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // 切换菜单状态
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // 关闭菜单
  const closeMenu = () => {
    setIsOpen(false);
  };

  // 处理点击事件
  const handleMenuItemClick = () => {
    if (closeOnClick) {
      closeMenu();
    }
  };

  // 处理外部点击事件
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        closeOnOutsideClick &&
        isOpen &&
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, closeOnOutsideClick]);

  // 处理 ESC 键关闭菜单
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  // 位置样式
  const positionStyles = {
    'bottom-left': 'top-full left-0 mt-1',
    'bottom-right': 'top-full right-0 mt-1',
    'top-left': 'bottom-full left-0 mb-1',
    'top-right': 'bottom-full right-0 mb-1'
  };

  return (
    <div className="relative inline-block">
      {/* 触发器 */}
      <div
        ref={triggerRef}
        className="cursor-pointer"
        onClick={toggleMenu}
      >
        {trigger}
      </div>

      {/* 菜单内容 */}
      <Transition
        show={isOpen}
        type={transitionType}
        duration={200}
      >
        <div
          ref={menuRef}
          className={`absolute z-50 ${positionStyles[position]} bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 ${className}`}
          style={{ width }}
          onClick={handleMenuItemClick}
        >
          {children}
        </div>
      </Transition>
    </div>
  );
};

export interface MenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * 菜单项组件
 */
export const MenuItem: React.FC<MenuItemProps> = ({
  children,
  onClick,
  disabled = false,
  className = '',
  icon
}) => {
  return (
    <div
      className={`
        px-4 py-2 text-sm cursor-pointer flex items-center
        ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
        ${className}
      `}
      onClick={disabled ? undefined : onClick}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </div>
  );
};

/**
 * 菜单分割线组件
 */
export const MenuDivider: React.FC = () => {
  return <div className="my-1 border-t border-gray-200 dark:border-gray-700" />;
};

export default Menu;
