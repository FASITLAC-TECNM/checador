# 🔄 Rediseño Completo del Sistema de Horarios

## 🎯 Cambios Principales

Se ha replanteado completamente el sistema de horarios para hacerlo más intuitivo y práctico:

### ✅ **Antes (Antiguo Sistema)**
- ❌ Horarios se creaban manualmente desde una página separada
- ❌ Había que asignar manualmente el horario al empleado
- ❌ Página de horarios era un formulario complejo de creación
- ❌ No había forma fácil de editar el horario de un empleado
- ❌ No había vista global de quién trabaja cuándo

### ✅ **Ahora (Nuevo Sistema)**
- ✅ Horario se crea **automáticamente** al crear un empleado
- ✅ Se edita directamente desde el **perfil del empleado**
- ✅ Página de horarios es un **calendario global**
- ✅ Vista clara de quién trabaja cada día
- ✅ Interfaz intuitiva y simple

---

## 📋 Archivos Modificados/Creados

### Backend

#### 1. **`backend/src/controllers/empleados.controller.js`** (Modificado)
**Cambio principal**: Al crear un empleado, se crea automáticamente un horario por defecto

```javascript
// Crear horario por defecto para el empleado
const horarioDefault = {
    dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    turnos: [{ entrada: '09:00', salida: '18:00' }],
    tipo: 'continuo',
    total_horas: 9
};

const horarioResult = await pool.query(`
    INSERT INTO horario (date_ini, date_fin, estado, config_horario, config_excep)
    VALUES (CURRENT_DATE, NULL, 'Activo', 'Semanal', $1)
    RETURNING id
`, [JSON.stringify(horarioDefault)]);

const horario_id = horarioResult.rows[0].id;
```

**Horario por defecto**:
- Lunes a Viernes
- 9:00 AM - 6:00 PM
- Continuo (sin descanso)
- 9 horas diarias

---

### Frontend

#### 2. **`Administrator/src/modules/users/HorarioEditor.jsx`** (Nuevo)
**Componente modal para editar horarios directamente desde el perfil del empleado**

**Características**:
- ✅ Modal fullscreen con scroll
- ✅ Selector de tipo: Continuo vs Quebrado
- ✅ Días laborales con botones toggle (Lu, Ma, Mi, Ju, Vi, Sá, Do)
- ✅ Gestión de múltiples turnos (agregar/eliminar)
- ✅ Inputs de tiempo para entrada/salida
- ✅ Cálculo automático de horas totales
- ✅ Resumen en tiempo real
- ✅ Validaciones visuales

**Interfaz**:
```
┌─────────────────────────────────────┐
│ Editar Horario         [X]          │
│ Juan Pérez López                     │
├─────────────────────────────────────┤
│                                      │
│ Tipo de Horario:                     │
│ [Continuo]  [Quebrado]              │
│                                      │
│ Días Laborales:                      │
│ [Lu] [Ma] [Mi] [Ju] [Vi] [Sá] [Do] │
│                                      │
│ Turnos:                   [+ Turno] │
│ ┌──────────────────────────────┐    │
│ │ Entrada 1    Salida 1    [X] │    │
│ │ [09:00]      [18:00]          │    │
│ └──────────────────────────────┘    │
│                                      │
│ Resumen:                             │
│ • Tipo: Continuo                     │
│ • Días: 5                            │
│ • Horas/día: 9h                      │
│ • Horas/semana: 45h                  │
│                                      │
│ [Guardar Horario]  [Cancelar]       │
└─────────────────────────────────────┘
```

---

#### 3. **`Administrator/src/modules/users/UserProfile.jsx`** (Modificado)
**Integración del editor de horarios**

**Nuevos imports**:
```javascript
import { obtenerHorarioPorId, actualizarHorario } from '../../services/horariosService';
import HorarioEditor from './HorarioEditor';
```

**Nuevos estados**:
```javascript
const [showHorarioEditor, setShowHorarioEditor] = useState(false);
const [horarioData, setHorarioData] = useState(null);
```

