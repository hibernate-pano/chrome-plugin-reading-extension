import React, { useState } from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
  label?: string;
  showValue?: boolean; // For the label next to the main label, not the tooltip
  valueFormat?: (value: number) => string;
  // `variant` prop removed, defaults to material.primary
  // `size` prop kept for now, but effects will be standardized
  size?: 'sm' | 'md' | 'lg'; 
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  className = '',
  label,
  showValue = true,
  valueFormat,
  size = 'md', // Default size, though MD spec is fairly standard
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hover, setHover] = useState(false);
  
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = valueFormat ? valueFormat(value) : value.toString();

  // Standard Material Design sizes
  const mdTrackHeight = 'h-0.5'; // 2px
  const mdThumbSizeDefault = 'w-3 h-3'; // 12px
  const mdThumbSizeInteracting = 'w-5 h-5'; // 20px
  const mdTickSize = 'w-1 h-1'; // 4px, but track is 2px. Tick should be on the track. Let's make it a 2x2 dot on the 2px track.
                                 // Or a 1x1 div that looks like a 2px dot due to border or bg.
                                 // Material spec says 2dp diameter for tick mark dot when track is 2dp. So w-0.5 h-0.5 for a 2px dot.

  // Adjusting based on `size` prop - for now, mostly affects label text size if needed.
  // The core slider elements will try to stick to MD standard.
  // const valueLabelTypography = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'; // Old logic
  const componentLabelTypography = 'text-md-body2'; // Standard for component labels
  const valueLabelTypography = 'text-md-caption'; // For the tooltip and potentially the side label
  const minMaxLabelTypography = 'text-md-caption';


  // Thumb positioning needs to account for its size to be centered on the percentage
  const thumbOffsetDragging = '-0.625rem'; // 10px for 20px thumb
  const thumbOffsetDefault = '-0.375rem'; // 6px for 12px thumb
  const currentThumbOffset = isDragging || hover ? thumbOffsetDragging : thumbOffsetDefault; // Use larger offset if thumb is larger on hover too
  const currentThumbSize = isDragging || hover ? mdThumbSizeInteracting : mdThumbSizeDefault;

  return (
    <div className={`space-y-2 ${className}`}
         onMouseEnter={() => setHover(true)}
         onMouseLeave={() => { setHover(false); setIsDragging(false); /* Stop dragging if mouse leaves */ }}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <label className={`${componentLabelTypography} text-material-onSurface dark:text-material-darkOnSurface`}>
              {label}
            </label>
          )}
          {showValue && ( // This is the label next to the component label, not the tooltip
            <span className={`${valueLabelTypography} text-material-onSurface/75 dark:text-material-darkOnSurface/75 px-2 py-0.5 rounded-sm`}>
              {displayValue}
            </span>
          )}
        </div>
      )}
      
      <div 
        className="relative py-3 group cursor-pointer" // Increased py for easier thumb interaction
        onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
        onTouchStart={(e) => { e.preventDefault(); setIsDragging(true); }}
        onMouseUp={() => setIsDragging(false)}
        // onMouseLeave handled by parent div
        onTouchEnd={() => setIsDragging(false)}
        // TODO: Add click/drag handling to update value based on position
      >
        {/* Track background (inactive part) */}
        <div className={`absolute w-full ${mdTrackHeight} bg-material-primary/30 dark:bg-material-primary/30 rounded-full top-1/2 -translate-y-1/2`}>
          {/* Filled part of the track (active) */}
          <div 
            className={`absolute h-full bg-material-primary dark:bg-material-primary rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Tick Marks for discrete sliders */}
        {step && (max - min) / step <= 20 && ( // Show ticks if step is defined and not too many
          <div className="absolute w-full flex justify-between top-1/2 -translate-y-1/2 px-0"> 
            {Array.from({ length: Math.floor((max - min) / step) + 1 }).map((_, index) => {
              const tickValue = min + (index * step);
              const tickPosition = ((tickValue - min) / (max - min)) * 100;
              // Only show ticks within the bounds
              if (tickPosition < 0 || tickPosition > 100) return null;
              return (
                <div 
                  key={index}
                  className={`absolute w-1 h-1 rounded-full transform -translate-x-1/2 
                             ${tickValue <= value ? 'bg-material-primary' : 'bg-material-onSurface/30 dark:bg-material-darkOnSurface/30'}`}
                  style={{ left: `${tickPosition}%` }} // translate-x-1/2 will center it on the position
                />
              );
            })}
          </div>
        )}
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute w-full h-full bg-transparent appearance-none cursor-pointer z-10 opacity-0 m-0 p-0 top-0 left-0"
          style={{ WebkitAppearance: 'none' }}
        />
        
        {/* Value Label Tooltip - shown on hover or drag */}
        {(hover || isDragging) && (
          <div 
            className={`absolute bottom-full left-0 mb-2 px-1.5 py-0.5 rounded-sm 
                        bg-material-onSurface dark:bg-material-darkOnSurface 
                        ${valueLabelTypography} text-material-surface dark:text-material-darkSurface 
                        shadow-md transform -translate-x-1/2 transition-opacity duration-100 z-20
                        ${isDragging || hover ? 'opacity-100' : 'opacity-0'}`}
            style={{ left: `${percentage}%` }}
          >
            {displayValue}
            {/* Optional: Inverted teardrop shape using borders - more complex, rounded rect is fine */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent border-t-[4px] border-t-material-onSurface dark:border-t-material-darkOnSurface"></div>

          </div>
        )}
        
        {/* Custom Thumb */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 rounded-full 
                      bg-material-primary dark:bg-material-primary 
                      shadow-md-dp2 transition-all duration-150 ease-in-out
                      ${currentThumbSize}`}
          style={{ left: `calc(${percentage}% + ${currentThumbOffset})` }}
        >
          {/* Optional: Inner pulse or different visual for dragging state if needed */}
        </div>
      </div>
      
      <div className="relative flex justify-between px-1 mt-0.5">
        <span className={`${minMaxLabelTypography} text-material-onSurface/75 dark:text-material-darkOnSurface/75`}>{min}</span>
        <span className={`${minMaxLabelTypography} text-material-onSurface/75 dark:text-material-darkOnSurface/75`}>{max}</span>
      </div>
    </div>
  );
};