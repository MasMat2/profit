# Sistema de Autenticación PROFIT

## Descripción
Sistema completo de autenticación implementado en la rama `demo` que valida credenciales contra la base de datos usando Kysely.

## Componentes Implementados

### Backend (NestJS)
- **AuthModule** (`/api/src/auth/`)
  - `auth.service.ts`: Lógica de autenticación
  - `auth.controller.ts`: Endpoints REST
  - `auth.module.ts`: Módulo de autenticación

### Frontend (Angular)
- **Servicio de Autenticación** (`/profit-web/src/app/services/auth.service.ts`)
- **Guard de Autenticación** (`/profit-web/src/app/guards/auth.guard.ts`)
- **Componente Login** (`/profit-web/src/app/views/login/`)

## Endpoints Backend

### POST /auth/login
Autentica un usuario y devuelve un token.

**Request:**
```json
{
  "clave": "usuario",
  "password": "contraseña"
}
```

**Response:**
```json
{
  "token": "base64_encoded_token",
  "user": {
    "id": 1,
    "usuario": 1,
    "clave": "admin",
    "nombre": "Administrador",
    "email": "admin@profit.com",
    "admin": 1,
    "perfil": 1,
    "foto": ""
  }
}
```

### GET /auth/validate
Valida un token existente.

**Headers:**
```
Authorization: Bearer {token}
```

### GET /auth/me
Obtiene la información del usuario actual.

**Headers:**
```
Authorization: Bearer {token}
```

## Uso del Sistema

### 1. Credenciales de Acceso
Las credenciales se validan contra la tabla `tbusuarios` de la base de datos:
- **Campo usuario**: `clave` (ej: "admin", "cajero1")
- **Campo contraseña**: `psw` (texto plano en BD)
- **Restricción**: Solo usuarios con `activo = 1`

### 2. Flujo de Login
1. Usuario accede a `/login`
2. Ingresa clave y contraseña
3. Sistema valida contra backend
4. Si es válido, redirige a página principal
5. Si es inválido, muestra mensaje de error

### 3. Flujo de Logout
1. Usuario hace clic en "Cerrar Sesión" en el sidebar
2. Sistema limpia token y sesión
3. Redirige automáticamente a `/login`

### 4. Protección de Rutas
Todas las rutas principales están protegidas con `authGuard`:
- Si usuario no autenticado → redirige a `/login`
- Si token inválido o expirado → redirige a `/login`
- Error 401 en cualquier request → redirige a `/login`

## Almacenamiento

### localStorage
- `token`: Token de autenticación
- `currentUser`: Datos del usuario (JSON)

### sessionStorage
- `isLoggedIn`: Flag booleano de sesión activa

## Seguridad

### Token
- Token generado en Base64 (sin JWT)
- Incluye: id, usuario, clave, nombre, admin, timestamp
- Enviado en header `Authorization: Bearer {token}`
- Interceptor automático agrega token a todas las requests

### Validaciones
- Usuario debe estar activo (`activo = 1`)
- Contraseña debe coincidir exactamente
- Token validado en cada request protegida
- Redirección automática en errores 401

## Personalización del Login

### Logo
El componente usa el logo ubicado en:
```
/profit-web/src/assets/logo.png
```

### Estilos
- Gradiente de fondo: Púrpura (#667eea a #764ba2)
- Botón principal: Azul #4A90E2 (consistente con el sistema)
- Animaciones suaves de entrada
- Diseño responsive

### Modificar Colores
Editar `login.component.scss`:
```scss
.login-container {
  background: linear-gradient(135deg, #nuevo-color1 0%, #nuevo-color2 100%);
}

.login-button {
  background: linear-gradient(135deg, #nuevo-azul1 0%, #nuevo-azul2 100%);
}
```

## Testing

### Probar Login
1. Asegúrate que el backend esté corriendo en `http://localhost:3000`
2. Asegúrate que el frontend esté corriendo
3. Navega a `http://localhost:4200/login`
4. Ingresa credenciales de un usuario activo de la BD
5. Verifica redirección al dashboard

### Usuarios de Prueba
Consulta la tabla `tbusuarios` en tu base de datos para usuarios disponibles.

## Troubleshooting

### Error: "Credenciales inválidas"
- Verifica que el usuario exista en tabla `tbusuarios`
- Verifica que `activo = 1`
- Verifica que la contraseña coincida exactamente con campo `psw`

### Error: "Cannot connect to backend"
- Verifica que el backend esté corriendo
- Verifica el proxy configuration en `angular.json`
- Verifica la conexión a la base de datos

### Redirige constantemente a login
- Limpia localStorage y sessionStorage
- Verifica que el token se esté guardando correctamente
- Revisa la consola del navegador para errores

## Próximas Mejoras Sugeridas

1. **Implementar JWT real** para mayor seguridad
2. **Hash de contraseñas** con bcrypt
3. **Refresh tokens** para sesiones extendidas
4. **Rate limiting** para prevenir ataques de fuerza bruta
5. **Recuperación de contraseña** por email
6. **Autenticación de dos factores (2FA)**
7. **Logs de intentos de login** (exitosos y fallidos)