**Nuevas funciones**:
```javascript
const handleEditarHorario = async () => {
    const horario = await obtenerHorarioPorId(empleadoData.horario_id);
    setHorarioData(horario);
    setShowHorarioEditor(true);
};

const handleGuardarHorario = async (configActualizada) => {
    await actualizarHorario(empleadoData.horario_id, {
        config_excep: configActualizada
    });
    setShowHorarioEditor(false);
};
```

**Botón de Horario** (ahora funcional):
```jsx
<button onClick={handleEditarHorario}>
    <Calendar size={18} />
    Horario
</button>
```

**Modal renderizado**:
```jsx
{showHorarioEditor && horarioData && (
    <HorarioEditor
        empleado={empleadoData}
        horario={horarioData}
        onSave={handleGuardarHorario}
        onCancel={() => setShowHorarioEditor(false)}
    />
)}
```

---

#### 4. **`Administrator/src/modules/schedules/CalendarioGlobal.jsx`** (Nuevo)
**Nueva página de horarios - Vista de calendario global**

**Propósito**: Ver qué empleados trabajan cada día de la semana

**Características**:
- ✅ Estadísticas generales (empleados con horario, trabajando hoy, horas totales)
- ✅ Filtro por nombre de empleado
- ✅ Selector de día de la semana
- ✅ Lista de empleados trabajando ese día
- ✅ Detalles de cada horario (turnos, horas, tipo)
- ✅ Vista detallada de turnos

**Secciones**:

1. **Stats Cards**:
   - Empleados con horario
   - Trabajando [día seleccionado]
   - Horas totales del día

2. **Filtros**:
   - Búsqueda por nombre

3. **Selector de Día**:
   - 7 botones para cada día de la semana
   - Botones de navegación (anterior/siguiente)

4. **Lista de Empleados**:
   - Tarjeta por empleado trabajando ese día
   - Avatar con iniciales
   - Nombre y email
   - Tipo de horario (Continuo/Quebrado)
   - Número de turnos
   - Horario completo (ej: "09:00-18:00")
   - Horas totales
   - Detalle de cada turno

**Interfaz**:
```
┌─────────────────────────────────────────┐
│ Calendario Global de Horarios           │
├─────────────────────────────────────────┤
│ [52 con horario] [38 Lunes] [342h]     │
│                                          │
│ Buscar: [___________________]            │
│                                          │
│ [< ] [Lu][Ma][Mi][Ju][Vi][Sá][Do] [>]  │
│                                          │
│ ┌──────────────────────────────────┐   │
│ │ [JP] Juan Pérez                   │   │
│ │      juan@example.com             │   │
│ │                                    │   │
│ │ Continuo | 1 turno | 9h           │   │
│ │ Horario: 09:00-18:00              │   │
│ │                                    │   │
│ │ [Turno 1: 09:00 - 18:00]         │   │
│ └──────────────────────────────────┘   │
│                                          │
│ ┌──────────────────────────────────┐   │
│ │ [MP] María González               │   │
│ │      maria@example.com            │   │
│ │                                    │   │
│ │ Quebrado | 2 turnos | 8h          │   │
│ │ Horario: 08:00-13:00 | 15:00-19:00│   │
│ │                                    │   │
│ │ [Turno 1: 08:00-13:00][Turno 2...]│   │
│ └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

#### 5. **`Administrator/src/DashboardPage.jsx`** (Modificado)
**Cambio del import**:
```javascript
// Antes:
import SchedulesPage from './modules/schedules/NewSchedulesPage';

// Ahora:
import SchedulesPage from './modules/schedules/CalendarioGlobal';
```

---

## 🔄 Flujo de Trabajo Nuevo

### Crear Empleado
```
1. Usuario crea empleado desde UserPage
   ↓
2. Backend crea empleado
   ↓
3. Backend crea horario por defecto automáticamente
   ↓
4. Empleado queda con horario asignado (Lun-Vie, 9-18h)
```

### Editar Horario
```
1. Usuario abre perfil del empleado
   ↓
