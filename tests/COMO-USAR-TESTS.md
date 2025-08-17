# 🧪 Guía de Tests - Cancha App

## 🚀 Comandos Básicos

### Correr todos los tests
```bash
npm test
```

### Modo watch (automático) - RECOMENDADO PARA DESARROLLO
```bash
npm test -- --watch
```
- ✅ Se ejecuta automáticamente cuando guardas cambios
- ✅ Solo corre tests relacionados con archivos modificados  
- ✅ Súper rápido
- ✅ Resultados en tiempo real

### Solo tests que fallaron
```bash
npm test -- --onlyFailures
```

### Test específico por archivo
```bash
npm test tests/unit/password.test.ts
npm test tests/security/csrf.test.ts
```

### Tests por categoría
```bash
# Solo tests de autenticación
npm test auth

# Solo tests de componentes UI
npm test components

# Solo tests de seguridad  
npm test security

# Solo tests de integración
npm test integration
```

## 🎯 Workflow Recomendado

### 1. Antes de empezar a programar
```bash
npm test
```
Para ver el estado actual de todos los tests.

### 2. Mientras desarrollas
```bash
npm test -- --watch
```
Deja esto corriendo en una terminal separada. Te avisará inmediatamente si rompes algo.

### 3. Antes de hacer commit
```bash
npm test
```
Asegúrate de que todos los tests pasen antes de commitear.

## 📊 Estructura de Tests

```
tests/
├── unit/                 # Tests unitarios
│   ├── components/       # Tests de componentes React
│   ├── auth-types.test.ts
│   ├── password.test.ts
│   └── validation.test.ts
├── integration/          # Tests de integración
│   └── auth-workflow.test.ts
├── security/             # Tests de seguridad
│   └── csrf.test.ts
├── e2e/                  # Tests end-to-end
│   └── auth.spec.ts
└── setup.ts              # Configuración global
```

## 🐛 Debugging Tests

### Ver detalles de tests que fallan
```bash
npm test -- --verbose
```

### Correr un solo test específico
```bash
npm test -- --testNamePattern="should validate password strength"
```

### Ver coverage (cobertura de código)
```bash
npm test -- --coverage
```

## ⚡ Tips y Trucos

### 1. Watch mode inteligente
En modo watch, puedes presionar:
- `a` - correr todos los tests
- `f` - solo tests que fallaron
- `p` - filtrar por archivo
- `q` - salir

### 2. Para desarrollo rápido
```bash
# Solo tests relacionados con el archivo que estás editando
npm test -- --watch src/components/ui/button.tsx
```

### 3. Tests en paralelo (más rápido)
```bash
npm test -- --maxWorkers=4
```

## 🚨 Bugs Conocidos Encontrados por Tests

1. **Password strength algorithm** - Calificación inconsistente
2. **CSRF headers** - Case sensitivity en headers
3. **UI Components** - Problemas de accesibilidad
4. **Input password** - Tipo de input incorrecto

## 📈 Estado Actual

- ✅ **126 tests pasando**
- ❌ **17 tests fallando** 
- 🎯 **Coverage**: Por determinar (`npm test -- --coverage`)

---

**Recuerda**: Los tests son tu red de seguridad. ¡Úsalos constantemente!