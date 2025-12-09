# 📋 Cambios Realizados - Backend y Frontend

## Fecha: 2025-12-08

### 🎯 Objetivo
Alinear el código del backend y frontend con la estructura de base de datos documentada en [DOCUMENTACION_BD_CHECADOR.md](DOCUMENTACION_BD_CHECADOR.md).

---

## ✅ Cambios Realizados

### 🔧 Backend

#### 1. **Controlador de Usuarios** ([backend/src/controllers/usuarios.controller.js](backend/src/controllers/usuarios.controller.js))

**Cambios:**
- ✅ Se hizo obligatorio el campo `id_empresa` en la creación de usuarios
- ✅ Se eliminó el valor por defecto `null` para `id_empresa` (ahora es requerido)

**Antes:**
```javascript
if (!username || !email || !password || !nombre) { ... }
// id_empresa || null
```

**Después:**
```javascript
if (!id_empresa || !username || !email || !password || !nombre) { ... }
// id_empresa (requerido)
```

---

#### 2. **Nuevo Controlador de Credenciales** ([backend/src/controllers/credenciales.controller.js](backend/src/controllers/credenciales.controller.js))

**Creado desde cero** para manejar:
- 🔐 **PIN** (4 dígitos)
- 👆 **Huella dactilar** (BYTEA)
- 👤 **Reconocimiento facial** (BYTEA)

**Endpoints disponibles:**
- `GET /api/credenciales/empleado/:id_empleado` - Obtener credenciales
- `GET /api/credenciales/empleado/:id_empleado/metodos` - Ver métodos configurados
- `POST /api/credenciales` - Crear credenciales
- `PUT /api/credenciales/empleado/:id_empleado` - Actualizar credenciales
- `DELETE /api/credenciales/empleado/:id_empleado` - Eliminar credenciales
- `POST /api/credenciales/validar-pin` - Validar PIN
- `PUT /api/credenciales/empleado/:id_empleado/dactilar` - Actualizar huella
- `PUT /api/credenciales/empleado/:id_empleado/facial` - Actualizar facial

---

#### 3. **Controlador de Empleados** ([backend/src/controllers/empleados.controller.js](backend/src/controllers/empleados.controller.js))

**Cambios:**
- ❌ **Eliminado** el campo `pin` de la tabla `Empleado` (ahora está en `Credenciales`)
- ✅ **Agregado** el campo `horario_id` (referencia a la tabla `Horario`)
- ✅ Actualizados todos los queries SELECT para incluir `horario_id`

**Antes:**
```javascript
INSERT INTO Empleado (id_usuario, rfc, nss, fecha_registro, estado)
```

**Después:**
```javascript
INSERT INTO Empleado (id_usuario, rfc, nss, fecha_registro, estado, horario_id)
```

---

#### 4. **Nuevas Rutas** ([backend/src/routes/credenciales.routes.js](backend/src/routes/credenciales.routes.js))

Archivo creado con todas las rutas para gestión de credenciales.

---

#### 5. **Actualización de App.js** ([backend/src/app.js](backend/src/app.js))

**Agregado:**
```javascript
import credencialesRoutes from './routes/credenciales.routes.js';
app.use('/api/credenciales', credencialesRoutes);
```

---

### 🎨 Frontend (Administrator)

#### 1. **Nuevo Servicio de Credenciales** ([administrator/src/services/credencialesService.js](administrator/src/services/credencialesService.js))

**Creado desde cero** con las siguientes funciones:
- `getCredencialesByEmpleado(idEmpleado)`
- `getMetodosAutenticacion(idEmpleado)`
- `crearCredenciales(credenciales)`
- `actualizarCredenciales(idEmpleado, credenciales)`
- `eliminarCredenciales(idEmpleado)`
- `validarPin(idEmpleado, pin)`
- `actualizarDactilar(idEmpleado, dactilar)`
- `actualizarFacial(idEmpleado, facial)`

---

#### 2. **Servicio de Empleados Actualizado** ([administrator/src/services/empleadoService.js](administrator/src/services/empleadoService.js))

**Cambios:**
- ❌ **Eliminado** el campo `pin` de `crearEmpleado()`
- ✅ **Agregado** el campo `horario_id` (opcional)
- ⚠️ **Deprecado** `validarPinEmpleado()` - ahora redirige a `credencialesService.validarPin()`

