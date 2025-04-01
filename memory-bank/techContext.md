# Technical Context: AI Reading Extension

## Technology Stack

### Core Technologies

- **React 18**: UI component library
- **TypeScript**: Typed JavaScript
- **Vite**: Build and development tool
- **Zustand**: State management
- **Tailwind CSS**: Utility-first CSS framework
- **Headless UI**: Unstyled, accessible UI components

### Extension-Specific Technologies

- **Chrome Extension API**: Browser integration
- **Content Scripts**: Page manipulation
- **Background Scripts**: Event handling and coordination
- **Storage API**: User preferences persistence

### Supporting Libraries

- **Pangu.js**: Chinese-English text spacing
- **Mozilla Readability**: Content extraction and formatting
- **Prism.js**: Code syntax highlighting

## Development Environment

### Requirements

- Node.js >= 16
- pnpm package manager

### Development Commands

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
```

### Project Structure

```
src/
├── background/       # Chrome extension background scripts
├── content/         # Page content scripts
│   ├── content.tsx
│   └── content.css
├── popup/          # Extension popup UI
│   ├── components/
│   └── Popup.tsx
├── options/        # Extension configuration page
├── storage/        # Data storage utilities
└── store.ts        # Global state management

public/            # Static assets
├── manifest.json   # Chrome extension manifest
└── icons/         # Extension icons

docs/             # Project documentation
```

## Technical Constraints

### Browser Compatibility

- Chrome >= 88
- Edge >= 88 (Chromium-based)
- Other Chromium-based browsers with similar version requirements

### Performance Considerations

- Minimal impact on page load times
- Efficient DOM manipulation
- Optimized state updates
- Responsive UI interactions

### Security Constraints

- Content script isolation
- Permission limitations
- Cross-origin restrictions
- Safe DOM manipulation

## Build and Deployment

### Build Configuration

- Multi-target build process
- Separate bundles for different extension components
- Optimized asset handling
- Manifest generation

### Extension Packaging

- ZIP archive creation
- Chrome Web Store requirements
- Version management
- Update mechanism

## Dependencies and Integrations

### External Dependencies

- Chrome Extension API
- Web platform features
- DOM manipulation APIs

### Third-Party Services

- None currently integrated

## Testing Strategy

### Manual Testing

- Cross-browser compatibility verification
- Visual regression testing
- User experience testing

### Automated Testing

- Unit tests for utility functions
- Component testing
- State management validation
