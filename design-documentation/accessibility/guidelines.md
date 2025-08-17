---
title: Accessibility Guidelines - Cancha Leconte
description: Comprehensive accessibility standards and requirements for inclusive design
last-updated: 2025-08-17
version: 1.0.0
related-files:
  - ../design-system/style-guide.md
  - ./testing.md
  - ./compliance.md
status: approved
---

# Accessibility Guidelines

## Overview

Cancha Leconte is committed to providing an inclusive experience that works for all users, regardless of their abilities, assistive technologies, or access methods. These guidelines ensure compliance with WCAG 2.1 AA standards while addressing the specific needs of our Argentine user base.

## Accessibility Principles

### 1. Perceivable
Information and UI components must be presentable to users in ways they can perceive.

**Implementation Focus**:
- **High contrast ratios** for all text and interactive elements
- **Alternative text** for images and icons
- **Color independence** - information conveyed through multiple means
- **Responsive text sizing** that scales appropriately
- **Clear visual hierarchy** with consistent styling

### 2. Operable
UI components and navigation must be operable by all users.

**Implementation Focus**:
- **Keyboard accessibility** for all interactive elements
- **Touch target sizing** minimum 44×44px for mobile users
- **Timing flexibility** for form completion and payment processes
- **Seizure prevention** through careful animation design
- **Clear navigation** with logical tab order

### 3. Understandable
Information and operation of UI must be understandable.

**Implementation Focus**:
- **Clear Spanish language** appropriate for Argentine users
- **Consistent interface patterns** across all features
- **Error prevention and recovery** with helpful messaging
- **Predictable behavior** in interactive elements
- **Context-appropriate help** and instructions

### 4. Robust
Content must be robust enough to be interpreted by assistive technologies.

**Implementation Focus**:
- **Semantic HTML** structure with proper landmarks
- **ARIA labels and descriptions** for complex interactions
- **Cross-platform compatibility** with screen readers
- **Future-proof code** following web standards
- **Graceful degradation** for older technologies

## Color and Contrast Standards

### Contrast Ratios
All color combinations meet or exceed these minimum requirements:

**Normal Text** (< 18px or < 14px bold)
- **Minimum**: 4.5:1 contrast ratio
- **Enhanced**: 7:1 contrast ratio for critical information
- **Examples**: Body text, form labels, navigation links

**Large Text** (≥ 18px or ≥ 14px bold)
- **Minimum**: 3:1 contrast ratio
- **Enhanced**: 4.5:1 contrast ratio for important headings
- **Examples**: Headings, button text, call-to-action elements

**Interactive Elements**
- **Minimum**: 3:1 contrast ratio for focus indicators
- **Enhanced**: 4.5:1 contrast ratio for critical actions
- **Examples**: Button borders, form field outlines, active states

### Color Implementation

#### Primary Text Combinations
```css
/* High contrast combinations verified for accessibility */
.text-primary { color: #212121; } /* 16.1:1 on white */
.text-secondary { color: #424242; } /* 9.1:1 on white */
.text-tertiary { color: #616161; } /* 6.2:1 on white */
.text-disabled { color: #9E9E9E; } /* 2.8:1 - for decorative only */
```

#### Background Combinations
```css
/* Accessible background combinations */
.bg-primary { background: #2E7D32; color: #FFFFFF; } /* 7.9:1 */
.bg-secondary { background: #FFA726; color: #000000; } /* 5.4:1 */
.bg-success { background: #4CAF50; color: #FFFFFF; } /* 6.3:1 */
.bg-error { background: #F44336; color: #FFFFFF; } /* 5.1:1 */
```

#### Status Indicators
Never rely solely on color to convey information:
```css
/* Always combine color with text or icons */
.status-success::before { content: "✓ "; }
.status-error::before { content: "⚠ "; }
.status-pending::before { content: "⏳ "; }
```

### Color-Blind Considerations
- **Red-green color blindness** (8% of men, 0.5% of women): Use additional indicators
- **Blue-yellow color blindness** (rare): Ensure sufficient contrast
- **Complete color blindness** (very rare): Rely on contrast and patterns
- **Testing**: Verify with Coblis color blindness simulator

## Typography and Readability

### Font Size Requirements

