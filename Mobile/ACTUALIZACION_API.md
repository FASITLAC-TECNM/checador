# Actualización de APIs Mobile - Checador FASITLAC

## 📋 Resumen de Cambios

Se han modernizado todas las APIs de servicios en la carpeta Mobile para que funcionen correctamente con el nuevo sistema de autenticación y gestión de empleados del backend.

## 🔄 Archivos Modificados

### 1. **config/api.js** ✅
- **Estado**: Verificado y correcto
- **URL Base**: `https://9dm7dqf9-3001.usw3.devtunnels.ms`
- **Función**: `getApiEndpoint(path)` - Construye URLs completas para las APIs

### 2. **services/authService.js** ✅ ACTUALIZADO
**Cambios principales:**
- Ahora retorna información completa del login incluyendo:
  - ✅ Usuario (id, username, email, nombre, telefono, foto, activo, conexion)
  - ✅ Empleado (id_empleado, rfc, nss, fecha_registro, estado)
  - ✅ Rol (id_rol, nombre_rol, descripcion_rol, tolerancia)
  - ✅ Permisos (array de módulos con permisos: ver, crear, editar, eliminar)
  - ✅ Departamento (id_departamento, nombre, ubicacion, color)
  - ✅ Token (si el backend lo genera)

**Respuesta del login:**
```javascript
{
  success: true,
  usuario: { /* datos del usuario */ },
  empleado: { /* datos del empleado o null */ },
  rol: { /* información del rol o null */ },
  permisos: [ /* array de permisos */ ],
  departamento: { /* departamento o null */ },
  token: 'token_jwt',
  message: 'Login exitoso'
}
```

### 3. **services/empleadosServices.js** ✅ ACTUALIZADO
**Funciones disponibles:**
- ✅ `getEmpleados()` - Obtener todos los empleados
- ✅ `getEmpleado(id)` - Obtener empleado por ID
- ✅ `getEmpleadoPorUsuario(idUsuario)` - Obtener empleado por ID de usuario
- ✅ `getEmpleadoConPermisos(id)` - **NUEVO** - Empleado con sus permisos
- ✅ `getStats()` - **NUEVO** - Estadísticas de empleados
- ✅ `crearEmpleado(empleado)` - Crear nuevo empleado
- ✅ `actualizarEmpleado(id, empleado)` - Actualizar empleado
- ✅ `eliminarEmpleado(id)` - Eliminar empleado
- ✅ `validarPinEmpleado(idEmpleado, pin)` - Validar PIN
- ✅ `buscarPorNSS(nss)` - **CORREGIDO** - Buscar por NSS
- ✅ `buscarPorRFC(rfc)` - **CORREGIDO** - Buscar por RFC
- ✅ `getEmpleadosConUsuarios()` - Empleados con datos completos
- ✅ `validarNSSUnico(nss, idExcluir)` - Validar NSS único
- ✅ `validarRFCUnico(rfc, idExcluir)` - Validar RFC único
- ✅ `cambiarEstadoEmpleado(id, estado, motivo)` - Cambiar estado
- ✅ `getHistorialEstadoEmpleado(id)` - Historial de cambios

**URLs corregidas:**
- ❌ Antes: `/empleados/buscar/nss/${nss}`
- ✅ Ahora: `/empleados/nss/${nss}`

### 4. **services/index.js** ✅ ACTUALIZADO
- Corregida importación: `empleadoService` → `empleadosServices.js`
- Agregadas nuevas exportaciones: `getEmpleadoConPermisos`, `getStats`

### 5. **services/api.js** ✅ ACTUALIZADO
- Actualizado para re-exportar servicios modulares correctamente
- Importa `empleadosServices.js` y `authService.js`

### 6. **login.jsx** ✅ ACTUALIZADO
**Cambios principales:**
- Ahora captura y pasa TODA la información del login:
  ```javascript
  const datosCompletos = {
    // Usuario
    id, id_empresa, username, email, nombre, telefono, foto, activo, conexion,

    // Empleado
    empleado: { /* info empleado */ },

    // Rol
    rol: { /* info rol */ },

    // Permisos
    permisos: [ /* array */ ],

    // Departamento
    departamento: { /* info depto */ },

    // Token
    token: 'jwt_token'
  };
  ```
- Muestra el nombre del departamento en el Alert de bienvenida

