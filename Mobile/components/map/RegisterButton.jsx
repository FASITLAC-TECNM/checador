import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { isPointInPolygon, extraerCoordenadas } from '../../services/ubicacionService';
import { getApiEndpoint } from '../../config/api';
import MapaZonasPermitidas from './MapaZonasPermitidas';

const API_URL = getApiEndpoint('/api');

export const RegisterButton = ({ userData, darkMode, onRegistroExitoso }) => {
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [mostrarDepartamentos, setMostrarDepartamentos] = useState(false);
  
  const [ubicacionActual, setUbicacionActual] = useState(null);
  const [departamentos, setDepartamentos] = useState([]); // Array de departamentos
  const [departamentoActivo, setDepartamentoActivo] = useState(null); // Departamento donde está el usuario
  const [horarioInfo, setHorarioInfo] = useState(null);
  const [toleranciaInfo, setToleranciaInfo] = useState(null);
  const [ultimoRegistroHoy, setUltimoRegistroHoy] = useState(null);
  
  const [dentroDelArea, setDentroDelArea] = useState(false);
  const [puedeRegistrar, setPuedeRegistrar] = useState(false);
  const [tipoSiguienteRegistro, setTipoSiguienteRegistro] = useState('entrada');
  const [estadoHorario, setEstadoHorario] = useState(null);
  const [jornadaCompletada, setJornadaCompletada] = useState(false);

  const styles = darkMode ? registerStylesDark : registerStyles;

  const getDiaSemana = () => {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return dias[new Date().getDay()];
  };

  const getMinutosDelDia = (fecha = new Date()) => {
    return fecha.getHours() * 60 + fecha.getMinutes();
  };

  const obtenerUltimoRegistro = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return null;

      const response = await fetch(
        `${API_URL}/asistencias/empleado/${empleadoId}`,
        {
          headers: {
            'Authorization': `Bearer ${userData.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      
      if (!data.data?.length) return null;

      const hoy = new Date().toDateString();
      const registrosHoy = data.data.filter(registro => {
        const fechaRegistro = new Date(registro.fecha_registro);
        return fechaRegistro.toDateString() === hoy;
      });

      if (!registrosHoy.length) return null;

      const ultimo = registrosHoy[0];
      
      return {
        tipo: ultimo.tipo,
        estado: ultimo.estado,
        fecha_registro: new Date(ultimo.fecha_registro),
        hora: new Date(ultimo.fecha_registro).toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
    } catch (err) {
      return null;
    }
  }, [userData]);

  const obtenerHorario = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return null;

      const response = await fetch(
        `${API_URL}/empleados/${empleadoId}/horario`,
        {
          headers: {
            'Authorization': `Bearer ${userData.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const horario = data.data || data.horario || data;
      
      if (!horario?.configuracion) return null;

      let config = typeof horario.configuracion === 'string' 
        ? JSON.parse(horario.configuracion) 
        : horario.configuracion;

      const diaHoy = getDiaSemana();
      let turnosHoy = [];

      if (config.configuracion_semanal?.[diaHoy]) {
        turnosHoy = config.configuracion_semanal[diaHoy].map(t => ({
          entrada: t.inicio,
          salida: t.fin
        }));
      } else if (config.dias?.includes(diaHoy)) {
        turnosHoy = config.turnos || [];
      }

      if (!turnosHoy.length) {
        return { trabaja: false, turnos: [] };
      }

      return {
        trabaja: true,
        turnos: turnosHoy,
        entrada: turnosHoy[0].entrada,
        salida: turnosHoy[turnosHoy.length - 1].salida,
        tipo: turnosHoy.length > 1 ? 'quebrado' : 'continuo'
      };
    } catch (err) {
      return null;
    }
  }, [userData]);

  const obtenerTolerancia = useCallback(async () => {
    const defaultTolerancia = {
      minutos_retardo: 10,
      minutos_falta: 30,
      permite_registro_anticipado: true,
      minutos_anticipado_max: 60
    };

    try {
      const rolesResponse = await fetch(
        `${API_URL}/usuarios/${userData.id}/roles`,
        {
          headers: {
            'Authorization': `Bearer ${userData.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!rolesResponse.ok) return defaultTolerancia;

      const rolesData = await rolesResponse.json();
      const roles = rolesData.data || [];
      const rolConTolerancia = roles
        .filter(r => r.tolerancia_id)
        .sort((a, b) => b.posicion - a.posicion)[0];

      if (!rolConTolerancia) return defaultTolerancia;

      const toleranciaResponse = await fetch(
        `${API_URL}/tolerancias/${rolConTolerancia.tolerancia_id}`,
        {
          headers: {
            'Authorization': `Bearer ${userData.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!toleranciaResponse.ok) return defaultTolerancia;

      const toleranciaData = await toleranciaResponse.json();
      return toleranciaData.data || toleranciaData;
    } catch (err) {
      return defaultTolerancia;
    }
  }, [userData]);

  const obtenerDepartamentos = useCallback(async () => {
    try {
      const departamentosAsignados = userData?.empleadoInfo?.departamentos;
      
      if (!departamentosAsignados || departamentosAsignados.length === 0) {
        return [];
      }

      // Obtener detalles completos de cada departamento
      const promesas = departamentosAsignados.map(async (depto) => {
        try {
          const response = await fetch(
            `${API_URL}/departamentos/${depto.id}`,
            {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            return data.data || data;
          }
          return null;
        } catch (err) {
          return null;
        }
      });

      const resultados = await Promise.all(promesas);
      return resultados.filter(depto => depto !== null && depto.ubicacion);
    } catch (err) {
      console.error('Error obteniendo departamentos:', err);
      return [];
    }
  }, [userData]);

  const validarEntrada = (horario, tolerancia, minutosActuales) => {
    for (const turno of horario.turnos) {
      const [hE, mE] = turno.entrada.split(':').map(Number);
      const [hS, mS] = turno.salida.split(':').map(Number);
      
      const minEntrada = hE * 60 + mE;
      const minSalida = hS * 60 + mS;
      
      const ventanaInicio = minEntrada - (tolerancia.minutos_anticipado_max || 60);
      const ventanaRetardo = minEntrada + tolerancia.minutos_retardo;
      const ventanaFalta = minEntrada + tolerancia.minutos_falta;

      if (minutosActuales >= ventanaInicio && minutosActuales <= ventanaRetardo) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          estadoHorario: 'puntual',
          jornadaCompleta: false,
          mensaje: 'Puedes registrar tu entrada'
        };
      }

      if (minutosActuales > ventanaRetardo && minutosActuales <= ventanaFalta) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          estadoHorario: 'retardo',
          jornadaCompleta: false,
          mensaje: 'Registro con retardo'
        };
      }

      if (minutosActuales > ventanaFalta && minutosActuales <= minSalida) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'entrada',
          estadoHorario: 'falta',
          jornadaCompleta: false,
          mensaje: 'Fuera de tolerancia (falta)'
        };
      }
    }

    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      mensaje: 'Fuera de horario'
    };
  };

  const validarSalida = (horario, minutosActuales) => {
    for (const turno of horario.turnos) {
      const [hS, mS] = turno.salida.split(':').map(Number);
      const minSalida = hS * 60 + mS;
      const ventanaSalida = minSalida - 10;

      if (minutosActuales >= ventanaSalida) {
        return {
          puedeRegistrar: true,
          tipoRegistro: 'salida',
          estadoHorario: 'puntual',
          jornadaCompleta: false,
          mensaje: 'Puedes registrar tu salida'
        };
      }
    }

    return {
      puedeRegistrar: false,
      tipoRegistro: 'salida',
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      mensaje: 'Aún no es hora de salida'
    };
  };

  const calcularEstadoRegistro = useCallback((ultimo, horario, tolerancia) => {
    if (!horario?.trabaja) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        mensaje: 'No tienes horario configurado para hoy'
      };
    }

    const tipoRegistro = (!ultimo || ultimo.tipo === 'salida') ? 'entrada' : 'salida';
    
    if (ultimo?.tipo === 'salida') {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'completado',
        jornadaCompleta: true,
        mensaje: 'Ya completaste tu jornada de hoy'
      };
    }

    const ahora = getMinutosDelDia();

    return tipoRegistro === 'entrada' 
      ? validarEntrada(horario, tolerancia, ahora)
      : validarSalida(horario, ahora);
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      try {
        const [ultimo, horario, tolerancia, deptos] = await Promise.all([
          obtenerUltimoRegistro(),
          obtenerHorario(),
          obtenerTolerancia(),
          obtenerDepartamentos()
        ]);

        setUltimoRegistroHoy(ultimo);
        setHorarioInfo(horario);
        setToleranciaInfo(tolerancia);
        setDepartamentos(deptos);

        if (horario && tolerancia) {
          const estado = calcularEstadoRegistro(ultimo, horario, tolerancia);
          setPuedeRegistrar(estado.puedeRegistrar);
          setTipoSiguienteRegistro(estado.tipoRegistro);
          setEstadoHorario(estado.estadoHorario);
          setJornadaCompletada(estado.jornadaCompleta);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [obtenerUltimoRegistro, obtenerHorario, obtenerTolerancia, obtenerDepartamentos, calcularEstadoRegistro]);

  useEffect(() => {
    let locationSubscription = null;

    const iniciarUbicacion = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        setUbicacionActual({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10
          },
          (newLocation) => {
            setUbicacionActual({
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude
            });
          }
        );
      } catch (err) {
        console.error('Error obteniendo ubicación:', err);
      }
    };

    iniciarUbicacion();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Verificar en qué departamento está el usuario
  useEffect(() => {
    if (!ubicacionActual || !departamentos.length) {
      setDentroDelArea(false);
      setDepartamentoActivo(null);
      return;
    }

    let encontrado = false;

    for (const depto of departamentos) {
      try {
        const coordenadas = extraerCoordenadas(depto.ubicacion);
        if (!coordenadas || coordenadas.length < 3) continue;

        const dentro = isPointInPolygon(ubicacionActual, coordenadas);
        
        if (dentro) {
          setDentroDelArea(true);
          setDepartamentoActivo(depto);
          encontrado = true;
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (!encontrado) {
      setDentroDelArea(false);
      setDepartamentoActivo(null);
    }
  }, [ubicacionActual, departamentos]);

  const handleRegistro = async () => {
    if (!horarioInfo) {
      Alert.alert('Error', 'No tienes un horario configurado. Contacta al administrador.', [{ text: 'OK' }]);
      return;
    }

    if (!puedeRegistrar || !dentroDelArea) {
      let mensaje = 'No puedes registrar en este momento';
      
      if (!dentroDelArea) {
        mensaje = 'Debes estar dentro de un área permitida';
      } else if (jornadaCompletada) {
        mensaje = 'Ya completaste tu jornada de hoy';
      } else if (estadoHorario === 'fuera_horario') {
        mensaje = 'Estás fuera de tu horario laboral';
      } else if (!horarioInfo.trabaja) {
        mensaje = 'No tienes horario configurado para hoy';
      }

      Alert.alert('No disponible', mensaje, [{ text: 'Entendido' }]);
      return;
    }

    const empleadoId = userData?.empleado_id;
    if (!empleadoId) {
      Alert.alert('Error', 'No se pudo identificar tu información');
      return;
    }

    let estadoMensaje = '';
    
    if (tipoSiguienteRegistro === 'salida') {
      estadoMensaje = '✅ Salida';
    } else {
      if (estadoHorario === 'puntual') estadoMensaje = '✅ Puntual';
      if (estadoHorario === 'retardo') estadoMensaje = '⚠️ Con retardo';
      if (estadoHorario === 'falta') estadoMensaje = '❌ Fuera de tolerancia';
    }

    const tipoTexto = tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida';

    Alert.alert(
      `Confirmar ${tipoTexto}`,
      `¿Deseas registrar tu ${tipoTexto.toLowerCase()}?\n\n${estadoMensaje}\n\nUbicación: ${departamentoActivo?.nombre || 'Desconocida'}\nHora: ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setRegistrando(true);

            try {
              const payload = {
                empleado_id: empleadoId,
                dispositivo_origen: 'movil',
                ubicacion: [ubicacionActual.lat, ubicacionActual.lng]
              };

              const response = await fetch(`${API_URL}/asistencias/registrar`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userData.token}`,
                },
                body: JSON.stringify(payload)
              });

              const responseText = await response.text();

              if (response.status === 502) {
                throw new Error('El servidor no está disponible en este momento. Por favor intenta de nuevo.');
              }

              if (response.status === 500) {
                throw new Error('Error interno del servidor. Contacta al administrador.');
              }

              let data;
              try {
                data = responseText ? JSON.parse(responseText) : {};
              } catch (parseError) {
                throw new Error('Error del servidor: respuesta inválida');
              }

              if (!response.ok) {
                throw new Error(data.message || data.error || `Error del servidor (${response.status})`);
              }

              const nuevoUltimo = await obtenerUltimoRegistro();
              setUltimoRegistroHoy(nuevoUltimo);

              if (horarioInfo && toleranciaInfo) {
                const nuevoEstado = calcularEstadoRegistro(nuevoUltimo, horarioInfo, toleranciaInfo);
                setPuedeRegistrar(nuevoEstado.puedeRegistrar);
                setTipoSiguienteRegistro(nuevoEstado.tipoRegistro);
                setEstadoHorario(nuevoEstado.estadoHorario);
                setJornadaCompletada(nuevoEstado.jornadaCompleta);
              }

              let estadoTexto = '';
              let emoji = '✅';

              if (tipoSiguienteRegistro === 'salida') {
                estadoTexto = 'salida registrada';
                emoji = '✅';
              } else {
                if (data.data?.estado === 'retardo') {
                  estadoTexto = 'retardo';
                  emoji = '⚠️';
                } else if (data.data?.estado === 'falta') {
                  estadoTexto = 'falta';
                  emoji = '❌';
                } else {
                  estadoTexto = 'puntual';
                  emoji = '✅';
                }
              }

              Alert.alert(
                '¡Éxito!',
                `${emoji} ${tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida'} registrada como ${estadoTexto}\nHora: ${new Date(data.data?.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
                [{ text: 'OK' }]
              );

              if (onRegistroExitoso) {
                onRegistroExitoso(data);
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo registrar', [{ text: 'OK' }]);
            } finally {
              setRegistrando(false);
            }
          }
        }
      ]
    );
  };

  const getButtonColor = () => {
    if (jornadaCompletada) return '#6b7280';
    if (!dentroDelArea || !puedeRegistrar) return '#ef4444';
    if (tipoSiguienteRegistro === 'salida' && puedeRegistrar) return '#10b981';
    if (estadoHorario === 'puntual') return '#10b981';
    if (estadoHorario === 'retardo') return '#f59e0b';
    if (estadoHorario === 'falta') return '#ef4444';
    return '#6b7280';
  };

  const getIcon = () => {
    if (jornadaCompletada) return 'checkmark-done-circle';
    if (!dentroDelArea) return 'location';
    if (!puedeRegistrar) return 'time';
    if (tipoSiguienteRegistro === 'salida') return 'log-out';
    if (estadoHorario === 'puntual') return 'checkmark-circle';
    if (estadoHorario === 'retardo') return 'time';
    if (estadoHorario === 'falta') return 'alert-circle';
    return 'time';
  };

  const getStatusText = () => {
    if (jornadaCompletada) return 'Jornada completada';
    if (!dentroDelArea) return 'Fuera del área';
    if (!puedeRegistrar) return 'Fuera de horario';
    if (tipoSiguienteRegistro === 'salida' && puedeRegistrar) return 'Listo para salida';
    if (estadoHorario === 'puntual') return 'Listo para registrar';
    if (estadoHorario === 'retardo') return 'Registro con retardo';
    if (estadoHorario === 'falta') return 'Fuera de tolerancia';
    return 'Verificando...';
  };

  const getButtonText = () => {
    if (jornadaCompletada) return 'Jornada completada';
    if (!puedeRegistrar || !dentroDelArea) return 'No disponible';
    return `Registrar ${tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida'}`;
  };

  const puedePresionarBoton = puedeRegistrar && dentroDelArea && !jornadaCompletada && !registrando;

  return (
    <>
      <View style={styles.container}>
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

        <View style={styles.content}>
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

          {!loading && !jornadaCompletada && (
            <View style={styles.statusIndicators}>
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

              <View style={styles.indicator}>
                <Ionicons 
                  name={
                    tipoSiguienteRegistro === 'salida' ? 'checkmark-circle' :
                    estadoHorario === 'puntual' ? 'checkmark-circle' :
                    estadoHorario === 'retardo' ? 'time' :
                    estadoHorario === 'falta' ? 'alert-circle' :
                    'close-circle'
                  } 
                  size={16} 
                  color={
                    tipoSiguienteRegistro === 'salida' && puedeRegistrar ? '#10b981' :
                    estadoHorario === 'puntual' ? '#10b981' :
                    estadoHorario === 'retardo' ? '#f59e0b' :
                    estadoHorario === 'falta' ? '#ef4444' :
                    '#ef4444'
                  } 
                />
                <Text style={[
                  styles.indicatorText, 
                  { 
                    color: tipoSiguienteRegistro === 'salida' && puedeRegistrar ? '#10b981' :
                           estadoHorario === 'puntual' ? '#10b981' :
                           estadoHorario === 'retardo' ? '#f59e0b' :
                           estadoHorario === 'falta' ? '#ef4444' :
                           '#ef4444'
                  }
                ]}>
                  {tipoSiguienteRegistro === 'salida' && puedeRegistrar ? 'Hora de salida' :
                   estadoHorario === 'puntual' ? 'A tiempo' :
                   estadoHorario === 'retardo' ? 'Con retardo' :
                   estadoHorario === 'falta' ? 'Fuera tolerancia' :
                   'Fuera de horario'}
                </Text>
              </View>
            </View>
          )}

          {!loading && departamentos.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.locationInfo}
                onPress={() => setMostrarDepartamentos(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="location" size={14} color="#6b7280" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {departamentoActivo 
                    ? departamentoActivo.nombre 
                    : `${departamentos.length} ${departamentos.length === 1 ? 'departamento' : 'departamentos'}`
                  }
                </Text>
                <Ionicons name="chevron-down" size={14} color="#6b7280" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              {departamentos.length > 1 && (
                <TouchableOpacity 
                  style={styles.viewMapButton}
                  onPress={() => setMostrarMapa(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={14} color="#3b82f6" />
                  <Text style={styles.viewMapText}>Ver mapa</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <TouchableOpacity
            style={[
              styles.registerButton,
              { backgroundColor: getButtonColor() },
              !puedePresionarBoton && styles.registerButtonDisabled
            ]}
            onPress={handleRegistro}
            disabled={!puedePresionarBoton}
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
                  name={puedePresionarBoton ? 'finger-print' : jornadaCompletada ? 'checkmark-done' : 'lock-closed'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.registerButtonText}>
                  {getButtonText()}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {ultimoRegistroHoy && (
            <View style={styles.lastRegisterContainer}>
              <View style={styles.lastRegisterIcon}>
                <Ionicons
                  name={ultimoRegistroHoy.tipo === 'entrada' ? 'log-in' : 'log-out'}
                  size={12}
                  color="#9ca3af"
                />
              </View>
              <Text style={styles.lastRegisterText}>
                Último: {ultimoRegistroHoy.tipo === 'entrada' ? 'Entrada' : 'Salida'} · {ultimoRegistroHoy.hora}
                {ultimoRegistroHoy.estado && ` · ${ultimoRegistroHoy.estado}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal de lista de departamentos */}
      {departamentos.length > 0 && (
        <Modal
          visible={mostrarDepartamentos}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMostrarDepartamentos(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMostrarDepartamentos(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Departamentos Asignados</Text>
                <TouchableOpacity 
                  onPress={() => setMostrarDepartamentos(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.departamentosList}>
                {departamentos.map((depto, index) => {
                  const esActivo = departamentoActivo?.id === depto.id;
                  
                  return (
                    <TouchableOpacity
                      key={depto.id || index}
                      style={[
                        styles.departamentoItem,
                        esActivo && styles.departamentoItemActivo
                      ]}
                      onPress={() => {
                        setMostrarMapa(true);
                        setMostrarDepartamentos(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.departamentoInfo}>
                        <View style={styles.departamentoHeader}>
                          <Ionicons 
                            name={esActivo ? 'location' : 'location-outline'} 
                            size={20} 
                            color={esActivo ? '#10b981' : '#6b7280'} 
                          />
                          <Text style={[
                            styles.departamentoNombre,
                            esActivo && styles.departamentoNombreActivo
                          ]}>
                            {depto.nombre}
                          </Text>
                        </View>
                        
                        {esActivo && (
                          <View style={styles.departamentoBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.departamentoBadgeText}>Ubicación actual</Text>
                          </View>
                        )}
                      </View>

                      <Ionicons name="map" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Modal de mapa */}
      {(departamentoActivo || departamentos.length > 0) && (
        <Modal
          visible={mostrarMapa}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMostrarMapa(false)}
        >
          <MapaZonasPermitidas
            departamento={departamentoActivo}
            departamentos={departamentos}
            ubicacionActual={ubicacionActual}
            onClose={() => setMostrarMapa(false)}
            onDepartamentoSeleccionado={(depto) => setDepartamentoActivo(depto)}
            darkMode={darkMode}
          />
        </Modal>
      )}
    </>
  );
};

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  departamentosList: {
    padding: 16,
  },
  departamentoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  departamentoItemActivo: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  departamentoInfo: {
    flex: 1,
    gap: 6,
  },
  departamentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  departamentoNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  departamentoNombreActivo: {
    color: '#059669',
  },
  departamentoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 28,
  },
  departamentoBadgeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewMapText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
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
  modalContent: {
    ...registerStyles.modalContent,
    backgroundColor: '#1f2937',
  },
  modalHeader: {
    ...registerStyles.modalHeader,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    ...registerStyles.modalTitle,
    color: '#fff',
  },
  modalCloseButton: {
    ...registerStyles.modalCloseButton,
    backgroundColor: '#374151',
  },
  departamentoItem: {
    ...registerStyles.departamentoItem,
    backgroundColor: '#374151',
  },
  departamentoItemActivo: {
    ...registerStyles.departamentoItemActivo,
    backgroundColor: '#1e3a2f',
  },
  departamentoNombre: {
    ...registerStyles.departamentoNombre,
    color: '#fff',
  },
});

export default RegisterButton;