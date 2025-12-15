import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Obtener el ID correcto del empleado
  const getEmpleadoId = () => {
    // Intentar con id_empleado primero (estructura nueva)
    if (userData?.empleado?.id_empleado) {
      return userData.empleado.id_empleado;
    }
    // Fallback a id (estructura antigua)
    if (userData?.empleado?.id) {
      return userData.empleado.id;
    }
    return null;
  };

  useEffect(() => {
    const empleadoId = getEmpleadoId();
    
    if (empleadoId) {
      console.log('✅ ID de empleado encontrado:', empleadoId);
      
      // Agregar un timeout de seguridad de 10 segundos
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

  const cargarHorario = async (empleadoId) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📅 === INICIO CARGA DE HORARIO ===');
      console.log('📅 Cargando horario para empleado ID:', empleadoId);

      // Obtener horario del empleado
      const horario = await getHorarioPorEmpleado(empleadoId);
      
      console.log('📅 Horario recibido:', horario);

      // Parsear y formatear datos
      const horarioParsed = parsearHorario(horario);
      console.log('📅 Horario parseado:', horarioParsed);
      
      setScheduleData(horarioParsed);

      // Calcular resumen semanal
      const resumenCalculado = calcularResumenSemanal(horarioParsed);
      console.log('📅 Resumen calculado:', resumenCalculado);
      setResumen(resumenCalculado);

      // Obtener info del día actual
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
      
      // Establecer horario vacío en caso de error
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
    primerDia.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes

    const ultimoDia = new Date(primerDia);
    ultimoDia.setDate(primerDia.getDate() + 4); // Viernes

    const formatoFecha = (fecha) => {
      const dia = fecha.getDate();
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mes = meses[fecha.getMonth()];
      return `${dia} ${mes}`;
    };

    return `${formatoFecha(primerDia)} - ${formatoFecha(ultimoDia)}`;
  };

  const styles = darkMode ? scheduleStylesDark : scheduleStyles;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando horario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Horario</Text>
        <Text style={styles.headerSubtitle}>
          {userData?.nombre || userData?.usuario?.nombre || 'Usuario'}
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Schedule Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horario Asignado</Text>
          <Text style={styles.sectionSubtitle}>Semana del {obtenerFechaSemana()}</Text>
          
          {scheduleData.map((schedule, index) => (
            <View 
              key={index} 
              style={[
                styles.scheduleCard,
                { 
                  borderLeftColor: schedule.active ? '#2563eb' : '#d1d5db',
                  backgroundColor: schedule.active 
                    ? (darkMode ? '#374151' : '#eff6ff')
                    : (darkMode ? '#374151' : '#f9fafb')
                }
              ]}
            >
              <View style={styles.scheduleContent}>
                <Text style={[
                  styles.scheduleDay,
                  { color: schedule.active ? (darkMode ? '#fff' : '#1f2937') : '#9ca3af' }
                ]}>
                  {schedule.day}
                </Text>
                <Text style={[
                  styles.scheduleLocation,
                  { color: darkMode ? '#d1d5db' : '#6b7280' }
                ]}>
                  {schedule.location}
                </Text>
                {schedule.tipo === 'quebrado' && schedule.active && (
                  <Text style={styles.scheduleType}>
                    🔄 Horario quebrado
                  </Text>
                )}
              </View>
              <View style={styles.scheduleRight}>
                <Text style={[
                  styles.scheduleTime,
                  { color: schedule.active ? (darkMode ? '#fff' : '#1f2937') : '#9ca3af' }
                ]}>
                  {schedule.time}
                </Text>
                {schedule.hours && (
                  <Text style={[
                    styles.scheduleHours,
                    { color: darkMode ? '#d1d5db' : '#6b7280' }
                  ]}>
                    {schedule.hours}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Semanal</Text>
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: darkMode ? '#374151' : '#eff6ff' }]}>
              <Text style={[styles.summaryLabel, { color: darkMode ? '#d1d5db' : '#6b7280' }]}>
                Total de horas
              </Text>
              <Text style={styles.summaryValue}>{resumen.horasTotales}</Text>
              <Text style={[styles.summarySubtext, { color: darkMode ? '#9ca3af' : '#9ca3af' }]}>
                esta semana
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: darkMode ? '#374151' : '#d1fae5' }]}>
              <Text style={[styles.summaryLabel, { color: darkMode ? '#d1d5db' : '#6b7280' }]}>
                Días laborales
              </Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                {resumen.diasLaborales}
              </Text>
              <Text style={[styles.summarySubtext, { color: darkMode ? '#9ca3af' : '#9ca3af' }]}>
                de {resumen.totalDias} días
              </Text>
            </View>
          </View>
        </View>

        {/* Info del Día Actual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Hoy</Text>
          
          {infoHoy.trabaja ? (
            <>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Horario de entrada</Text>
                  <Text style={styles.infoText}>
                    {infoHoy.entrada} con tolerancia de 10 minutos
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color="#ea580c" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Horario de salida</Text>
                  <Text style={styles.infoText}>{infoHoy.salida}</Text>
                </View>
              </View>
              {infoHoy.tipo === 'quebrado' && infoHoy.turnos.length > 1 && (
                <View style={styles.infoItem}>
                  <Ionicons name="swap-horizontal" size={20} color="#8b5cf6" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Turnos</Text>
                    {infoHoy.turnos.map((turno, idx) => (
                      <Text key={idx} style={styles.infoText}>
                        Turno {idx + 1}: {turno.entrada} - {turno.salida}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={20} color="#10b981" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Ubicación</Text>
                  <Text style={styles.infoText}>Edificio A - Entrada Principal</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noDayInfo}>
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text style={styles.noDayText}>Hoy es tu día de descanso</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight + 20 : 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#93c5fd',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 15,
  },
  scheduleCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduleLocation: {
    fontSize: 14,
    marginTop: 2,
  },
  scheduleType: {
    fontSize: 12,
    color: '#8b5cf6',
    marginTop: 4,
  },
  scheduleRight: {
    alignItems: 'flex-end',
  },
  scheduleTime: {
    fontSize: 15,
    fontWeight: '600',
  },
  scheduleHours: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  noDayInfo: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDayText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
});

const scheduleStylesDark = StyleSheet.create({
  ...scheduleStyles,
  container: {
    ...scheduleStyles.container,
    backgroundColor: '#111827',
  },
  section: {
    ...scheduleStyles.section,
    backgroundColor: '#1f2937',
  },
  sectionTitle: {
    ...scheduleStyles.sectionTitle,
    color: '#fff',
  },
  sectionSubtitle: {
    ...scheduleStyles.sectionSubtitle,
    color: '#d1d5db',
  },
  infoTitle: {
    ...scheduleStyles.infoTitle,
    color: '#fff',
  },
  infoText: {
    ...scheduleStyles.infoText,
    color: '#d1d5db',
  },
  noDayText: {
    ...scheduleStyles.noDayText,
    color: '#d1d5db',
  },
  loadingText: {
    ...scheduleStyles.loadingText,
    color: '#d1d5db',
  },
});