**Antes:**
```javascript
const empleadoDB = {
    id_usuario: empleado.id_usuario,
    nss: empleado.nss,
    rfc: empleado.rfc.toUpperCase(),
    pin: empleado.pin  // ❌ Ya no existe
};
```

**Después:**
```javascript
const empleadoDB = {
    id_usuario: empleado.id_usuario,
    nss: empleado.nss,
    rfc: empleado.rfc.toUpperCase(),
    horario_id: empleado.horario_id || null  // ✅ Nuevo campo
};
```

---

#### 3. **API Service Actualizado** ([administrator/src/services/api.js](administrator/src/services/api.js))

**Agregado:**
```javascript
export { default as credencialesService } from './credencialesService';
```

---

## 🗄️ Estructura de Base de Datos Alineada

### Tabla `Usuario`
```sql
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    id_empresa INTEGER NOT NULL REFERENCES empresa(id),  -- ✅ Ahora requerido
    username VARCHAR(55) UNIQUE NOT NULL,
    correo VARCHAR(55) UNIQUE NOT NULL,
    contraseña TEXT NOT NULL,
    nombre TEXT NOT NULL,
    foto TEXT,
    telefono VARCHAR(10),
    activo ENUM DEFAULT 'Activo',
    conexion ENUM DEFAULT 'Desconectado',
    token_recuperacion INTEGER
);
```

### Tabla `Empleado`
```sql
CREATE TABLE empleado (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE NOT NULL REFERENCES usuario(id),
    rfc CHAR(13),
    nss CHAR(11),
    fecha_registro DATE DEFAULT CURRENT_DATE,
    fecha_modificacion DATE,
    estado BOOLEAN DEFAULT TRUE,
    horario_id INTEGER REFERENCES horario(id)  -- ✅ Nuevo campo
    -- ❌ pin eliminado (ahora está en Credenciales)
);
```

### Tabla `Credenciales` (Nueva)
```sql
CREATE TABLE credenciales (
    id SERIAL PRIMARY KEY,
    id_empleado INTEGER UNIQUE NOT NULL REFERENCES empleado(id),
    dactilar BYTEA,           -- Huella digital
    facial BYTEA,             -- Reconocimiento facial
    pin INTEGER,              -- PIN numérico
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    fecha_actualizacion DATE
);
```

---

## 🚀 Cómo Usar

### Crear un Empleado con Credenciales

**Paso 1: Crear Usuario**
```javascript
const usuario = await crearUsuario({
    id_empresa: 1,  // ✅ Ahora requerido
    username: 'jperez',
    email: 'juan.perez@empresa.com',
    password: 'password123',
    nombre: 'Juan Pérez',
    telefono: '4431234567'
});
```

**Paso 2: Crear Empleado**
```javascript
const empleado = await crearEmpleado({
    id_usuario: usuario.id_usuario,
    nss: '12345678901',  // 11 dígitos
    rfc: 'PELJ850315ABC', // 13 caracteres
    horario_id: 1        // Opcional
});
```

**Paso 3: Crear Credenciales**
```javascript
import { credencialesService } from './services/api';

const credenciales = await credencialesService.crearCredenciales({
    id_empleado: empleado.id,
    pin: '1234'  // 4 dígitos
});
```

**Paso 4: Validar PIN**
```javascript
const resultado = await credencialesService.validarPin(empleado.id, '1234');
console.log(resultado.valido); // true
```

---

## ⚠️ Cambios Breaking

### 1. Campo `id_empresa` ahora es obligatorio
**Antes:**
```javascript
crearUsuario({ username, email, password, nombre });
```

**Ahora:**
```javascript
crearUsuario({ id_empresa, username, email, password, nombre });
```

### 2. PIN ya no es parte de Empleado
**Antes:**
```javascript
crearEmpleado({ id_usuario, nss, rfc, pin });
```

**Ahora:**
```javascript
// 1. Crear empleado
const empleado = await crearEmpleado({ id_usuario, nss, rfc, horario_id });

// 2. Crear credenciales por separado
await credencialesService.crearCredenciales({ id_empleado: empleado.id, pin });
```

### 3. Validación de PIN
**Antes:**
```javascript
import { validarPinEmpleado } from './services/empleadoService';
await validarPinEmpleado(empleadoId, pin);
```

