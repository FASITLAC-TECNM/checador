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
import { TouchableOpacity } from 'react-native';
import { RegisterButton } from '../map/RegisterButton';
import { ScheduleBento } from './ScheduleBento';
import sqliteManager from '../../services/offline/sqliteManager';
import { parsearHorario } from '../../services/horariosService';

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
export const HomeScreen = ({ userData, darkMode, onOpenAvisos }) => {
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
        // Usar SQLite local en lugar de API
        const horario = await sqliteManager.getHorario(userData.empleado_id);
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

            {/* Icono de avisos */}
            <TouchableOpacity
              onPress={onOpenAvisos}
              style={styles.notifyButton}
              activeOpacity={0.7}
            >
              <Ionicons name="megaphone-outline" size={22} color="#fff" />
            </TouchableOpacity>
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
          <ScheduleBento
            infoHoy={infoHoy}
            loading={loadingHorario}
            darkMode={darkMode}
          />
        )}

        {/* Register Button - Solo visible para empleados */}
        {esEmpleado && (
          <RegisterButton
            userData={userData}
            darkMode={darkMode}
            onRegistroExitoso={handleRegistroExitoso}
          />
        )}
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
  notifyButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
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