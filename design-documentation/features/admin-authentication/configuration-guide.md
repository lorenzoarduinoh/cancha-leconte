# 🔧 Guía de Configuración - Sistema de Autenticación Admin

## 📖 Índice
- [Configuración de Usuarios Admin](#-configuración-de-usuarios-admin)
- [Configuración de Rate Limiting](#️-configuración-de-rate-limiting)
- [Configuración de Sesiones](#-configuración-de-sesiones)
- [Configuración de Seguridad](#-configuración-de-seguridad)
- [Comandos de Gestión](#️-comandos-de-gestión)
- [Configuraciones por Ambiente](#-configuraciones-por-ambiente)
- [Checklist de Producción](#-checklist-de-producción)

---

## 👤 Configuración de Usuarios Admin

### 📁 **Archivo**: `.env.local`

```bash
# Admin User Credentials - Usuarios y contraseñas de los administradores
ADMIN_SANTIAGO_USERNAME=lecon                          # Usuario del admin Santiago
ADMIN_SANTIAGO_PASSWORD=e@BKx%c29sM1j;^@              # Password del admin Santiago
ADMIN_AGUSTIN_USERNAME=golfi                           # Usuario del admin Agustin
ADMIN_AGUSTIN_PASSWORD=5F{8%,2L3>t!m&S9               # Password del admin Agustin
```

### 🔄 **Proceso para cambiar usuarios/passwords:**

1. **Actualizar archivo `.env.local`** con los nuevos valores
2. **Regenerar usuarios en la base de datos:**
   ```bash
   node scripts/setup-admin-users.js
   ```

### 📋 **Reglas para nombres de usuario:**
- Mínimo 3 caracteres, máximo 50
- Solo letras, números, guiones (-) y guiones bajos (_)
- Ejemplos válidos: `lecon`, `admin_1`, `user-123`
- Ejemplos inválidos: `ab`, `user@domain`, `user space`

---

## ⏱️ Configuración de Rate Limiting

### 📁 **Archivo**: `.env.local`

```bash
# Security Configuration - Límites de intentos de login
RATE_LIMIT_MAX_ATTEMPTS=5          # Número máximo de intentos fallidos
RATE_LIMIT_WINDOW_MINUTES=15       # Ventana de tiempo en minutos
```

### 📊 **Ejemplos de configuración según necesidad:**

#### 🔒 **Muy Estricto (Alta Seguridad)**
```bash
RATE_LIMIT_MAX_ATTEMPTS=3          # Solo 3 intentos
RATE_LIMIT_WINDOW_MINUTES=30       # Bloqueo por 30 minutos
```

#### ⚖️ **Balanceado (Recomendado para Producción)**
```bash
RATE_LIMIT_MAX_ATTEMPTS=5          # 5 intentos (default)
RATE_LIMIT_WINDOW_MINUTES=15       # Bloqueo por 15 minutos
```

#### 🚀 **Permisivo (Solo para Desarrollo)**
```bash
RATE_LIMIT_MAX_ATTEMPTS=100        # Muchos intentos
RATE_LIMIT_WINDOW_MINUTES=1        # Bloqueo corto
```

---

## ⏰ Configuración de Sesiones

### 📁 **Archivo**: `.env.local`

```bash
# JWT and Session Configuration - Duración de las sesiones
SESSION_DURATION_HOURS=2                    # Sesión normal (sin "Remember me")
SESSION_REMEMBER_DURATION_HOURS=24          # Sesión con "Remember me" activado
```

### 🕐 **Ejemplos de configuración:**

#### ⚡ **Sesiones Cortas (Alta Seguridad)**
```bash
SESSION_DURATION_HOURS=1                    # 1 hora sin remember me
SESSION_REMEMBER_DURATION_HOURS=8           # 8 horas con remember me
```

#### 🏢 **Sesiones Laborales (Recomendado)**
```bash
SESSION_DURATION_HOURS=2                    # 2 horas sin remember me
SESSION_REMEMBER_DURATION_HOURS=24          # 24 horas con remember me
```

#### 🌙 **Sesiones Largas (Conveniente)**
```bash
SESSION_DURATION_HOURS=8                    # 8 horas sin remember me
SESSION_REMEMBER_DURATION_HOURS=72          # 3 días con remember me
```

---

## 🔐 Configuración de Seguridad

### 📁 **Archivo**: `.env.local`

```bash
# JWT and Session Secrets - CAMBIAR EN PRODUCCIÓN
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
SESSION_SECRET=your_session_secret_key_here_minimum_32_characters

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3004    # URL local de desarrollo
NODE_ENV=development                         # Ambiente (development/production)
```

### 🔑 **Generar secretos seguros:**

#### Opción 1: Usar Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Opción 2: Usar PowerShell (Windows)
```powershell
[System.Web.Security.Membership]::GeneratePassword(64, 10)
```

#### Opción 3: Online (NO recomendado para producción)
- https://generate-secret.vercel.app/64

---

## 🛠️ Comandos de Gestión

### 👥 **Gestión de Usuarios**

```bash
# Crear/actualizar usuarios admin (después de cambiar .env.local)
node scripts/setup-admin-users.js
```

### 🗄️ **Gestión de Base de Datos**

```bash
# 1. Ejecutar migración inicial (solo primera vez)
# Ejecutar en Supabase SQL Editor: lib/database/migrations/001_create_admin_auth_tables.sql

# 2. Agregar columna username (si actualizas de email a username)
# Ejecutar en Supabase SQL Editor: lib/database/migrations/002_add_username_column.sql

# 3. Crear usuarios admin
node scripts/setup-admin-users.js
```

---

## 🌍 Configuraciones por Ambiente

### 🚧 **Desarrollo Local**
```bash
# .env.local para desarrollo
ADMIN_SANTIAGO_USERNAME=lecon
ADMIN_SANTIAGO_PASSWORD=dev123456
ADMIN_AGUSTIN_USERNAME=golfi
ADMIN_AGUSTIN_PASSWORD=dev123456

RATE_LIMIT_MAX_ATTEMPTS=100
RATE_LIMIT_WINDOW_MINUTES=1
SESSION_DURATION_HOURS=8
SESSION_REMEMBER_DURATION_HOURS=72

NEXT_PUBLIC_APP_URL=http://localhost:3005
NODE_ENV=development
```

### 🏭 **Producción**
```bash
# .env.local para producción
ADMIN_SANTIAGO_USERNAME=admin_santiago
ADMIN_SANTIAGO_PASSWORD=SuperSecurePassword123!@#
ADMIN_AGUSTIN_USERNAME=admin_agustin
ADMIN_AGUSTIN_PASSWORD=AnotherSecurePassword456$%^

RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MINUTES=15
SESSION_DURATION_HOURS=2
SESSION_REMEMBER_DURATION_HOURS=24

NEXT_PUBLIC_APP_URL=https://midominio.com
NODE_ENV=production

# IMPORTANTES: Generar nuevos secretos para producción
JWT_SECRET=NUEVO_SECRET_SUPER_SEGURO_64_CARACTERES_MINIMO
SESSION_SECRET=OTRO_SECRET_DIFERENTE_64_CARACTERES_MINIMO
```

---

## ✅ Checklist de Producción

### 🔒 **Seguridad**
- [ ] **Cambiar todos los secretos** (`JWT_SECRET`, `SESSION_SECRET`)
- [ ] **Generar contraseñas fuertes** para ambos admins
- [ ] **Configurar usernames únicos** y seguros
- [ ] **Configurar rate limiting apropiado** (5 intentos, 15 minutos)
- [ ] **Verificar HTTPS** en `NEXT_PUBLIC_APP_URL`
- [ ] **Configurar `NODE_ENV=production`**

### 🗄️ **Base de Datos**
- [ ] **Ejecutar migración** en Supabase de producción
- [ ] **Crear usuarios admin** con `node scripts/setup-admin-users.js`
- [ ] **Verificar usuarios** ejecutando el script nuevamente
- [ ] **Probar login** con ambas cuentas

### 🧪 **Testing**
- [ ] **Probar login exitoso** con ambos usuarios
- [ ] **Probar rate limiting** (intentos fallidos)
- [ ] **Probar logout** desde dashboard
- [ ] **Probar "Remember me"** checkbox
- [ ] **Verificar sesiones** expiran correctamente

### 📊 **Monitoreo**
- [ ] **Configurar logs** de seguridad
- [ ] **Monitorear intentos fallidos** de login
- [ ] **Alertas de seguridad** si es necesario

---

## 🚨 Troubleshooting Común

### ❌ **"Token CSRF inválido"**
- Verificar que el frontend esté enviando el token
- Recargar la página para obtener nuevo token

### ❌ **"Demasiados intentos"**
- Esperar 15 minutos o cambiar `RATE_LIMIT_WINDOW_MINUTES`
- Verificar configuración en `.env.local`

### ❌ **"Sesión expirada inmediatamente"**
- Verificar `JWT_SECRET` sea consistente
- Verificar configuración de cookies en navegador

### ❌ **"Usuario no encontrado"**
- Ejecutar `node scripts/setup-admin-users.js` para verificar usuarios
- Re-ejecutar el script si es necesario
- Verificar que el username esté en minúsculas

---

## 📞 Contacto y Soporte

**Archivos importantes:**
- `.env.local` - Todas las configuraciones
- `scripts/setup-admin-users.js` - Script de gestión de usuarios
- `lib/database/migrations/001_create_admin_auth_tables.sql` - Migración inicial
- `lib/database/migrations/002_add_username_column.sql` - Migración para usernames

**Logs importantes:**
- Consola del servidor Next.js para eventos de seguridad
- Supabase Dashboard para logs de base de datos

---

*✅ Guía actualizada - Sistema de Autenticación Admin v1.0*