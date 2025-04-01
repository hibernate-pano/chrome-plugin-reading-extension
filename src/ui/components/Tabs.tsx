import React, { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pill' | 'underline' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  // 确定悬停状态
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  
  // 根据变体确定样式
  const getVariantClasses = () => {
    switch (variant) {
      case 'pill':
        return {
          container: 'bg-gray-100/80 p-1 rounded-xl backdrop-blur-sm dark:bg-gray-800/50',
          tab: (isActive: boolean, id: string) => `
            rounded-lg transition-all duration-200
            ${isActive 
              ? 'bg-white text-brand-700 shadow-sm dark:bg-gray-700 dark:text-brand-400'
              : 'text-gray-600 hover:text-brand-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-brand-400 dark:hover:bg-gray-800/80'
            }
          `,
        };
      case 'underline':
        return {
          container: 'border-b border-gray-200 dark:border-gray-700',
          tab: (isActive: boolean, id: string) => `
            border-b-2 transition-all duration-200
            ${isActive 
              ? 'border-brand-500 text-brand-700 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-gray-600 hover:text-brand-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-brand-400 dark:hover:border-gray-600'
            }
          `,
        };
      case 'minimal':
        return {
          container: '',
          tab: (isActive: boolean, id: string) => `
            transition-all duration-200
            ${isActive 
              ? 'text-brand-700 font-medium dark:text-brand-400'
              : 'text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400'
            }
          `,
        };
      default:
        return {
          container: '',
          tab: () => '',
        };
    }
  };
  
  // 根据尺寸确定样式
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs py-1.5 px-2.5';
      case 'lg':
        return 'text-base py-2.5 px-4';
      case 'md':
      default:
        return 'text-sm py-2 px-3';
    }
  };
  
  const variantClasses = getVariantClasses();
  const sizeClasses = getSizeClasses();
  
  return (
    <div className={`${variantClasses.container} ${className}`}>
      <nav className={`flex ${fullWidth ? 'w-full' : ''} ${variant === 'minimal' ? 'gap-4' : 'gap-1'}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const isHovered = tab.id === hoveredTab;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className={`
                ${fullWidth ? 'flex-1' : ''}
                ${sizeClasses}
                ${variantClasses.tab(isActive, tab.id)}
                font-medium leading-none flex items-center justify-center transition-all
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-400
                ${isActive ? 'z-10' : ''}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon && (
                <span className={`${tab.label ? 'mr-1.5' : ''} ${
                  isActive || isHovered ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'
                } transition-colors duration-200`}>
                  {tab.icon}
                </span>
              )}
              <span className="transition-all duration-200">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

interface TabPanelsProps {
  activeTab: string;
  children: React.ReactNode;
  className?: string;
  transition?: 'fade' | 'slide' | 'none';
}

export const TabPanels: React.FC<TabPanelsProps> = ({
  activeTab,
  children,
  className = '',
  transition = 'fade',
}) => {
  // 转换为数组以便操作
  const childrenArray = React.Children.toArray(children);
  
  const transitionClasses = {
    fade: 'animate-fadeIn',
    slide: 'animate-slideIn',
    none: '',
  };
  
  return (
    <div className={`tab-panels mt-4 ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.props.id === activeTab) {
          return React.cloneElement(child, {
            ...child.props,
            className: `${child.props.className || ''} ${transitionClasses[transition]}`,
          });
        }
        return null;
      })}
    </div>
  );
};

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  id,
  children,
  className = '',
}) => {
  return (
    <div id={`panel-${id}`} role="tabpanel" className={`tab-panel ${className}`}>
      {children}
    </div>
  );
}; 