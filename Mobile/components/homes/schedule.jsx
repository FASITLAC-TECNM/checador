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
import sqliteManager from '../../services/offline/sqliteManager.mjs';
import syncManager from '../../services/offline/syncManager.mjs';

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

  const obtenerTurnoRelevante = (turnos) => {
    if (!turnos || turnos.length === 0) return null;

    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes(); // en minutos

    const convertirAMinutos = (hora) => {
      const [h, m] = hora.split(':').map(Number);
      return h * 60 + m;
    };

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
    return null;
  };

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

  // ── Carga de datos ──────────────────────────────────────────

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

  // ── Funciones de UI ─────────────────────────────────────────

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

  // ── Renderizado ─────────────────────────────────────────────

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
                    {infoHoy.turnoRelevante.estado === 'activo' ? 'ACTIVO' : 'SIGUIENTE'}
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
              <Text style={styles.finishedText}>Todos los turnos de hoy han finalizado</Text>
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

// ── Estilos ───────────────────────────────────────────────────

const scheduleStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
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
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#bfdbfe',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '500',
  },

  // Tarjeta HOY
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  todayHeader: {
    marginBottom: 16,
  },
  todayBadge: {
    backgroundColor: '#ef4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  todayDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  currentShiftContainer: {
    marginBottom: 14,
  },
  shiftTimeRow: {
    marginBottom: 10,
  },
  shiftTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 14,
    borderRadius: 14,
  },
  shiftTimeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  shiftLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 3,
  },
  shiftTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  moreTurnsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  moreTurnsText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
  finishedText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 16,
    fontWeight: '500',
  },
  todayLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  todayLocationText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Dia de descanso
  dayOffCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayOffIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dayOffTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  dayOffText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Resumen
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryContent: {
    backgroundColor: '#2563eb',
    padding: 18,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 10,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.85,
    fontWeight: '500',
  },

  // Lista semanal
  scheduleSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scheduleSectionHeader: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  scheduleSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  scheduleSectionSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: '#f8fafc',
    minHeight: 68,
  },
  scheduleItemInactive: {
    backgroundColor: 'transparent',
  },
  scheduleItemToday: {
    backgroundColor: '#eef2ff',
    borderWidth: 1.5,
    borderColor: '#818cf8',
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  dayIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dayIconActive: {
    backgroundColor: '#c7d2fe',
  },
  dayIconInactive: {
    backgroundColor: '#f1f5f9',
  },
  dayInitialText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayInitialActive: {
    color: '#4f46e5',
  },
  dayInitialInactive: {
    color: '#94a3b8',
  },
  scheduleInfo: {
    flex: 1,
    paddingRight: 6,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  scheduleDayInactive: {
    color: '#94a3b8',
  },
  todayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#818cf8',
    marginLeft: 6,
  },
  scheduleLocation: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  scheduleLocationInactive: {
    color: '#cbd5e1',
  },
  multipleTurnsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
    gap: 3,
  },
  multipleTurnsText: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: '600',
  },
  scheduleRight: {
    alignItems: 'flex-end',
    minWidth: 95,
    maxWidth: 115,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'right',
  },
  scheduleTimeInactive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  hoursChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  hoursChipText: {
    fontSize: 10,
    color: '#1d4ed8',
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    paddingBottom: 24,
  },
  modalTurnoBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTurnoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTurnoNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalTurnoNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  modalTurnoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalTurnoDetails: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  modalTurnoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  modalTurnoLabel: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  modalTurnoTime: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalTurnoDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 2,
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  modalEmptyText: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 10,
    fontWeight: '500',
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalFooterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  incidenciasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  incidenciasLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incidenciasIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidenciasTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 1,
  },
  incidenciasSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
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
  headerSubtitle: {
    ...scheduleStyles.headerSubtitle,
    color: '#93c5fd',
  },
  errorCard: {
    ...scheduleStyles.errorCard,
    backgroundColor: '#451a1a',
    borderColor: '#7f1d1d',
  },
  todayCard: {
    ...scheduleStyles.todayCard,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  todayDate: {
    ...scheduleStyles.todayDate,
    color: '#f1f5f9',
  },
  shiftTime: {
    ...scheduleStyles.shiftTime,
    color: '#f1f5f9',
  },
  shiftLabel: {
    ...scheduleStyles.shiftLabel,
    color: '#94a3b8',
  },
  shiftTimeBlock: {
    ...scheduleStyles.shiftTimeBlock,
    backgroundColor: '#334155',
  },
  finishedText: {
    ...scheduleStyles.finishedText,
    color: '#94a3b8',
  },
  moreTurnsButton: {
    ...scheduleStyles.moreTurnsButton,
    backgroundColor: '#334155',
  },
  moreTurnsText: {
    ...scheduleStyles.moreTurnsText,
    color: '#60a5fa',
  },
  dayOffCard: {
    ...scheduleStyles.dayOffCard,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  dayOffIcon: {
    ...scheduleStyles.dayOffIcon,
    backgroundColor: '#334155',
  },
  dayOffTitle: {
    ...scheduleStyles.dayOffTitle,
    color: '#f1f5f9',
  },
  dayOffText: {
    ...scheduleStyles.dayOffText,
    color: '#64748b',
  },
  summaryContent: {
    ...scheduleStyles.summaryContent,
    backgroundColor: '#1d4ed8',
  },
  scheduleSection: {
    ...scheduleStyles.scheduleSection,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  scheduleSectionTitle: {
    ...scheduleStyles.scheduleSectionTitle,
    color: '#f1f5f9',
  },
  scheduleSectionSubtitle: {
    ...scheduleStyles.scheduleSectionSubtitle,
    color: '#64748b',
  },
  scheduleItem: {
    ...scheduleStyles.scheduleItem,
    backgroundColor: '#334155',
  },
  scheduleItemToday: {
    ...scheduleStyles.scheduleItemToday,
    backgroundColor: '#172554',
    borderColor: '#60a5fa',
  },
  dayIconActive: {
    ...scheduleStyles.dayIconActive,
    backgroundColor: '#1e3a8a',
  },
  dayInitialActive: {
    ...scheduleStyles.dayInitialActive,
    color: '#60a5fa',
  },
  todayDot: {
    ...scheduleStyles.todayDot,
    backgroundColor: '#60a5fa',
  },
  scheduleDay: {
    ...scheduleStyles.scheduleDay,
    color: '#f1f5f9',
  },
  scheduleTime: {
    ...scheduleStyles.scheduleTime,
    color: '#f1f5f9',
  },
  scheduleTimeInactive: {
    ...scheduleStyles.scheduleTimeInactive,
    color: '#475569',
  },
  multipleTurnsBadge: {
    ...scheduleStyles.multipleTurnsBadge,
    backgroundColor: '#1e3a8a',
  },
  multipleTurnsText: {
    ...scheduleStyles.multipleTurnsText,
    color: '#60a5fa',
  },
  hoursChip: {
    ...scheduleStyles.hoursChip,
    backgroundColor: '#1e3a8a',
  },
  hoursChipText: {
    ...scheduleStyles.hoursChipText,
    color: '#93c5fd',
  },
  modalContent: {
    ...scheduleStyles.modalContent,
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    ...scheduleStyles.modalHeader,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    ...scheduleStyles.modalTitle,
    color: '#f1f5f9',
  },
  modalSubtitle: {
    ...scheduleStyles.modalSubtitle,
    color: '#64748b',
  },
  modalCloseButton: {
    ...scheduleStyles.modalCloseButton,
    backgroundColor: '#334155',
  },
  modalTurnoBlock: {
    ...scheduleStyles.modalTurnoBlock,
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  modalTurnoDetails: {
    ...scheduleStyles.modalTurnoDetails,
    backgroundColor: '#1e293b',
  },
  modalTurnoTitle: {
    ...scheduleStyles.modalTurnoTitle,
    color: '#f1f5f9',
  },
  modalTurnoTime: {
    ...scheduleStyles.modalTurnoTime,
    color: '#f1f5f9',
  },
  modalTurnoNumber: {
    ...scheduleStyles.modalTurnoNumber,
    backgroundColor: '#1d4ed8',
  },
  modalFooter: {
    ...scheduleStyles.modalFooter,
    borderTopColor: '#334155',
  },
  incidenciasButton: {
    ...scheduleStyles.incidenciasButton,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  incidenciasIcon: {
    ...scheduleStyles.incidenciasIcon,
    backgroundColor: '#3b0764',
  },
  incidenciasTitle: {
    ...scheduleStyles.incidenciasTitle,
    color: '#f1f5f9',
  },
  incidenciasSubtitle: {
    ...scheduleStyles.incidenciasSubtitle,
    color: '#64748b',
  },
});

export default ScheduleScreen;