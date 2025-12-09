# 📊 Sistema de Checador - Base de Datos PostgreSQL

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura de la Base de Datos](#arquitectura-de-la-base-de-datos)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Descripción de Tablas](#descripción-de-tablas)
5. [Guía de Inserción de Datos](#guía-de-inserción-de-datos)
6. [Consultas Comunes](#consultas-comunes)
7. [Buenas Prácticas](#buenas-prácticas)
8. [Solución de Problemas](#solución-de-problemas)

---

## 📖 Descripción General

Sistema de control de asistencia empresarial que gestiona:
- ✅ Registro de entradas/salidas de empleados
- 👥 Gestión de usuarios, roles y permisos
- 🏢 Organización por departamentos
- ⏰ Horarios flexibles y turnos quebrados
- 📝 Incidencias (permisos, vacaciones, justificantes)
- 🔐 Autenticación biométrica (huella, facial, PIN)
- 📱 Soporte para dispositivos móviles y de escritorio

---

## 🏗️ Arquitectura de la Base de Datos

### Diagrama de Relaciones Principales

```
┌─────────────┐
│Configuracion│
└──────┬──────┘
       │
       ▼
┌─────────┐      ┌─────────┐      ┌──────────┐
│ Empresa │◄─────┤ Usuario │──────┤ Empleado │
└─────────┘      └────┬────┘      └────┬─────┘
                      │                │
                      ▼                │
                ┌─────────────┐        │
                │Usuario_Rol  │        │
                └──────┬──────┘        │
                       │               │
                       ▼               ▼
                  ┌─────┐      ┌──────────────┐
                  │ Rol │      │Empleado_Depto│
                  └─────┘      └──────┬───────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │ Departamento │
                              └──────────────┘

┌──────────┐      ┌──────────────────┐
│ Horario  │◄─────┤    Empleado      │
└──────────┘      └────────┬─────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │Registro         │
                  │Asistencia       │
                  └─────────────────┘
```

### Módulos del Sistema

| Módulo | Tablas | Descripción |
|--------|--------|-------------|
| **Configuración** | `configuracion`, `empresa` | Ajustes globales del sistema |
| **Usuarios** | `usuario`, `empleado`, `usuario_rol`, `rol` | Gestión de identidad |
| **Organización** | `departamento`, `empleado_departamento` | Estructura organizacional |
| **Asistencia** | `horario`, `registro_asistencia`, `incidencia` | Control de tiempo |
| **Seguridad** | `credenciales`, `tolerancia` | Autenticación y políticas |
| **Dispositivos** | `dispositivo_biometrico`, `dispositivo_movil`, `escritorio` | Hardware de registro |
| **Permisos** | `modulo`, `rolmodulo` | Control de acceso |
| **Eventos** | `evento`, `empleado_evento` | Notificaciones |

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- PostgreSQL 12 o superior
- Acceso de superusuario (postgres)
- Cliente psql instalado

### Paso 1: Crear la Base de Datos

```bash
# Conectar como superusuario
sudo -u postgres psql

# Crear la base de datos
CREATE DATABASE checador;

# Crear usuario dedicado (recomendado)
CREATE USER checador_user WITH PASSWORD 'tu_password_seguro_aqui';

# Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE checador TO checador_user;

# Conectar a la base de datos
\c checador

# Otorgar privilegios en el esquema public
GRANT ALL ON SCHEMA public TO checador_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO checador_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO checador_user;

# Salir
\q
```

### Paso 2: Ejecutar Script de Creación

Guarda el siguiente contenido en `crear_tablas.sql`:

```bash
psql -U postgres -d checador -f crear_tablas.sql
```

### Paso 3: Verificar Instalación

```sql
-- Conectar a la base de datos
\c checador

-- Listar todas las tablas
\dt

-- Verificar tipos ENUM creados
\dT

-- Ver estructura de una tabla específica
\d usuario

-- Probar inserción básica
INSERT INTO configuracion DEFAULT VALUES;
SELECT * FROM configuracion;
```

### Paso 4: Insertar Datos de Prueba

```bash
psql -U postgres -d checador -f datos_prueba.sql
```

---

## 📚 Descripción Detallada de Tablas

### 1️⃣ Configuración

**Propósito**: Almacena la configuración global del sistema.

```sql
CREATE TABLE configuracion (
    id SERIAL PRIMARY KEY,
    paleta_colores JSON,              -- Esquema de colores UI
    mantenimiento BOOLEAN,             -- Modo mantenimiento
    formato_fecha ENUM,                -- DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD
    formato_hora ENUM,                 -- 12 o 24 horas
    zona_horaria VARCHAR(50),          -- Ej: America/Mexico_City
    idioma ENUM,                       -- 'es' o 'en'
    max_intentos INTEGER,              -- Intentos de login permitidos
    credenciales_orden JSON            -- Orden de autenticación biométrica
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO configuracion (
    paleta_colores,
    mantenimiento,
    formato_fecha,
    formato_hora,
    zona_horaria,
    idioma,
    max_intentos,
    credenciales_orden
) VALUES (
    '{"primary": "#4F46E5", "secondary": "#10B981", "accent": "#F59E0B"}',
    FALSE,
    'DD/MM/YYYY',
    '24',
    'America/Mexico_City',
    'es',
    3,
    '["facial", "huella", "pin"]'
);
```

---

### 2️⃣ Empresa

**Propósito**: Representa organizaciones que usan el sistema (multi-tenant).

```sql
CREATE TABLE empresa (
    id SERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(30) NOT NULL,
    logo_empresa VARCHAR(255),         -- URL del logo
    estado BOOLEAN DEFAULT TRUE,       -- Activa/Inactiva
    fecha_empresa DATE,                -- Fecha de fundación
    fecha_registro DATE DEFAULT CURRENT_DATE,
    id_configuracion INTEGER REFERENCES configuracion(id)
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO empresa (
    nombre_empresa,
    logo_empresa,
    estado,
    fecha_empresa,
    id_configuracion
) VALUES (
    'TecnoSoluciones SA',
    'https://example.com/logo.png',
    TRUE,
    '2020-01-15',
    1
);
```

---

### 3️⃣ Usuario

**Propósito**: Credenciales de acceso al sistema.

```sql
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    id_empresa INTEGER NOT NULL REFERENCES empresa(id),
    username VARCHAR(55) UNIQUE NOT NULL,
    correo VARCHAR(55) UNIQUE NOT NULL,
    contraseña TEXT NOT NULL,              -- Hash bcrypt
    nombre TEXT NOT NULL,
    foto TEXT,                             -- URL foto de perfil
    telefono VARCHAR(10),
    activo ENUM DEFAULT 'Activo',          -- Activo/Suspensión/Baja
    conexion ENUM DEFAULT 'Desconectado',  -- Conectado/Desconectado
    token_recuperacion INTEGER             -- Token para reset password
);
```

**Ejemplo de inserción:**
```sql
-- IMPORTANTE: La contraseña debe estar hasheada con bcrypt
-- Ejemplo en Node.js: bcrypt.hash('password123', 10)

INSERT INTO usuario (
    id_empresa,
    username,
    correo,
    contraseña,
    nombre,
    telefono,
    activo
) VALUES (
    1,
    'jperez',
    'juan.perez@tecnosoluciones.com',
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',  -- password123
    'Juan Pérez López',
    '4431234567',
    'Activo'
);
```

---

### 4️⃣ Empleado

**Propósito**: Información laboral del empleado.

```sql
CREATE TABLE empleado (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE NOT NULL REFERENCES usuario(id),
    rfc CHAR(13),                      -- RFC con homoclave
    nss CHAR(11),                      -- Número de Seguro Social
    fecha_registro DATE DEFAULT CURRENT_DATE,
    fecha_modificacion DATE,
    estado BOOLEAN DEFAULT TRUE,
    horario_id INTEGER REFERENCES horario(id)
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO empleado (
    id_usuario,
    rfc,
    nss,
    estado,
    horario_id
) VALUES (
    1,
    'PELJ850315ABC',
    '12345678901',
    TRUE,
    1
);
```

---

### 5️⃣ Departamento

**Propósito**: Áreas organizacionales de la empresa.

```sql
CREATE TABLE departamento (
    id_departamento SERIAL PRIMARY KEY,
    nombre VARCHAR(55) NOT NULL,
    descripcion VARCHAR(100),
    ubicacion INTEGER[],               -- Array de códigos de ubicación
    jefes TEXT[],                      -- Array de IDs de jefes
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN DEFAULT TRUE,
    color VARCHAR(7)                   -- Color hexadecimal (#RRGGBB)
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO departamento (
    nombre,
    descripcion,
    color,
    estado
) VALUES 
    ('Recursos Humanos', 'Gestión de personal y nómina', '#3B82F6', TRUE),
    ('Tecnología', 'Desarrollo de software e infraestructura', '#10B981', TRUE),
    ('Ventas', 'Comercialización y atención a clientes', '#F59E0B', TRUE);
```

---

### 6️⃣ Horario

**Propósito**: Define los horarios de trabajo (incluyendo turnos quebrados).

```sql
CREATE TABLE horario (
    id SERIAL PRIMARY KEY,
    date_ini DATE,                     -- Fecha inicio vigencia
    date_fin DATE,                     -- Fecha fin vigencia
    estado VARCHAR(50),                -- Activo/Inactivo
    config_horario ENUM DEFAULT 'Semanal',  -- Semanal/Mensual/Diario
    config_excep JSON                  -- Configuración detallada
);
```

**Ejemplo - Horario Normal (Continuo):**
```sql
INSERT INTO horario (
    date_ini,
    date_fin,
    estado,
    config_horario,
    config_excep
) VALUES (
    '2024-01-01',
    '2024-12-31',
    'Activo',
    'Semanal',
    '{
        "dias": ["lunes", "martes", "miercoles", "jueves", "viernes"],
        "turnos": [
            {"entrada": "09:00", "salida": "18:00"}
        ],
        "tipo": "continuo",
        "total_horas": 9
    }'
);
```

**Ejemplo - Horario Quebrado:**
```sql
INSERT INTO horario (
    date_ini,
    date_fin,
    estado,
    config_horario,
    config_excep
) VALUES (
    '2024-01-01',
    '2024-12-31',
    'Activo',
    'Semanal',
    '{
        "dias": ["lunes", "martes", "miercoles", "jueves", "viernes"],
        "turnos": [
            {"entrada": "08:00", "salida": "13:00"},
            {"entrada": "15:00", "salida": "19:00"}
        ],
        "tipo": "quebrado",
        "total_horas": 9,
        "descanso": "13:00-15:00"
    }'
);
```

---

### 7️⃣ Rol

**Propósito**: Define niveles de acceso y permisos.

```sql
CREATE TABLE rol (
    id SERIAL PRIMARY KEY,
    id_tolerancia INTEGER REFERENCES tolerancia(id),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    contador_retardos INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_edicion TIMESTAMP,
    jerarquia INTEGER                  -- 1=Mayor autoridad, 10=Menor
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO rol (nombre, descripcion, jerarquia) VALUES
    ('Administrador', 'Control total del sistema', 1),
    ('Gerente', 'Gestión de departamento y personal', 2),
    ('Supervisor', 'Supervisión de equipo', 3),
    ('Empleado', 'Usuario estándar', 4);
```

---

### 8️⃣ Tolerancia

**Propósito**: Políticas de tolerancia para retardos.

```sql
CREATE TABLE tolerancia (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo_tolerancia ENUM DEFAULT 'Entrada',  -- Entrada/Salida/Ambos
    max_retardos INTEGER DEFAULT 3,
    dias_aplicables JSON,              -- Días de la semana aplicables
    estado BOOLEAN DEFAULT TRUE,
    tipo ENUM DEFAULT 'general'        -- general/empleado/departamento/rol
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO tolerancia (
    nombre,
    tipo_tolerancia,
    max_retardos,
    dias_aplicables,
    tipo
) VALUES (
    'Tolerancia Estándar',
    'Entrada',
    3,
    '["lunes", "martes", "miercoles", "jueves", "viernes"]',
    'general'
);
```

---

### 9️⃣ Registro de Asistencia

**Propósito**: Registra cada entrada/salida de empleados.

```sql
CREATE TABLE registro_asistencia (
    id SERIAL PRIMARY KEY,
    id_empleado INTEGER NOT NULL REFERENCES empleado(id),
    estado BOOLEAN DEFAULT TRUE,
    dispositivo ENUM,                  -- Huella/Teclado/Facial
    tipo ENUM,                         -- Movil/Escritorio
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Ejemplo de inserción:**
```sql
-- Registro de entrada
INSERT INTO registro_asistencia (
    id_empleado,
    estado,
    dispositivo,
    tipo,
    fecha
) VALUES (
    1,
    TRUE,
    'Facial',
    'Escritorio',
    CURRENT_TIMESTAMP
);

-- Registro de salida (2 horas después)
INSERT INTO registro_asistencia (
    id_empleado,
    estado,
    dispositivo,
    tipo,
    fecha
) VALUES (
    1,
    TRUE,
    'Facial',
    'Escritorio',
    CURRENT_TIMESTAMP + INTERVAL '9 hours'
);
```

---

### 🔟 Incidencia

**Propósito**: Gestiona permisos, vacaciones, justificantes.

```sql
CREATE TABLE incidencia (
    id SERIAL PRIMARY KEY,
    id_empleado INTEGER NOT NULL REFERENCES empleado(id),
    motivo TEXT,
    tipo_incidencia ENUM,              -- retardo/justificante/permiso/vacaciones/dias_festivos
    fecha_aprob DATE,                  -- Fecha de aprobación
    fecha_ini DATE,                    -- Fecha inicio
    fecha_fin DATE,                    -- Fecha fin
    observaciones VARCHAR(255),
    estado ENUM DEFAULT 'pendiente'    -- aprobada/rechazada/pendiente
);
```

**Ejemplo de inserción:**
```sql
-- Solicitud de vacaciones
INSERT INTO incidencia (
    id_empleado,
    motivo,
    tipo_incidencia,
    fecha_ini,
    fecha_fin,
    estado
) VALUES (
    1,
    'Vacaciones de verano',
    'vacaciones',
    '2024-07-15',
    '2024-07-29',
    'pendiente'
);

-- Justificante médico
INSERT INTO incidencia (
    id_empleado,
    motivo,
    tipo_incidencia,
    fecha_ini,
    fecha_fin,
    observaciones,
    estado
) VALUES (
    2,
    'Consulta médica',
    'justificante',
    '2024-06-10',
    '2024-06-10',
    'Adjuntar comprobante médico',
    'aprobada'
);
```

---

### 1️⃣1️⃣ Credenciales

**Propósito**: Almacena datos biométricos del empleado.

```sql
CREATE TABLE credenciales (
    id SERIAL PRIMARY KEY,
    id_empleado INTEGER UNIQUE NOT NULL REFERENCES empleado(id),
    dactilar BYTEA,                    -- Huella digital (binario)
    facial BYTEA,                      -- Patrón facial (binario)
    pin INTEGER,                       -- PIN numérico
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    fecha_actualizacion DATE
);
```

**Ejemplo de inserción:**
```sql
-- Insertar PIN básico
INSERT INTO credenciales (
    id_empleado,
    pin,
    fecha_creacion
) VALUES (
    1,
    1234,
    CURRENT_DATE
);

-- Nota: Los datos biométricos (dactilar, facial) se insertan 
-- desde la aplicación que captura estos datos
```

---

### 1️⃣2️⃣ Dispositivo Biométrico

**Propósito**: Gestiona lectores de huella y cámaras faciales.

```sql
CREATE TABLE dispositivo_biometrico (
    id_dispositivo_biometrico SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    tipo ENUM,                         -- camara/huella
    puerto VARCHAR(10),                -- Puerto USB/COM
    ip VARCHAR(15),                    -- IP si es dispositivo red
    estado ENUM DEFAULT 'inactivo',    -- activo/inactivo/error/no_detectado
    color JSON,                        -- Configuración visual
    id_escritorio INTEGER REFERENCES escritorio(id)
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO dispositivo_biometrico (
    nombre,
    descripcion,
    tipo,
    puerto,
    estado,
    id_escritorio
) VALUES (
    'Lector Principal Entrada',
    'Lector de huellas ZK4500',
    'huella',
    'COM3',
    'activo',
    1
);
```

---

### 1️⃣3️⃣ Escritorio

**Propósito**: Estaciones de trabajo con lectores biométricos.

```sql
CREATE TABLE escritorio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    ip TEXT,                           -- IP en la red
    mac TEXT,                          -- Dirección MAC
    sistema_operativo TEXT,            -- Windows/Linux/macOS
    estado ENUM DEFAULT 'activo',      -- activo/inactivo
    ubicacion TEXT,                    -- Ubicación física
    ultima_sync TIMESTAMP,             -- Última sincronización
    dispositivos_biometricos JSON,     -- Array de dispositivos
    id_configuracion INTEGER REFERENCES configuracion(id)
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO escritorio (
    nombre,
    descripcion,
    ip,
    mac,
    sistema_operativo,
    estado,
    ubicacion
) VALUES (
    'Recepción Principal',
    'Estación de entrada principal',
    '192.168.1.100',
    '00:1B:44:11:3A:B7',
    'Windows 10',
    'activo',
    'Planta Baja - Entrada'
);
```

---

### 1️⃣4️⃣ Dispositivo Móvil

**Propósito**: Registra dispositivos móviles autorizados.

```sql
CREATE TABLE dispositivo_movil (
    id SERIAL PRIMARY KEY,
    id_empleado INTEGER NOT NULL REFERENCES empleado(id),
    tipo ENUM,                         -- Huella/Facial/Teclado
    sistema_operativo ENUM,            -- iOS/Android
    fecha DATE DEFAULT CURRENT_DATE,
    estado BOOLEAN DEFAULT TRUE,
    id_usuario INTEGER REFERENCES usuario(id),
    root BOOLEAN DEFAULT FALSE         -- Dispositivo rooteado/jailbreak
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO dispositivo_movil (
    id_empleado,
    tipo,
    sistema_operativo,
    estado,
    id_usuario,
    root
) VALUES (
    1,
    'Facial',
    'iOS',
    TRUE,
    1,
    FALSE
);
```

---

### 1️⃣5️⃣ Módulo

**Propósito**: Define módulos/funcionalidades del sistema.

```sql
CREATE TABLE modulo (
    id SERIAL PRIMARY KEY,
    estado BOOLEAN DEFAULT TRUE,
    nombre TEXT NOT NULL,
    descripcion TEXT
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO modulo (nombre, descripcion, estado) VALUES
    ('Usuarios', 'Gestión de usuarios y empleados', TRUE),
    ('Asistencia', 'Registro y reportes de asistencia', TRUE),
    ('Incidencias', 'Gestión de permisos y vacaciones', TRUE),
    ('Reportes', 'Generación de reportes', TRUE),
    ('Configuración', 'Ajustes del sistema', TRUE);
```

---

### 1️⃣6️⃣ Rol-Módulo

**Propósito**: Define permisos de roles sobre módulos.

```sql
CREATE TABLE rolmodulo (
    id SERIAL PRIMARY KEY,
    id_rol INTEGER NOT NULL REFERENCES rol(id),
    id_modulo INTEGER NOT NULL REFERENCES modulo(id),
    ver BOOLEAN DEFAULT FALSE,
    crear BOOLEAN DEFAULT FALSE,
    editar BOOLEAN DEFAULT FALSE,
    eliminar BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_edicion TIMESTAMP
);
```

**Ejemplo de inserción:**
```sql
-- Dar permisos completos al Administrador en todos los módulos
INSERT INTO rolmodulo (id_rol, id_modulo, ver, crear, editar, eliminar)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE
FROM modulo;

-- Dar solo lectura al Empleado
INSERT INTO rolmodulo (id_rol, id_modulo, ver, crear, editar, eliminar)
SELECT 4, id, TRUE, FALSE, FALSE, FALSE
FROM modulo
WHERE nombre IN ('Asistencia', 'Incidencias');
```

---

### 1️⃣7️⃣ Evento

**Propósito**: Notificaciones y alertas del sistema.

```sql
CREATE TABLE evento (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado BOOLEAN DEFAULT TRUE,
    tipo_evento ENUM                   -- notificacion/anuncio/alerta/recordatorio
);
```

**Ejemplo de inserción:**
```sql
INSERT INTO evento (titulo, descripcion, tipo_evento) VALUES
    ('Mantenimiento Programado', 'El sistema estará en mantenimiento el sábado', 'anuncio'),
    ('Registro Pendiente', 'No has registrado tu salida', 'alerta');
```

---

### 1️⃣8️⃣ Empleado-Evento

**Propósito**: Relaciona eventos con empleados (notificaciones personalizadas).

```sql
CREATE TABLE empleado_evento (
    id_evento_empleado SERIAL PRIMARY KEY,
    fecha_visualizacion DATE,
    fecha_actualizacion DATE,
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    estado_visualizacion ENUM DEFAULT 'no_leido',  -- no_leido/leido/confirmado/archivado
    id_evento INTEGER NOT NULL REFERENCES evento(id),
    id_empleado INTEGER NOT NULL REFERENCES empleado(id)
);
```

**Ejemplo de inserción:**
```sql
-- Enviar evento a un empleado específico
INSERT INTO empleado_evento (id_evento, id_empleado, estado_visualizacion)
VALUES (1, 1, 'no_leido');

-- Enviar evento a todos los empleados
INSERT INTO empleado_evento (id_evento, id_empleado, estado_visualizacion)
SELECT 1, id, 'no_leido'
FROM empleado
WHERE estado = TRUE;
```

---

## 📝 Guía de Inserción de Datos

### Orden de Inserción Recomendado

```sql
-- 1. Configuración base
INSERT INTO configuracion (...) VALUES (...);

-- 2. Empresa
INSERT INTO empresa (...) VALUES (...);

-- 3. Usuarios
INSERT INTO usuario (...) VALUES (...);

-- 4. Horarios
INSERT INTO horario (...) VALUES (...);

-- 5. Empleados
INSERT INTO empleado (...) VALUES (...);

-- 6. Departamentos
INSERT INTO departamento (...) VALUES (...);

-- 7. Relación Empleado-Departamento
INSERT INTO empleado_departamento (...) VALUES (...);

-- 8. Roles
INSERT INTO rol (...) VALUES (...);

-- 9. Relación Usuario-Rol
INSERT INTO usuario_rol (...) VALUES (...);

-- 10. Módulos
INSERT INTO modulo (...) VALUES (...);

-- 11. Permisos Rol-Módulo
INSERT INTO rolmodulo (...) VALUES (...);

-- 12. Dispositivos y otros datos secundarios
```

### Script Completo de Ejemplo

```sql
-- ===== EJEMPLO COMPLETO DE INSERCIÓN =====

BEGIN;

-- 1. Configuración
INSERT INTO configuracion (
    formato_fecha, zona_horaria, idioma, max_intentos
) VALUES (
    'DD/MM/YYYY', 'America/Mexico_City', 'es', 3
) RETURNING id;  -- Asumiendo ID = 1

-- 2. Empresa
INSERT INTO empresa (
    nombre_empresa, estado, id_configuracion
) VALUES (
    'Mi Empresa SA', TRUE, 1
) RETURNING id;  -- Asumiendo ID = 1

-- 3. Usuario
INSERT INTO usuario (
    id_empresa, username, correo, contraseña, nombre
) VALUES (
    1, 'admin', 'admin@miempresa.com', 
    '$2b$10$hashedpassword', 'Administrador'
) RETURNING id;  -- Asumiendo ID = 1

-- 4. Horario
INSERT INTO horario (
    date_ini, date_fin, estado, config_horario, config_excep
) VALUES (
    '2024-01-01', '2024-12-31', 'Activo', 'Semanal',
    '{"dias": ["lunes","martes","miercoles","jueves","viernes"],
      "turnos": [{"entrada": "09:00", "salida": "18:00"}],
      "tipo": "continuo", "total_horas": 9}'
) RETURNING id;  -- Asumiendo ID = 1

-- 5. Empleado
INSERT INTO empleado (
    id_usuario, rfc, nss, horario_id
) VALUES (
    1, 'AAAA800101AAA', '12345678901', 1
) RETURNING id;  -- Asumiendo ID = 1

-- 6. Departamento
INSERT INTO departamento (
    nombre, descripcion, color
) VALUES (
    'Administración', 'Departamento administrativo', '#3B82F6'
) RETURNING id_departamento;  -- Asumiendo ID = 1

-- 7. Relación Empleado-Departamento
INSERT INTO empleado_departamento (
    id_empleado, id_departamento
) VALUES (1, 1);

-- 8. Rol
INSERT INTO rol (
    nombre, descripcion, jerarquia
) VALUES (
    'Administrador', 'Acceso completo', 1
) RETURNING id;  -- Asumiendo ID = 1

-- 9. Relación Usuario-Rol
INSERT INTO usuario_rol (
    id_usuario, id_rol
) VALUES (1, 1);

COMMIT;
```

---

## 🔍 Consultas Comunes

### 👤 Usuarios y Empleados

```sql
-- Ver todos los usuarios con su información de empleado
SELECT 
    u.id,
    u.username,
    u.nombre,
    u.correo,
    e.rfc,
    e.nss,
    u.activo,
    u.conexion
FROM usuario u
LEFT JOIN empleado e ON u.id = e.id_usuario
ORDER BY u.nombre;

-- Buscar usuario por correo
SELECT * FROM usuario 
WHERE correo = 'ejemplo@empresa.com';

-- Contar empleados activos
SELECT COUNT(*) AS empleados_activos
FROM empleado
WHERE estado = TRUE;
```

### 🏢 Departamentos y Organización

```sql
-- Ver empleados por departamento
SELECT 
    d.nombre AS departamento,
    u.nombre AS empleado,
    ed.fecha_asignacion
FROM departamento d
JOIN empleado_departamento ed ON d.id_departamento = ed.id_departamento
JOIN empleado e ON ed.id_empleado = e.id
JOIN usuario u ON e.id_usuario = u.id
WHERE ed.estado = TRUE
ORDER BY d.nombre, u.nombre;

-- Contar empleados por departamento
SELECT 
    d.nombre AS departamento,
    COUNT(ed.id_empleado) AS total_empleados
FROM departamento d
LEFT JOIN empleado_departamento ed ON d.id_departamento = ed.id_departamento
WHERE ed.estado = TRUE OR ed.estado IS NULL
GROUP BY d.nombre
ORDER BY total_empleados DESC;
```

### ⏰ Asistencia

```sql
-- Registros de asistencia de hoy
SELECT 
    u.nombre AS empleado,
    ra.fecha,
    ra.dispositivo,
    ra.tipo
FROM registro_asistencia ra
JOIN empleado e ON ra.id_empleado = e.id
JOIN usuario u ON e.id_usuario = u.id
WHERE DATE(ra.fecha) = CURRENT_DATE
ORDER BY ra.fecha DESC;

-- Empleados que no han registrado entrada hoy
SELECT 
    u.id,
    u.nombre,
    u.telefono
FROM usuario u
JOIN empleado e ON u.id = e.id_usuario
WHERE e.estado = TRUE
AND NOT EXISTS (
    SELECT 1 FROM registro_asistencia ra
    WHERE ra.id_empleado = e.id
    AND DATE(ra.fecha) = CURRENT_DATE
);

-- Calcular horas trabajadas por empleado en un día
SELECT 
    u.nombre AS empleado,
    DATE(ra.fecha) AS fecha,
    MIN(ra.fecha) AS entrada,
    MAX(ra.fecha) AS salida,
    EXTRACT(EPOCH FROM (MAX(ra.fecha) - MIN(ra.fecha)))/3600 AS horas_trabajadas
FROM registro_asistencia ra
JOIN empleado e ON ra.id_empleado = e.id
JOIN usuario u ON e.id_usuario = u.id
WHERE DATE(ra.fecha) = CURRENT_DATE
GROUP BY u.nombre, DATE(ra.fecha);
```

### 📊 Reportes

```sql
-- Reporte mensual de asistencia
SELECT 
    u.nombre AS empleado,
    COUNT(DISTINCT DATE(ra.fecha)) AS dias_asistidos,
    EXTRACT(MONTH FROM ra.fecha) AS mes,
    EXTRACT(YEAR FROM ra.fecha) AS año
FROM registro_asistencia ra
JOIN empleado e ON ra.id_empleado = e.id
JOIN usuario u ON e.id_usuario = u.id
WHERE EXTRACT(MONTH FROM ra.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY u.nombre, EXTRACT(MONTH FROM ra.fecha), EXTRACT(YEAR FROM ra.fecha);

-- Incidencias pendientes
SELECT 
    u.nombre AS empleado,
    i.tipo_incidencia,
    i.fecha_ini,
    i.fecha_fin,
    i.motivo
FROM incidencia i
JOIN empleado e ON i.id_empleado = e.id
JOIN usuario u ON e.id_usuario = u.id
WHERE i.estado = 'pendiente'
ORDER BY i.fecha_ini;
```

### 🎭 Roles y Permisos

```sql
-- Ver permisos de un rol específico
SELECT 
    r.nombre AS rol,
    m.nombre AS modulo,
    rm.ver,
    rm.crear,
    rm.editar,
    rm.eliminar
FROM rol r
JOIN rolmodulo rm ON r.id = rm.id_rol
JOIN modulo m ON rm.id_modulo = m.id
WHERE r.nombre = 'Administrador';

-- Usuarios con sus roles
SELECT 
    u.nombre AS usuario,
    r.nombre AS rol,
    r.jerarquia
FROM usuario u
JOIN usuario_rol ur ON u.id = ur.id_usuario
JOIN rol r ON ur.id_rol = r.id
WHERE ur.estado = TRUE
ORDER BY r.jerarquia, u.nombre;
```

### 📱 Dispositivos

```sql
-- Dispositivos biométricos activos
SELECT 
    db.nombre,
    db.tipo,
    db.estado,
    e.nombre AS ubicacion
FROM dispositivo_biometrico db
LEFT JOIN escritorio e ON db.id_escritorio = e.id
WHERE db.estado = 'activo';

-- Empleados con dispositivos móviles registrados
SELECT 
    u.nombre AS empleado,
    dm.sistema_operativo,
    dm.tipo,
    dm.fecha AS fecha_registro
FROM dispositivo_movil dm
JOIN empleado e ON dm.id_empleado = e.id
JOIN usuario u ON e.id_usuario = u.id
WHERE dm.estado = TRUE;
```

---

## ✅ Buenas Prácticas

### 1. Seguridad

```sql
-- ❌ NUNCA almacenar contraseñas en texto plano
INSERT INTO usuario (contraseña) VALUES ('password123');

-- ✅ SIEMPRE usar hash bcrypt
INSERT INTO usuario (contraseña) 
VALUES ('$2b$10$EixZaYVK1fsbw1ZfbX3OXe...');

-- ✅ Usar índices para búsquedas frecuentes
CREATE INDEX idx_usuario_correo ON usuario(correo);
CREATE INDEX idx_registro_fecha ON registro_asistencia(fecha);

-- ✅ Establecer CASCADE apropiadamente
-- Si eliminas un usuario, elimina automáticamente el empleado
ALTER TABLE empleado 
ADD CONSTRAINT fk_empleado_usuario 
FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE;
```

### 2. Integridad de Datos

```sql
-- ✅ Usar transacciones para operaciones múltiples
BEGIN;
    INSERT INTO usuario (...) VALUES (...);
    INSERT INTO empleado (...) VALUES (...);
    INSERT INTO usuario_rol (...) VALUES (...);
COMMIT;

-- ✅ Validar datos antes de insertar
-- Verificar que el usuario no exista
SELECT COUNT(*) FROM usuario WHERE username = 'nuevo_usuario';

-- ✅ Usar COALESCE para valores por defecto
SELECT 
    nombre,
    COALESCE(telefono, 'Sin teléfono') AS telefono
FROM usuario;
```

### 3. Rendimiento

```sql
-- ✅ Usar LIMIT en consultas grandes
SELECT * FROM registro_asistencia 
ORDER BY fecha DESC 
LIMIT 100;

-- ✅ Crear vistas para consultas complejas frecuentes
CREATE VIEW vista_empleados_completa AS
SELECT 
    u.id,
    u.nombre,
    u.correo,
    e.rfc,
    d.nombre AS departamento,
    r.nombre AS rol
FROM usuario u
JOIN empleado e ON u.id = e.id_usuario
LEFT JOIN empleado_departamento ed ON e.id = ed.id_empleado
LEFT JOIN departamento d ON ed.id_departamento = d.id_departamento
LEFT JOIN usuario_rol ur ON u.id = ur.id_usuario
LEFT JOIN rol r ON ur.id_rol = r.id;

-- Usar la vista
SELECT * FROM vista_empleados_completa WHERE departamento = 'Sistemas';
```

### 4. Mantenimiento

```sql
-- ✅ Respaldar regularmente
pg_dump checador > backup_checador_$(date +%Y%m%d).sql

-- ✅ Analizar y optimizar
ANALYZE usuario;
VACUUM registro_asistencia;

-- ✅ Monitorear tamaño de tablas
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🔧 Solución de Problemas

### Error: Violación de llave foránea

```sql
-- Problema: Error al insertar empleado
ERROR: insert or update on table "empleado" violates foreign key constraint

-- Solución: Verificar que el usuario existe
SELECT id FROM usuario WHERE id = 123;

-- Si no existe, crear primero el usuario
INSERT INTO usuario (...) VALUES (...);
```

### Error: Duplicado de llave única

```sql
-- Problema: 
ERROR: duplicate key value violates unique constraint "usuario_username_key"

-- Solución: Verificar valores únicos antes de insertar
SELECT username FROM usuario WHERE username = 'jperez';

-- Actualizar en lugar de insertar si ya existe
UPDATE usuario SET nombre = 'Nuevo Nombre' WHERE username = 'jperez';
```

### Error: Enum inválido

```sql
-- Problema:
ERROR: invalid input value for enum enum_activo_usuario: "activo"

-- Solución: Usar mayúscula inicial
INSERT INTO usuario (activo) VALUES ('Activo');  -- ✅ Correcto
```

### Resetear secuencias después de importar datos

```sql
-- Si importaste datos con IDs específicos, resetea las secuencias
SELECT setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));
SELECT setval('empleado_id_seq', (SELECT MAX(id) FROM empleado));
SELECT setval('departamento_id_departamento_seq', (SELECT MAX(id_departamento) FROM departamento));
```

### Limpiar datos de prueba

```sql
-- ⚠️ CUIDADO: Esto eliminará TODOS los datos
TRUNCATE TABLE empleado_evento CASCADE;
TRUNCATE TABLE empleado_departamento CASCADE;
TRUNCATE TABLE usuario_rol CASCADE;
TRUNCATE TABLE registro_asistencia CASCADE;
TRUNCATE TABLE incidencia CASCADE;
TRUNCATE TABLE credenciales CASCADE;
TRUNCATE TABLE dispositivo_movil CASCADE;
TRUNCATE TABLE dispositivo_biometrico CASCADE;
TRUNCATE TABLE rolmodulo CASCADE;
TRUNCATE TABLE empleado CASCADE;
TRUNCATE TABLE usuario CASCADE;
TRUNCATE TABLE departamento CASCADE;
TRUNCATE TABLE rol CASCADE;
TRUNCATE TABLE modulo CASCADE;
TRUNCATE TABLE evento CASCADE;
TRUNCATE TABLE empresa CASCADE;
TRUNCATE TABLE configuracion CASCADE;
TRUNCATE TABLE horario CASCADE;
TRUNCATE TABLE tolerancia CASCADE;
TRUNCATE TABLE escritorio CASCADE;
```

---

## 📞 Información Adicional

### Convenciones de Nombres

- **Tablas**: snake_case (minúsculas con guiones bajos)
- **Columnas**: snake_case
- **Claves primarias**: `id` o `id_[nombre_tabla]`
- **Claves foráneas**: `id_[tabla_referenciada]`
- **Índices**: `idx_[tabla]_[columna]`
- **Vistas**: `vista_[descripcion]`

### Tipos de Datos Comunes

| Tipo SQL | Uso | Ejemplo |
|----------|-----|---------|
| `SERIAL` | ID auto-incremental | `id SERIAL PRIMARY KEY` |
| `VARCHAR(n)` | Texto con límite | `username VARCHAR(55)` |
| `TEXT` | Texto sin límite | `descripcion TEXT` |
| `INTEGER` | Número entero | `max_intentos INTEGER` |
| `BOOLEAN` | Verdadero/Falso | `estado BOOLEAN` |
| `DATE` | Fecha sin hora | `fecha_registro DATE` |
| `TIMESTAMP` | Fecha y hora | `fecha_creacion TIMESTAMP` |
| `JSON` | Datos JSON | `config_excep JSON` |
| `BYTEA` | Datos binarios | `dactilar BYTEA` |
| `ENUM` | Lista de valores | `activo ENUM(...)` |

### Comandos Útiles psql

```bash
\l                      # Listar bases de datos
\c checador             # Conectar a base de datos
\dt                     # Listar tablas
\d usuario              # Describir tabla
\dT                     # Listar tipos ENUM
\di                     # Listar índices
\du                     # Listar usuarios
\q                      # Salir
```

---

## 📄 Licencia

Sistema de Checador - Base de Datos PostgreSQL
Documentación versión 1.0

---

**Fecha de última actualización**: Diciembre 2024
