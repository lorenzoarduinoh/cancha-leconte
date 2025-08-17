---
title: Cancha Leconte - Complete Style Guide
description: Comprehensive design system specifications including colors, typography, spacing, and components
feature: design-system
last-updated: 2025-08-17
version: 1.0.0
status: approved
---

# Cancha Leconte - Complete Style Guide

## Design Philosophy

The Cancha Leconte design system embodies **bold simplicity** with a soccer-inspired aesthetic that feels authentic to Argentine football culture. The system prioritizes:

- **Effortless navigation** through clear visual hierarchy
- **Mobile-first interactions** optimized for WhatsApp workflows
- **Cultural authenticity** with soccer-inspired elements
- **Accessibility excellence** meeting WCAG AA standards
- **Performance optimization** for 3G connections

## Color System

### Primary Colors
- **Primary**: `#2E7D32` – Main CTAs, navigation, soccer field green inspiration
- **Primary Dark**: `#1B5E20` – Hover states, emphasis, active states
- **Primary Light**: `#4CAF50` – Subtle backgrounds, success states

### Secondary Colors
- **Secondary**: `#FFA726` – Supporting elements, warning states, soccer ball orange
- **Secondary Light**: `#FFB74D` – Backgrounds, subtle accents
- **Secondary Pale**: `#FFF3E0` – Selected states, highlights

### Accent Colors
- **Accent Primary**: `#1976D2` – Important actions, notifications, trust elements
- **Accent Secondary**: `#F57C00` – Warnings, payment highlights
- **Gradient Start**: `#2E7D32` – Hero sections, cards
- **Gradient End**: `#4CAF50` – Smooth transitions

### Semantic Colors
- **Success**: `#4CAF50` – Positive actions, payment confirmations
- **Warning**: `#FF9800` – Caution states, payment reminders
- **Error**: `#F44336` – Errors, destructive actions, cancellations
- **Info**: `#2196F3` – Informational messages, game details

### Neutral Palette
- **Neutral-50**: `#FAFAFA` – Page backgrounds, card backgrounds
- **Neutral-100**: `#F5F5F5` – Section dividers, subtle borders
- **Neutral-200**: `#EEEEEE` – Input borders, disabled states
- **Neutral-300**: `#E0E0E0` – Borders, separators
- **Neutral-400**: `#BDBDBD` – Placeholder text, icons
- **Neutral-500**: `#9E9E9E` – Secondary text, captions
- **Neutral-600**: `#757575` – Tertiary text, timestamps
- **Neutral-700**: `#616161` – Body text, readable content
- **Neutral-800**: `#424242` – Headings, important text
- **Neutral-900**: `#212121` – Primary text, maximum contrast

### Accessibility Notes
- All color combinations achieve WCAG AA standards (4.5:1 normal text, 3:1 large text)
- Critical interactions maintain 7:1 contrast ratio for enhanced accessibility
- Color-blind friendly palette tested with Coblis simulator
- Alternative indicators provided for color-dependent information

## Typography System

### Font Stack
- **Primary**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace**: `JetBrains Mono, Consolas, "Courier New", monospace`

### Font Weights
- **Light**: 300 – Decorative elements, large displays
- **Regular**: 400 – Body text, standard content
- **Medium**: 500 – Emphasized text, section headers
- **Semibold**: 600 – Buttons, important labels
- **Bold**: 700 – Headings, critical information

### Type Scale

#### Desktop (1024px+)
- **H1**: `32px/40px, Bold, -0.02em` – Page titles, major sections
- **H2**: `24px/32px, Semibold, -0.01em` – Section headers
- **H3**: `20px/28px, Semibold, 0em` – Subsection headers
- **H4**: `18px/24px, Medium, 0em` – Card titles
- **H5**: `16px/20px, Medium, 0em` – Minor headers
- **Body Large**: `18px/28px, Regular` – Primary reading text
- **Body**: `16px/24px, Regular` – Standard UI text
- **Body Small**: `14px/20px, Regular` – Secondary information
- **Caption**: `12px/16px, Regular` – Metadata, timestamps
- **Label**: `14px/16px, Medium, uppercase` – Form labels
- **Code**: `14px/20px, JetBrains Mono` – Technical text

