import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { validarUbicacionPermitida, formatearCoordenadas, isPointInPolygon, extraerCoordenadas } from '../../services/ubicacionService';
import { getApiEndpoint } from '../../config/api';

const API_URL = getApiEndpoint('/api');

/**
 * Componente de botón de registro con validación de ubicación y biometría
 */
export const RegisterButton = ({ userData, darkMode, onRegistroExitoso }) => {
  const [ubicacionActual, setUbicacionActual] = useState(null);
  const [dentroDelArea, setDentroDelArea] = useState(false);
  const [estadoBoton, setEstadoBoton] = useState('cargando');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrando, setRegistrando] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [departamento, setDepartamento] = useState(null);

  const styles = darkMode ? registerStylesDark : registerStyles;

  // ==================== OBTENER ID DEL EMPLEADO ====================
  const getEmpleadoId = () => {
    // La nueva API retorna empleado_id directamente en userData
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
          `${API_URL}/asistencia/empleado/${empleadoId}/ultimo`
        );

        if (!response.ok) {
          console.warn('⚠️ No se pudo obtener último registro');
          return;
        }

        const data = await response.json();
        console.log('📋 Último registro:', data);
        setUltimoRegistro(data.ultimo_registro);
      } catch (err) {
        console.error('❌ Error obteniendo último registro:', err);
      }
    };

    obtenerUltimo();
  }, [userData]);

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

        console.log('📍 Ubicación actual obtenida:', formatearCoordenadas(coords));
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

  // ==================== VALIDAR UBICACIÓN CUANDO CAMBIE ====================
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

        // Obtener ID de departamento desde empleadoInfo
        let departamentoId = null;
        let departamentoData = null;

        if (userData?.empleadoInfo?.id_departamento) {
          departamentoId = userData.empleadoInfo.id_departamento;
          console.log('📋 ID de departamento obtenido de empleadoInfo:', departamentoId);
        }

        if (!departamentoId) {
          console.error('❌ NO SE ENCONTRÓ ID DE DEPARTAMENTO');
          setError('No tienes un departamento asignado.');
          setEstadoBoton('error');
          setLoading(false);
          return;
        }

        // Si ya tenemos los datos del departamento en empleadoInfo
        if (userData?.empleadoInfo?.departamento?.ubicacion) {
          console.log('✅ Usando datos de departamento del empleadoInfo');
          departamentoData = userData.empleadoInfo.departamento;

          const coordenadas = extraerCoordenadas(departamentoData.ubicacion);

          if (coordenadas && coordenadas.length >= 3) {
            const dentroDelArea = isPointInPolygon(ubicacionActual, coordenadas);

            setDentroDelArea(dentroDelArea);
            setDepartamento({
              ...departamentoData,
              nombre: departamentoData.nombre_departamento || departamentoData.nombre
            });
            setEstadoBoton(dentroDelArea ? 'disponible' : 'fuera');
            setError(null);
            setLoading(false);
            return;
          }
        }

        // Si no, hacer fetch del departamento desde API
        console.log('🌐 Haciendo fetch del departamento desde API...');
        const resultado = await validarUbicacionPermitida(
          ubicacionActual,
          departamentoId
        );

        if (resultado.error) {
          setError(resultado.error);
          setEstadoBoton('error');
          setDepartamento(resultado.departamento);
        } else {
          setDentroDelArea(resultado.dentroDelArea);
          setDepartamento(resultado.departamento);
          setEstadoBoton(resultado.dentroDelArea ? 'disponible' : 'fuera');
          setError(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Error validando ubicación:', err);
        setError('Error al validar ubicación');
        setEstadoBoton('error');
        setLoading(false);
      }
    };

    validarUbicacion();
  }, [ubicacionActual, userData]);

  // ==================== MANEJAR REGISTRO ====================
  const handleRegistro = async () => {
    try {
      if (estadoBoton !== 'disponible') {
        Alert.alert(
          'No disponible',
          estadoBoton === 'fuera'
            ? 'Debes estar dentro del área permitida para registrar tu asistencia.'
            : 'El registro no está disponible en este momento.',
          [{ text: 'Entendido' }]
        );
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
              setRegistrando(true);

              try {
                // Generar placeholder de huella
                const huellaPlaceholder = 'HUELLA_PLACEHOLDER_' + Date.now();

                console.log('📤 Enviando registro de asistencia:', {
                  id_empleado: empleadoId,
                  tipo: tipoRegistro,
                  ubicacion: ubicacionActual
                });

                const response = await fetch(`${API_URL}/asistencia/registrar`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    id_empleado: empleadoId,
                    tipo: tipoRegistro,
                    huella_dactilar: huellaPlaceholder,
                    dispositivo_id: 'MOBILE_APP',
                    ubicacion: JSON.stringify(ubicacionActual)
                  })
                });

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || 'Error al registrar asistencia');
                }

                console.log('✅ Asistencia registrada:', data);

                setUltimoRegistro(data.registro);

                Alert.alert(
                  '¡Éxito!',
                  `${tipoRegistro} registrada correctamente\nHora: ${data.registro.hora}`,
                  [{ text: 'OK' }]
                );

                if (onRegistroExitoso) {
                  onRegistroExitoso(data);
                }

              } catch (err) {
                console.error('❌ Error registrando:', err);
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
        return '#10b981';
      case 'fuera':
        return '#2563eb';
      case 'error':
      case 'cargando':
      default:
        return '#6b7280';
    }
  };

  const getIcon = () => {
    switch (estadoBoton) {
      case 'disponible':
        return 'checkmark-circle';
      case 'fuera':
        return 'location';
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
      case 'fuera':
        return 'Fuera del área';
      case 'error':
        return 'Sin conexión';
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

        {/* Location Info */}
        {!loading && departamento && (
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={14} color="#6b7280" />
            <Text style={styles.locationText} numberOfLines={1}>
              {departamento.nombre}
            </Text>
          </View>
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  biometricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  biometricText: {
    fontSize: 12,
    fontWeight: '600',
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