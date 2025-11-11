# 🎯 Sistema de Estados de Empleado - Guía de Uso

## 📋 ¿Qué problema resuelve?

Antes solo tenías un campo `activo` (boolean) que no era muy descriptivo. Ahora tienes un **sistema profesional de estados** que te permite:

1. **Separar conceptos**: El usuario puede loguearse (estado de usuario) pero el empleado puede estar de vacaciones (estado de empleado)
2. **Auditoría completa**: Sabes CUÁNDO y POR QUÉ cambió el estado
3. **Reportes precisos**: Puedes filtrar empleados por tipo de ausencia
4. **Flexibilidad**: Puedes reactivar empleados fácilmente

## 🏗️ Arquitectura

### Estados Disponibles:
- **ACTIVO**: Trabajando normalmente
- **LICENCIA**: Licencia médica o personal
- **VACACIONES**: Periodo vacacional
- **BAJA_TEMPORAL**: Suspensión temporal
- **BAJA_DEFINITIVA**: Ya no trabaja en la empresa

### Campos Nuevos en la BD:
```sql
estado_empleado         -- ENUM con los estados
fecha_cambio_estado     -- Timestamp automático
motivo_cambio_estado    -- Razón del cambio (opcional)
```

## 🚀 Instalación

### 1. Ejecutar la migración:
```bash
cd backend
node run-migration-estado-empleado.js
```

Esto creará:
- El tipo ENUM `estado_empleado_enum`
- Los campos en la tabla `empleado`
- Trigger automático para actualizar fechas
- Vista de estadísticas

### 2. Verificar que el backend ya está actualizado:
✅ Controllers actualizados con `estado_empleado`
✅ Endpoint `PATCH /api/empleados/:id/estado`
✅ Endpoint `GET /api/empleados/:id/historial-estado`
✅ Stats actualizadas

### 3. Usar el componente en el frontend:

```jsx
import EmployeeCard from './modules/users/EmployeeCard';
import { cambiarEstadoEmpleado } from './services/empleadoService';

function MiPaginaDeEmpleados() {
    const [empleados, setEmpleados] = useState([]);

    const handleCambiarEstado = async (idEmpleado, nuevoEstado, motivo) => {
        try {
            await cambiarEstadoEmpleado(idEmpleado, nuevoEstado, motivo);

            // Recargar empleados
            const data = await getEmpleados();
            setEmpleados(data);

            alert('Estado actualizado correctamente');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cambiar estado');
        }
    };

    return (
        <div>
            {empleados.map(emp => (
                <EmployeeCard
                    key={emp.id}
                    empleado={emp}
                    usuario={emp} // Datos de usuario vienen en el mismo objeto
                    onEstadoChange={handleCambiarEstado}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
}
```

## 🎨 Características del Componente

### Badge Visual Intuitivo:
- ✅ **Verde** para ACTIVO
- 🏥 **Azul** para LICENCIA
- 🏖️ **Morado** para VACACIONES
- ⏸️ **Amarillo** para BAJA_TEMPORAL
- ✕ **Rojo** para BAJA_DEFINITIVA

### Selector Interactivo:
1. Click en "Cambiar Estado"
2. Aparece un grid con todos los estados disponibles
3. Cada estado muestra su descripción
4. Opción de agregar un motivo
5. Cambio instantáneo

### Auditoría Automática:
- Muestra fecha del último cambio
- Muestra motivo del cambio
- Todo guardado automáticamente en la BD

## 📊 API Endpoints

### Cambiar Estado
```http
PATCH /api/empleados/:id/estado
Content-Type: application/json

{
  "estado": "LICENCIA",
  "motivo": "Licencia médica por 2 semanas"
}
```

**Respuesta:**
```json
{
  "message": "Estado del empleado actualizado",
  "empleado": {
    "id": 1,
    "id_usuario": 5,
    "estado_empleado": "LICENCIA",
    "fecha_cambio_estado": "2025-11-09T10:30:00.000Z",
    "motivo_cambio_estado": "Licencia médica por 2 semanas"
  }
}
```

