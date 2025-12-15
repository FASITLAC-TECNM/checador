# Configuración de API - Mobile App

## URL Base del Backend
```
https://9dm7dqf9-5173.usw3.devtunnels.ms
```

## Configuración Actualizada

### Archivo: `Mobile/config/api.js`
La configuración centralizada de la API apunta al devtunnel:

```javascript
export const getApiEndpoint = (path = '') => {
    const BASE_URL = 'https://9dm7dqf9-5173.usw3.devtunnels.ms';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};
```

## Autenticación

### Login con Username y Password

**Endpoint:** `POST /api/auth/login`

**Request Body:**
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
        "estado": "Activo"
    },
    "rol": {
        "id_rol": 1,
        "nombre_rol": "Empleado",
        "descripcion_rol": "Rol básico de empleado"
    },
    "permisos": [
        {
            "id_modulo": 1,
            "nombre_modulo": "Checador",
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
        "color": "#3B82F6"
    }
}
```

**Response (Error):**
```json
{
    "error": "Credenciales inválidas"
}
```

### Logout

**Endpoint:** `POST /api/auth/logout`

**Request Body:**
```json
{
    "userId": 1
}
```

## Servicios Implementados

### authService.js
- `login(username, password)` - Autenticación de usuarios
- `logout(idUsuario)` - Cierre de sesión
- `verificarEmail(email)` - Verificar si existe un email
- `solicitarRecuperacion(email)` - Solicitar recuperación de contraseña
- `cambiarPassword(idUsuario, passwordActual, passwordNueva)` - Cambiar contraseña

### api.js (Usuarios y Empleados)
- Gestión completa de usuarios
- Gestión completa de empleados
- Validación de PIN de empleados

## Uso en el Login

El componente `LoginScreen` utiliza el servicio de autenticación:

```javascript
import { login } from './services/authService';

const handleLogin = async () => {
    const response = await login(username, password);
    if (response && response.success) {
        onLoginSuccess(response);
    }
};
```

## Notas Importantes

1. **El backend está en el devtunnel del amigo**, no necesitas correr un backend local
2. **La autenticación usa username y password**, no email
3. **El username puede ser el correo o el nombre de usuario** - el backend acepta ambos
4. **Todos los servicios apuntan a** `https://9dm7dqf9-5173.usw3.devtunnels.ms/api/*`
5. **El login retorna información completa** del usuario, empleado, rol, permisos y departamento

## Prueba con curl

```bash
# Probar login
curl -X POST https://9dm7dqf9-5173.usw3.devtunnels.ms/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario123","password":"contraseña123"}'

# Verificar que el backend responde
curl https://9dm7dqf9-5173.usw3.devtunnels.ms/
```

## Solución de Problemas

### Error: "Error del servidor"
- Verifica que el devtunnel esté activo
- Verifica que la URL sea correcta
- Revisa los logs del backend del amigo

### Error: "Credenciales inválidas"
- Verifica el username y password
- Asegúrate de que el usuario esté activo en la BD

### Error: "Usuario y contraseña son obligatorios"
- Ambos campos deben estar llenos
- No deben ser solo espacios en blanco