2. Click en botón "Horario"
   ↓
3. Se abre modal HorarioEditor con datos actuales
   ↓
4. Usuario modifica:
   - Tipo (Continuo/Quebrado)
   - Días laborales
   - Turnos (entrada/salida)
   ↓
5. Click en "Guardar"
   ↓
6. Se actualiza config_excep en la BD
   ↓
7. Modal se cierra, perfil se recarga
```

### Ver Horarios Globales
```
1. Usuario va a sección "Horarios"
   ↓
2. Ve CalendarioGlobal
   ↓
3. Selecciona día de la semana
   ↓
4. Ve lista de empleados trabajando ese día
   ↓
5. Puede filtrar por nombre
   ↓
6. Ve detalles de cada horario
```

---

## 📊 Estructura de Datos

### JSON en `config_excep`

**Formato estándar**:
```json
{
  "dias": ["lunes", "martes", "miercoles", "jueves", "viernes"],
  "turnos": [
    {"entrada": "09:00", "salida": "18:00"}
  ],
  "tipo": "continuo",
  "total_horas": 9
}
```

**Horario quebrado con descanso**:
```json
{
  "dias": ["lunes", "martes", "miercoles", "jueves", "viernes"],
  "turnos": [
    {"entrada": "08:00", "salida": "13:00"},
    {"entrada": "15:00", "salida": "19:00"}
  ],
  "tipo": "quebrado",
  "total_horas": 9,
  "descanso": "13:00-15:00"
}
```

**Campos**:
- `dias`: Array de días laborales
- `turnos`: Array de objetos {entrada, salida}
- `tipo`: "continuo" o "quebrado"
- `total_horas`: Número calculado automáticamente
- `descanso`: (Opcional) Solo para horarios quebrados

---

## ✅ Ventajas del Nuevo Sistema

### Para Administradores:
1. ✅ **Menos pasos**: No hay que crear horario manualmente
2. ✅ **Más rápido**: Horario listo al crear empleado
3. ✅ **Más intuitivo**: Se edita desde el perfil
4. ✅ **Vista global**: Fácil ver quién trabaja cuándo

### Para Empleados:
1. ✅ **Claridad**: Ven su horario en su perfil
2. ✅ **Actualizado**: Siempre el horario correcto

### Técnicas:
1. ✅ **Menos código duplicado**: Un solo editor
2. ✅ **Mejor UX**: Flujo natural
3. ✅ **Mantenible**: Lógica centralizada
4. ✅ **Escalable**: Fácil agregar features

---

## 🚀 Próximas Mejoras Sugeridas

1. **Vista de Calendario Mensual**
   - Calendario tipo Google Calendar
   - Vista de todo el mes
   - Click en día para ver quién trabaja

2. **Exportar/Imprimir**
   - Exportar horarios a PDF/Excel
   - Imprimir calendario mensual
   - Generar reportes

3. **Notificaciones**
   - Notificar a empleado cuando cambia su horario
   - Recordatorios de cambios próximos

4. **Plantillas de Horario**
   - Guardar horarios comunes como plantillas
   - Aplicar plantilla a múltiples empleados
   - Horarios predefinidos por departamento

5. **Historial**
   - Ver cambios históricos de horario
   - Auditoría de modificaciones

6. **Validaciones Avanzadas**
   - Evitar turnos solapados
   - Validar horas mínimas/máximas legales
   - Alertas de horas extras

---

## 📝 Notas Técnicas

### Horario por Defecto
Al crear empleado, se inserta:
- Lunes a Viernes
- 09:00 - 18:00
- Tipo: continuo
- Total: 9 horas

### Editor de Horario
- Modal fullscreen responsive
- Manejo de estado local
- Validación en tiempo real
- Cálculo automático de horas

### Calendario Global
- Carga todos los empleados una vez
- Filtra por día en frontend
- Performance optimizada
- UI responsive

---

**Fecha**: Diciembre 2024
**Versión**: 3.0
**Estado**: ✅ Completado y listo para usar
