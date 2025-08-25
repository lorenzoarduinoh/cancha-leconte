# Error de Jest Worker en Next.js - Guía de Solución

## Síntomas del Error

```
Error: Jest worker encountered 2 child process exceptions, exceeding retry limit
    at ChildProcessWorker.initialize (file://C:\Users\loren\Desktop\cancha\node_modules\next\dist\compiled\jest-worker\index.js:1:11580)
    at ChildProcessWorker._onExit (file://C:\Users\loren\Desktop\cancha\node_modules\next\dist\compiled\jest-worker\index.js:1:12545)
```

## Causa Raíz

- **Conflicto entre Next.js 15.4.6 y Jest 30.0.5** en Windows
- **Jest workers se ejecutaban durante peticiones HTTP normales** en lugar de solo durante testing
- **Configuración inadecuada** que no aislaba completamente Jest del runtime de Next.js
- **Windows maneja child processes diferente** que Unix, agravando el problema

## ¿Por qué ocurría?

1. El archivo `jest.config.js` cargaba `next/jest` incondicionalmente
2. Next.js webpack no excluía correctamente módulos de Jest del bundle
3. Lazy imports o dynamic imports podían arrastrar dependencias de Jest
4. Variables de entorno no separaban claramente test vs runtime

## Solución Completa

### 1. next.config.ts - Bloqueo total de Jest

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: false,
  },
  
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.parallelism = 1;
      
      // Bloquear módulos de Jest completamente
      config.resolve.alias = {
        ...config.resolve.alias,
        'jest-worker': false,
        '@jest/core': false,
        '@jest/transform': false,
        '@jest/globals': false,
        'jest-environment-jsdom': false,
        'ts-jest': false,
      };
      
      // Externals para evitar bundling
      config.externals.push(
        'jest-worker',
        '@jest/core',
        '@jest/transform',
        '@jest/globals',
        'jest-environment-jsdom',
        'ts-jest'
      );
      
      // Plugin para ignorar imports de Jest
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(jest-worker|@jest\/core|@jest\/transform)$/,
        })
      );
      
      // Excluir archivos de test del bundle
      config.module.rules.push({
        test: /\.(test|spec)\.(js|jsx|ts|tsx)$/,
        loader: 'ignore-loader'
      });
    }
    
    return config;
  },
  
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
```

### 2. jest.config.js - Limitación de workers

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Limitación crítica de workers
  maxWorkers: 1,
  workerIdleMemoryLimit: '512MB',
  
  // Configuración de cobertura
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

### 3. Variables de entorno - .env.development.local

```bash
# Deshabilitar Jest workers en desarrollo
JEST_WORKER_DISABLED=true
DISABLE_WORKERS=true
UV_THREADPOOL_SIZE=1

# Asegurar que no estamos en modo test
NODE_ENV=development
```

### 4. package.json - Scripts actualizados

```json
{
  "scripts": {
    "dev": "NEXT_DISABLE_JEST=1 UV_THREADPOOL_SIZE=1 NODE_OPTIONS=\"--max-old-space-size=4096\" next dev --port 3000",
    "test": "NODE_ENV=test jest",
    "test:watch": "NODE_ENV=test jest --watch"
  }
}
```

## Cómo identificar este error en el futuro

- Error menciona "Jest worker" en stack trace
- Ocurre durante navegación normal (no durante testing)
- Específicamente en Windows con Next.js + Jest
- Error aparece en `node_modules\next\dist\compiled\jest-worker\index.js`
- Se activa al acceder a páginas específicas que usan lazy imports

## Solución rápida para futuros casos

1. **Verificar** si Jest está siendo importado en código de runtime
2. **Bloquear** Jest modules en `next.config.ts` con aliases `false`
3. **Limitar** Jest workers a 1 en `jest.config.js`
4. **Agregar** variables de entorno para deshabilitar workers
5. **Reiniciar** servidor completamente después de cambios

```bash
# Pasos de emergencia
npx kill-port 3000
npm run dev
```

## Prevención

- Nunca importar Jest modules en componentes de React
- Mantener separación estricta entre test y runtime code
- Usar `NODE_ENV` checks para imports condicionales
- En Windows, ser especialmente cuidadoso con child processes
- Revisar lazy imports que puedan arrastrar dependencias de test

## Testing de la solución

```bash
# 1. Reiniciar servidor
npm run dev

# 2. Probar URL problemática
curl -I "http://localhost:3000/admin/games/[id]"

# 3. Verificar que retorna HTTP 200 OK sin errores de Jest worker
```

## Archivos modificados

- `/next.config.ts` - Configuración webpack y bloqueo de Jest
- `/jest.config.js` - Limitación de workers y memoria
- `/.env.development.local` - Variables de entorno (nuevo)
- `/package.json` - Scripts con variables de entorno

## Fecha de resolución

**24 de Agosto, 2025** - Error completamente resuelto por agentes especializados.

---

**Nota importante**: Este error es específico de la combinación Next.js 15.4.6 + Jest 30.0.5 en Windows. Versiones futuras pueden resolver este conflicto nativamente.