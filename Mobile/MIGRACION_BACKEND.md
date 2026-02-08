# Guía de Migración: Adaptación al Nuevo Backend

## 📋 Resumen de Cambios

El backend ahora maneja toda la lógica de cálculo de estados de asistencia y validación de horarios. El frontend solo necesita hacer validaciones básicas para UX y enviar el registro.

---

## ✅ Servicios Actualizados

### 1. `horariosService.js` ✅
**Añadidas funciones de tolerancia:**
- `getToleranciaEmpleado(token)` - Obtiene tolerancia del rol del usuario
- `getTolerancias(token)` - Obtiene todas las tolerancias

### 2. `asistenciasService.js` ✅
**Compatible** con el nuevo backend. No requiere cambios.

### 3. `registerHelpers.js` ✅ NUEVO
**Funciones helper simplificadas** que reemplazan la lógica compleja del RegisterButton:
- `obtenerHorarioSimplificado()` - Solo obtiene si trabaja hoy y sus turnos
- `obtenerTolerancia()` - Obtiene tolerancia del backend
- `obtenerUltimoRegistro()` - Obtiene último registro del día
- `validarRegistroCliente()` - Validación BÁSICA cliente (solo UX, no seguridad)

---

## 🔧 Adaptación del RegisterButton.jsx

### ❌ Funciones a ELIMINAR (ahora las maneja el backend):

```javascript
// ESTAS FUNCIONES YA NO SON NECESARIAS:
const agruparTurnosConcatenados = () => { ... }  // ❌ Eliminar
const getEntradaSalidaGrupo = () => { ... }      // ❌ Eliminar
const validarEntrada = () => { ... }              // ❌ Eliminar
const validarSalida = () => { ... }               // ❌ Eliminar
const obtenerHorario = () => { ... }              // ❌ Reemplazar con helper
const obtenerTolerancia = () => { ... }           // ❌ Reemplazar con helper
```

### ✅ Nuevas imports a AGREGAR:

```javascript
import {
  obtenerHorarioSimplificado,
  obtenerTolerancia,
  obtenerUltimoRegistro,
  validarRegistroCliente
} from '../../services/registerHelpers';
```

### 🔄 Cambios en `useEffect` de carga de datos:

**ANTES:**
```javascript
const [horario, tolerancia, deptos] = await Promise.all([
  obtenerHorario(),      // Lógica compleja
  obtenerTolerancia(),   // Lógica compleja
  obtenerDepartamentos()
]);

// ... cálculo complejo de puedeRegistrar
const resultado = calcularEstadoYPermisos(ultimo, horario, tolerancia, ahora);
```

**DESPUÉS:**
```javascript
const empleadoId = userData?.empleado_id;

const [ultimo, horario, tolerancia, deptos] = await Promise.all([
  obtenerUltimoRegistro(empleadoId, userData.token),
  obtenerHorarioSimplificado(empleadoId, userData.token),
  obtenerTolerancia(userData.token),
  obtenerDepartamentos()
]);

// Validación simplificada
const validacion = validarRegistroCliente(horario, ultimo, tolerancia);

setPuedeRegistrar(validacion.puedeRegistrar);
setTipoSiguienteRegistro(validacion.tipoSiguiente);
setMensajeEspera(validacion.mensaje);
```

### 🔄 Cambios en `procederConRegistro`:

El backend ahora calcula automáticamente el estado, así que solo necesitas:

```javascript
const procederConRegistro = async () => {
  try {
    const departamento = datosRegistroRef.current.departamento;
    let ubicacionFinal = datosRegistroRef.current.ubicacion;

    // Obtener ubicación actual (opcional, mejorar precisión)
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 5000
      });
      ubicacionFinal = {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };
    } catch (locError) {
      console.log('Usando ubicación guardada');
    }

    // 🎯 ENVIAR REGISTRO - EL BACKEND CALCULA EL ESTADO
    const resultado = await registrarAsistencia(
      userData.empleado_id,
      ubicacionFinal,
      userData.token,
      departamento?.id
    );

    if (resultado.success) {
      Alert.alert(
        '✅ Registro Exitoso',
        `${resultado.data.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada como: ${resultado.data.estado}\n\nHora: ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
        [{ text: 'OK', onPress: () => {
          if (onRegistroExitoso) {
            onRegistroExitoso({ tipo: resultado.data.tipo, data: resultado.data });
          }
          // Recargar datos
          cargarDatos();
        }}]
      );
    }
  } catch (error) {
    console.error('Error en registro:', error);
    Alert.alert(
      '❌ Error',
      error.message || 'No se pudo registrar la asistencia',
      [{ text: 'OK' }]
    );
  } finally {
    setRegistrando(false);
  }
};
```

---

## 📊 Respuestas del Backend

### POST `/api/asistencias/registrar`

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Asistencia registrada como puntual",
  "data": {
    "id": "ASIS-xxx",
    "estado": "puntual",          // ← Backend calcula esto
    "dispositivo_origen": "movil",
    "ubicacion": [lat, lng],
    "fecha_registro": "2024-01-15T08:30:00Z",
    "empleado_id": "EMP-xxx",
    "empleado_nombre": "Juan Pérez",
    "departamento_id": "DEPT-xxx",
    "tipo": "entrada"              // ← Backend calcula esto
  }
}
```