#### Mobile (320-767px)
- **H1**: `28px/36px, Bold, -0.02em` – Page titles
- **H2**: `22px/28px, Semibold, -0.01em` – Section headers
- **H3**: `18px/24px, Semibold, 0em` – Subsection headers
- **H4**: `16px/20px, Medium, 0em` – Card titles
- **Body Large**: `16px/24px, Regular` – Primary reading text
- **Body**: `14px/20px, Regular` – Standard UI text
- **Body Small**: `12px/18px, Regular` – Secondary information
- **Caption**: `11px/14px, Regular` – Metadata, timestamps

### Spanish Language Considerations
- **Character support** for Spanish accents and special characters
- **Line height** optimized for Spanish text patterns
- **Reading length** adapted for Spanish sentence structure
- **Cultural typography** preferences integrated

## Spacing & Layout System

### Base Unit
**8px** – All spacing derives from this foundational unit

### Spacing Scale
- **xs**: `4px` (0.5 × base) – Micro spacing, icon padding
- **sm**: `8px` (1 × base) – Small spacing, form element gaps
- **md**: `16px` (2 × base) – Default spacing, card padding
- **lg**: `24px` (3 × base) – Section spacing, large margins
- **xl**: `32px` (4 × base) – Major section separation
- **2xl**: `48px` (6 × base) – Page-level spacing
- **3xl**: `64px` (8 × base) – Hero sections, large screens

### Grid System
- **Columns**: 12 (desktop), 8 (tablet), 4 (mobile)
- **Gutters**: 24px (desktop), 16px (tablet), 8px (mobile)
- **Margins**: 32px (desktop), 24px (tablet), 16px (mobile)
- **Container max-widths**: 1200px (desktop), 768px (tablet), 100% (mobile)

### Breakpoints
- **Mobile**: 320px – 767px (primary target for friends)
- **Tablet**: 768px – 1023px (occasional use)
- **Desktop**: 1024px – 1439px (admin primary)
- **Wide**: 1440px+ (admin secondary)

## Component Specifications

### Buttons

#### Primary Button
**Variants**: Primary, Secondary, Tertiary, Ghost
**States**: Default, Hover, Active, Focus, Disabled, Loading

**Visual Specifications**
- **Height**: `48px` (mobile), `44px` (desktop)
- **Padding**: `16px 24px` (horizontal), `12px` (vertical)
- **Border Radius**: `8px`
- **Border**: `2px solid transparent`
- **Shadow**: `0 2px 4px rgba(0,0,0,0.1)`
- **Typography**: Body/Medium weight

**Primary Variant**
- **Background**: Primary color `#2E7D32`
- **Text**: White `#FFFFFF`
- **Hover**: Primary Dark `#1B5E20`
- **Active**: Primary Dark with 10% darker overlay
- **Focus**: 2px solid Accent Primary `#1976D2`

**Interaction Specifications**
- **Hover Transition**: `200ms ease-out`
- **Click Feedback**: Scale transform `0.98` for 100ms
- **Focus Indicator**: 2px outline with 2px offset
- **Loading State**: Spinner animation with disabled styling
- **Disabled State**: 50% opacity, no interactions

#### Secondary Button
- **Background**: Transparent
- **Text**: Primary color `#2E7D32`
- **Border**: `2px solid #2E7D32`
- **Hover**: Light primary background `#E8F5E8`

#### Icon Button
- **Size**: `44px × 44px` (minimum touch target)
- **Border Radius**: `50%` (circular)
- **Icon Size**: `24px`
- **Hover**: Background overlay 10% primary

### Form Elements

#### Input Field
**Visual Specifications**
- **Height**: `48px` (mobile), `44px` (desktop)
- **Padding**: `12px 16px`
- **Border Radius**: `8px`
- **Border**: `1px solid Neutral-300`
- **Typography**: Body/Regular

**States**
- **Default**: Neutral-300 border
- **Focus**: Primary color border, 0 2px 4px rgba(46,125,50,0.2) shadow
- **Error**: Error color border and text
- **Disabled**: Neutral-100 background, Neutral-400 text

#### Select Dropdown
- **Appearance**: Custom arrow icon
- **Padding**: Same as input field
- **Options**: Max height 200px with scroll

### Cards

#### Game Card
**Visual Specifications**
- **Padding**: `24px`
- **Border Radius**: `12px`
- **Border**: `1px solid Neutral-200`
- **Shadow**: `0 2px 8px rgba(0,0,0,0.1)`
- **Background**: White