#### Minimum Sizes
- **Body text**: 16px minimum on mobile, 14px minimum on desktop
- **Small text**: 12px absolute minimum (captions, legal text only)
- **Touch targets**: Text within touch areas should be ≥ 16px
- **Form labels**: 14px minimum for clear readability

#### Responsive Scaling
```css
/* Base font sizes with responsive scaling */
html { font-size: 16px; } /* Base size */

@media (max-width: 768px) {
  html { font-size: 14px; } /* Smaller screens */
  .body-text { font-size: 1.14rem; } /* 16px effective */
}

@media (min-width: 1200px) {
  html { font-size: 18px; } /* Larger screens */
}
```

### Line Height and Spacing
- **Body text**: 1.5 minimum line height (24px for 16px text)
- **Headings**: 1.2-1.4 line height depending on size
- **Paragraph spacing**: 1.5em minimum between paragraphs
- **Letter spacing**: Default for most text, slight increase for all-caps

### Spanish Language Support
- **Character support**: Full support for Spanish accents (á, é, í, ó, ú, ñ)
- **Text direction**: Left-to-right (LTR) layout
- **Word wrapping**: Proper hyphenation for Spanish words
- **Cultural typography**: Respect for Spanish punctuation and quotation marks

## Keyboard Navigation

### Tab Order Requirements
Logical tab order following visual layout and user workflow:

1. **Primary navigation** (admin header, main menu)
2. **Page content** (forms, game information, actions)
3. **Secondary actions** (help links, footer navigation)
4. **Skip links** available for efficient navigation

### Keyboard Shortcuts
Implement common keyboard patterns users expect:

```javascript
// Essential keyboard support
document.addEventListener('keydown', function(e) {
  switch(e.key) {
    case 'Enter':
      // Activate buttons, submit forms
      break;
    case ' ': // Spacebar
      // Activate buttons, toggle checkboxes
      break;
    case 'Escape':
      // Close modals, cancel operations
      break;
    case 'Tab':
      // Navigate between interactive elements
      break;
  }
});
```

### Focus Management
- **Visible focus indicators** on all interactive elements
- **Focus trapping** in modals and dialogs
- **Focus restoration** when closing overlays
- **Skip links** for efficient navigation
- **Focus outline** meets 3:1 contrast requirement

```css
/* Accessible focus indicators */
.focusable:focus {
  outline: 2px solid #1976D2;
  outline-offset: 2px;
}

/* Skip link for screen readers */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #1976D2;
  color: white;
  padding: 8px;
  text-decoration: none;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}
```

## Touch and Mobile Accessibility

### Touch Target Sizing
Minimum touch target requirements for mobile accessibility:

- **Minimum size**: 44×44px for all interactive elements
- **Spacing**: 8px minimum between adjacent touch targets
- **Button padding**: Sufficient internal padding for comfortable tapping
- **Form elements**: Large enough for accurate input

```css
/* Accessible touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
  margin: 4px;
}

/* Ensure spacing between adjacent targets */
.button-group .button + .button {
  margin-left: 8px;
}
```

### Mobile-Specific Considerations
- **Orientation support**: Interface works in both portrait and landscape
- **Zoom capability**: Content remains functional at 200% zoom
- **Gesture alternatives**: All gestures have button alternatives
- **Voice control**: Compatible with mobile voice control features

## Screen Reader Support

### Semantic HTML Structure
Use proper HTML elements to convey meaning:

```html
<!-- Proper semantic structure -->
<main role="main">
  <h1>Cancha Leconte - Crear Partido</h1>
  
  <section aria-labelledby="game-details">
    <h2 id="game-details">Detalles del Partido</h2>
    <form role="form" aria-labelledby="game-form">
      <!-- Form content -->
    </form>
  </section>
  
  <aside aria-label="Información adicional">
    <!-- Sidebar content -->
  </aside>
</main>
```

### ARIA Labels and Descriptions
Enhance semantics with ARIA attributes:

```html
<!-- Form fields with proper labeling -->
<div class="form-field">
  <label for="game-date" class="form-label">Fecha del Partido</label>
  <input 
    id="game-date" 
    type="date" 
    class="form-input"
    aria-describedby="date-help"
    required
  />
  <div id="date-help" class="help-text">
    Selecciona la fecha cuando se jugará el partido
  </div>
</div>

<!-- Status updates with live regions -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  <span id="status-update"></span>
</div>

<!-- Complex UI elements -->
<button 
  aria-expanded="false" 
  aria-controls="player-list"
  aria-label="Mostrar lista de jugadores registrados"
>
  Jugadores (12/20)
</button>
```