**Estados posibles:**
- Entrada: `puntual`, `retardo`, `falta`
- Salida: `salida_puntual`, `salida_temprano`

### GET `/api/asistencias/empleado/:empleadoId`

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ASIS-xxx",
      "estado": "puntual",
      "fecha_registro": "2024-01-15T08:30:00Z",
      "tipo": "entrada",           // ← Backend calcula tipo
      "departamento_nombre": "Ventas"
    }
  ],
  "estadisticas": {               // ← Nuevas estadísticas
    "total": "15",
    "puntuales": "12",
    "retardos": "2",
    "faltas": "1"
  }
}
```

### GET `/api/tolerancias`

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "TOL-xxx",
      "nombre": "Tolerancia - Empleado",
      "minutos_retardo": 10,
      "minutos_falta": 30,
      "permite_registro_anticipado": true,
      "minutos_anticipado_max": 60,
      "aplica_tolerancia_entrada": true,
      "aplica_tolerancia_salida": false,
      "rol_id": "ROL-xxx",
      "rol_nombre": "Empleado"
    }
  ]
}
```

---

## 🎯 Flujo Simplificado

### ANTES (Frontend hace todo):
1. ✅ Frontend obtiene horario completo
2. ✅ Frontend agrupa turnos concatenados
3. ✅ Frontend calcula ventanas de tiempo
4. ✅ Frontend valida entrada/salida
5. ✅ Frontend calcula estado (puntual/retardo/falta)
6. ✅ Frontend envía registro
7. ❌ Backend solo guarda sin validar

### AHORA (Backend hace validación, frontend UX):
1. ✅ Frontend obtiene info básica (horario, tolerancia, último registro)
2. ✅ Frontend hace validación MÍNIMA para UX (mostrar si puede registrar)
3. ✅ Frontend envía registro
4. **✅ Backend calcula estado real** (agrupa turnos, valida horarios, aplica tolerancia)
5. ✅ Backend devuelve resultado con estado calculado
6. ✅ Frontend muestra resultado

---

## ⚠️ Notas Importantes

1. **Validación Cliente = Solo UX**: La validación del frontend es solo para mejorar UX (mostrar mensajes útiles). El backend tiene la última palabra.

2. **No confiar en el frontend**: Nunca asumir que el frontend calculó el estado correctamente. El backend SIEMPRE recalcula.

3. **Manejo de errores**: Si el backend rechaza un registro que el frontend permitió, mostrar el mensaje de error del backend.

4. **Estados del backend**: Usar siempre los estados que devuelve el backend, no los que calculó el frontend.

5. **Tolerancia dinámica**: La tolerancia puede cambiar según el rol. Siempre obtenerla del backend.

---

## 🔍 Testing

### Casos a probar:

1. ✅ Registro de entrada puntual
2. ✅ Registro de entrada con retardo
3. ✅ Registro de entrada con falta
4. ✅ Registro de salida puntual
5. ✅ Registro de salida temprana
6. ✅ Intento de salida sin tiempo mínimo trabajado
7. ✅ Registro fuera de horario
8. ✅ Cambio de tolerancia en el backend (verificar que frontend se adapte)

---

## 📝 Checklist de Migración

- [x] ✅ Actualizar `horariosService.js` con funciones de tolerancia
- [x] ✅ Crear `registerHelpers.js` con funciones simplificadas
- [ ] 🔄 Actualizar `RegisterButton.jsx`:
  - [ ] Eliminar funciones de validación compleja
  - [ ] Importar helpers
  - [ ] Simplificar `useEffect` de carga
  - [ ] Simplificar `procederConRegistro`
  - [ ] Actualizar manejo de respuestas del backend
- [ ] 🔄 Testing en desarrollo
- [ ] 🔄 Testing en producción

---

## 💡 Beneficios de la Migración

1. **Menos código frontend**: Eliminar ~500 líneas de lógica compleja
2. **Única fuente de verdad**: El backend calcula todo, sin inconsistencias
3. **Más fácil mantener**: Cambios de lógica solo en backend
4. **Más seguro**: No se puede manipular el frontend para engañar al sistema
5. **Mejor UX**: Frontend más rápido, menos cálculos
6. **Estadísticas**: El backend ahora devuelve estadísticas automáticamente

---

## 🆘 Soporte

Si tienes dudas durante la migración:
1. Revisar este documento
2. Verificar respuestas del backend en console.log
3. Comparar con código de `registerHelpers.js`
4. Probar endpoint en Postman/Thunder Client

¡Buena suerte con la migración! 🚀
