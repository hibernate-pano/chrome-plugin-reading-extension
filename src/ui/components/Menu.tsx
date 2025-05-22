import React, { useState, useRef, useEffect, useContext } from 'react';
import Transition from './Transition';
import Ripple from './Ripple'; // Import Ripple

// A simple context for dark mode, you might have a more robust one
// For now, we'll simulate it or assume a way to get it.
// const DarkModeContext = React.createContext(false);

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
  transitionType = 'zoom' // Changed default to 'zoom' for Material-like reveal
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

  // 处理 ESC 键关闭菜单 & Focus restoration
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus(); // Return focus to trigger
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, closeMenu]);


  // Focus first item and handle arrow key navigation when menu is open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const items = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
      );
      if (items.length > 0) {
        items[0].focus(); // Focus the first item
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        const { key } = event;
        if (key === 'ArrowUp' || key === 'ArrowDown') {
          event.preventDefault();
          const currentFocusedIndex = items.findIndex(item => item === document.activeElement);
          let nextFocusedIndex = -1;

          if (key === 'ArrowDown') {
            nextFocusedIndex = currentFocusedIndex >= 0 && currentFocusedIndex < items.length - 1 ? currentFocusedIndex + 1 : 0;
          } else if (key === 'ArrowUp') {
            nextFocusedIndex = currentFocusedIndex > 0 ? currentFocusedIndex - 1 : items.length - 1;
          }
          
          if (nextFocusedIndex !== -1) {
            items[nextFocusedIndex].focus();
          }
        } else if (key === 'Tab') {
          // Close menu on Tab, allowing focus to move naturally
          // This is simpler than full focus trapping for a dropdown menu
          closeMenu();
          // Optional: try to focus next/prev element outside menu, but browser default might be fine
        }
      };

      const menuElement = menuRef.current;
      menuElement.addEventListener('keydown', handleKeyDown);
      return () => {
        menuElement.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, children, closeMenu]);


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
        aria-haspopup="true" // ARIA attribute for menu trigger
        aria-expanded={isOpen} // ARIA attribute for menu trigger state
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
          className={`
            absolute z-50 ${positionStyles[position]} 
            bg-material-surface dark:bg-material-darkSurface 
            rounded shadow-md-dp8 
            py-2 ${className}
          `}
          style={{ width }}
          role="menu" // ARIA role for the menu container
          // tabIndex={-1} // Make menu container focusable for key events if needed, but items are better
        >
          {/* Pass down handleMenuItemClick to children if they are MenuItem components */}
          {React.Children.map(children, (child, index) => {
            if (React.isValidElement(child) && child.type === MenuItem) {
              return React.cloneElement(child as React.ReactElement<any>, { 
                onItemClick: handleMenuItemClick 
              });
            }
            return child;
          })}
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
  onItemClick?: () => void; // Internal prop from Menu
}

/**
 * 菜单项组件
 */
export const MenuItem: React.FC<MenuItemProps> = ({
  children,
  onClick,
  disabled = false,
  className = '',
  icon,
  onItemClick // internal prop
}) => {
  // const isDarkMode = useContext(DarkModeContext); // Example: detect dark mode
  // For ripple, using approximated colors based on typical onSurface for light/dark
  // A more robust solution would involve theme context.
  // For now, we assume onSurface is dark for light theme, light for dark theme.
  // So ripple is light on dark hover bg, dark on light hover bg.
  // The hover background is onSurface/10.
  // Let's use a fixed ripple color that works on a slightly opaque background.
  // `material.onSurface` is black, `material.darkOnSurface` is white.
  // A common ripple on such items is a slightly darker shade of the hover.
  // Or, the text color with very low opacity.
  // For simplicity: using a generic gray ripple.
  // A better approach: pass 'text-material-onSurface dark:text-material-darkOnSurface' to Ripple and let it handle opacity.
  // However, Ripple takes a direct color string.
  // Light theme: text is material.onSurface (e.g. black), ripple rgba(0,0,0,0.1)
  // Dark theme: text is material.darkOnSurface (e.g. white), ripple rgba(255,255,255,0.1)
  // The MenuItem component itself doesn't easily know if it's in dark mode without context.
  // For this exercise, we'll use the light theme ripple color.
  // A real implementation would use a theme context to switch this color.
  const rippleColor = 'rgba(0, 0, 0, 0.1)'; // Corresponds to material.onSurface (black) at 10% opacity

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (onItemClick) { // Call the Menu's handler for closing
      onItemClick();
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden 
        px-4 py-3 flex items-center
        text-md-body1 text-material-onSurface dark:text-material-darkOnSurface
        cursor-pointer
        focus:outline-none 
        ${disabled 
          ? 'text-material-onSurface/30 dark:text-material-darkOnSurface/30 cursor-not-allowed' 
          : 'hover:bg-material-onSurface/10 dark:hover:bg-material-darkOnSurface/10 focus:bg-material-onSurface/10 dark:focus:bg-material-darkOnSurface/10'}
        ${className}
      `}
      onClick={disabled ? undefined : handleClick}
      tabIndex={disabled ? -1 : 0}
      role="menuitem" // ARIA role for menu item
      aria-disabled={disabled} // ARIA disabled state
      onKeyDown={(e) => { 
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          if (e.key === ' ') e.preventDefault(); // Prevent page scroll for Space key
          handleClick();
        }
      }}
    >
      {icon && <span className="mr-4">{icon}</span>}
      {children}
      {!disabled && <Ripple color={rippleColor} />}
    </div>
  );
};

/**
 * 菜单分割线组件
 */
export const MenuDivider: React.FC = () => {
  return <div className="my-1 border-t border-material-onSurface/12 dark:border-material-darkOnSurface/12" />;
};

export default Menu;
