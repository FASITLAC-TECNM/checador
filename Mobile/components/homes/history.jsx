import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAsistenciasEmpleado } from '../../services/asistenciasService';

export const HistoryScreen = ({ darkMode, userData }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    diasAsistidos: 0,
    entradas: 0,
    salidas: 0,
    retardos: 0,
    faltas: 0,
    puntuales: 0
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const styles = darkMode ? historyStylesDark : historyStyles;

  // Cargar asistencias del mes actual
  const cargarAsistencias = useCallback(async () => {
    if (!userData?.empleado_id || !userData?.token) {
      setLoading(false);
      return;
    }

    try {
      const primerDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const ultimoDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const filtros = {
        fecha_inicio: primerDia.toISOString().split('T')[0],
        fecha_fin: ultimoDia.toISOString().split('T')[0]
      };

      const response = await getAsistenciasEmpleado(userData.empleado_id, userData.token, filtros);
      
      if (response?.data && Array.isArray(response.data)) {
        // Ordenar por fecha más reciente primero
        const asistenciasOrdenadas = response.data.sort((a, b) => 
          new Date(b.fecha_registro) - new Date(a.fecha_registro)
        );
        
        setAsistencias(asistenciasOrdenadas);
        calcularEstadisticas(asistenciasOrdenadas);
      } else {
        setAsistencias([]);
        setEstadisticas({
          diasAsistidos: 0,
          entradas: 0,
          salidas: 0,
          retardos: 0,
          faltas: 0,
          puntuales: 0
        });
      }
    } catch (error) {
      console.error('Error cargando asistencias:', error);
      setAsistencias([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData, currentMonth]);

  // Calcular estadísticas del mes
  const calcularEstadisticas = (data) => {
    const stats = {
      diasAsistidos: 0,
      entradas: 0,
      salidas: 0,
      retardos: 0,
      faltas: 0,
      puntuales: 0
    };

    // Agrupar por día
    const diasUnicos = new Set();
    
    data.forEach(registro => {
      const fecha = new Date(registro.fecha_registro).toDateString();
      diasUnicos.add(fecha);

      if (registro.tipo === 'entrada') {
        stats.entradas++;
        if (registro.estado === 'puntual') stats.puntuales++;
        if (registro.estado === 'retardo') stats.retardos++;
        if (registro.estado === 'falta') stats.faltas++;
      } else if (registro.tipo === 'salida') {
        stats.salidas++;
      }
    });

    stats.diasAsistidos = diasUnicos.size;

    setEstadisticas(stats);
  };

  useEffect(() => {
    cargarAsistencias();
  }, [cargarAsistencias]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarAsistencias();
  };

  const cambiarMes = (direccion) => {
    const nuevoMes = new Date(currentMonth);
    nuevoMes.setMonth(currentMonth.getMonth() + direccion);
    setCurrentMonth(nuevoMes);
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
  };

  const formatearHora = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'puntual':
        return '#059669';
      case 'retardo':
        return '#f59e0b';
      case 'falta':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const obtenerTextoEstado = (estado) => {
    switch (estado) {
      case 'puntual':
        return 'Puntual';
      case 'retardo':
        return 'Retardo';
      case 'falta':
        return 'Falta';
      default:
        return 'Registrado';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"}
      />
      
      {/* Header - Mismo tamaño que HomeScreen */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historial</Text>
          <Text style={styles.headerSubtitle}>Registro de asistencias</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
            colors={['#2563eb']}
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
      >
        {/* Navegación de mes */}
        <View style={styles.section}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => cambiarMes(-1)}
            >
              <Ionicons name="chevron-back" size={24} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.calendarMonth}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={() => cambiarMes(1)}
              disabled={currentMonth >= new Date()}
            >
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color={currentMonth >= new Date() ? '#9ca3af' : '#2563eb'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estadísticas de {monthNames[currentMonth.getMonth()]}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.statNumber, { color: '#2563eb' }]}>
                  {estadisticas.diasAsistidos}
                </Text>
              </View>
              <Text style={styles.statLabel}>Días con registro</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
                <Text style={[styles.statNumber, { color: '#059669' }]}>
                  {estadisticas.puntuales}
                </Text>
              </View>
              <Text style={styles.statLabel}>Puntuales</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fed7aa' }]}>
                <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
                  {estadisticas.retardos}
                </Text>
              </View>
              <Text style={styles.statLabel}>Retardos</Text>
            </View>
          </View>

          <View style={[styles.statsContainer, { marginTop: 12 }]}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
                <Text style={[styles.statNumber, { color: '#059669' }]}>
                  {estadisticas.entradas}
                </Text>
              </View>
              <Text style={styles.statLabel}>Entradas</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.statNumber, { color: '#2563eb' }]}>
                  {estadisticas.salidas}
                </Text>
              </View>
              <Text style={styles.statLabel}>Salidas</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.statNumber, { color: '#ef4444' }]}>
                  {estadisticas.faltas}
                </Text>
              </View>
              <Text style={styles.statLabel}>Faltas</Text>
            </View>
          </View>
        </View>

        {/* Lista de registros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registros del mes</Text>
          <Text style={styles.sectionSubtitle}>
            {asistencias.length} {asistencias.length === 1 ? 'registro' : 'registros'} encontrados
          </Text>
          
          {asistencias.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>
                No hay registros para este mes
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Tus asistencias aparecerán aquí
              </Text>
            </View>
          ) : (
            asistencias.map((registro, index) => (
              <View key={registro.id || index} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordLeft}>
                    <View style={[
                      styles.recordIcon,
                      { 
                        backgroundColor: registro.tipo === 'entrada' 
                          ? '#d1fae5' 
                          : '#dbeafe' 
                      }
                    ]}>
                      <Ionicons 
                        name={registro.tipo === 'entrada' ? 'log-in' : 'log-out'} 
                        size={20} 
                        color={registro.tipo === 'entrada' ? '#059669' : '#2563eb'}
                      />
                    </View>
                    <View>
                      <Text style={styles.recordType}>
                        {registro.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </Text>
                      <Text style={styles.recordLocation}>
                        {registro.dispositivo_origen || 'Móvil'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recordRight}>
                    <Text style={styles.recordTime}>
                      {formatearHora(registro.fecha_registro)}
                    </Text>
                    <Text style={styles.recordDate}>
                      {formatearFecha(registro.fecha_registro)}
                    </Text>
                  </View>
                </View>
                
                {registro.tipo === 'entrada' && registro.estado && (
                  <View style={styles.recordStatus}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: obtenerColorEstado(registro.estado) }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: obtenerColorEstado(registro.estado) }
                    ]}>
                      {obtenerTextoEstado(registro.estado)}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {asistencias.length > 0 && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#3b82f6" />
            <Text style={styles.infoBoxText}>
              Desliza hacia abajo para actualizar los registros
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const historyStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 0,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 120,
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
  recordCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  recordLocation: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  recordDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  recordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarButton: {
    padding: 8,
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
  },
});

const historyStylesDark = StyleSheet.create({
  ...historyStyles,
  container: {
    ...historyStyles.container,
    backgroundColor: '#0f172a',
  },
  headerWrapper: {
    ...historyStyles.headerWrapper,
    backgroundColor: '#1e40af',
  },
  header: {
    ...historyStyles.header,
    backgroundColor: '#1e40af',
  },
  section: {
    ...historyStyles.section,
    backgroundColor: '#1f2937',
  },
  sectionTitle: {
    ...historyStyles.sectionTitle,
    color: '#fff',
  },
  sectionSubtitle: {
    ...historyStyles.sectionSubtitle,
    color: '#d1d5db',
  },
  recordCard: {
    ...historyStyles.recordCard,
    backgroundColor: '#374151',
    borderLeftColor: '#3b82f6',
  },
  recordType: {
    ...historyStyles.recordType,
    color: '#fff',
  },
  recordTime: {
    ...historyStyles.recordTime,
    color: '#fff',
  },
  recordDate: {
    ...historyStyles.recordDate,
    color: '#9ca3af',
  },
  recordLocation: {
    ...historyStyles.recordLocation,
    color: '#9ca3af',
  },
  calendarMonth: {
    ...historyStyles.calendarMonth,
    color: '#fff',
  },
  emptyStateText: {
    ...historyStyles.emptyStateText,
    color: '#d1d5db',
  },
  emptyStateSubtext: {
    ...historyStyles.emptyStateSubtext,
    color: '#6b7280',
  },
  loadingText: {
    ...historyStyles.loadingText,
    color: '#9ca3af',
  },
  infoBox: {
    ...historyStyles.infoBox,
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  infoBoxText: {
    ...historyStyles.infoBoxText,
    color: '#93c5fd',
  },
  recordStatus: {
    ...historyStyles.recordStatus,
    borderTopColor: '#4b5563',
  },
});

export default HistoryScreen;