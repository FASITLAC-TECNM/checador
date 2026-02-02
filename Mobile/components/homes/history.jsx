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
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAsistenciasEmpleado } from '../../services/asistenciasService';

export const HistoryScreen = ({ darkMode, userData }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    puntuales: 0,
    retardos: 0,
    faltas: 0
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const styles = darkMode ? historyStylesDark : historyStyles;

  // Cargar asistencias del mes
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
        const asistenciasOrdenadas = response.data.sort((a, b) => 
          new Date(b.fecha_registro) - new Date(a.fecha_registro)
        );
        
        setAsistencias(asistenciasOrdenadas);
        calcularEstadisticas(asistenciasOrdenadas);
      } else {
        setAsistencias([]);
        setEstadisticas({ puntuales: 0, retardos: 0, faltas: 0 });
      }
    } catch (error) {
      console.error('Error cargando asistencias:', error);
      setAsistencias([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData, currentMonth]);

  // Calcular estadísticas
  const calcularEstadisticas = (data) => {
    const stats = { puntuales: 0, retardos: 0, faltas: 0 };
    
    data.forEach(registro => {
      if (registro.tipo === 'entrada') {
        if (registro.estado === 'puntual') stats.puntuales++;
        if (registro.estado === 'retardo') stats.retardos++;
        if (registro.estado === 'falta') stats.faltas++;
      }
    });

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
    setSelectedDate(null);
  };

  // Generar días del calendario
  const generarDiasCalendario = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();

    const dias = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }
    
    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(dia);
    }

    return dias;
  };

  // Verificar si un día tiene registros
  const tienRegistros = (dia) => {
    if (!dia) return false;
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
    return asistencias.some(registro => {
      const registroFecha = new Date(registro.fecha_registro);
      return registroFecha.toDateString() === fecha.toDateString();
    });
  };

  // Obtener estado del día (puntual, retardo, falta)
  const getEstadoDia = (dia) => {
    if (!dia) return null;
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
    const registrosDia = asistencias.filter(registro => {
      const registroFecha = new Date(registro.fecha_registro);
      return registroFecha.toDateString() === fecha.toDateString() && registro.tipo === 'entrada';
    });

    if (registrosDia.length === 0) return null;
    
    // Prioridad: falta > retardo > puntual
    if (registrosDia.some(r => r.estado === 'falta')) return 'falta';
    if (registrosDia.some(r => r.estado === 'retardo')) return 'retardo';
    if (registrosDia.some(r => r.estado === 'puntual')) return 'puntual';
    
    return null;
  };

  // Seleccionar día
  const seleccionarDia = (dia) => {
    if (!dia) return;
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
    setSelectedDate(fecha);
  };

  // Filtrar registros por día seleccionado
  const getRegistrosDia = () => {
    if (!selectedDate) return asistencias;
    
    return asistencias.filter(registro => {
      const registroFecha = new Date(registro.fecha_registro);
      return registroFecha.toDateString() === selectedDate.toDateString();
    });
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}`;
  };

  const formatearHora = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'puntual': return '#10b981';
      case 'retardo': return '#f59e0b';
      case 'falta': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const registrosFiltrados = getRegistrosDia();

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial</Text>
        <Text style={styles.headerSubtitle}>Registro de asistencias</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
            colors={['#2563eb']}
          />
        }
      >
        {/* Navegación de mes */}
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => cambiarMes(-1)}
          >
            <Ionicons name="chevron-back" size={24} color={styles.monthButtonText.color} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthLabel}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Text style={styles.monthText}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Ionicons 
              name={showCalendar ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={styles.monthText.color} 
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => cambiarMes(1)}
            disabled={currentMonth >= new Date()}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={currentMonth >= new Date() ? '#9ca3af' : styles.monthButtonText.color} 
            />
          </TouchableOpacity>
        </View>

        {/* Calendario */}
        {showCalendar && (
          <View style={styles.calendarContainer}>
            {/* Nombres de días */}
            <View style={styles.weekDays}>
              {dayNames.map((day, index) => (
                <View key={index} style={styles.weekDay}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Días del mes */}
            <View style={styles.daysGrid}>
              {generarDiasCalendario().map((dia, index) => {
                const estado = getEstadoDia(dia);
                const isSelected = selectedDate && dia === selectedDate.getDate();
                const isToday = dia && 
                  new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia).toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.dayCell}
                    onPress={() => seleccionarDia(dia)}
                    disabled={!dia}
                  >
                    {dia && (
                      <View style={[
                        styles.dayContent,
                        isSelected && styles.dayContentSelected,
                        isToday && !isSelected && styles.dayContentToday
                      ]}>
                        <Text style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                          isToday && !isSelected && styles.dayTextToday
                        ]}>
                          {dia}
                        </Text>
                        {estado && !isSelected && (
                          <View style={[
                            styles.dayIndicator,
                            { backgroundColor: obtenerColorEstado(estado) }
                          ]} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Estadísticas compactas */}
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <View style={[styles.statDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.statText}>{estadisticas.puntuales} Puntual</Text>
          </View>
          <View style={styles.statBadge}>
            <View style={[styles.statDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.statText}>{estadisticas.retardos} Retardo</Text>
          </View>
          <View style={styles.statBadge}>
            <View style={[styles.statDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.statText}>{estadisticas.faltas} Falta</Text>
          </View>
        </View>

        {/* Encabezado de registros */}
        <View style={styles.recordsHeader}>
          <Text style={styles.recordsTitle}>
            {selectedDate 
              ? `${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`
              : 'Todos los registros'
            }
          </Text>
          <Text style={styles.recordsCount}>
            {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'registro' : 'registros'}
          </Text>
        </View>

        {/* Lista de registros */}
        {registrosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Sin registros</Text>
            <Text style={styles.emptySubtext}>
              {selectedDate ? 'No hay registros para este día' : 'No hay registros este mes'}
            </Text>
          </View>
        ) : (
          <View style={styles.recordsList}>
            {registrosFiltrados.map((registro, index) => (
              <View key={registro.id || index} style={styles.recordItem}>
                <View style={[
                  styles.recordIconContainer,
                  { backgroundColor: registro.tipo === 'entrada' ? '#ecfdf5' : '#eff6ff' }
                ]}>
                  <Ionicons 
                    name={registro.tipo === 'entrada' ? 'arrow-down' : 'arrow-up'} 
                    size={18} 
                    color={registro.tipo === 'entrada' ? '#10b981' : '#2563eb'}
                  />
                </View>
                
                <View style={styles.recordContent}>
                  <Text style={styles.recordType}>
                    {registro.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                  </Text>
                  <View style={styles.recordMeta}>
                    <Text style={styles.recordTime}>
                      {formatearHora(registro.fecha_registro)}
                    </Text>
                    <Text style={styles.recordSeparator}>•</Text>
                    <Text style={styles.recordDate}>
                      {formatearFecha(registro.fecha_registro)}
                    </Text>
                  </View>
                </View>

                {registro.tipo === 'entrada' && registro.estado && (
                  <View style={[
                    styles.recordBadge,
                    { backgroundColor: obtenerColorEstado(registro.estado) + '20' }
                  ]}>
                    <Text style={[
                      styles.recordBadgeText,
                      { color: obtenerColorEstado(registro.estado) }
                    ]}>
                      {registro.estado === 'puntual' ? '✓' : registro.estado === 'retardo' ? '⏱' : '✕'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const historyStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonText: {
    color: '#2563eb',
  },
  monthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayContent: {
    width: '80%',
    height: '80%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCellActive: {
    // Removed - not needed
  },
  dayContentSelected: {
    backgroundColor: '#2563eb',
  },
  dayContentToday: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#2563eb',
    fontWeight: '700',
  },
  dayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  recordsHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  recordsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  recordsCount: {
    fontSize: 13,
    color: '#64748b',
  },
  recordsList: {
    paddingHorizontal: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  recordIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordTime: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  recordSeparator: {
    fontSize: 13,
    color: '#cbd5e1',
    marginHorizontal: 6,
  },
  recordDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  recordBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});

const historyStylesDark = StyleSheet.create({
  ...historyStyles,
  container: {
    ...historyStyles.container,
    backgroundColor: '#0f172a',
  },
  header: {
    ...historyStyles.header,
    backgroundColor: '#1e40af',
  },
  monthSelector: {
    ...historyStyles.monthSelector,
    backgroundColor: '#1e293b',
  },
  monthButtonText: {
    ...historyStyles.monthButtonText,
    color: '#60a5fa',
  },
  monthText: {
    ...historyStyles.monthText,
    color: '#f1f5f9',
  },
  calendarContainer: {
    ...historyStyles.calendarContainer,
    backgroundColor: '#1e293b',
  },
  weekDayText: {
    ...historyStyles.weekDayText,
    color: '#94a3b8',
  },
  dayContent: {
    ...historyStyles.dayContent,
  },
  dayContentSelected: {
    ...historyStyles.dayContentSelected,
    backgroundColor: '#3b82f6',
  },
  dayContentToday: {
    ...historyStyles.dayContentToday,
    borderColor: '#3b82f6',
  },
  dayText: {
    ...historyStyles.dayText,
    color: '#e2e8f0',
  },
  dayTextToday: {
    ...historyStyles.dayTextToday,
    color: '#60a5fa',
  },
  statBadge: {
    ...historyStyles.statBadge,
    backgroundColor: '#1e293b',
  },
  statText: {
    ...historyStyles.statText,
    color: '#cbd5e1',
  },
  recordsTitle: {
    ...historyStyles.recordsTitle,
    color: '#f1f5f9',
  },
  recordsCount: {
    ...historyStyles.recordsCount,
    color: '#94a3b8',
  },
  recordItem: {
    ...historyStyles.recordItem,
    backgroundColor: '#1e293b',
  },
  recordIconContainer: {
    ...historyStyles.recordIconContainer,
  },
  recordType: {
    ...historyStyles.recordType,
    color: '#f1f5f9',
  },
  recordTime: {
    ...historyStyles.recordTime,
    color: '#cbd5e1',
  },
  recordDate: {
    ...historyStyles.recordDate,
    color: '#64748b',
  },
  emptyText: {
    ...historyStyles.emptyText,
    color: '#cbd5e1',
  },
  emptySubtext: {
    ...historyStyles.emptySubtext,
    color: '#64748b',
  },
});

export default HistoryScreen;