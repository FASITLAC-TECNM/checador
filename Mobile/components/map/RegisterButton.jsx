import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { isPointInPolygon, extraerCoordenadas } from '../../services/ubicacionService';
import { getApiEndpoint } from '../../config/api';
import MapaZonasPermitidas from './MapaZonasPermitidas';

const API_URL = getApiEndpoint('/api');

/**
 * Componente de botón de registro con validación de ubicación Y horario
 */
export const RegisterButton = ({ userData, darkMode, onRegistroExitoso }) => {
  const [ubicacionActual, setUbicacionActual] = useState(null);
  const [dentroDelArea, setDentroDelArea] = useState(false);
  const [dentroDeHorario, setDentroDeHorario] = useState(false);
  const [estadoBoton, setEstadoBoton] = useState('cargando');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrando, setRegistrando] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [departamento, setDepartamento] = useState(null);
  const [horarioInfo, setHorarioInfo] = useState(null);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const styles = darkMode ? registerStylesDark : registerStyles;

  // ==================== OBTENER ID DEL EMPLEADO ====================
  const getEmpleadoId = () => {
    return userData?.empleado_id || null;
  };

  // ==================== OBTENER ÚLTIMO REGISTRO ====================
  useEffect(() => {
    const obtenerUltimo = async () => {
      try {
        const empleadoId = getEmpleadoId();
        if (!empleadoId) {
          console.warn('⚠️ No se puede obtener último registro sin ID de empleado');
          return;
        }

        const response = await fetch(
          `${API_URL}/asistencias/empleado/${empleadoId}`,
          {
            headers: {
              'Authorization': `Bearer ${userData.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          console.warn('⚠️ No se pudo obtener último registro');
          return;
        }

        const data = await response.json();
        console.log('📋 Asistencias obtenidas:', data);
        
        // El endpoint devuelve un array de asistencias, tomar la primera (más reciente)
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const ultimaAsistencia = data.data[0];
          setUltimoRegistro({
            tipo: ultimaAsistencia.estado === 'puntual' || ultimaAsistencia.estado === 'retardo' ? 'Entrada' : 'Salida',
            hora: new Date(ultimaAsistencia.fecha_registro).toLocaleTimeString('es-MX', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          });
          console.log('✅ Último registro establecido:', ultimaAsistencia);
        }
      } catch (err) {
        console.error('❌ Error obteniendo último registro:', err);
      }
    };

    obtenerUltimo();
  }, [userData]);

  // ==================== OBTENER HORARIO DEL EMPLEADO ====================
  useEffect(() => {
    const obtenerHorario = async () => {
      try {
        const empleadoId = getEmpleadoId();
        if (!empleadoId) {
          console.warn('⚠️ No se puede obtener horario sin ID de empleado');
          return;
        }

        console.log('═══════════════════════════════════════');
        console.log('📅 OBTENIENDO HORARIO DEL EMPLEADO');
        console.log('═══════════════════════════════════════');
        console.log('📋 Empleado ID:', empleadoId);
        console.log('📅 URL:', `${API_URL}/empleados/${empleadoId}/horario`);

        const response = await fetch(
          `${API_URL}/empleados/${empleadoId}/horario`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${userData.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('📥 Status respuesta:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error del servidor:', errorText);
          console.warn('⚠️ No se pudo obtener horario - usando validación solo por zona');
          return;
        }

        const responseText = await response.text();
        console.log('📄 Respuesta (primeros 300 chars):', responseText.substring(0, 300));

        let data;
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          console.error('❌ Error al parsear JSON:', parseError);
          return;
        }

        console.log('📦 Data parseada:', data);

        // El horario puede venir en diferentes estructuras
        const horarioData = data.data || data.horario || data;
        
        if (!horarioData || !horarioData.configuracion) {
          console.warn('⚠️ No hay configuración de horario en la respuesta');
          console.log('📊 Estructura recibida:', JSON.stringify(horarioData, null, 2));
          return;
        }

        console.log('✅ Horario obtenido correctamente');
        console.log('📊 Configuración:', typeof horarioData.configuracion === 'string' 
          ? horarioData.configuracion.substring(0, 200) 
          : JSON.stringify(horarioData.configuracion).substring(0, 200));

        // Parsear horario y obtener info del día actual
        const infoDiaActual = parsearHorarioYObtenerDiaActual(horarioData);
        console.log('📅 Info día actual parseada:', infoDiaActual);
        console.log('═══════════════════════════════════════');
        
        setHorarioInfo(infoDiaActual);

      } catch (err) {
        console.error('❌ Error obteniendo horario:', err);
        console.error('❌ Stack:', err.stack);
      }
    };

    obtenerHorario();
  }, [userData]);

  // ==================== PARSEAR HORARIO Y OBTENER DÍA ACTUAL ====================
  const parsearHorarioYObtenerDiaActual = (horario) => {
    try {
      const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const hoy = new Date().getDay();
      const diaHoyKey = diasSemana[hoy];
      
      console.log('📅 Día actual:', diaHoyKey, '(índice:', hoy, ')');

      // Extraer configuración
      let config = horario.configuracion || horario.config_excep;
      
      if (typeof config === 'string') {
        config = JSON.parse(config);
      }

      if (!config) {
        console.warn('⚠️ No hay configuración en horario');
        return {
          trabaja: false,
          entrada: null,
          salida: null,
          turnos: []
        };
      }

      console.log('📅 Configuración parseada:', config);

      // Verificar si tiene configuracion_semanal (estructura nueva)
      let turnosHoy = [];
      if (config.configuracion_semanal && config.configuracion_semanal[diaHoyKey]) {
        turnosHoy = config.configuracion_semanal[diaHoyKey].map(t => ({
          entrada: t.inicio,
          salida: t.fin
        }));
        console.log('📅 Usando configuracion_semanal');
      }
      // Estructura antigua (dias + turnos)
      else if (config.dias && config.dias.includes(diaHoyKey)) {
        turnosHoy = config.turnos || [];
        console.log('📅 Usando estructura antigua (dias + turnos)');
      }

      if (turnosHoy.length === 0) {
        console.log('📅 No hay turnos para hoy - día de descanso');
        return {
          trabaja: false,
          entrada: null,
          salida: null,
          turnos: []
        };
      }

      console.log('📅 Turnos de hoy:', turnosHoy);

      return {
        trabaja: true,
        entrada: turnosHoy[0]?.entrada || null,
        salida: turnosHoy[turnosHoy.length - 1]?.salida || null,
        turnos: turnosHoy,
        tipo: turnosHoy.length > 1 ? 'quebrado' : 'continuo'
      };

    } catch (error) {
      console.error('❌ Error parseando horario:', error);
      return {
        trabaja: false,
        entrada: null,
        salida: null,
        turnos: []
      };
    }
  };

  // ==================== OBTENER UBICACIÓN DEL USUARIO ====================
  useEffect(() => {
    let locationSubscription = null;

    const iniciarRastreoUbicacion = async () => {
      try {
        console.log('📍 Solicitando permisos de ubicación...');

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.error('❌ Permiso de ubicación denegado');
          setError('Permiso de ubicación denegado.');
          setEstadoBoton('error');
          setLoading(false);
          return;
        }

        console.log('✅ Permisos de ubicación otorgados');

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        const coords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };

        console.log('📍 Ubicación actual obtenida:', coords);
        setUbicacionActual(coords);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10
          },
          (newLocation) => {
            const newCoords = {
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude
            };
            setUbicacionActual(newCoords);
          }
        );

      } catch (err) {
        console.error('❌ Error obteniendo ubicación:', err);
        setError('Error al obtener ubicación.');
        setEstadoBoton('error');
        setLoading(false);
      }
    };

    iniciarRastreoUbicacion();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // ==================== VALIDAR HORARIO ====================
  const validarHorario = () => {
    // ⭐ TEMPORAL: Si no hay info de horario, permitir registro (solo validar zona)
    if (!horarioInfo) {
      console.log('⚠️ No hay información de horario - permitiendo registro (solo validación de zona)');
      return true;
    }

    if (!horarioInfo.trabaja) {
      console.log('❌ Hoy no es día laboral');
      return false;
    }

    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    // 🔍 Determinar si es entrada o salida basado en el último registro
    const esEntrada = !ultimoRegistro || ultimoRegistro.tipo === 'Salida';
    
    console.log('🕐 Tipo de registro a validar:', esEntrada ? 'ENTRADA' : 'SALIDA');

    // Validar contra todos los turnos del día
    const dentroDeAlgunTurno = horarioInfo.turnos.some(turno => {
      const [horaEntrada, minEntrada] = turno.entrada.split(':').map(Number);
      const [horaSalida, minSalida] = turno.salida.split(':').map(Number);
      
      const minEntradaTurno = horaEntrada * 60 + minEntrada;
      const minSalidaTurno = horaSalida * 60 + minSalida;
      
      let dentroDelTurno = false;
      
      if (esEntrada) {
        // ✅ ENTRADA: 30 minutos antes hasta la hora de entrada
        const toleranciaAntes = 30;
        dentroDelTurno = horaActual >= (minEntradaTurno - toleranciaAntes) && 
                        horaActual <= minSalidaTurno;
        console.log(`🕐 ENTRADA - Turno ${turno.entrada}-${turno.salida}: Rango permitido ${horaEntrada - Math.floor(toleranciaAntes/60)}:${String((minEntrada - (toleranciaAntes % 60) + 60) % 60).padStart(2, '0')} - ${turno.salida}`);
      } else {
        // ⭐ SALIDA: Solo últimos 10 minutos antes de la salida o después
        const toleranciaSalida = 10;
        dentroDelTurno = horaActual >= (minSalidaTurno - toleranciaSalida);
        console.log(`🕐 SALIDA - Turno ${turno.entrada}-${turno.salida}: Rango permitido desde ${Math.floor((minSalidaTurno - toleranciaSalida) / 60)}:${String((minSalidaTurno - toleranciaSalida) % 60).padStart(2, '0')} en adelante`);
      }
      
      console.log(`   Hora actual: ${Math.floor(horaActual / 60)}:${String(horaActual % 60).padStart(2, '0')} → ${dentroDelTurno ? '✅ VÁLIDO' : '❌ FUERA DE RANGO'}`);
      return dentroDelTurno;
    });

    console.log(`🕐 Dentro de horario: ${dentroDeAlgunTurno ? 'SÍ ✅' : 'NO ❌'}`);
    return dentroDeAlgunTurno;
  };

  // ==================== VALIDAR UBICACIÓN ====================
  useEffect(() => {
    const validarUbicacion = async () => {
      try {
        if (!ubicacionActual) {
          console.log('⏳ Esperando ubicación del usuario...');
          return;
        }

        console.log('═══════════════════════════════════════');
        console.log('🔍 INICIANDO VALIDACIÓN DE UBICACIÓN');
        console.log('═══════════════════════════════════════');

        let departamentoData = userData?.empleadoInfo?.departamento;

        if (!departamentoData && userData?.empleadoInfo?.departamentos?.length > 0) {
          console.log('📥 Departamento no viene completo, obteniendo del API...');
          
          const deptoId = userData.empleadoInfo.departamentos[0].id;
          console.log('🏢 Departamento ID:', deptoId);

          try {
            const deptoResponse = await fetch(
              `${API_URL}/departamentos/${deptoId}`,
              {
                headers: {
                  'Authorization': `Bearer ${userData.token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            console.log('📥 Status departamento:', deptoResponse.status);

            if (deptoResponse.ok) {
              const deptoResult = await deptoResponse.json();
              departamentoData = deptoResult.data || deptoResult;
              console.log('✅ Departamento obtenido:', departamentoData.nombre);
            } else {
              const errorText = await deptoResponse.text();
              console.error('❌ Error obteniendo departamento:', errorText);
              setError('No se pudo obtener la configuración del departamento.');
              setEstadoBoton('error');
              setLoading(false);
              return;
            }
          } catch (fetchError) {
            console.error('❌ Error en fetch departamento:', fetchError);
            setError('Error al obtener departamento.');
            setEstadoBoton('error');
            setLoading(false);
            return;
          }
        }

        if (!departamentoData) {
          console.error('❌ NO SE ENCONTRÓ DEPARTAMENTO');
          setError('No tienes un departamento asignado.');
          setEstadoBoton('error');
          setLoading(false);
          return;
        }

        console.log('✅ Departamento:', departamentoData.nombre);

        if (!departamentoData.ubicacion) {
          console.error('❌ El departamento no tiene ubicación configurada');
          setError('El departamento no tiene ubicación configurada.');
          setEstadoBoton('error');
          setLoading(false);
          return;
        }

        const coordenadas = extraerCoordenadas(departamentoData.ubicacion);
        console.log('📐 Coordenadas extraídas:', coordenadas?.length || 0, 'puntos');

        if (!coordenadas || coordenadas.length < 3) {
          console.error('❌ Coordenadas inválidas');
          setError('Configuración de ubicación inválida.');
          setEstadoBoton('error');
          setLoading(false);
          return;
        }

        const dentroZona = isPointInPolygon(ubicacionActual, coordenadas);
        console.log('🎯 Dentro del área:', dentroZona ? 'SÍ ✅' : 'NO ❌');

        const dentroHorario = validarHorario();

        setDentroDelArea(dentroZona);
        setDentroDeHorario(dentroHorario);
        setDepartamento(departamentoData);

        // Determinar estado del botón
        if (!dentroZona && !dentroHorario) {
          setEstadoBoton('fuera_zona_horario');
        } else if (!dentroZona) {
          setEstadoBoton('fuera_zona');
        } else if (!dentroHorario) {
          setEstadoBoton('fuera_horario');
        } else {
          setEstadoBoton('disponible');
        }

        setError(null);
        setLoading(false);

        console.log('═══════════════════════════════════════');

      } catch (err) {
        console.error('❌ Error validando ubicación:', err);
        setError('Error al validar ubicación');
        setEstadoBoton('error');
        setLoading(false);
      }
    };

    validarUbicacion();
  }, [ubicacionActual, userData, horarioInfo]);

  // ==================== MANEJAR REGISTRO ====================
  const handleRegistro = async () => {
    try {
      if (estadoBoton !== 'disponible') {
        let mensaje = 'El registro no está disponible en este momento.';
        
        if (estadoBoton === 'fuera_zona') {
          mensaje = 'Debes estar dentro del área permitida para registrar tu asistencia.';
        } else if (estadoBoton === 'fuera_horario') {
          const esEntrada = !ultimoRegistro || ultimoRegistro.tipo === 'Salida';
          
          if (esEntrada) {
            mensaje = 'Fuera de horario de entrada. Puedes registrar tu entrada desde 30 minutos antes de tu hora de inicio.';
          } else {
            mensaje = 'Fuera de horario de salida. Puedes registrar tu salida únicamente en los últimos 10 minutos antes de tu hora de salida o después.';
          }
        } else if (estadoBoton === 'fuera_zona_horario') {
          mensaje = 'Estás fuera del área permitida y fuera de tu horario laboral.';
        }

        Alert.alert('No disponible', mensaje, [{ text: 'Entendido' }]);
        return;
      }

      const empleadoId = getEmpleadoId();
      if (!empleadoId) {
        Alert.alert('Error', 'No se pudo identificar tu información de empleado.');
        return;
      }

      const tipoRegistro = ultimoRegistro?.tipo === 'Entrada' ? 'Salida' : 'Entrada';

      Alert.alert(
        `Confirmar ${tipoRegistro}`,
        `¿Deseas registrar tu ${tipoRegistro.toLowerCase()}?\n\nUbicación: ${departamento?.nombre || 'Desconocida'}\nHora: ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Confirmar',
            onPress: async () => {
              console.log('═══════════════════════════════════════');
              console.log('📤 INICIANDO REGISTRO DE ASISTENCIA');
              console.log('═══════════════════════════════════════');
              
              const payload = {
                empleado_id: empleadoId,
                dispositivo_origen: 'movil',
                ubicacion: [ubicacionActual.lat, ubicacionActual.lng]
              };
              
              console.log('📋 Empleado ID:', empleadoId);
              console.log('📍 Ubicación:', payload.ubicacion);
              console.log('📱 Dispositivo:', payload.dispositivo_origen);
              console.log('🔑 Token:', userData.token ? userData.token.substring(0, 20) + '...' : 'NO HAY TOKEN');
              console.log('🌐 URL completa:', `${API_URL}/asistencias/registrar`);
              console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
              
              setRegistrando(true);

              try {
                const response = await fetch(`${API_URL}/asistencias/registrar`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`,
                  },
                  body: JSON.stringify(payload)
                });

                console.log('📥 Status de respuesta:', response.status, response.statusText);
                console.log('📥 Content-Type:', response.headers.get('content-type'));

                // Obtener el texto de la respuesta primero
                const responseText = await response.text();
                console.log('📄 Tipo de respuesta:', typeof responseText);
                console.log('📄 Longitud de respuesta:', responseText.length);
                console.log('📄 Primeros 500 caracteres:', responseText.substring(0, 500));
                console.log('📄 Últimos 100 caracteres:', responseText.substring(responseText.length - 100));

                // Intentar parsear como JSON
                let data;
                try {
                  data = responseText ? JSON.parse(responseText) : {};
                  console.log('✅ JSON parseado correctamente');
                  console.log('📊 Data:', JSON.stringify(data, null, 2));
                } catch (parseError) {
                  console.error('═══════════════════════════════════════');
                  console.error('❌ ERROR AL PARSEAR JSON');
                  console.error('═══════════════════════════════════════');
                  console.error('❌ Parse error:', parseError.message);
                  console.error('❌ Parse error stack:', parseError.stack);
                  console.error('📄 RESPUESTA COMPLETA DEL SERVIDOR:');
                  console.error(responseText);
                  console.error('═══════════════════════════════════════');
                  throw new Error(`El servidor devolvió HTML en lugar de JSON. Status: ${response.status}`);
                }

                if (!response.ok) {
                  console.error('❌ Respuesta no OK. Status:', response.status);
                  throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
                }

                console.log('✅ Asistencia registrada exitosamente');
                console.log('═══════════════════════════════════════');

                // Actualizar último registro
                if (data.data) {
                  setUltimoRegistro({
                    tipo: data.data.estado === 'puntual' || data.data.estado === 'retardo' ? 'Entrada' : 'Salida',
                    hora: new Date(data.data.fecha_registro).toLocaleTimeString('es-MX', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  });
                }

                Alert.alert(
                  '¡Éxito!',
                  `Asistencia registrada como ${data.data?.estado || 'exitosa'}\nHora: ${new Date(data.data?.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
                  [{ text: 'OK' }]
                );

                if (onRegistroExitoso) {
                  onRegistroExitoso(data);
                }

              } catch (err) {
                console.error('═══════════════════════════════════════');
                console.error('❌ ERROR REGISTRANDO ASISTENCIA');
                console.error('═══════════════════════════════════════');
                console.error('❌ Error message:', err.message);
                console.error('❌ Error stack:', err.stack);
                console.error('═══════════════════════════════════════');
                
                Alert.alert(
                  'Error',
                  err.message || 'No se pudo registrar la asistencia',
                  [{ text: 'OK' }]
                );
              } finally {
                setRegistrando(false);
              }
            }
          }
        ]
      );

    } catch (err) {
      console.error('❌ Error en handleRegistro:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  // ==================== OBTENER ESTADO DEL BOTÓN ====================
  const getButtonColor = () => {
    switch (estadoBoton) {
      case 'disponible':
        return '#10b981'; // Verde
      case 'fuera_zona':
      case 'fuera_horario':
      case 'fuera_zona_horario':
        return '#ef4444'; // Rojo
      case 'error':
      case 'cargando':
      default:
        return '#6b7280'; // Gris
    }
  };

  const getIcon = () => {
    switch (estadoBoton) {
      case 'disponible':
        return 'checkmark-circle';
      case 'fuera_zona':
        return 'location';
      case 'fuera_horario':
        return 'time';
      case 'fuera_zona_horario':
        return 'alert-circle';
      case 'error':
        return 'alert-circle';
      case 'cargando':
      default:
        return 'time';
    }
  };

  const getStatusText = () => {
    switch (estadoBoton) {
      case 'disponible':
        return 'Listo para registrar';
      case 'fuera_zona':
        return 'Fuera del área';
      case 'fuera_horario':
        return 'Fuera de horario';
      case 'fuera_zona_horario':
        return 'Fuera de área y horario';
      case 'error':
        return error || 'Sin conexión';
      case 'cargando':
      default:
        return 'Verificando...';
    }
  };

  const getTipoRegistro = () => {
    return ultimoRegistro?.tipo === 'Entrada' ? 'Salida' : 'Entrada';
  };

  // ==================== RENDER ====================
  return (
    <>
      <View style={styles.container}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: `${getButtonColor()}15` }]}>
            {loading ? (
              <ActivityIndicator size="small" color={getButtonColor()} />
            ) : (
              <Ionicons name={getIcon()} size={16} color={getButtonColor()} />
            )}
            <Text style={[styles.statusText, { color: getButtonColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Hora actual</Text>
            <Text style={styles.timeValue}>
              {new Date().toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </Text>
          </View>

          {/* Status Indicators */}
          {!loading && (
            <View style={styles.statusIndicators}>
              {/* Zona */}
              <View style={styles.indicator}>
                <Ionicons 
                  name={dentroDelArea ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color={dentroDelArea ? '#10b981' : '#ef4444'} 
                />
                <Text style={[styles.indicatorText, { color: dentroDelArea ? '#10b981' : '#ef4444' }]}>
                  {dentroDelArea ? 'Dentro de zona' : 'Fuera de zona'}
                </Text>
              </View>

              {/* Horario */}
              <View style={styles.indicator}>
                <Ionicons 
                  name={dentroDeHorario ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color={dentroDeHorario ? '#10b981' : '#ef4444'} 
                />
                <Text style={[styles.indicatorText, { color: dentroDeHorario ? '#10b981' : '#ef4444' }]}>
                  {dentroDeHorario ? 'Dentro de horario' : 'Fuera de horario'}
                </Text>
              </View>
            </View>
          )}

          {/* Location Info */}
          {!loading && departamento && (
            <TouchableOpacity 
              style={styles.locationInfo}
              onPress={() => setMostrarMapa(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={14} color="#6b7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {departamento.nombre}
              </Text>
              <Ionicons name="map" size={14} color="#6b7280" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              { backgroundColor: getButtonColor() },
              (estadoBoton !== 'disponible' || registrando) && styles.registerButtonDisabled
            ]}
            onPress={handleRegistro}
            disabled={estadoBoton !== 'disponible' || registrando}
            activeOpacity={0.7}
          >
            {registrando ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.registerButtonText}>Registrando...</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={estadoBoton === 'disponible' ? 'finger-print' : 'lock-closed'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.registerButtonText}>
                  {estadoBoton === 'disponible' ? `Registrar ${getTipoRegistro()}` : 'No disponible'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Last Register Info */}
          {ultimoRegistro && (
            <View style={styles.lastRegisterContainer}>
              <View style={styles.lastRegisterIcon}>
                <Ionicons
                  name={ultimoRegistro.tipo === 'Entrada' ? 'log-in' : 'log-out'}
                  size={12}
                  color="#9ca3af"
                />
              </View>
              <Text style={styles.lastRegisterText}>
                Último: {ultimoRegistro.tipo} · {ultimoRegistro.hora}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal del Mapa */}
      <Modal
        visible={mostrarMapa}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setMostrarMapa(false)}
      >
        <MapaZonasPermitidas
          departamento={departamento}
          ubicacionActual={ubicacionActual}
          onClose={() => setMostrarMapa(false)}
          darkMode={darkMode}
        />
      </Modal>
    </>
  );
};

// ==================== ESTILOS ====================
const registerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    gap: 12,
  },
  timeContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -1,
  },
  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastRegisterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
  },
  lastRegisterIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastRegisterText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

const registerStylesDark = StyleSheet.create({
  ...registerStyles,
  container: {
    ...registerStyles.container,
    backgroundColor: '#1f2937',
  },
  timeValue: {
    ...registerStyles.timeValue,
    color: '#fff',
  },
  locationInfo: {
    ...registerStyles.locationInfo,
    backgroundColor: '#374151',
  },
  lastRegisterContainer: {
    ...registerStyles.lastRegisterContainer,
    borderTopColor: '#374151',
  },
  lastRegisterIcon: {
    ...registerStyles.lastRegisterIcon,
    backgroundColor: '#374151',
  },
});

export default RegisterButton;