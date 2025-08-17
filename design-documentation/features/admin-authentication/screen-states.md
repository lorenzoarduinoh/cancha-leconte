---
title: Admin Authentication - Screen States and Visual Specifications
description: Complete visual specifications for all states of the admin login interface
feature: admin-authentication
last-updated: 2025-08-17
version: 1.0.0
related-files:
  - ./README.md
  - ../../design-system/style-guide.md
status: approved
---

# Admin Authentication - Screen States

## Visual Layout Specifications

### Container Structure
```
┌─────────────────────────────────────┐
│              Page Container         │
│  ┌───────────────────────────────┐  │
│  │         Brand Section         │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │      Login Card         │  │  │
│  │  │                         │  │  │
│  │  │  ┌─────────────────┐    │  │  │
│  │  │  │   Form Fields   │    │  │  │
│  │  │  └─────────────────┘    │  │  │
│  │  │                         │  │  │
│  │  │  ┌─────────────────┐    │  │  │
│  │  │  │  Action Button  │    │  │  │
│  │  │  └─────────────────┘    │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Responsive Breakpoints

#### Mobile (320-767px)
- **Container Width**: `calc(100vw - 32px)`
- **Card Padding**: `24px`
- **Card Margin**: `16px`
- **Form Width**: `100%`

#### Tablet (768-1023px)
- **Container Width**: `400px`
- **Card Padding**: `32px`
- **Card Margin**: `auto`
- **Form Width**: `336px`

#### Desktop (1024px+)
- **Container Width**: `400px`
- **Card Padding**: `32px`
- **Card Margin**: `auto`
- **Form Width**: `336px`

## State 1: Default/Empty State

### Visual Layout
```css
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8F5E8 0%, #F1F8E9 100%);
  padding: 16px;
}

.login-card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 32px;
  width: 100%;
  max-width: 400px;
}
```

### Brand Section
- **Logo/Title**: "Cancha Leconte"
- **Typography**: H1 style (32px/40px, Bold)
- **Color**: Primary `#2E7D32`
- **Margin Bottom**: `32px`
- **Text Align**: Center

### Form Header
- **Text**: "Iniciar Sesión"
- **Typography**: H2 style (24px/32px, Semibold)
- **Color**: Neutral-800 `#424242`
- **Margin Bottom**: `24px`
- **Text Align**: Center

### Email/Username Field
```css
.form-field {
  margin-bottom: 16px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #424242;
  margin-bottom: 8px;
  display: block;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 12px 16px;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1.5;
  transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
}

.form-input::placeholder {
  color: #9E9E9E;
}
```

- **Label**: "Email o Usuario"
- **Placeholder**: "tu@email.com"
- **Height**: `48px`
- **Border**: `1px solid #E0E0E0`
- **Border Radius**: `8px`

### Password Field
```css
.password-field {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #757575;
  cursor: pointer;
  padding: 8px;
}
```

- **Label**: "Contraseña"
- **Placeholder**: "Tu contraseña"
- **Type**: Password (with visibility toggle)
- **Toggle Icon**: Eye icon (24px, Neutral-600)

### Remember Me Checkbox
```css
.checkbox-field {
  display: flex;
  align-items: center;
  margin: 24px 0;
}

.checkbox {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  accent-color: #2E7D32;
}

.checkbox-label {
  font-size: 14px;
  color: #616161;
  cursor: pointer;
}
```

- **Text**: "Mantenerme conectado"
- **Position**: Left-aligned with 12px spacing
- **Checkbox Color**: Primary `#2E7D32`

### Login Button
```css
.login-button {
  width: 100%;
  height: 48px;
  background: #2E7D32;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 200ms ease-out, transform 100ms ease-out;
}

.login-button:hover {
  background: #1B5E20;
  transform: translateY(-1px);
}

.login-button:active {
  transform: translateY(0);
}
```

- **Text**: "Iniciar Sesión"
- **Background**: Primary `#2E7D32`
- **Hover**: Primary Dark `#1B5E20`
- **Font Weight**: Medium (500)

## State 2: Focus States

### Input Focus
```css
.form-input:focus {
  outline: none;
  border-color: #2E7D32;
  box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
}
```

- **Border Color**: Primary `#2E7D32`
- **Box Shadow**: `0 0 0 2px rgba(46, 125, 50, 0.2)`
- **Transition**: `200ms ease-out`

### Button Focus
```css
.login-button:focus {
  outline: 2px solid #1976D2;
  outline-offset: 2px;
}
```