### Obtener Historial
```http
GET /api/empleados/:id/historial-estado
```

**Respuesta:**
```json
{
  "id": 1,
  "estado_empleado": "LICENCIA",
  "fecha_cambio_estado": "2025-11-09T10:30:00.000Z",
  "motivo_cambio_estado": "Licencia médica por 2 semanas",
  "nombre": "Juan Pérez"
}
```

### Estadísticas
```http
GET /api/empleados/stats
```

**Respuesta:**
```json
{
  "total_empleados": "50",
  "activos": "40",
  "en_licencia": "3",
  "en_vacaciones": "5",
  "baja_temporal": "1",
  "baja_definitiva": "1",
  "conectados": "25",
  "desconectados": "25"
}
```

## 🔥 Ventajas sobre el sistema anterior

### Antes (solo campo `activo`):
```javascript
// ❌ No sabes POR QUÉ está inactivo
empleado.activo = false;

// ❌ No sabes CUÁNDO cambió
// ❌ No puedes diferenciar entre vacaciones y baja
// ❌ No hay auditoría
```

### Ahora:
```javascript
// ✅ Sabes exactamente el estado
empleado.estado_empleado = 'VACACIONES'

// ✅ Sabes cuándo cambió
empleado.fecha_cambio_estado = '2025-11-09T10:30:00.000Z'

// ✅ Sabes por qué
empleado.motivo_cambio_estado = 'Vacaciones de fin de año'

// ✅ Auditoría completa automática
```

## 📈 Casos de Uso

### 1. Empleado se va de vacaciones:
```javascript
await cambiarEstadoEmpleado(1, 'VACACIONES', 'Vacaciones de diciembre');
```

### 2. Empleado con licencia médica:
```javascript
await cambiarEstadoEmpleado(2, 'LICENCIA', 'Licencia médica por cirugía - 3 semanas');
```

### 3. Suspensión temporal:
```javascript
await cambiarEstadoEmpleado(3, 'BAJA_TEMPORAL', 'Suspensión administrativa pendiente investigación');
```

### 4. Empleado renuncia:
```javascript
await cambiarEstadoEmpleado(4, 'BAJA_DEFINITIVA', 'Renuncia voluntaria - último día 15/12/2025');
```

### 5. Reactivar empleado:
```javascript
await cambiarEstadoEmpleado(4, 'ACTIVO', 'Recontratación después de 6 meses');
```

## 🎯 Reportes que puedes hacer

```sql
-- Empleados de vacaciones este mes
SELECT * FROM empleado
WHERE estado_empleado = 'VACACIONES'
AND fecha_cambio_estado >= date_trunc('month', CURRENT_DATE);

-- Empleados con licencia médica
SELECT * FROM empleado
WHERE estado_empleado = 'LICENCIA';

-- Historial de cambios (necesitarías una tabla de auditoría)
SELECT * FROM vista_estadisticas_empleados;
```

## 🛡️ Seguridad

- ✅ Validación de estados en el backend
- ✅ Trigger automático para fechas (no se puede manipular)
- ✅ Estados válidos definidos en ENUM (no se pueden poner valores inválidos)
- ✅ Índice en `estado_empleado` para búsquedas rápidas

## 🎨 UI/UX

El componente `EmployeeCard` incluye:
- Badge colorido según el estado
- Fecha del último cambio
- Motivo del cambio
- Selector visual interactivo
- Feedback inmediato al usuario
- Animaciones suaves
- Diseño responsive

## 🚀 ¡Listo para usar!

Ya tienes todo configurado. Solo necesitas:
1. Ejecutar la migración: `node run-migration-estado-empleado.js`
2. Usar el componente `EmployeeCard` con la prop `onEstadoChange`
3. ¡Disfrutar de un sistema profesional de gestión de estados!
