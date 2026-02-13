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
  TouchableOpacity,
  Modal,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getHorarioPorEmpleado,
  parsearHorario,
  calcularResumenSemanal,
  getInfoDiaActual
} from '../../services/horariosService';
import { IncidenciasScreen } from '../settingsPages/IncidentScreen';
import sqliteManager from '../../services/offline/sqliteManager';
import syncManager from '../../services/offline/syncManager';

export const ScheduleScreen = ({ darkMode, userData }) => {
  const [scheduleData, setScheduleData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resumen, setResumen] = useState({ diasLaborales: 0, totalDias: 7, horasTotales: '0' });
  const [infoHoy, setInfoHoy] = useState({ trabaja: false, entrada: null, salida: null, turnos: [] });
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showIncidencias, setShowIncidencias] = useState(false);

  const insets = useSafeAreaInsets();
  const styles = darkMode ? scheduleStylesDark : scheduleStyles;

  // ============================================================
  // 🧠 FUNCIONES INTELIGENTES PARA HORARIOS
  // ============================================================

  /**
   * Obtiene el turno más relevante según la hora actual
   * - Si hay un turno activo (estamos dentro): lo retorna
   * - Si no, retorna el siguiente turno del día
   * - Si no hay más turnos hoy, retorna null
   */
  const obtenerTurnoRelevante = (turnos) => {
    if (!turnos || turnos.length === 0) return null;

    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes(); // en minutos

    const convertirAMinutos = (hora) => {
      const [h, m] = hora.split(':').map(Number);
      return h * 60 + m;
    };

    // Buscar turno activo (estamos dentro del rango)
    for (const turno of turnos) {
      const inicio = convertirAMinutos(turno.entrada);
      const fin = convertirAMinutos(turno.salida);

      if (horaActual >= inicio && horaActual <= fin) {
        return { ...turno, estado: 'activo' };
      }
    }

    // Buscar siguiente turno
    for (const turno of turnos) {
      const inicio = convertirAMinutos(turno.entrada);

      if (horaActual < inicio) {
        return { ...turno, estado: 'proximo' };
      }
    }

    // No hay más turnos hoy
    return null;
  };

  /**
   * Formatea el rango de tiempo de forma inteligente
   */
  const formatearRangoTiempo = (turno) => {
    if (!turno) return '---';
    return `${turno.entrada} - ${turno.salida}`;
  };

  /**
   * Obtiene info del día actual mejorada
   */
  const obtenerInfoHoyMejorada = (horarioParsed) => {
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoy = new Date();
    const nombreHoy = diasSemana[hoy.getDay()];

    const diaHoy = horarioParsed.find(d => d.day === nombreHoy);

    if (!diaHoy || !diaHoy.active || !diaHoy.turnos || diaHoy.turnos.length === 0) {
      return { trabaja: false, turnos: [], turnoRelevante: null };
    }

    const turnoRelevante = obtenerTurnoRelevante(diaHoy.turnos);

    return {
      trabaja: true,
      turnos: diaHoy.turnos,
      turnoRelevante: turnoRelevante,
      tipo: diaHoy.tipo
    };
  };

  // ============================================================
  // 🔄 CARGA DE DATOS
  // ============================================================

  const getEmpleadoId = () => {
    if (userData?.empleado_id) return userData.empleado_id;
    if (userData?.empleadoInfo?.id) return userData.empleadoInfo.id;
    return null;
  };

  const cargarHorario = async (empleadoId) => {
    try {
      setIsLoading(true);
      setError(null);

      let horario = null;
      const online = await syncManager.isOnline();

      if (online) {
        try {
          horario = await getHorarioPorEmpleado(empleadoId, userData?.token);
        } catch (e) {
          console.log('Online fetch failed for schedule:', e.message);
        }
      }

      // Offline Fallback
      if (!horario) {
        console.log('Trying offline schedule...');
        const hLocal = await sqliteManager.getHorario(empleadoId);
        if (hLocal) {
          horario = hLocal;
          console.log('Loaded offline schedule');
        }
      }

      if (!horario) {
        throw new Error('No se recibió información del horario (ni online ni offline)');
      }

      const horarioParsed = parsearHorario(horario);

      setScheduleData(horarioParsed);
      setResumen(calcularResumenSemanal(horarioParsed));
      setInfoHoy(obtenerInfoHoyMejorada(horarioParsed));

    } catch (error) {
      setError(error.message || 'Error desconocido al cargar horario');
      setScheduleData(obtenerHorarioVacio());
      setResumen({ diasLaborales: 0, totalDias: 7, horasTotales: '0' });
      setInfoHoy({ trabaja: false, turnos: [], turnoRelevante: null });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const empleadoId = getEmpleadoId();

    if (empleadoId) {
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setError('La carga del horario está tomando demasiado tiempo. Verifica tu conexión.');
          setIsLoading(false);
          setScheduleData(obtenerHorarioVacio());
        }
      }, 10000);

      cargarHorario(empleadoId).finally(() => clearTimeout(timeoutId));
      return () => clearTimeout(timeoutId);
    } else {
      setIsLoading(false);
      setError('No se pudo identificar al empleado. Verifica tu sesión.');
      setScheduleData(obtenerHorarioVacio());
    }
  }, [userData]);

  // Auto-actualizar el turno relevante cada minuto
  useEffect(() => {
    if (!scheduleData.length) return;

    const interval = setInterval(() => {
      setInfoHoy(obtenerInfoHoyMejorada(scheduleData));
    }, 60000); // Cada 60 segundos

    return () => clearInterval(interval);
  }, [scheduleData]);

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

  // ============================================================
  // 🎨 FUNCIONES DE UI
  // ============================================================

  const obtenerFechaSemana = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy);
    primerDia.setDate(hoy.getDate() - hoy.getDay() + 1);

    const ultimoDia = new Date(primerDia);
    ultimoDia.setDate(primerDia.getDate() + 6);

    const formatoFecha = (fecha) => {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
    };

    return `${formatoFecha(primerDia)} - ${formatoFecha(ultimoDia)}`;
  };

  const getDayInitial = (day) => {
    const initials = {
      'Lunes': 'L',
      'Martes': 'M',
      'Miércoles': 'MI',
      'Jueves': 'J',
      'Viernes': 'V',
      'Sábado': 'S',
      'Domingo': 'D'
    };
    return initials[day] || 'X';
  };

  const handleDayPress = (day) => {
    setSelectedDay(day);
    setModalVisible(true);
  };

  // ============================================================
  // 📱 RENDERIZADO
  // ============================================================

  if (showIncidencias) {
    return (
      <IncidenciasScreen
        userData={userData}
        darkMode={darkMode}
        onBack={() => setShowIncidencias(false)}
      />
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"}
      />

      {/* Header - Siempre visible */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Horario</Text>
          <Text style={styles.headerSubtitle}>Tu horario asignado</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Cargando tu horario...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 80 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
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
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={24} color="#ef4444" />
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* TARJETA DE HOY - TURNO INTELIGENTE */}
          {infoHoy.trabaja && infoHoy.turnoRelevante ? (
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>
                    {infoHoy.turnoRelevante.estado === 'activo' ? '🔴 ACTIVO' : 'SIGUIENTE'}
                  </Text>
                </View>
                <Text style={styles.todayDate}>
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>

              {/* Turno Relevante */}
              <View style={styles.currentShiftContainer}>
                <View style={styles.shiftTimeRow}>
                  <View style={styles.shiftTimeBlock}>
                    <Ionicons name="time-outline" size={24} color={darkMode ? "#3794fd" : "#6366f1"} />
                    <View style={styles.shiftTimeInfo}>
                      <Text style={styles.shiftLabel}>
                        {infoHoy.turnoRelevante.estado === 'activo' ? 'En turno' : 'Próximo turno'}
                      </Text>
                      <Text style={styles.shiftTime}>
                        {formatearRangoTiempo(infoHoy.turnoRelevante)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Mostrar contador de turnos si hay más de uno */}
                {infoHoy.turnos.length > 1 && (
                  <TouchableOpacity
                    style={styles.moreTurnsButton}
                    onPress={() => {
                      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                      const nombreHoy = diasSemana[new Date().getDay()];
                      const diaHoy = scheduleData.find(d => d.day === nombreHoy);
                      handleDayPress(diaHoy);
                    }}
                  >
                    <Ionicons name="albums-outline" size={18} color={darkMode ? "#3794fd" : "#6366f1"} />
                    <Text style={styles.moreTurnsText}>
                      {infoHoy.turnos.length} turnos hoy - Ver todos
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={darkMode ? "#3794fd" : "#6366f1"} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.todayLocation}>
                <Ionicons name="location" size={16} color={darkMode ? "#3794fd" : "#6366f1"} />
                <Text style={styles.todayLocationText}>Edificio A - Entrada Principal</Text>
              </View>
            </View>
          ) : infoHoy.trabaja ? (
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <View style={[styles.todayBadge, { backgroundColor: '#6b7280' }]}>
                  <Text style={styles.todayBadgeText}>FINALIZADO</Text>
                </View>
                <Text style={styles.todayDate}>
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
              <Text style={styles.finishedText}>Todos los turnos de hoy han finalizado ✓</Text>
            </View>
          ) : (
            <View style={styles.dayOffCard}>
              <View style={styles.dayOffIcon}>
                <Ionicons name="cafe-outline" size={48} color={darkMode ? "#3794fd" : "#6366f1"} />
              </View>
              <Text style={styles.dayOffTitle}>Día de Descanso</Text>
              <Text style={styles.dayOffText}>Disfruta tu día libre</Text>
            </View>
          )}

          {/* Resumen Semanal */}
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <Ionicons name="time-outline" size={28} color="#fff" />
                <Text style={styles.summaryValue}>{resumen.horasTotales}</Text>
                <Text style={styles.summaryLabel}>Horas Totales</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryContent, { backgroundColor: '#10b981' }]}>
                <Ionicons name="calendar-outline" size={28} color="#fff" />
                <Text style={styles.summaryValue}>{resumen.diasLaborales}</Text>
                <Text style={styles.summaryLabel}>Días Laborales</Text>
              </View>
            </View>
          </View>

          {/* HORARIO SEMANAL - TURNO RELEVANTE POR DÍA */}
          <View style={styles.scheduleSection}>
            <View style={styles.scheduleSectionHeader}>
              <Text style={styles.scheduleSectionTitle}>Horario Semanal</Text>
              <Text style={styles.scheduleSectionSubtitle}>{obtenerFechaSemana()}</Text>
            </View>

            {scheduleData.map((schedule, index) => {
              const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
              const hoy = new Date();
              const diaActual = diasSemana[hoy.getDay()];
              const isToday = schedule.day.toLowerCase() === diaActual;

              // Obtener turno relevante para este día
              let turnoMostrar = '---';
              let tieneMasTurnos = false;

              if (schedule.active && schedule.turnos && schedule.turnos.length > 0) {
                if (isToday) {
                  // Si es hoy, mostrar el turno relevante
                  const turnoRelevante = obtenerTurnoRelevante(schedule.turnos);
                  turnoMostrar = turnoRelevante ? formatearRangoTiempo(turnoRelevante) : formatearRangoTiempo(schedule.turnos[0]);
                } else {
                  // Si es otro día, mostrar el primer turno
                  turnoMostrar = formatearRangoTiempo(schedule.turnos[0]);
                }
                tieneMasTurnos = schedule.turnos.length > 1;
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  onPress={() => handleDayPress(schedule)}
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
                      <Text style={[
                        styles.dayInitialText,
                        schedule.active ? styles.dayInitialActive : styles.dayInitialInactive
                      ]}>
                        {getDayInitial(schedule.day)}
                      </Text>
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
                      {tieneMasTurnos && (
                        <View style={styles.multipleTurnsBadge}>
                          <Ionicons name="albums-outline" size={10} color={darkMode ? "#3794fd" : "#8b5cf6"} />
                          <Text style={styles.multipleTurnsText}>{schedule.turnos.length} turnos</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.scheduleRight}>
                    <Text style={[
                      styles.scheduleTime,
                      !schedule.active && styles.scheduleTimeInactive
                    ]}>
                      {turnoMostrar}
                    </Text>
                    {schedule.hours && schedule.active && (
                      <View style={styles.hoursChip}>
                        <Text style={styles.hoursChipText}>{schedule.hours}</Text>
                      </View>
                    )}
                    {schedule.active && (
                      <Ionicons name="chevron-forward" size={16} color="#9ca3af" style={{ marginTop: 4 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Botón de Incidencias */}
          {userData?.es_empleado && userData?.empleado_id && (
            <TouchableOpacity
              style={styles.incidenciasButton}
              onPress={() => setShowIncidencias(true)}
              activeOpacity={0.7}
            >
              <View style={styles.incidenciasLeft}>
                <View style={styles.incidenciasIcon}>
                  <Ionicons name="document-text-outline" size={24} color={darkMode ? '#d8b4fe' : '#9333ea'} />
                </View>
                <View>
                  <Text style={styles.incidenciasTitle}>Incidencias</Text>
                  <Text style={styles.incidenciasSubtitle}>Justificantes y permisos</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* MODAL DE DETALLES DEL DÍA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedDay?.day}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedDay?.active ? 'Turnos del día' : 'Día de descanso'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
            >
              {selectedDay?.active && selectedDay?.turnos?.length > 0 ? (
                selectedDay.turnos.map((turno, idx) => (
                  <View key={idx} style={styles.modalTurnoBlock}>
                    <View style={styles.modalTurnoHeader}>
                      <View style={styles.modalTurnoNumber}>
                        <Text style={styles.modalTurnoNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.modalTurnoTitle}>Turno {idx + 1}</Text>
                    </View>

                    <View style={styles.modalTurnoDetails}>
                      <View style={styles.modalTurnoRow}>
                        <Ionicons name="log-in-outline" size={20} color="#10b981" />
                        <Text style={styles.modalTurnoLabel}>Entrada</Text>
                        <Text style={styles.modalTurnoTime}>{turno.entrada}</Text>
                      </View>

                      <View style={styles.modalTurnoDivider} />

                      <View style={styles.modalTurnoRow}>
                        <Ionicons name="log-out-outline" size={20} color="#f59e0b" />
                        <Text style={styles.modalTurnoLabel}>Salida</Text>
                        <Text style={styles.modalTurnoTime}>{turno.salida}</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="cafe-outline" size={48} color="#9ca3af" />
                  <Text style={styles.modalEmptyText}>No hay turnos programados</Text>
                </View>
              )}
            </ScrollView>

            {selectedDay?.active && (
              <View style={styles.modalFooter}>
                <View style={styles.modalFooterInfo}>
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text style={styles.modalFooterText}>
                    Total: {selectedDay?.hours || '0h'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================================
// 🎨 ESTILOS
// ============================================================

const scheduleStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
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

  // Tarjeta HOY renovada
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
    backgroundColor: '#ef4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  todayDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  currentShiftContainer: {
    marginBottom: 16,
  },
  shiftTimeRow: {
    marginBottom: 12,
  },
  shiftTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    padding: 16,
    borderRadius: 16,
  },
  shiftTimeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  shiftLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  moreTurnsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  moreTurnsText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  finishedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
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

  // Día de descanso
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

  // Resumen
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
  summaryContent: {
    backgroundColor: '#6366f1',
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

  // Lista semanal
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    minHeight: 76,
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
    marginRight: 12,
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
  dayInitialText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dayInitialActive: {
    color: '#6366f1',
  },
  dayInitialInactive: {
    color: '#9ca3af',
  },
  scheduleInfo: {
    flex: 1,
    paddingRight: 8,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleDay: {
    fontSize: 15,
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
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  scheduleLocationInactive: {
    color: '#9ca3af',
  },
  multipleTurnsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  multipleTurnsText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  scheduleRight: {
    alignItems: 'flex-end',
    minWidth: 100,
    maxWidth: 120,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
  },
  scheduleTimeInactive: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  hoursChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  hoursChipText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 24,
  },
  modalTurnoBlock: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  modalTurnoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTurnoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalTurnoNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalTurnoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalTurnoDetails: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  modalTurnoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalTurnoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  modalTurnoTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalTurnoDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  modalFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalFooterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  incidenciasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  incidenciasLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  incidenciasIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidenciasTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  incidenciasSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
});

const scheduleStylesDark = StyleSheet.create({
  ...scheduleStyles,
  mainContainer: {
    ...scheduleStyles.mainContainer,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    ...scheduleStyles.loadingContainer,
  },
  headerWrapper: {
    ...scheduleStyles.headerWrapper,
    backgroundColor: '#1e40af',
  },
  header: {
    ...scheduleStyles.header,
    backgroundColor: '#1e40af',
  },
  todayCard: {
    ...scheduleStyles.todayCard,
    backgroundColor: '#1f2937',
  },
  todayDate: {
    ...scheduleStyles.todayDate,
    color: '#f9fafb',
  },
  shiftTime: {
    ...scheduleStyles.shiftTime,
    color: '#f9fafb',
  },
  shiftTimeBlock: {
    ...scheduleStyles.shiftTimeBlock,
    backgroundColor: '#374151',
  },
  moreTurnsButton: {
    ...scheduleStyles.moreTurnsButton,
    backgroundColor: '#374151',
  },
  moreTurnsText: {
    ...scheduleStyles.moreTurnsText,
    color: '#3794fd',
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
  summaryContent: {
    ...scheduleStyles.summaryContent,
    backgroundColor: '#3794fd',
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
  scheduleItemToday: {
    ...scheduleStyles.scheduleItemToday,
    backgroundColor: '#1e3a8a',
    borderColor: '#3794fd',
  },
  dayIconActive: {
    ...scheduleStyles.dayIconActive,
    backgroundColor: '#1e3a8a',
  },
  dayInitialActive: {
    ...scheduleStyles.dayInitialActive,
    color: '#3794fd',
  },
  todayDot: {
    ...scheduleStyles.todayDot,
    backgroundColor: '#3794fd',
  },
  scheduleDay: {
    ...scheduleStyles.scheduleDay,
    color: '#f9fafb',
  },
  scheduleTime: {
    ...scheduleStyles.scheduleTime,
    color: '#f9fafb',
  },
  multipleTurnsBadge: {
    ...scheduleStyles.multipleTurnsBadge,
    backgroundColor: '#1e3a8a',
  },
  multipleTurnsText: {
    ...scheduleStyles.multipleTurnsText,
    color: '#3794fd',
  },
  modalContent: {
    ...scheduleStyles.modalContent,
    backgroundColor: '#1f2937',
  },
  modalTitle: {
    ...scheduleStyles.modalTitle,
    color: '#f9fafb',
  },
  modalTurnoBlock: {
    ...scheduleStyles.modalTurnoBlock,
    backgroundColor: '#374151',
  },
  modalTurnoDetails: {
    ...scheduleStyles.modalTurnoDetails,
    backgroundColor: '#1f2937',
  },
  modalTurnoTitle: {
    ...scheduleStyles.modalTurnoTitle,
    color: '#f9fafb',
  },
  modalTurnoTime: {
    ...scheduleStyles.modalTurnoTime,
    color: '#f9fafb',
  },
  modalTurnoNumber: {
    ...scheduleStyles.modalTurnoNumber,
    backgroundColor: '#3794fd',
  },
  incidenciasButton: {
    ...scheduleStyles.incidenciasButton,
    backgroundColor: '#1f2937',
  },
  incidenciasIcon: {
    ...scheduleStyles.incidenciasIcon,
    backgroundColor: '#581c87',
  },
  incidenciasTitle: {
    ...scheduleStyles.incidenciasTitle,
    color: '#f9fafb',
  },
  incidenciasSubtitle: {
    ...scheduleStyles.incidenciasSubtitle,
    color: '#9ca3af',
  },
});

export default ScheduleScreen;