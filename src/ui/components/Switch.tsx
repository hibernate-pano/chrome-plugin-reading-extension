import React from 'react';

interface SwitchProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const Switch: React.FC<SwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  className = '',
  // size prop removed
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  // Material Design standard dimensions
  const trackWidth = 'w-9'; // 36px
  const trackHeight = 'h-3.5'; // 14px
  const thumbSize = 'after:w-5 after:h-5'; // 20px

  // Thumb positioning: Track height 14px, Thumb height 20px. Thumb needs to be offset by -3px top.
  // Track width 36px, Thumb width 20px.
  // Unchecked: left is -1px (to appear slightly inset within the 14px height visual track, considering border)
  // Checked: translate by 36px (track) - 20px (thumb) - 2px (start offset) = 14px. -> translate-x-3.5
  // Let's simplify: track is a box. Thumb slides within it.
  // Track padding for thumb: p-[1px] or p-[2px] effectively.
  // If track is 36px wide, and thumb 20px. Travel distance is 36-20 = 16px.
  // Start position of thumb: left-[-1px] relative to track edge to seem slightly inset.
  // End position: translate-x-4 (16px).
  const thumbUncheckedPosition = 'after:left-[-2px] after:top-[-3px]'; // Approx. for visual centering and slight inset
  const thumbCheckedTranslate = 'peer-checked:after:translate-x-[18px]'; // 36px (track) - 20px (thumb) = 16px travel. 18px is 36/2 - 20/2 + some.
                                                                      // More precise: (36px - 2px_track_padding_total) - (20px_thumb) = 14px travel.
                                                                      // So translate-x-3.5 (14px). Original was left-0.5, translate-x-5 from w-11 to w-5. (44-20)/2 = 12.  (44-20) - 2 = 22px = 5.5.
                                                                      // Track W36, H14. Thumb W20, H20.
                                                                      // Unchecked: thumb left edge at 0px of track visual.
                                                                      // Checked: thumb left edge at 36-20 = 16px of track visual.
                                                                      // So, translate-x-4 is correct.
                                                                      // Thumb initial pos: after:left-[-2px]
                                                                      // Thumb checked pos: peer-checked:after:translate-x-4
  // Let's use flex to center the thumb in the track for vertical alignment which is simpler.
  // Track will be `flex items-center`. Thumb `after:` will be positioned relative to this.
  // Track height 14px. Thumb height 20px. Thumb will overflow vertically by 3px top and bottom.
  // Track width 36px. Thumb width 20px.
  // Unchecked: thumb left edge at -2px from track start (for slight visual inset and to make it feel like it's part of the track).
  // Checked: thumb left edge at 36 - 20 + 2 = 18px.  So translate-x by 18 - (-2) = 20px.  translate-x-5.

  const thumbCheckedTranslation = 'peer-checked:after:translate-x-[19px]'; // (36px track - 20px thumb) / 2 for each side padding = 8px. So 16px travel.
                                                                      // Start left-[-1px] for 1px padding. End needs to be 16px over. So translate-x-4.
                                                                      // If start is after:left-0 (relative to padded track). Track has padding.
                                                                      // Track visual width 32px (36px - 2px padding each side). Thumb 20px. Travel 12px. translate-x-3.

  // Let's use the common approach: track has no padding. Thumb is placed.
  // Track: w-9 (36px), h-3.5 (14px). Thumb: w-5 (20px), h-5 (20px).
  // Unchecked thumb: left: -2px (to align edge of 20px thumb with effective edge of 14px track, making it visually stick out a bit)
  // Checked thumb: translate-x of (36px - 20px - (-2px) + (-2px)) = 16px. So translate-x-4.
  // Thumb vertical: top: -3px ( (20px-14px)/2 )

  return (
    <label className={`inline-flex items-center cursor-pointer group ${className}`}>
      <div className="relative"> {/* Container for input and visual switch */}
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={handleChange}
          // Add focus visible styling for accessibility
          // Note: For `after:` elements, focus rings are tricky. This applies to the hidden input.
          // A visible focus state on the track or a custom ring around the thumb is better.
          // For now, applying to peer:
          // peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-material-primary/50
          // This will outline the track effectively.
        />
        <div
          className={`
            relative ${trackWidth} ${trackHeight} rounded-full transition-colors duration-200 ease-in-out
            flex items-center  /* For vertical centering of the thumb */
            peer-checked:bg-material-primary/50 dark:peer-checked:bg-material-primary/50 
            bg-material-onSurface/30 dark:bg-material-darkOnSurface/30
            
            after:content-[''] after:absolute 
            ${thumbSize} after:rounded-full 
            after:shadow-md-dp1 /* Using existing shadow-md as dp1 */
            
            after:transition-all after:duration-200 after:ease-in-out
            
            /* Unchecked State */
            after:left-[-2px] /* Thumb slightly offset to left for visual balance */
            after:top-[-3px] /* Thumb offset for vertical centering (20px thumb on 14px track) */
            after:bg-gray-50 dark:after:bg-gray-400
            after:border after:border-gray-300 dark:after:border-transparent

            /* Checked State */
            peer-checked:after:translate-x-4 /* 16px translation */
            peer-checked:after:bg-material-primary dark:peer-checked:after:bg-material-primary
            peer-checked:after:border-transparent /* Remove border when checked */

            group-hover:after:shadow-md-dp2 /* Optional: slightly larger shadow on hover */
            peer-focus-visible:ring-2 peer-focus-visible:ring-material-primary/30 peer-focus-visible:ring-offset-1
          `}
        />
        {/* Removed "开/关" text span */}
      </div>
      {(label || description) && (
        <div className="ml-3">
          {label && (
            <span className={`text-md-body1 text-material-onSurface dark:text-material-darkOnSurface ${description ? 'block' : ''}`}>
              {label}
            </span>
          )}
          {description && (
            <p className="text-md-caption text-material-onSurface/75 dark:text-material-darkOnSurface/75 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  );
};

export default Switch;