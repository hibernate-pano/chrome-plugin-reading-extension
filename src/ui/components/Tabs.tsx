import React from 'react'; // Removed useState for hoveredTab as it's not used in MD style
import Ripple from './Ripple'; // Assuming Ripple.tsx is in the same directory

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  // variant and size props removed
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  fullWidth = false,
  className = '',
}) => {
  const rippleColor = 'rgba(62, 103, 138, 0.1)'; // Approx of material.primary #3e678a with 10% opacity

  return (
    <div className={`border-b border-material-onSurface/12 dark:border-material-darkOnSurface/12 ${className}`}>
      <nav className={`flex ${fullWidth ? 'w-full' : ''} overflow-x-auto whitespace-nowrap`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative overflow-hidden /* For Ripple */
                ${fullWidth ? 'flex-1' : ''}
                min-h-[3rem] px-4 /* 48dp height, 16dp padding */
                flex items-center justify-center
                text-md-button uppercase 
                border-b-2 transition-colors duration-200
                focus:outline-none focus:bg-material-onSurface/10 dark:focus:bg-material-darkOnSurface/10
                ${isActive 
                  ? 'text-material-primary dark:text-material-primary border-material-primary dark:border-material-primary'
                  : 'text-material-onSurface/60 dark:text-material-darkOnSurface/60 hover:text-material-onSurface dark:hover:text-material-darkOnSurface border-transparent'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon && (
                <span className={`${tab.label ? 'mr-1.5' : ''} text-current /* Icon inherits text color */`}>
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              <Ripple color={rippleColor} />
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