### 7. **home.jsx** ✅ ACTUALIZADO
**Mejoras visuales:**
- Extrae y muestra información de empleado, rol, departamento y permisos
- Muestra el nombre del departamento bajo el nombre del usuario
- El badge del rol ahora usa el color del departamento (si existe)
- Logs de debug para todas las propiedades
- Agregado estilo `departmentText` para mostrar el departamento

**Vista actualizada:**
```
┌─────────────────────────────┐
│ 👤 [Foto]                   │
│    Buenos días, username    │
│    Nombre Completo          │
│    Departamento TI          │ ← NUEVO
│    [Rol del Usuario]        │ ← Usa color del depto
└─────────────────────────────┘
```

### 8. **App.jsx** ✅ ACTUALIZADO
**Simplificación:**
- Ahora simplemente pasa todos los datos recibidos del login sin filtrar
- `handleLoginSuccess(data)` → `setUserData(data)`
- Mantiene toda la información disponible para todas las pantallas

## 🎯 Beneficios de la Actualización

1. **Información Completa**: Ahora la app mobile tiene acceso a TODA la información del usuario:
   - Datos personales
   - Información de empleado (NSS, RFC, PIN)
   - Rol y permisos del usuario
   - Departamento asignado

2. **Control de Acceso**: Con los permisos disponibles, puedes implementar:
   - Mostrar/ocultar funciones según permisos
   - Validar acciones según rol
   - Personalizar interfaz por departamento

3. **Consistencia**: Las URLs de las APIs coinciden exactamente con las rutas del backend

4. **Escalabilidad**: Fácil agregar nuevos servicios siguiendo el patrón modular

## 📱 Uso en Componentes

### Ejemplo: Acceder a datos del usuario en cualquier pantalla

```javascript
export const MiComponente = ({ userData }) => {
  // Datos del usuario
  const { nombre, email, username, foto } = userData;

  // Datos del empleado
  const empleado = userData.empleado;
  const nss = empleado?.nss;
  const rfc = empleado?.rfc;

  // Rol y permisos
  const rol = userData.rol;
  const nombreRol = rol?.nombre_rol;
  const permisos = userData.permisos;

  // Departamento
  const departamento = userData.departamento;
  const colorDepto = departamento?.color;

  // Verificar si tiene permiso
  const puedeCrear = permisos.some(p =>
    p.nombre_modulo === 'Usuarios' && p.crear === true
  );

  return (
    <View>
      <Text>Bienvenido {nombre}</Text>
      <Text>Rol: {nombreRol}</Text>
      <Text>Departamento: {departamento?.nombre_departamento}</Text>
      {puedeCrear && <Button title="Crear Usuario" />}
    </View>
  );
};
```

## 🔐 Endpoints Backend Disponibles

### Autenticación
- `POST /api/auth/login` - Login con username/password
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verificar` - Verificar sesión activa

### Empleados
- `GET /api/empleados` - Listar todos
- `GET /api/empleados/stats` - Estadísticas
- `GET /api/empleados/:id` - Por ID
- `GET /api/empleados/:id/permisos` - Con permisos
- `GET /api/empleados/usuario/:id_usuario` - Por usuario
- `GET /api/empleados/nss/:nss` - Buscar por NSS
- `GET /api/empleados/rfc/:rfc` - Buscar por RFC
- `POST /api/empleados` - Crear
- `PUT /api/empleados/:id` - Actualizar
- `DELETE /api/empleados/:id` - Eliminar

## ✅ Testing

Para probar los cambios:

```javascript
// En cualquier componente
import { login } from './services/authService';
import { getEmpleados, getStats } from './services/empleadosServices';

// Login
const response = await login('usuario', 'password');
console.log('Usuario:', response.usuario);
console.log('Empleado:', response.empleado);
console.log('Rol:', response.rol);
console.log('Permisos:', response.permisos);
console.log('Departamento:', response.departamento);

// Empleados
const empleados = await getEmpleados();
const stats = await getStats();
```

## 🚀 Próximos Pasos Sugeridos

1. **Implementar control de permisos en la UI**
   - Ocultar botones según permisos
   - Validar acciones antes de ejecutar

2. **Usar colores de departamento**
   - Personalizar temas por departamento
   - Badges con colores del departamento

3. **Gestión de sesión**
   - Guardar token en AsyncStorage
   - Auto-login con token guardado
   - Refresh token

4. **Validación de PIN**
   - Pantalla de confirmación con PIN
   - Para acciones sensibles

---

**Fecha de actualización**: Diciembre 2024
**Versión**: 2.0
**Desarrollado por**: FASITLAC™
