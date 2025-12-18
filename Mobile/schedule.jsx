import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { 
  getHorarioPorEmpleado, 
  parsearHorario, 
  calcularResumenSemanal,
  getInfoDiaActual 
} from './services/horariosService';

export const ScheduleScreen = ({ darkMode, userData }) => {
  const [scheduleData, setScheduleData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resumen, setResumen] = useState({ diasLaborales: 0, totalDias: 7, horasTotales: '0' });
  const [infoHoy, setInfoHoy] = useState({ trabaja: false, entrada: null, salida: null });
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const getEmpleadoId = () => {
    if (userData?.empleado?.id_empleado) {
      return userData.empleado.id_empleado;
    }
    if (userData?.empleado?.id) {
      return userData.empleado.id;
    }
    return null;
  };

  useEffect(() => {
    const empleadoId = getEmpleadoId();
    
    if (empleadoId) {
      console.log('✅ ID de empleado encontrado:', empleadoId);
      
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.error('⏱️ TIMEOUT: La carga tomó más de 10 segundos');
          setError('La carga del horario está tomando demasiado tiempo. Verifica tu conexión.');
          setIsLoading(false);
          setScheduleData(obtenerHorarioVacio());
        }
      }, 10000);

      cargarHorario(empleadoId).finally(() => {
        clearTimeout(timeoutId);
      });

      return () => clearTimeout(timeoutId);
    } else {
      console.warn('⚠️ No se pudo obtener el ID del empleado');
      console.warn('userData:', JSON.stringify(userData, null, 2));
      setIsLoading(false);
      setError('No se pudo identificar al empleado. Verifica tu sesión.');
      setScheduleData(obtenerHorarioVacio());
    }
  }, [userData]);

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  const cargarHorario = async (empleadoId) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📅 === INICIO CARGA DE HORARIO ===');
      console.log('📅 Cargando horario para empleado ID:', empleadoId);

      const horario = await getHorarioPorEmpleado(empleadoId);
      console.log('📅 Horario recibido:', horario);

      const horarioParsed = parsearHorario(horario);
      console.log('📅 Horario parseado:', horarioParsed);
      
      setScheduleData(horarioParsed);

      const resumenCalculado = calcularResumenSemanal(horarioParsed);
      console.log('📅 Resumen calculado:', resumenCalculado);
      setResumen(resumenCalculado);

      const infoDia = getInfoDiaActual(horarioParsed);
      console.log('📅 Info día actual:', infoDia);
      setInfoHoy(infoDia);

      console.log('✅ Horario cargado exitosamente');
    } catch (error) {
      console.error('❌ === ERROR EN CARGA DE HORARIO ===');
      console.error('❌ Error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      setError(error.message || 'Error desconocido al cargar horario');
      
      const horarioVacio = obtenerHorarioVacio();
      setScheduleData(horarioVacio);
      setResumen({ diasLaborales: 0, totalDias: 7, horasTotales: '0' });
      setInfoHoy({ trabaja: false, entrada: null, salida: null });
    } finally {
      setIsLoading(false);
      console.log('📅 === FIN CARGA DE HORARIO ===');
    }
  };

  const onRefresh = async () => {
    const empleadoId = getEmpleadoId();
    if (empleadoId) {
      setRefreshing(true);
      await cargarHorario(empleadoId);
      setRefreshing(false);
    }
  };

  const obtenerHorarioVacio = () => {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return dias.map(day => ({
      day,
      active: false,
      location: 'Sin configurar',
      time: '---',
      hours: '',
      turnos: []
    }));
  };

  const obtenerFechaSemana = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy);
    primerDia.setDate(hoy.getDate() - hoy.getDay() + 1);

    const ultimoDia = new Date(primerDia);
    ultimoDia.setDate(primerDia.getDate() + 4);

    const formatoFecha = (fecha) => {
      const dia = fecha.getDate();
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mes = meses[fecha.getMonth()];
      return `${dia} ${mes}`;
    };

    return `${formatoFecha(primerDia)} - ${formatoFecha(ultimoDia)}`;
  };

  const getDayIcon = (day) => {
    const icons = {
      'Lunes': 'sunny-outline',
      'Martes': 'partly-sunny-outline',
      'Miércoles': 'cloudy-outline',
      'Jueves': 'rainy-outline',
      'Viernes': 'star-outline',
      'Sábado': 'home-outline',
      'Domingo': 'bed-outline'
    };
    return icons[day] || 'calendar-outline';
  };

  const styles = darkMode ? scheduleStylesDark : scheduleStyles;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando tu horario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header con gradiente */}
      <LinearGradient
        colors={darkMode ? ['#4f46e5', '#7c3aed'] : ['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Hola de nuevo 👋</Text>
            <Text style={styles.headerTitle}>
              {userData?.nombre || userData?.usuario?.nombre || 'Usuario'}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {error && (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={24} color="#ef4444" />
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Info del Día Actual - Destacado */}
          {infoHoy.trabaja && (
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>HOY</Text>
                </View>
                <Text style={styles.todayDate}>
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>

              <View style={styles.todayTimeContainer}>
                <View style={styles.todayTimeBlock}>
                  <View style={styles.timeIconContainer}>
                    <Ionicons name="log-in-outline" size={24} color="#6366f1" />
                  </View>
                  <View style={styles.todayTimeInfo}>
                    <Text style={styles.todayTimeLabel}>Entrada</Text>
                    <Text style={styles.todayTime}>{infoHoy.entrada}</Text>
                    <Text style={styles.todayTolerance}>+10 min tolerancia</Text>
                  </View>
                </View>

                <View style={styles.timeDivider} />

                <View style={styles.todayTimeBlock}>
                  <View style={[styles.timeIconContainer, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="log-out-outline" size={24} color="#f59e0b" />
                  </View>
                  <View style={styles.todayTimeInfo}>
                    <Text style={styles.todayTimeLabel}>Salida</Text>
                    <Text style={styles.todayTime}>{infoHoy.salida}</Text>
                  </View>
                </View>
              </View>

              {infoHoy.tipo === 'quebrado' && infoHoy.turnos.length > 1 && (
                <View style={styles.splitShiftBanner}>
                  <Ionicons name="swap-horizontal" size={18} color="#8b5cf6" />
                  <Text style={styles.splitShiftText}>Horario Quebrado</Text>
                </View>
              )}

              <View style={styles.todayLocation}>
                <Ionicons name="location" size={16} color="#6366f1" />
                <Text style={styles.todayLocationText}>Edificio A - Entrada Principal</Text>
              </View>
            </View>
          )}

          {!infoHoy.trabaja && (
            <View style={styles.dayOffCard}>
              <View style={styles.dayOffIcon}>
                <Ionicons name="cafe-outline" size={48} color="#6366f1" />
              </View>
              <Text style={styles.dayOffTitle}>Día de Descanso</Text>
              <Text style={styles.dayOffText}>Disfruta tu día libre 🎉</Text>
            </View>
          )}

          {/* Resumen Semanal */}
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <LinearGradient
                colors={darkMode ? ['#4f46e5', '#6366f1'] : ['#6366f1', '#818cf8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryGradient}
              >
                <Ionicons name="time-outline" size={28} color="#fff" />
                <Text style={styles.summaryValue}>{resumen.horasTotales}</Text>
                <Text style={styles.summaryLabel}>Horas Totales</Text>
              </LinearGradient>
            </View>

            <View style={styles.summaryCard}>
              <LinearGradient
                colors={darkMode ? ['#059669', '#10b981'] : ['#10b981', '#34d399']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryGradient}
              >
                <Ionicons name="calendar-outline" size={28} color="#fff" />
                <Text style={styles.summaryValue}>{resumen.diasLaborales}</Text>
                <Text style={styles.summaryLabel}>Días Laborales</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Horario Semanal */}
          <View style={styles.scheduleSection}>
            <View style={styles.scheduleSectionHeader}>
              <Text style={styles.scheduleSectionTitle}>Horario Semanal</Text>
              <Text style={styles.scheduleSectionSubtitle}>{obtenerFechaSemana()}</Text>
            </View>
            
            {scheduleData.map((schedule, index) => {
              const isToday = schedule.day === new Date().toLocaleDateString('es-ES', { weekday: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('es-ES', { weekday: 'long' }).slice(1);
              
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  style={[
                    styles.scheduleItem,
                    !schedule.active && styles.scheduleItemInactive,
                    isToday && styles.scheduleItemToday
                  ]}
                >
                  <View style={styles.scheduleLeft}>
                    <View style={[
                      styles.dayIconContainer,
                      schedule.active ? styles.dayIconActive : styles.dayIconInactive
                    ]}>
                      <Ionicons 
                        name={getDayIcon(schedule.day)} 
                        size={20} 
                        color={schedule.active ? '#6366f1' : '#9ca3af'} 
                      />
                    </View>
                    <View style={styles.scheduleInfo}>
                      <View style={styles.scheduleTopRow}>
                        <Text style={[
                          styles.scheduleDay,
                          !schedule.active && styles.scheduleDayInactive
                        ]}>
                          {schedule.day}
                        </Text>
                        {isToday && (
                          <View style={styles.todayDot} />
                        )}
                      </View>
                      <Text style={[
                        styles.scheduleLocation,
                        !schedule.active && styles.scheduleLocationInactive
                      ]}>
                        {schedule.location}
                      </Text>
                      {schedule.tipo === 'quebrado' && schedule.active && (
                        <View style={styles.splitBadge}>
                          <Text style={styles.splitBadgeText}>Quebrado</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.scheduleRight}>
                    <Text style={[
                      styles.scheduleTime,
                      !schedule.active && styles.scheduleTimeInactive
                    ]}>
                      {schedule.time}
                    </Text>
                    {schedule.hours && schedule.active && (
                      <View style={styles.hoursChip}>
                        <Text style={styles.hoursChipText}>{schedule.hours}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight + 20 : 50,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 14,
    color: '#e0e7ff',
    marginBottom: 4,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '500',
  },
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  todayHeader: {
    marginBottom: 20,
  },
  todayBadge: {
    backgroundColor: '#6366f1',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  todayDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  todayTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayTimeBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  todayTimeInfo: {
    flex: 1,
  },
  todayTimeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  todayTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  todayTolerance: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 2,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  splitShiftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  splitShiftText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  todayLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  todayLocationText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  dayOffCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayOffIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayOffTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  dayOffText: {
    fontSize: 16,
    color: '#6b7280',
  },
  summarySection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryGradient: {
    padding: 20,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
  },
  scheduleSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleSectionHeader: {
    marginBottom: 20,
  },
  scheduleSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  scheduleSectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  scheduleItemInactive: {
    backgroundColor: 'transparent',
  },
  scheduleItemToday: {
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dayIconActive: {
    backgroundColor: '#eef2ff',
  },
  dayIconInactive: {
    backgroundColor: '#f3f4f6',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scheduleDayInactive: {
    color: '#9ca3af',
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginLeft: 8,
  },
  scheduleLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  scheduleLocationInactive: {
    color: '#9ca3af',
  },
  splitBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  splitBadgeText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  scheduleRight: {
    alignItems: 'flex-end',
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scheduleTimeInactive: {
    color: '#9ca3af',
  },
  hoursChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  hoursChipText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
});

const scheduleStylesDark = StyleSheet.create({
  ...scheduleStyles,
  container: {
    ...scheduleStyles.container,
    backgroundColor: '#111827',
  },
  todayCard: {
    ...scheduleStyles.todayCard,
    backgroundColor: '#1f2937',
  },
  todayDate: {
    ...scheduleStyles.todayDate,
    color: '#f9fafb',
  },
  todayTime: {
    ...scheduleStyles.todayTime,
    color: '#f9fafb',
  },
  todayLocationText: {
    ...scheduleStyles.todayLocationText,
    color: '#9ca3af',
  },
  dayOffCard: {
    ...scheduleStyles.dayOffCard,
    backgroundColor: '#1f2937',
  },
  dayOffIcon: {
    ...scheduleStyles.dayOffIcon,
    backgroundColor: '#374151',
  },
  dayOffTitle: {
    ...scheduleStyles.dayOffTitle,
    color: '#f9fafb',
  },
  dayOffText: {
    ...scheduleStyles.dayOffText,
    color: '#9ca3af',
  },
  scheduleSection: {
    ...scheduleStyles.scheduleSection,
    backgroundColor: '#1f2937',
  },
  scheduleSectionTitle: {
    ...scheduleStyles.scheduleSectionTitle,
    color: '#f9fafb',
  },
  scheduleSectionSubtitle: {
    ...scheduleStyles.scheduleSectionSubtitle,
    color: '#9ca3af',
  },
  scheduleItem: {
    ...scheduleStyles.scheduleItem,
    backgroundColor: '#374151',
  },
  scheduleItemInactive: {
    ...scheduleStyles.scheduleItemInactive,
    backgroundColor: 'transparent',
  },
  scheduleItemToday: {
    ...scheduleStyles.scheduleItemToday,
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
  },
  dayIconActive: {
    ...scheduleStyles.dayIconActive,
    backgroundColor: '#374151',
  },
  dayIconInactive: {
    ...scheduleStyles.dayIconInactive,
    backgroundColor: '#1f2937',
  },
  scheduleDay: {
    ...scheduleStyles.scheduleDay,
    color: '#f9fafb',
  },
  scheduleLocation: {
    ...scheduleStyles.scheduleLocation,
    color: '#9ca3af',
  },
  scheduleTime: {
    ...scheduleStyles.scheduleTime,
    color: '#f9fafb',
  },
  loadingText: {
    ...scheduleStyles.loadingText,
    color: '#9ca3af',
  },
});