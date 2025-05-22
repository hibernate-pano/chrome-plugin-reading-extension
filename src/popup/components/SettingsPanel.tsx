import React from 'react';
import { Drawer } from '../../ui/components/Drawer';
import { Button } from '../../ui/components/Button';
import { Slider } from '../../ui/components/Slider';
import { Switch } from '../../ui/components/Switch';
import useAppStore from '../../store'; // Assuming this path is correct
import {
  Theme,
  FontFamily,
  DEFAULT_THEME,
  AVAILABLE_THEMES,
  DEFAULT_FONT_FAMILY,
  AVAILABLE_FONT_FAMILIES,
  DEFAULT_FONT_SIZE, MIN_FONT_SIZE, MAX_FONT_SIZE, FONT_SIZE_STEP,
  DEFAULT_LINE_HEIGHT, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT, LINE_HEIGHT_STEP,
  DEFAULT_PAGE_WIDTH, MIN_PAGE_WIDTH, MAX_PAGE_WIDTH, PAGE_WIDTH_STEP,
  DEFAULT_SHOW_IMAGES,
  // Assuming paragraphSpacing and lineSpacing are covered or part of a reset
  // DEFAULT_PARAGRAPH_SPACING, MIN_PARAGRAPH_SPACING, MAX_PARAGRAPH_SPACING, PARAGRAPH_SPACING_STEP,
  // DEFAULT_LINE_SPACING, MIN_LINE_SPACING, MAX_LINE_SPACING, LINE_SPACING_STEP
} from '../../constants/options';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsGroupTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-md-subtitle1 text-material-onSurface/85 dark:text-material-darkOnSurface/85 mt-6 mb-3 px-1">
    {children}
  </h3>
);

const SettingItem: React.FC<{ label: string; description?: string; children: React.ReactNode; htmlFor?: string }> = ({ label, description, children, htmlFor }) => (
  <div className="py-3 px-1">
    <div className="flex justify-between items-center">
      <label htmlFor={htmlFor} className="text-md-body1 text-material-onSurface dark:text-material-darkOnSurface flex-grow">
        {label}
      </label>
      <div className="flex-shrink-0 ml-4">
        {children}
      </div>
    </div>
    {description && (
      <p className="text-md-caption text-material-onSurface/60 dark:text-material-darkOnSurface/60 mt-1">
        {description}
      </p>
    )}
  </div>
);


export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    theme, setAppTheme,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    lineHeight, setLineHeight,
    // paragraphSpacing, setParagraphSpacing, // Kept if needed, not in main list
    // lineSpacing, setLineSpacing, // Kept if needed
    pageWidth, setPageWidth,
    showImages, setShowImages,
    resetSettings, // Assuming a general reset function from store
  } = useAppStore();

  const handleThemeChange = async (selectedTheme: Theme) => {
    await setAppTheme(selectedTheme);
  };

  const handleFontFamilyChange = async (selectedFont: FontFamily) => {
    // Placeholder for Select component
    console.log("Font family change to:", selectedFont);
    await setFontFamily(selectedFont);
  };
  
  const handleResetDefaults = async () => {
    await resetSettings(); // Call the zustand store action
  };


  const settingsFooter = (
    <div className="flex justify-between items-center">
      <Button variant="text" color="primary" onClick={handleResetDefaults}>
        Reset to Default
      </Button>
      <div className="space-x-2">
        <Button variant="outlined" onClick={() => console.log('Load Preset clicked')}>Load Preset</Button>
        <Button variant="outlined" onClick={() => console.log('Save Preset clicked')}>Save Preset</Button>
      </div>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Settings" footer={settingsFooter} width="380px">
      <div className="divide-y divide-material-onSurface/12 dark:divide-material-darkOnSurface/12">
        {/* Theme Settings */}
        <section>
          <SettingsGroupTitle>Theme</SettingsGroupTitle>
          <div className="grid grid-cols-3 gap-2 py-2 px-1">
            {AVAILABLE_THEMES.map((themeOption) => (
              <Button
                key={themeOption}
                variant={theme === themeOption ? "contained" : "outlined"}
                onClick={() => handleThemeChange(themeOption)}
                className="w-full capitalize"
                size="sm"
              >
                {themeOption}
              </Button>
            ))}
          </div>
        </section>

        {/* Typography Settings */}
        <section>
          <SettingsGroupTitle>Typography</SettingsGroupTitle>
          <SettingItem label="Font Family">
            {/* Placeholder for Select component */}
            <div className="text-md-body2 text-material-onSurface/75 dark:text-material-darkOnSurface/75">
              {fontFamily} (Select Placeholder)
              <div className="flex gap-1 mt-1">
                {AVAILABLE_FONT_FAMILIES.map(fam => (
                  <button key={fam} onClick={() => handleFontFamilyChange(fam)} className={`text-xs p-1 border rounded ${fontFamily === fam ? 'bg-material-primary/20' : ''}`}>{fam.substring(0,1)}</button>
                ))}
              </div>
            </div>
          </SettingItem>
          <SettingItem label="Font Size" description={`Current: ${fontSize.toFixed(1)}px`}>
            <Slider
              value={fontSize}
              onChange={async (val) => await setFontSize(val)}
              min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step={FONT_SIZE_STEP}
              className="w-32" // Smaller width for slider in settings
            />
          </SettingItem>
          <SettingItem label="Line Height" description={`Current: ${lineHeight.toFixed(1)}`}>
            <Slider
              value={lineHeight}
              onChange={async (val) => await setLineHeight(val)}
              min={MIN_LINE_HEIGHT} max={MAX_LINE_HEIGHT} step={LINE_HEIGHT_STEP}
              className="w-32"
            />
          </SettingItem>
          <SettingItem label="Page Width" description={`Current: ${pageWidth}px`}>
             <Slider
              value={pageWidth}
              onChange={async (val) => await setPageWidth(val)}
              min={MIN_PAGE_WIDTH} max={MAX_PAGE_WIDTH} step={PAGE_WIDTH_STEP}
              className="w-32"
            />
          </SettingItem>
          {/* TODO: Add Paragraph Spacing and Letter Spacing if needed */}
        </section>

        {/* Content Settings */}
        <section>
          <SettingsGroupTitle>Content</SettingsGroupTitle>
          <SettingItem label="Show Images">
            <Switch
              checked={showImages}
              onChange={async (val) => await setShowImages(val)}
            />
          </SettingItem>
        </section>
      </div>
    </Drawer>
  );
};