# Cambios en el Backend - Adaptación a Nuevo Esquema de Base de Datos

## Resumen de Cambios

Se ha adaptado completamente el backend para trabajar con el nuevo esquema de base de datos que incluye un sistema completo de roles y permisos.

## Tablas Principales Actualizadas

### Nombres de Tablas
- `usuarios` → `Usuario`
- `empleado` → `Empleado`

### Nuevas Tablas Implementadas
- `Rol` - Definición de roles
- `Usuario_rol` - Asignación de roles a usuarios
- `Modulo` - Módulos del sistema
- `Rol_has_modulo` - Permisos de roles sobre módulos
- `Tolerancia` - Configuración de tolerancias
- `Departamento` - Departamentos de la empresa
- `empleado_departamento` - Asignación de empleados a departamentos

## Cambios en el Endpoint de Login

### Endpoint: `POST /api/session/login`

#### Request Body
```json
{
  "username": "usuario@ejemplo.com",  // puede ser username o correo
  "password": "contraseña"
}
```

#### Response (Exitosa)
```json
{
  "success": true,
  "message": "Login exitoso",
  "usuario": {
    "id_usuario": 1,
    "id_empresa": 1,
    "username": "usuario",
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Completo",
    "telefono": "1234567890",
    "foto": "url_foto.jpg",
    "activo": "Activo",
    "conexion": "Conectado"
  },
  "empleado": {
    "id_empleado": 1,
    "id_usuario": 1,
    "rfc": "ABCD123456EFG",
    "nss": "12345678901234567",
    "fecha_registro": "2024-01-01",
    "fecha_modificacion": "2024-01-15",
    "estado": true
  },
  "rol": {
    "id_rol": 1,
    "nombre_rol": "Administrador",
    "descripcion_rol": "Acceso completo al sistema",
    "rol_activo": true,
    "fecha_asignacion": "2024-01-01T00:00:00.000Z",
    "id_tolerancia": 1,
    "nombre_tolerancia": "Tolerancia General",
    "tipo_tolerancia": "Ambos",
    "max_retardos": 3,
    "dias_aplicables": ["lunes", "martes", "miércoles", "jueves", "viernes"],
    "tolerancia_activa": true
  },
  "permisos": [
    {
      "id_modulo": 1,
      "nombre_modulo": "Usuarios",
      "descripcion_modulo": "Gestión de usuarios",
      "modulo_activo": true,
      "ver": true,
      "crear": true,
      "editar": true,
      "eliminar": true
    },
    {
      "id_modulo": 2,
      "nombre_modulo": "Empleados",
      "descripcion_modulo": "Gestión de empleados",
      "modulo_activo": true,
      "ver": true,
      "crear": true,
      "editar": true,
      "eliminar": false
    }
  ],
  "departamento": {
    "id_departamento": 1,
    "nombre_departamento": "Recursos Humanos",
    "descripcion": "Departamento de RH",
    "ubicacion": "Piso 3",
    "color": "#FF5733",
    "fecha_asignacion": "2024-01-01",
    "estado": true
  }
}
```

## Cambios en Verificar Sesión

### Endpoint: `GET /api/session/verificar-sesion?userId=1`

Ahora también retorna información completa del usuario, empleado, rol y permisos:

#### Response
```json
{
  "success": true,
  "usuario": { /* datos del usuario */ },
  "empleado": { /* datos del empleado */ },
  "rol": { /* datos del rol */ },
  "permisos": [ /* array de permisos */ ]
}
```

## Nuevo Endpoint: Obtener Empleado con Permisos

### Endpoint: `GET /api/empleados/:id/permisos`

Retorna información completa del empleado junto con su rol y permisos.

## Controladores Actualizados

### 1. `auth.controller.js`
- ✅ `login()` - Incluye rol, permisos y departamento
- ✅ `logout()` - Actualizado para nuevo esquema
- ✅ `verificarSesion()` - Incluye rol y permisos

### 2. `empleados.controller.js`
- ✅ Todas las queries actualizadas para tablas `Usuario` y `Empleado`
- ✅ Nuevo endpoint `getEmpleadoConPermisos()`
- ✅ Eliminados campos obsoletos (pin, estado_empleado)
- ✅ Campos actualizados según nuevo esquema

### 3. `usuarios.controller.js`
- ✅ Todas las queries actualizadas para tabla `Usuario`
- ✅ Campo `estado` → `conexion`
- ✅ Valores ENUM actualizados:
  - `activo`: 'Activo', 'Suspensión', 'Baja'
  - `conexion`: 'Conectado', 'Desconectado'

## Valores ENUM Actualizados

### Usuario.activo
- `'Activo'`
- `'Suspensión'`
- `'Baja'`

### Usuario.conexion
- `'Conectado'`
- `'Desconectado'`

## Uso en el Frontend

### Ejemplo de Login
```javascript
const login = async (username, password) => {
  const response = await fetch('http://localhost:3000/api/session/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (data.success) {
    // Guardar información del usuario
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    localStorage.setItem('empleado', JSON.stringify(data.empleado));
    localStorage.setItem('rol', JSON.stringify(data.rol));
    localStorage.setItem('permisos', JSON.stringify(data.permisos));
    localStorage.setItem('departamento', JSON.stringify(data.departamento));

    // Verificar permisos para un módulo específico
    const permisosUsuarios = data.permisos.find(p => p.nombre_modulo === 'Usuarios');
    if (permisosUsuarios && permisosUsuarios.ver) {
      // El usuario puede ver el módulo de usuarios
    }
  }
};
```

### Ejemplo de Verificación de Permisos
```javascript
// Función helper para verificar permisos
const tienePermiso = (nombreModulo, accion) => {
  const permisos = JSON.parse(localStorage.getItem('permisos') || '[]');
  const modulo = permisos.find(p => p.nombre_modulo === nombreModulo);

  if (!modulo) return false;

  return modulo[accion] === true; // accion: 'ver', 'crear', 'editar', 'eliminar'
};

// Uso
if (tienePermiso('Empleados', 'crear')) {
  // Mostrar botón de crear empleado
}

if (tienePermiso('Usuarios', 'editar')) {
  // Mostrar botón de editar usuario
}
```

## Notas Importantes

1. **Contraseñas**: Actualmente se almacenan en texto plano. Se recomienda implementar bcrypt para producción.

2. **Roles**: Un usuario puede tener múltiples roles en la BD, pero el login retorna solo el rol más reciente activo.

3. **Empleados**: No todos los usuarios son empleados. El campo `empleado` puede ser `null` si el usuario no está registrado como empleado.

4. **Departamentos**: Solo se retorna el departamento más reciente activo del empleado.

5. **Permisos**: Solo se retornan módulos activos (`estado = true`).

## Validaciones del Login

- ✅ Usuario debe existir
- ✅ Usuario debe estar activo (`activo = 'Activo'`)
- ✅ Contraseña debe coincidir
- ✅ Se actualiza el estado de conexión a 'Conectado'
- ✅ Se obtiene información completa del empleado (si existe)
- ✅ Se obtiene el rol activo más reciente
- ✅ Se obtienen todos los permisos del rol
- ✅ Se obtiene el departamento activo (si existe)

## Próximos Pasos Recomendados

1. Implementar bcrypt para hash de contraseñas
2. Implementar JWT para autenticación
3. Agregar middleware de validación de permisos
4. Implementar refresh tokens
5. Agregar logs de auditoría para login/logout