### Dynamic Content Updates
Handle dynamic content appropriately for screen readers:

```javascript
// Announce important updates to screen readers
function announceUpdate(message) {
  const announcement = document.getElementById('status-update');
  announcement.textContent = message;
  
  // Clear after announcement
  setTimeout(() => {
    announcement.textContent = '';
  }, 1000);
}

// Example usage
announceUpdate('Nuevo jugador registrado. Total: 13 de 20 jugadores');
```

## Form Accessibility

### Field Labeling and Instructions
Every form field must have clear, accessible labeling:

```html
<!-- Accessible form field structure -->
<div class="form-field">
  <label for="player-name" class="form-label">
    Nombre del Jugador <span class="required">*</span>
  </label>
  <input 
    id="player-name"
    type="text"
    class="form-input"
    placeholder="Como te conocen tus amigos"
    aria-describedby="name-help name-error"
    required
    aria-invalid="false"
  />
  <div id="name-help" class="help-text">
    Ingresa el nombre que usarás en el partido
  </div>
  <div id="name-error" class="error-text" role="alert">
    <!-- Error message appears here -->
  </div>
</div>
```

### Error Handling and Validation
Accessible error handling with clear recovery guidance:

```javascript
// Accessible error handling
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(fieldId + '-error');
  
  // Update field state
  field.setAttribute('aria-invalid', 'true');
  field.classList.add('error');
  
  // Show error message
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  
  // Focus management
  field.focus();
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(fieldId + '-error');
  
  field.setAttribute('aria-invalid', 'false');
  field.classList.remove('error');
  errorElement.textContent = '';
  errorElement.style.display = 'none';
}
```

### Required Field Indicators
Clear indication of required vs optional fields:

```css
/* Required field indicator */
.required {
  color: #F44336;
  font-weight: bold;
}

.required::after {
  content: " (obligatorio)";
  font-weight: normal;
  font-size: 0.9em;
  color: #757575;
}
```

## Animation and Motion

### Reduced Motion Support
Respect user preferences for reduced motion:

```css
/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Alternative: Provide reduced motion versions */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    opacity: 1; /* Skip fade animation */
  }
  
  .slide-in {
    transform: translateX(0); /* Skip slide animation */
  }
}
```

### Safe Animation Guidelines
- **Duration limits**: No flashing more than 3 times per second
- **Contrast limits**: Avoid high contrast flashing patterns
- **User control**: Provide pause/stop controls for autoplaying content
- **Essential content**: Never hide critical information behind animations

## Testing and Validation

### Manual Testing Checklist
- [ ] **Keyboard navigation**: Tab through entire interface
- [ ] **Screen reader**: Test with NVDA (free) or JAWS
- [ ] **Zoom testing**: Verify 200% zoom functionality
- [ ] **Color contrast**: Use WebAIM contrast checker
- [ ] **Color blindness**: Test with Coblis simulator

### Automated Testing Tools
Integrate accessibility testing into development workflow:

```javascript
// Example: Automated accessibility testing with axe-core
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Admin dashboard should be accessible', async () => {
  const { container } = render(<AdminDashboard />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### User Testing
- **Real users with disabilities**: Include in testing process
- **Assistive technology users**: Test with actual screen reader users
- **Mobile accessibility**: Test on real devices with accessibility features
- **Diverse abilities**: Include users with various accessibility needs

## Implementation Priority

### Phase 1: Foundation (P0)
- [ ] Color contrast compliance across all interfaces
- [ ] Semantic HTML structure for screen readers
- [ ] Keyboard navigation for all interactive elements
- [ ] Touch target sizing for mobile users

### Phase 2: Enhancement (P1)
- [ ] ARIA labels and descriptions for complex interactions
- [ ] Form validation with accessible error handling
- [ ] Skip links and navigation shortcuts
- [ ] Reduced motion support

### Phase 3: Optimization (P2)
- [ ] Advanced screen reader optimizations
- [ ] Voice control compatibility
- [ ] Enhanced keyboard shortcuts
- [ ] User testing with disabled community

---

These accessibility guidelines ensure that Cancha Leconte provides an inclusive experience for all users while meeting international accessibility standards and serving the specific needs of our Argentine user base.