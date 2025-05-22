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
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let newIndex = index;
    if (event.key === 'ArrowRight') {
      newIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      newIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      newIndex = 0;
    } else if (event.key === 'End') {
      newIndex = tabs.length - 1;
    } else {
      return; // Not an arrow, home, or end key
    }

    event.preventDefault();
    const newTabId = tabs[newIndex]?.id;
    if (newTabId) {
      onChange(newTabId);
      // Set focus after state update (onChange might cause re-render)
      setTimeout(() => tabRefs.current[newIndex]?.focus(), 0);
    }
  };
  
  return (
    <div className={`border-b border-material-onSurface/12 dark:border-material-darkOnSurface/12 ${className}`}>
      <nav 
        className={`flex ${fullWidth ? 'w-full' : ''} overflow-x-auto whitespace-nowrap`}
        role="tablist"
        aria-orientation="horizontal"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const tabButtonId = `tab-${tab.id}`;
          const tabPanelId = `panel-${tab.id}`;
          
          return (
            <button
              key={tab.id}
              id={tabButtonId}
              ref={el => tabRefs.current[index] = el}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              role="tab"
              aria-selected={isActive}
              aria-controls={tabPanelId}
              tabIndex={isActive ? 0 : -1}
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
              // aria-current removed as aria-selected is more appropriate for role="tab"
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
  // tabId is passed from Tabs component for aria-labelledby
  // This prop is not part of the public API but used internally via cloneElement
  ['aria-labelledby']: tabButtonId, 
}) => {
  return (
    <div 
      id={`panel-${id}`} // This should match what aria-controls points to
      role="tabpanel" 
      className={`tab-panel ${className}`}
      aria-labelledby={tabButtonId}
      hidden={!className.includes('animate-fadeIn') && !className.includes('animate-slideIn') && !className.includes('none')} // Hide if not active (logic depends on how TabPanels handles visibility)
      // If TabPanels doesn't unmount inactive panels, this 'hidden' attribute is crucial.
      // Also, if active, it might need tabindex="0" if its content is not inherently focusable but should be a tab stop.
    >
      {children}
    </div>
  );
};