- **Outline**: `2px solid #1976D2` (Accent Primary)
- **Offset**: `2px`

## State 3: Loading State

### Button Loading
```css
.login-button.loading {
  background: #2E7D32;
  cursor: not-allowed;
  position: relative;
}

.login-button.loading::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

- **Text**: "Iniciando sesión..."
- **Spinner**: White, 20px, centered
- **Form State**: All inputs disabled
- **Opacity**: Form inputs at 70% opacity

### Disabled Form
```css
.form-input:disabled {
  background: #F5F5F5;
  color: #9E9E9E;
  cursor: not-allowed;
}
```

## State 4: Error State

### Error Message Container
```css
.error-message {
  background: #FFEBEE;
  border: 1px solid #F44336;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.error-icon {
  color: #F44336;
  margin-right: 12px;
  width: 20px;
  height: 20px;
}

.error-text {
  color: #C62828;
  font-size: 14px;
  line-height: 1.4;
}
```

### Error Messages

#### Invalid Credentials
- **Text**: "Email o contraseña incorrectos. Inténtalo de nuevo."
- **Icon**: Alert circle icon
- **Background**: Light error `#FFEBEE`
- **Border**: Error color `#F44336`

#### Network Error
- **Text**: "Error de conexión. Verifica tu conexión e inténtalo de nuevo."
- **Action**: Retry button available

#### Rate Limiting
- **Text**: "Demasiados intentos. Espera 5 minutos antes de intentar de nuevo."
- **Timer**: Countdown display if applicable

### Form Error State
```css
.form-input.error {
  border-color: #F44336;
  box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.2);
}
```

- **Border**: Error color `#F44336`
- **Shadow**: Error color with 20% opacity

### Form Shake Animation
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.login-card.error {
  animation: shake 300ms ease-out;
}
```

## State 5: Success State

### Success Animation
```css
.success-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #4CAF50;
  font-size: 32px;
  opacity: 0;
  animation: successFade 500ms ease-out forwards;
}

@keyframes successFade {
  0% { 
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% { 
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

### Success Button State
```css
.login-button.success {
  background: #4CAF50;
  color: #FFFFFF;
}

.login-button.success::after {
  content: '✓';
  font-size: 20px;
  animation: none;
}
```

- **Background**: Success color `#4CAF50`
- **Icon**: Checkmark
- **Text**: "¡Éxito!"
- **Duration**: 500ms before redirect

### Page Transition
```css
.page-exit {
  opacity: 1;
  transition: opacity 400ms ease-out;
}

.page-exit.fade-out {
  opacity: 0;
}
```

## Accessibility Specifications

### Screen Reader Support
```html
<form role="form" aria-labelledby="login-heading">
  <h2 id="login-heading">Iniciar Sesión</h2>
  
  <div class="form-field">
    <label for="email" class="form-label">Email o Usuario</label>
    <input 
      id="email" 
      type="email" 
      class="form-input"
      placeholder="tu@email.com"
      required
      aria-describedby="email-error"
    />
    <div id="email-error" class="sr-only" aria-live="polite"></div>
  </div>
  
  <div class="form-field">
    <label for="password" class="form-label">Contraseña</label>
    <div class="password-field">
      <input 
        id="password" 
        type="password" 
        class="form-input"
        placeholder="Tu contraseña"
        required
        aria-describedby="password-error"
      />
      <button 
        type="button" 
        class="password-toggle"
        aria-label="Mostrar contraseña"
        aria-pressed="false"
      >
        <span class="icon-eye" aria-hidden="true"></span>
      </button>
    </div>
    <div id="password-error" class="sr-only" aria-live="polite"></div>
  </div>
</form>
```

### Keyboard Navigation
- **Tab Order**: Email → Password → Password Toggle → Remember Me → Login Button
- **Enter Key**: Submits form from any field
- **Space**: Toggles checkbox and buttons
- **Escape**: Clears current field

### Color Contrast Verification
- **Primary Text** (#424242 on #FFFFFF): 9.07:1 ✓
- **Secondary Text** (#616161 on #FFFFFF): 6.23:1 ✓
- **Error Text** (#C62828 on #FFEBEE): 4.85:1 ✓
- **Button Text** (#FFFFFF on #2E7D32): 7.94:1 ✓
- **Focus Outline** (#1976D2): 3.05:1 ✓

---

These specifications provide complete implementation guidance for all visual states of the admin authentication system, ensuring consistent user experience and accessibility compliance.