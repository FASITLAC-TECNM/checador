import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RegisterButton } from '../map/RegisterButton';
import { getHorarioPorEmpleado, parsearHorario } from '../../services/horariosService';

const obtenerUrlFotoPerfil = (foto) => {  
  if (!foto) {
    return null;
  }
  if (foto.startsWith('data:image/')) {
    return foto;
  }
  if (foto.startsWith('http://') || foto.startsWith('https://')) {
    return foto;
  }
  const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
  const url = `${BASE_URL}${foto.startsWith('/') ? '' : '/'}${foto}`;
  
  return url;
};
export const HomeScreen = ({ userData, darkMode }) => {
  const [token, setToken] = useState(null);
  const [infoHoy, setInfoHoy] = useState(null);
  const [loadingHorario, setLoadingHorario] = useState(true);

  useEffect(() => {
    const obtenerToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
      }
    };
    obtenerToken();
  }, []);

  useEffect(() => {
    const cargarInfoDia = async () => {
      if (!userData?.empleado_id || !userData?.token) {
        setLoadingHorario(false);
        return;
      }

      try {
        const horario = await getHorarioPorEmpleado(userData.empleado_id, userData.token);
        const horarioParsed = parsearHorario(horario);
        
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const hoy = new Date();
        const nombreHoy = diasSemana[hoy.getDay()];
        
        const diaHoy = horarioParsed.find(d => d.day === nombreHoy);
        
        if (diaHoy && diaHoy.active && diaHoy.turnos && diaHoy.turnos.length > 0) {
          const ahora = hoy.getHours() * 60 + hoy.getMinutes();
          const convertirAMinutos = (hora) => {
            const [h, m] = hora.split(':').map(Number);
            return h * 60 + m;
          };

          let turnoActual = null;
          let proximoTurno = null;

          for (const turno of diaHoy.turnos) {
            const inicio = convertirAMinutos(turno.entrada);
            const fin = convertirAMinutos(turno.salida);
            
            if (ahora >= inicio && ahora <= fin) {
              turnoActual = turno;
              break;
            }
          }

          if (!turnoActual) {
            for (const turno of diaHoy.turnos) {
              const inicio = convertirAMinutos(turno.entrada);
              if (ahora < inicio) {
                proximoTurno = turno;
                break;
              }
            }
          }

          setInfoHoy({
            trabaja: true,
            turnoActual,
            proximoTurno,
            totalTurnos: diaHoy.turnos.length
          });
        } else {
          setInfoHoy({ trabaja: false });
        }
      } catch (error) {
        setInfoHoy(null);
      } finally {
        setLoadingHorario(false);
      }
    };

    cargarInfoDia();
  }, [userData]);

  const styles = darkMode ? homeStylesDark : homeStyles;
  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;

  const esEmpleado = userData.es_empleado && userData.empleado_id;
  const tipoUsuario = esEmpleado ? 'Empleado' : 'Usuario';

  const handleRegistroExitoso = () => {
    // Registro exitoso
  };

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"}
      />
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                {fotoUrl ? (
                  <Image 
                    source={{ uri: fotoUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={26} color="#FFFF" />
                  </View>
                )}
                <View style={[
                  styles.statusDot,
                  { backgroundColor: '#10b981' }
                ]} />
              </View>
              
              <View style={styles.headerInfo}>
                <Text style={styles.headerGreeting}>{obtenerSaludo()}</Text>
                <Text style={styles.headerName} numberOfLines={1}>{userData.nombre}</Text>
                <View style={styles.userTypeChip}>
                  <Ionicons 
                    name={esEmpleado ? "briefcase" : "person"} 
                    size={11} 
                    color="#e0f2fe" 
                  />
                  <Text style={styles.userTypeText}>{tipoUsuario}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 3 Bloques de información */}
        {esEmpleado && (
          <View style={styles.infoBloques}>
            {/* Bloque 1: Día de hoy */}
            <View style={styles.infoBloque}>
              <View style={[styles.infoBloqueIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="calendar-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.infoBloqueLabel}>Hoy</Text>
              <Text style={styles.infoBloqueValue} numberOfLines={1}>
                {new Date().toLocaleDateString('es-ES', { weekday: 'short' })}
              </Text>
            </View>

            {/* Bloque 2: Estado del turno */}
            <View style={styles.infoBloque}>
              {loadingHorario ? (
                <>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.infoBloqueLabel}>Cargando...</Text>
                </>
              ) : infoHoy === null ? (
                <>
                  <View style={[styles.infoBloqueIcon, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  </View>
                  <Text style={styles.infoBloqueLabel}>Estado</Text>
                  <Text style={styles.infoBloqueValue}>Sin horario</Text>
                </>
              ) : infoHoy.trabaja ? (
                infoHoy.turnoActual ? (
                  <>
                    <View style={[styles.infoBloqueIcon, { backgroundColor: '#dcfce7' }]}>
                      <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                    </View>
                    <Text style={styles.infoBloqueLabel}>En turno</Text>
                    <Text style={styles.infoBloqueValue} numberOfLines={1}>
                      {infoHoy.turnoActual.salida}
                    </Text>
                  </>
                ) : infoHoy.proximoTurno ? (
                  <>
                    <View style={[styles.infoBloqueIcon, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="time-outline" size={18} color="#d97706" />
                    </View>
                    <Text style={styles.infoBloqueLabel}>Próximo</Text>
                    <Text style={styles.infoBloqueValue} numberOfLines={1}>
                      {infoHoy.proximoTurno.entrada}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.infoBloqueIcon, { backgroundColor: '#e0e7ff' }]}>
                      <Ionicons name="moon-outline" size={18} color="#6366f1" />
                    </View>
                    <Text style={styles.infoBloqueLabel}>Estado</Text>
                    <Text style={styles.infoBloqueValue}>Finalizado</Text>
                  </>
                )
              ) : (
                <>
                  <View style={[styles.infoBloqueIcon, { backgroundColor: '#f3e8ff' }]}>
                    <Ionicons name="cafe-outline" size={18} color="#9333ea" />
                  </View>
                  <Text style={styles.infoBloqueLabel}>Descanso</Text>
                  <Text style={styles.infoBloqueValue}>Hoy libre</Text>
                </>
              )}
            </View>

            {/* Bloque 3: Total de turnos */}
            <View style={styles.infoBloque}>
              {loadingHorario ? (
                <>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.infoBloqueLabel}>...</Text>
                </>
              ) : infoHoy && infoHoy.trabaja ? (
                <>
                  <View style={[styles.infoBloqueIcon, { backgroundColor: '#f0fdfa' }]}>
                    <Ionicons name="albums-outline" size={18} color="#14b8a6" />
                  </View>
                  <Text style={styles.infoBloqueLabel}>Turnos</Text>
                  <Text style={styles.infoBloqueValue}>
                    {infoHoy.totalTurnos || 0}
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.infoBloqueIcon, { backgroundColor: '#f3f4f6' }]}>
                    <Ionicons name="remove-circle-outline" size={18} color="#6b7280" />
                  </View>
                  <Text style={styles.infoBloqueLabel}>Turnos</Text>
                  <Text style={styles.infoBloqueValue}>0</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Register Button */}
        <RegisterButton 
          userData={userData} 
          darkMode={darkMode}
          onRegistroExitoso={handleRegistroExitoso}
        />
      </ScrollView>
    </View>
  );
};

const homeStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWrapper: {
    backgroundColor: '#2563eb',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f1f5f9',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  headerInfo: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 13,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  headerName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
    marginBottom: 4,
  },
  userTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  userTypeText: {
    fontSize: 11,
    color: '#e0f2fe',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // 3 Bloques de info
  infoBloques: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  infoBloque: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minHeight: 90,
    justifyContent: 'center',
  },
  infoBloqueIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoBloqueLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoBloqueValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
});

const homeStylesDark = StyleSheet.create({
  ...homeStyles,
  mainContainer: {
    ...homeStyles.mainContainer,
    backgroundColor: '#0f172a',
  },
  headerWrapper: {
    ...homeStyles.headerWrapper,
    backgroundColor: '#1e40af',
  },
  header: {
    ...homeStyles.header,
    backgroundColor: '#1e40af',
  },
  statusDot: {
    ...homeStyles.statusDot,
    borderColor: '#1e40af',
  },
  infoBloque: {
    ...homeStyles.infoBloque,
    backgroundColor: '#1f2937',
  },
  infoBloqueValue: {
    ...homeStyles.infoBloqueValue,
    color: '#f9fafb',
  },
});