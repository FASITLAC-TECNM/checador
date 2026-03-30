import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAsistenciasEmpleado } from '../../services/asistenciasService';
import sqliteManager from '../../services/offline/sqliteManager.mjs';
import syncManager from '../../services/offline/syncManager.mjs';

export const HistoryScreen = ({ darkMode, userData }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rangoInicio, setRangoInicio] = useState(null);
  const [rangoFin, setRangoFin] = useState(null);
  const [modoRango, setModoRango] = useState(false); // true solo si el usuario hizo long-press
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    puntuales: 0,
    retardos: 0,
    faltas: 0,
    total: 0
  });

  const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const styles = darkMode ? historyStylesDark : historyStyles;


  const cargarAsistencias = useCallback(async () => {
    if (!userData?.empleado_id || !userData?.token) {
      setLoading(false);
      return;
    }

    const mesKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

    try {
      const primerDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const ultimoDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const filtros = {
        fecha_inicio: primerDia.toISOString().split('T')[0],
        fecha_fin: ultimoDia.toISOString().split('T')[0]
      };

      let cargoOnline = false;

      try {
        const isOnline = await syncManager.isOnline() && !syncManager.getIsBackendDown();
        if (isOnline) {
          const response = await getAsistenciasEmpleado(userData.empleado_id, userData.token, filtros);
          if (response?.data && Array.isArray(response.data)) {
            const ordenadas = response.data.sort(
              (a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro)
            );
            setAsistencias(ordenadas);
            calcularEstadisticas(ordenadas);
            cargoOnline = true;
            await sqliteManager.upsertAsistenciasMes(userData.empleado_id, mesKey, response.data).catch(() => {});
          } else {
            setAsistencias([]);
            setEstadisticas({ puntuales: 0, retardos: 0, faltas: 0, total: 0 });
            cargoOnline = true;
          }
        }
      } catch (_) {

      }

      if (!cargoOnline) {
        try {
          const datosLocal = await sqliteManager.getAsistenciasMesLocal(userData.empleado_id, mesKey);
          if (datosLocal && datosLocal.length > 0) {
            setAsistencias(datosLocal);
            calcularEstadisticas(datosLocal);
          } else {
            setAsistencias([]);
            setEstadisticas({ puntuales: 0, retardos: 0, faltas: 0, total: 0 });
          }
        } catch (_) {
          setAsistencias([]);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData, currentMonth]);


  const calcularEstadisticas = (data) => {
    let puntuales = 0,retardos = 0,faltas = 0;
    data.forEach((r) => {
      if (r.tipo !== 'entrada') return;
      if (r.estado === 'puntual') puntuales++;else
      if (r.estado.startsWith('retardo')) retardos++;else
      if (r.estado.startsWith('falta')) faltas++;
    });
    setEstadisticas({ puntuales, retardos, faltas, total: puntuales + retardos + faltas });
  };

  useEffect(() => {cargarAsistencias();}, [cargarAsistencias]);

  const onRefresh = () => {setRefreshing(true);cargarAsistencias();};

  const cambiarMes = (dir) => {
    const nuevo = new Date(currentMonth);
    nuevo.setMonth(currentMonth.getMonth() + dir);
    setCurrentMonth(nuevo);
    setRangoInicio(null);
    setRangoFin(null);
    setModoRango(false);
  };


  const diasCalendario = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const primerDia = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const dias = [];
    for (let i = 0; i < primerDia; i++) dias.push(null);
    for (let d = 1; d <= diasEnMes; d++) dias.push(d);
    return dias;
  }, [currentMonth]);


  const estadosPorDia = useMemo(() => {
    const mapa = {};
    asistencias.forEach((r) => {
      if (r.tipo !== 'entrada') return;
      const fecha = new Date(r.fecha_registro);
      if (fecha.getMonth() !== currentMonth.getMonth() || fecha.getFullYear() !== currentMonth.getFullYear()) return;
      const dia = fecha.getDate();
      
      const current = mapa[dia];
      const esFalta = r.estado?.startsWith('falta');
      const esRetardo = r.estado?.startsWith('retardo');
      const esPuntual = r.estado === 'puntual';
      
      if (esFalta) {
        mapa[dia] = r.estado;
      } else if (esRetardo && !current?.startsWith('falta')) {
        mapa[dia] = r.estado;
      } else if (esPuntual && !current?.startsWith('falta') && !current?.startsWith('retardo')) {
        mapa[dia] = r.estado;
      } else if (!current) {
        mapa[dia] = r.estado || 'pendiente';
      }
    });
    return mapa;
  }, [asistencias, currentMonth]);

  // Tap normal: comportamiento original (un solo día) O, si hay modo rango activo, cierra el rango.
  const seleccionarDia = useCallback((dia) => {
    if (!dia) return;
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
    if (!modoRango) {
      // Comportamiento original: filtrar ese día solo
      setRangoFin(null);
      setRangoInicio((prev) =>
        prev && prev.toDateString() === fecha.toDateString() ? null : fecha
      );
      return;
    }
    // Modo rango activo: este tap cierra el rango
    setModoRango(false);
    const inicio = rangoInicio;
    if (!inicio || fecha.toDateString() === inicio.toDateString()) {
      // Mismo día → cancelar rango, solo día simple
      setRangoFin(null);
      return;
    }
    if (fecha < inicio) {
      setRangoInicio(fecha);
      setRangoFin(inicio);
    } else {
      setRangoFin(fecha);
    }
  }, [currentMonth, modoRango, rangoInicio]);

  // Long-press: activa modo rango y fija el día como inicio
  const iniciarRango = useCallback((dia) => {
    if (!dia) return;
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
    setRangoInicio(fecha);
    setRangoFin(null);
    setModoRango(true);
  }, [currentMonth]);

  const limpiarRango = useCallback(() => {
    setRangoInicio(null);
    setRangoFin(null);
    setModoRango(false);
  }, []);


  const sections = useMemo(() => {
    let filtrados = asistencias;
    if (rangoInicio && rangoFin) {
      const inicio = new Date(rangoInicio); inicio.setHours(0, 0, 0, 0);
      const fin = new Date(rangoFin); fin.setHours(23, 59, 59, 999);
      filtrados = asistencias.filter((r) => {
        const d = new Date(r.fecha_registro);
        return d >= inicio && d <= fin;
      });
    } else if (rangoInicio) {
      // Solo inicio seleccionado → filtrar ese día solo
      filtrados = asistencias.filter((r) =>
        new Date(r.fecha_registro).toDateString() === rangoInicio.toDateString()
      );
    }


    const grupos = {};
    filtrados.forEach((r) => {
      const fecha = new Date(r.fecha_registro);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      if (!grupos[key]) grupos[key] = { key, fecha, registros: [] };
      grupos[key].registros.push(r);
    });


    const esRangoSeleccionado = rangoInicio && rangoFin;

    return Object.values(grupos).
    sort((a, b) => esRangoSeleccionado ? (a.fecha - b.fecha) : (b.fecha - a.fecha)).
    map((g) => {
      const sorted = [...g.registros].sort((a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro));
      const pairs = [];
      let currentEn = null;
      for (const r of sorted) {
         if (r.tipo === 'entrada') {
            if (currentEn) { pairs.push({ isPair: true, entrada: currentEn, salida: null, id: currentEn.id }); }
            currentEn = r;
         } else if (r.tipo === 'salida') {
            if (currentEn) {
               pairs.push({ isPair: true, entrada: currentEn, salida: r, id: currentEn.id + '_' + r.id });
               currentEn = null;
            } else {
               pairs.push({ isPair: true, entrada: null, salida: r, id: r.id });
            }
         } else {
            pairs.push({ isPair: false, record: r, id: r.id });
         }
      }
      if (currentEn) pairs.push({ isPair: true, entrada: currentEn, salida: null, id: currentEn.id });
      
      // En modo rango, invertimos el lógica para que dentro del mismo día también
      // se vea de forma cronológica (es decir, el primer turno del día hasta arriba).
      if (!esRangoSeleccionado) {
         pairs.reverse();
      }
      
      return { title: g.key, fecha: g.fecha, data: pairs, rawRegistros: g.registros };
    });
  }, [asistencias, rangoInicio, rangoFin]);


  const formatearHora = useCallback((fechaStr) => {
    return new Date(fechaStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  }, []);

  const formatearTituloDia = useCallback((fecha) => {
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaNum = String(fecha.getDate()).padStart(2, '0');
    const mesNum = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${diasSemana[fecha.getDay()]} - ${diaNum}/${mesNum}/${fecha.getFullYear()}`;
  }, []);

  const obtenerColorEstado = useCallback((estado) => {
    switch (estado) {
      case 'puntual':return '#10b981';
      case 'salida_puntual':return '#2563eb';
      case 'salida_temprano':return '#7c3aed';
    }
    if (estado?.startsWith('retardo')) return '#f59e0b';
    if (estado?.startsWith('falta')) return '#ef4444';
    return '#6b7280';
  }, []);

  const obtenerLabelEstado = useCallback((estado) => {
    if (!estado) return '';
    
    // Casos especiales donde queramos mantener una letra en mayúscula sola (ej. "Retardo A")
    if (estado.startsWith('retardo')) {
      const partes = estado.split('_');
      if (partes.length > 1 && partes[1].length === 1) {
        return `Retardo ${partes[1].toUpperCase()}`;
      }
      return 'Retardo';
    }
    if (estado.startsWith('falta')) return 'Falta';

    // Para cualquier otro como "salida_temprana", "salida_puntual", etc.
    // Transforma a "Salida Temprana", "Salida Puntual" dinámicamente.
    return estado
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const hoyStr = useMemo(() => new Date().toDateString(), []);


  const renderRecord = useCallback(({ item: r }) => {
    if (r.isPair) {
      const ent = r.entrada;
      const sal = r.salida;
      const colorEnt = ent ? obtenerColorEstado(ent.estado) : '#9ca3af';
      const colorSal = sal ? '#2563eb' : '#9ca3af';

      return (
        <View style={styles.recordItemPair}>
          <View style={styles.pairHalf}>
            <View style={styles.pairHeader}>
              <View style={[styles.recordIconContainerSmall, { backgroundColor: colorEnt + '18' }]}>
                <Ionicons name="log-in-outline" size={14} color={colorEnt} />
              </View>
              <Text style={styles.recordType}>Entrada</Text>
            </View>
            <Text style={styles.recordHora}>{ent ? formatearHora(ent.fecha_registro) : '--:--'}</Text>
            {ent && ent.estado && <Text style={[styles.recordEstado, {color: colorEnt}]}>{obtenerLabelEstado(ent.estado)}</Text>}
          </View>

          <View style={styles.pairDivider} />

          <View style={styles.pairHalf}>
            <View style={styles.pairHeader}>
              <View style={[styles.recordIconContainerSmall, { backgroundColor: colorSal + '18' }]}>
                <Ionicons name="log-out-outline" size={14} color={colorSal} />
              </View>
              <Text style={styles.recordType}>Salida</Text>
            </View>
            <Text style={styles.recordHora}>{sal ? formatearHora(sal.fecha_registro) : '--:--'}</Text>
            {sal && sal.estado && <Text style={[styles.recordEstado, {color: colorSal}]}>{obtenerLabelEstado(sal.estado)}</Text>}
          </View>
        </View>
      );
    }

    const rec = r.record;
    if (!rec) return null;
    const color = rec.tipo === 'entrada' ? obtenerColorEstado(rec.estado) : '#2563eb';
    return (
      <View style={styles.recordItem}>
        <View style={[styles.recordIconContainer, { backgroundColor: color + '18' }]}>
          <Ionicons name={rec.tipo === 'entrada' ? 'log-in-outline' : 'log-out-outline'} size={20} color={color} />
        </View>
        <View style={styles.recordContent}>
          <Text style={styles.recordType}>{rec.tipo === 'entrada' ? 'Entrada' : 'Salida'}</Text>
          {rec.tipo === 'entrada' && rec.estado && <Text style={[styles.recordEstado, { color }]}>{obtenerLabelEstado(rec.estado)}</Text>}
        </View>
        <Text style={styles.recordHora}>{formatearHora(rec.fecha_registro)}</Text>
      </View>);

  }, [styles, formatearHora, obtenerColorEstado, obtenerLabelEstado]);


  const renderSectionHeader = useCallback(({ section }) => {
    const entradas = section.rawRegistros.filter((r) => r.tipo === 'entrada');
    const totalRegistros = section.rawRegistros.length;
    const tieneProblema = entradas.some((r) =>
    r.estado === 'falta' || r.estado === 'falta_por_retardo'
    );
    const tieneRetardo = !tieneProblema && entradas.some((r) =>
    r.estado === 'retardo_a' || r.estado === 'retardo_b' || r.estado === 'retardo'
    );

    return (
      <View style={styles.sectionHeader}>
        <View style={[
        styles.sectionDot,
        {
          backgroundColor: tieneProblema ? '#ef4444' :
          tieneRetardo ? '#f59e0b' :
          entradas.length > 0 ? '#10b981' :
          '#94a3b8'
        }]
        } />
        <Text style={styles.sectionTitle}>{formatearTituloDia(section.fecha)}</Text>
        <Text style={styles.sectionCount}>
          {totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'}
        </Text>
      </View>);

  }, [styles, formatearTituloDia]);

  const keyExtractor = useCallback((item, index) => item.id?.toString() || index.toString(), []);


  const ListHeader = () =>
  <>
      {}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthButton} onPress={() => cambiarMes(-1)}>
          <Ionicons name="chevron-back" size={24} color={styles.monthButtonText.color} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.monthLabel} onPress={() => setShowCalendar((v) => !v)}>
          <Text style={styles.monthText}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <Ionicons
          name={showCalendar ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={styles.monthText.color}
          style={{ marginLeft: 6 }} />
        
        </TouchableOpacity>

        <TouchableOpacity
        style={styles.monthButton}
        onPress={() => cambiarMes(1)}
        disabled={currentMonth >= new Date()}>
        
          <Ionicons
          name="chevron-forward"
          size={24}
          color={currentMonth >= new Date() ? '#9ca3af' : styles.monthButtonText.color} />
        
        </TouchableOpacity>
      </View>

      {}
      {showCalendar &&
    <View style={styles.calendarContainer}>
          <View style={styles.weekDays}>
            {dayNames.map((d, i) =>
        <View key={i} style={styles.weekDay}>
                <Text style={styles.weekDayText}>{d}</Text>
              </View>
        )}
          </View>
          <View style={styles.daysGrid}>
            {diasCalendario.map((dia, index) => {
          const estado = dia ? estadosPorDia[dia] || null : null;
          const fechaDia = dia
            ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
            : null;
          const isInicio = rangoInicio && fechaDia &&
            fechaDia.toDateString() === rangoInicio.toDateString();
          const isFin = rangoFin && fechaDia &&
            fechaDia.toDateString() === rangoFin.toDateString();
          const isEnRango = rangoInicio && rangoFin && fechaDia &&
            fechaDia >= rangoInicio && fechaDia <= rangoFin && !isInicio && !isFin;
          const isSelected = isInicio || isFin;
          const isMultiMode = modoRango || rangoFin !== null;
          const isToday = dia &&
            hoyStr === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia).toDateString();
          const dotColor = estado ? obtenerColorEstado(estado) : null;

          return (
            <TouchableOpacity
              key={index}
              style={styles.dayCell}
              onPress={() => seleccionarDia(dia)}
              onLongPress={() => iniciarRango(dia)}
              disabled={!dia}>

              {dia &&
                <View style={[
                  styles.dayContent,
                  isSelected && !isMultiMode && styles.dayContentSelected,
                  isSelected && isMultiMode && styles.dayContentSelectedRange,
                  isEnRango && styles.dayContentInRange,
                  isToday && !isSelected && !isEnRango && styles.dayContentToday]
                }>
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isEnRango && styles.dayTextInRange,
                    isToday && !isSelected && !isEnRango && styles.dayTextToday]
                  }>
                    {dia}
                  </Text>
                  {dotColor && !isSelected && !isEnRango &&
                    <View style={[styles.dayIndicator, { backgroundColor: dotColor }]} />
                  }
                </View>
              }
            </TouchableOpacity>);

        })}
          </View>
        </View>
    }

      {}
      <View style={styles.recordsHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.recordsTitle}>
            {rangoInicio && rangoFin
              ? `${rangoInicio.getDate()} – ${rangoFin.getDate()} de ${monthNames[rangoFin.getMonth()]}`
              : rangoInicio
              ? `${rangoInicio.getDate()} de ${monthNames[rangoInicio.getMonth()]}`
              : `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`
            }
          </Text>
          {(rangoInicio || rangoFin) &&
            <TouchableOpacity onPress={limpiarRango}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563eb' }}>Ver mes</Text>
            </TouchableOpacity>
          }
        </View>
        <Text style={styles.recordsCount}>
          {asistencias.length} registros en el mes
        </Text>
      </View>
    </>;


  const ListEmpty = () =>
  <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
      <Text style={styles.emptyText}>Sin registros</Text>
      <Text style={styles.emptySubtext}>
        {(rangoInicio || rangoFin) ? 'No hay registros en este rango de fechas' : 'No hay registros este mes'}
      </Text>
    </View>;


  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={darkMode ? '#1e40af' : '#2563eb'} />
      

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial</Text>
        <Text style={styles.headerSubtitle}>Registro de asistencias</Text>
      </View>

      {loading ?
      <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View> :

      <SectionList
        sections={sections}
        renderItem={renderRecord}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={<View style={{ height: 100 }} />}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563eb"
          colors={['#2563eb']} />

        } />

      }
    </View>);

};


const historyStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#e0f2fe', fontWeight: '500', marginTop: 2 },

  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  monthButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  monthButtonText: { color: '#2563eb' },
  monthLabel: { flexDirection: 'row', alignItems: 'center' },
  monthText: { fontSize: 18, fontWeight: '700', color: '#1f2937' },

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
    shadowRadius: 3
  },
  weekDays: { flexDirection: 'row', marginBottom: 10 },
  weekDay: { flex: 1, alignItems: 'center' },
  weekDayText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayContent: {
    width: '80%', height: '80%', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', position: 'relative'
  },
  dayContentSelected: { backgroundColor: '#2563eb' },
  dayContentSelectedRange: { backgroundColor: '#2563eb' },
  dayContentToday: { borderWidth: 2, borderColor: '#2563eb' },
  dayText: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextToday: { color: '#2563eb', fontWeight: '700' },
  dayIndicator: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  dayContentInRange: { backgroundColor: '#dbeafe' },
  dayTextInRange: { color: '#1d4ed8', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '500' },

  recordsHeader: { marginHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  recordsTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 3 },
  recordsCount: { fontSize: 12, color: '#64748b' },


  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#374151' },
  sectionCount: { fontSize: 12, color: '#9ca3af' },


  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    marginHorizontal: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  recordIconContainer: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  recordContent: { flex: 1 },
  recordType: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  recordEstado: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  recordHora: { fontSize: 15, fontWeight: '700', color: '#374151' },

  recordIconContainerSmall: {
    width: 24, height: 24, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  recordItemPair: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  pairHalf: {
    flex: 1
  },
  pairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  pairDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
    height: '80%'
  },

  emptyState: { alignItems: 'center', paddingVertical: 60, marginHorizontal: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#475569', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 4 }
});

const historyStylesDark = StyleSheet.create({
  ...historyStyles,
  container: { ...historyStyles.container, backgroundColor: '#0f172a' },
  header: { ...historyStyles.header, backgroundColor: '#1e40af' },
  monthSelector: { ...historyStyles.monthSelector, backgroundColor: '#1e293b' },
  monthButtonText: { color: '#60a5fa' },
  monthText: { ...historyStyles.monthText, color: '#f1f5f9' },
  calendarContainer: { ...historyStyles.calendarContainer, backgroundColor: '#1e293b' },
  weekDayText: { ...historyStyles.weekDayText, color: '#94a3b8' },
  dayContentSelected: { backgroundColor: '#3b82f6' },
  dayContentSelectedRange: { backgroundColor: '#3b82f6' },
  dayContentInRange: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  dayTextInRange: { color: '#93c5fd' },
  dayContentToday: { ...historyStyles.dayContentToday, borderColor: '#3b82f6' },
  dayText: { ...historyStyles.dayText, color: '#e2e8f0' },
  dayTextToday: { ...historyStyles.dayTextToday, color: '#60a5fa' },
  statCard: { ...historyStyles.statCard, backgroundColor: '#1e293b' },
  statNumber: { ...historyStyles.statNumber, color: '#f1f5f9' },
  statLabel: { ...historyStyles.statLabel, color: '#94a3b8' },
  recordsTitle: { ...historyStyles.recordsTitle, color: '#f1f5f9' },
  recordsCount: { ...historyStyles.recordsCount, color: '#94a3b8' },
  sectionTitle: { ...historyStyles.sectionTitle, color: '#cbd5e1' },
  sectionCount: { ...historyStyles.sectionCount, color: '#64748b' },
  recordItem: { ...historyStyles.recordItem, backgroundColor: '#1e293b' },
  recordItemPair: { ...historyStyles.recordItemPair, backgroundColor: '#1e293b' },
  recordType: { ...historyStyles.recordType, color: '#f1f5f9' },
  recordEstado: { ...historyStyles.recordEstado },
  recordHora: { ...historyStyles.recordHora, color: '#e2e8f0' },
  emptyText: { ...historyStyles.emptyText, color: '#cbd5e1' },
  emptySubtext: { ...historyStyles.emptySubtext, color: '#64748b' }
});

export default HistoryScreen;