**Hover State**
- **Shadow**: `0 4px 16px rgba(0,0,0,0.15)`
- **Transform**: `translateY(-2px)`
- **Transition**: `200ms ease-out`

#### Player Card
**Visual Specifications**
- **Padding**: `16px`
- **Border Radius**: `8px`
- **Background**: Neutral-50
- **Avatar**: 40px circle with initials

### Navigation

#### Admin Navigation
**Visual Specifications**
- **Height**: `64px`
- **Background**: White with bottom border
- **Logo**: Left-aligned, 32px height
- **Menu Items**: Right-aligned, Body/Medium

**Mobile Navigation**
- **Hamburger Menu**: 44px touch target
- **Slide-out Drawer**: Full-height overlay
- **Menu Items**: 48px minimum height

## Motion & Animation System

### Timing Functions
- **Ease-out**: `cubic-bezier(0.0, 0, 0.2, 1)` – Entrances, modals
- **Ease-in-out**: `cubic-bezier(0.4, 0, 0.6, 1)` – Transitions
- **Spring**: Custom spring curves for playful interactions

### Duration Scale
- **Micro**: `150ms` – Button hover, state changes
- **Short**: `250ms` – Dropdowns, tooltips
- **Medium**: `400ms` – Page transitions, modals
- **Long**: `600ms` – Complex animations, onboarding

### Animation Principles
- **Performance**: 60fps minimum, hardware acceleration
- **Purpose**: Every animation serves user understanding
- **Accessibility**: Respects `prefers-reduced-motion`
- **Consistency**: Similar actions use similar timings

### Specific Animations

#### Page Transitions
- **Duration**: 400ms
- **Easing**: Ease-in-out
- **Effect**: Slide from right (forward) or left (back)

#### Modal Entrance
- **Duration**: 250ms
- **Easing**: Ease-out
- **Effect**: Scale from 0.9 to 1.0 with fade-in
- **Backdrop**: Fade-in 200ms

#### Loading States
- **Spinner**: 1s linear rotation
- **Skeleton**: 1.5s ease-in-out pulse
- **Progress Bar**: Smooth width transitions

## Accessibility Standards

### WCAG Compliance
- **Level**: AA standard minimum, AAA where possible
- **Contrast Ratios**: 4.5:1 normal text, 3:1 large text, 7:1 critical elements
- **Focus Management**: Logical tab order, visible focus indicators
- **Keyboard Navigation**: All functionality accessible via keyboard

### Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy, landmarks
- **ARIA Labels**: Descriptive labels for interactive elements
- **Live Regions**: Status updates, error messages
- **Skip Links**: Quick navigation to main content

### Touch Accessibility
- **Minimum Target Size**: 44px × 44px for all interactive elements
- **Spacing**: 8px minimum between adjacent targets
- **Gesture Alternatives**: All gestures have button alternatives

### Cultural Accessibility
- **Language**: Complete Spanish localization
- **Cultural Icons**: Soccer and Argentine cultural references
- **Payment Methods**: MercadoPago familiarity and trust

## Implementation Guidelines

### CSS Custom Properties
```css
:root {
  /* Colors */
  --color-primary: #2E7D32;
  --color-primary-dark: #1B5E20;
  --color-primary-light: #4CAF50;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* Typography */
  --font-size-body: 16px;
  --line-height-body: 1.5;
  --font-weight-medium: 500;
  
  /* Animations */
  --duration-short: 250ms;
  --ease-out: cubic-bezier(0.0, 0, 0.2, 1);
}
```

### Component Class Naming
- **BEM Methodology**: `.block__element--modifier`
- **Utility Classes**: For spacing, typography, colors
- **Component Classes**: For reusable component styling
- **State Classes**: `.is-active`, `.is-disabled`, `.is-loading`

### Performance Considerations
- **Critical CSS**: Inline above-the-fold styles
- **Font Loading**: Preload web fonts, fallback fonts
- **Image Optimization**: WebP with fallbacks, responsive images
- **Bundle Splitting**: Component-level code splitting

---

This style guide serves as the foundation for all design decisions in the Cancha Leconte application. All components and layouts should reference these specifications to ensure consistency and accessibility across the entire user experience.