**Ahora:**
```javascript
import { credencialesService } from './services/api';
await credencialesService.validarPin(empleadoId, pin);
```

---

## 📊 Testing

### Test de API
```bash
# Verificar que el backend esté corriendo
curl http://localhost:3001/

# Debería devolver:
# {"status":"OK","service":"FASITLAC API","version":"1.0.0","message":"Api funcionando correctamente."}
```

### Endpoints Disponibles

#### **Usuarios**
- `GET /api/usuarios` - Obtener todos los usuarios
- `GET /api/usuarios/:id` - Obtener usuario por ID
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

#### **Empleados**
- `GET /api/empleados` - Obtener todos los empleados
- `GET /api/empleados/:id` - Obtener empleado por ID
- `GET /api/empleados/usuario/:id_usuario` - Obtener empleado por ID de usuario
- `POST /api/empleados` - Crear empleado
- `PUT /api/empleados/:id` - Actualizar empleado
- `DELETE /api/empleados/:id` - Eliminar empleado

#### **Credenciales** (Nuevo)
- `GET /api/credenciales/empleado/:id_empleado` - Obtener credenciales
- `POST /api/credenciales` - Crear credenciales
- `PUT /api/credenciales/empleado/:id_empleado` - Actualizar PIN
- `POST /api/credenciales/validar-pin` - Validar PIN

#### **Sesión**
- `POST /api/session/validate` - Login
- `POST /api/session/close` - Logout
- `GET /api/session/check` - Verificar sesión

---

## 📝 Notas Importantes

1. **Migración de Datos**: Si ya tienes datos en la BD antigua, necesitarás migrar el campo `pin` de la tabla `Empleado` a la nueva tabla `Credenciales`.

2. **Seguridad de PIN**: El PIN se almacena como INTEGER en la BD. En producción, considera encriptarlo.

3. **Datos Biométricos**: Los campos `dactilar` y `facial` son BYTEA (binarios). Asegúrate de enviar los datos correctamente codificados.

4. **Validaciones**: Todos los servicios incluyen validaciones de longitud y formato antes de enviar al backend.

---

## ✅ Checklist de Verificación

- [x] Controlador de usuarios actualizado
- [x] Nuevo controlador de credenciales creado
- [x] Controlador de empleados actualizado (sin PIN, con horario_id)
- [x] Rutas de credenciales creadas
- [x] App.js actualizado con nuevas rutas
- [x] Servicio de credenciales creado en frontend
- [x] Servicio de empleados actualizado en frontend
- [x] API service actualizado para exportar credencialesService
- [x] Backend probado y funcionando
- [ ] Migración de datos ejecutada (si aplica)
- [ ] Tests de integración ejecutados
- [ ] Documentación actualizada en README

---

## 🔗 Archivos Modificados

### Backend
1. [backend/src/controllers/usuarios.controller.js](backend/src/controllers/usuarios.controller.js)
2. [backend/src/controllers/empleados.controller.js](backend/src/controllers/empleados.controller.js)
3. [backend/src/controllers/credenciales.controller.js](backend/src/controllers/credenciales.controller.js) ⭐ **NUEVO**
4. [backend/src/routes/credenciales.routes.js](backend/src/routes/credenciales.routes.js) ⭐ **NUEVO**
5. [backend/src/app.js](backend/src/app.js)

### Frontend (Administrator)
1. [administrator/src/services/empleadoService.js](administrator/src/services/empleadoService.js)
2. [administrator/src/services/credencialesService.js](administrator/src/services/credencialesService.js) ⭐ **NUEVO**
3. [administrator/src/services/api.js](administrator/src/services/api.js)

---

## 🆘 Troubleshooting

### Error: "id_empresa es requerido"
**Solución**: Asegúrate de proporcionar `id_empresa` al crear usuarios:
```javascript
await crearUsuario({ id_empresa: 1, ...otrosC ampos });
```

### Error: "El empleado no tiene credenciales"
**Solución**: Crea las credenciales después de crear el empleado:
```javascript
await credencialesService.crearCredenciales({ id_empleado, pin: '1234' });
```

### Error: "Puerto 3001 en uso"
**Solución**: Detén otros procesos que estén usando el puerto:
```bash
netstat -ano | findstr :3001
taskkill /F /PID <PID>
```

---

**Última actualización**: 2025-12-08
**Autor**: Claude Code Assistant
