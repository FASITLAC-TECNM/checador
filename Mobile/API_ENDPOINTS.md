# Endpoints Correctos de la API - Mobile App

## URL Base del Backend
```
https://9dm7dqf9-3001.usw3.devtunnels.ms/api
```

**IMPORTANTE:** El puerto 3001 es el backend, NO el 5173 (que es el frontend).

## ENDPOINTS CORRECTOS ✅

### 1. Login (Validar Sesión)
**Endpoint:** `POST /api/session/validate`

**Request:**
```json
{
    "username": "tu_usuario",
    "password": "tu_contraseña"
}
```

**Response (Éxito):**
```json
{
    "success": true,
    "message": "Login exitoso",
    "usuario": {
        "id_usuario": 1,
        "id_empresa": 4,
        "username": "usuario123",
        "email": "usuario@ejemplo.com",
        "nombre": "Nombre Completo",
        "telefono": "1234567890",
        "foto": null,
        "activo": "Activo",
        "conexion": "Conectado"
    },
    "empleado": {
        "id_empleado": 1,
        "id_usuario": 1,
        "rfc": "RFC123456",
        "nss": "12345678901",
        "fecha_registro": "2024-01-01",
        "estado": true
    },
    "rol": {
        "id_rol": 1,
        "nombre_rol": "Empleado",
        "descripcion_rol": "Rol básico de empleado",
        "rol_activo": true,
        "fecha_asignacion": "2024-01-01T00:00:00.000Z"
    },
    "permisos": [
        {
            "id_modulo": 1,
            "nombre_modulo": "Checador",
            "descripcion_modulo": "Módulo de checadas",
            "modulo_activo": true,
            "ver": true,
            "crear": false,
            "editar": false,
            "eliminar": false
        }
    ],
    "departamento": {
        "id_departamento": 1,
        "nombre_departamento": "IT",
        "descripcion": "Departamento de TI",
        "ubicacion": "Edificio A",
        "color": "#3B82F6",
        "fecha_asignacion": "2024-01-01",
        "estado": true
    }
}
```

### 2. Logout (Cerrar Sesión)
**Endpoint:** `POST /api/session/close`

**Request:**
```json
{
    "userId": 1
}
```

**Response:**
```json
{
    "success": true,
    "message": "Logout exitoso"
}
```

### 3. Verificar Sesión
**Endpoint:** `GET /api/session/check?userId=1`

**Response:**
```json
{
    "success": true,
    "usuario": { /* ... */ },
    "empleado": { /* ... */ },
    "rol": { /* ... */ },
    "permisos": [ /* ... */ ]
}
```

## Pruebas con curl

### Probar Login
```bash
curl -X POST https://9dm7dqf9-3001.usw3.devtunnels.ms/api/session/validate \
  -H "Content-Type: application/json" \
  -d '{"username":"tu_usuario","password":"tu_contraseña"}'
```

### Probar Logout
```bash
curl -X POST https://9dm7dqf9-3001.usw3.devtunnels.ms/api/session/close \
  -H "Content-Type: application/json" \
  -d '{"userId":1}'
```

### Verificar Sesión
```bash
curl "https://9dm7dqf9-3001.usw3.devtunnels.ms/api/session/check?userId=1"
```

### Verificar que el backend esté funcionando
```bash
curl https://9dm7dqf9-3001.usw3.devtunnels.ms/
# Debería retornar: {"status":"OK","service":"FASITLAC API",...}
```

## Cambios Realizados en Mobile

### authService.js
- ✅ Login usa: `POST /api/session/validate`
- ✅ Logout usa: `POST /api/session/close`
- ✅ Parámetro de logout: `userId` (no `id_usuario`)

### Uso en la App
```javascript
import { login, logout } from './services/authService';

// Login
const response = await login('usuario123', 'password123');
if (response.success) {
    console.log('Usuario:', response.usuario);
    console.log('Empleado:', response.empleado);
    console.log('Rol:', response.rol);
    console.log('Permisos:', response.permisos);
    console.log('Departamento:', response.departamento);
}

// Logout
await logout(usuario.id_usuario);
```

## Notas Importantes

1. **El username puede ser el correo o el nombre de usuario** - el backend acepta ambos
2. **El usuario debe estar activo** (`activo = 'Activo'`)
3. **Las contraseñas están en texto plano** (por ahora, en producción debería usar bcrypt)
4. **El login actualiza automáticamente** el estado de conexión a 'Conectado'
5. **No todos los usuarios son empleados** - el campo `empleado` puede ser `null`
