import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView
} from
  'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getIncidenciasEmpleado,
  createIncidencia
} from
  '../../services/incidenciasService';


import sqliteManager from '../../services/offline/sqliteManager.mjs';
import syncManager from '../../services/offline/syncManager.mjs';
import { detectarCambiosIncidencias } from '../../services/localNotificationService';
import { incidenciasStyles, incidenciasStylesDark } from './IncidentScreenStyles';
import { CreationIncidentScreen } from './CreationIncidentScreen';

export const IncidenciasScreen = ({ userData, darkMode, onBack }) => {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creando, setCreando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [vistaActual, setVistaActual] = useState('lista');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [rangoInicio, setRangoInicio] = useState(null);
  const [rangoFin, setRangoFin] = useState(null);
  const [modoRango, setModoRango] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);
  const [modalFiltroTipoVisible, setModalFiltroTipoVisible] = useState(false);

  const styles = darkMode ? incidenciasStylesDark : incidenciasStyles;


  const tiposIncidencia = [
    { value: 'retardo', label: 'Retardo', icon: 'time', color: '#f59e0b' },
    { value: 'justificante', label: 'Justificante', icon: 'document-text', color: '#3b82f6' },
    { value: 'permiso', label: 'Permiso', icon: 'calendar', color: '#8b5cf6' },
    { value: 'vacaciones', label: 'Vacaciones', icon: 'airplane', color: '#10b981' },
    { value: 'falta_justificada', label: 'Falta Justificada', icon: 'medkit', color: '#ec4899' }];


  const filtrosEstado = [
    { value: 'todos', label: 'Todos', icon: 'list' },
    { value: 'pendiente', label: 'Pendientes', icon: 'time', color: '#f59e0b' },
    { value: 'aprobado', label: 'Aprobadas', icon: 'checkmark-circle', color: '#10b981' },
    { value: 'rechazado', label: 'Rechazadas', icon: 'close-circle', color: '#ef4444' }];



  const filtrosTipo = [
    { value: 'todos', label: 'Todos los tipos', icon: 'apps', color: '#6b7280' },
    ...tiposIncidencia];


  useEffect(() => {
    cargarIncidencias();
  }, []);

  const cargarIncidencias = async () => {
    try {
      setLoading(true);
      const empleadoId = userData?.empleado_id;
      const token = userData?.token;

      if (!empleadoId || !token) {
        throw new Error('No se pudo obtener información del empleado');
      }

      let datos = [];
      let cargoOnline = false;


      try {
        if (syncManager.getIsBackendDown()) {
            throw new Error('Backend is offline');
        }
        const response = await getIncidenciasEmpleado(empleadoId, token);
        datos = response.data || [];
        cargoOnline = true;


        if (datos.length > 0) {
          await sqliteManager.upsertIncidencias(empleadoId, datos).catch((e) =>
            function () { }('Error guardando caché incidencias:', e.message)
          );
        }
      } catch (e) {
        (function () { })('Error cargando incidencias online, usando caché local:', e.message);

        try {
          datos = await sqliteManager.getIncidenciasLocal(empleadoId);
        } catch (dbErr) {
          (function () { })('Error leyendo caché local:', dbErr.message);
          datos = [];
        }
      }


      try {
        const pendientes = await sqliteManager.getPendingIncidencias();
        const offlineItems = pendientes.
          filter((p) => p.empleado_id === empleadoId).
          map((p) => ({
            id: `offline_${p.local_id}`,
            empleado_id: p.empleado_id,
            tipo: p.tipo,
            motivo: p.motivo,
            fecha_inicio: p.fecha_inicio,
            fecha_fin: p.fecha_fin,
            estado: 'pendiente_sync',
            is_offline: true,
            local_id: p.local_id
          }));

        datos = [...offlineItems, ...datos];
      } catch (e) {
        (function () { })('Error leyendo incidencias offline:', e.message);
      }

      const incidenciasOrdenadas = datos.sort((a, b) =>
        new Date(b.fecha_inicio) - new Date(a.fecha_inicio)
      );
      setIncidencias(incidenciasOrdenadas);


      if (cargoOnline) {
        detectarCambiosIncidencias(incidenciasOrdenadas);
      }


      if (!cargoOnline && datos.length === 0) {
        Alert.alert('Sin conexión', 'No se pudieron cargar las incidencias. Revisa tu conexión.');
      }
    } catch (error) {
      (function () { })('Error cargando incidencias:', error);
      Alert.alert('Error', 'No se pudieron cargar las incidencias');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarIncidencias();
    setRefreshing(false);
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return '#f59e0b';
      case 'aprobado': return '#10b981';
      case 'rechazado': return '#ef4444';
      case 'cancelado': return '#6b7280';
      case 'pendiente_sync': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'time';
      case 'aprobado': return 'checkmark-circle';
      case 'rechazado': return 'close-circle';
      case 'cancelado': return 'ban';
      case 'pendiente_sync': return 'cloud-offline';
      default: return 'help-circle';
    }
  };

  const getTipoIcon = (tipo) => {
    const tipoObj = tiposIncidencia.find((t) => t.value === tipo);
    return tipoObj?.icon || 'document';
  };

  const getTipoColor = (tipo) => {
    const tipoObj = tiposIncidencia.find((t) => t.value === tipo);
    return tipoObj?.color || '#6b7280';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No especificada';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatearFechaCompleta = (fecha) => {
    if (!fecha) return 'No especificada';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calcularDiasDiferencia = useCallback((inicio, fin) => {
    if (!fin) return 1;
    const diff = new Date(fin) - new Date(inicio);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, []);

  const incidenciasFiltradas = useMemo(() => {
    let filtradas = incidencias;

    if (filtroEstado !== 'todos' && vistaActual === 'lista') {
      filtradas = filtradas.filter((i) => i.estado?.toLowerCase() === filtroEstado);
    }

    if (filtroTipo !== 'todos') {
      filtradas = filtradas.filter((i) => i.tipo === filtroTipo);
    }

    if (vistaActual === 'calendario') {
      if (rangoInicio && rangoFin) {
        const inicio = new Date(rangoInicio); inicio.setHours(0, 0, 0, 0);
        const fin = new Date(rangoFin); fin.setHours(23, 59, 59, 999);
        filtradas = filtradas.filter((i) => {
          const iInicio = new Date(i.fecha_inicio);
          const iFin = i.fecha_fin ? new Date(i.fecha_fin) : iInicio;
          // Incidencia se solapa con el rango seleccionado
          return iInicio <= fin && iFin >= inicio;
        });
      } else if (rangoInicio) {
        filtradas = filtradas.filter((i) => {
          const iInicio = new Date(i.fecha_inicio);
          const iFin = i.fecha_fin ? new Date(i.fecha_fin) : iInicio;
          const d = new Date(rangoInicio); d.setHours(0, 0, 0, 0);
          return iInicio <= new Date(d.getTime() + 86399999) && iFin >= d;
        });
      }
    }

    return filtradas;
  }, [incidencias, filtroEstado, filtroTipo, rangoInicio, rangoFin, vistaActual]);

  const seccionesFiltradas = useMemo(() => {
    const grupos = {};
    incidenciasFiltradas.forEach((incidencia) => {
      // Usamos la fecha_inicio para agrupar (como el día principal del evento)
      const fecha = new Date(incidencia.fecha_inicio);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      if (!grupos[key]) {
        grupos[key] = {
          key,
          fecha,
          data: []
        };
      }
      grupos[key].data.push(incidencia);
    });

    return Object.values(grupos)
      .sort((a, b) => b.fecha - a.fecha)
      .map((g) => ({
        title: g.key,
        fecha: g.fecha,
        data: g.data
      }));
  }, [incidenciasFiltradas]);

  const cambiarMes = useCallback((direccion) => {
    const nuevoMes = new Date(currentMonth);
    nuevoMes.setMonth(currentMonth.getMonth() + direccion);
    setCurrentMonth(nuevoMes);
    setRangoInicio(null);
    setRangoFin(null);
    setModoRango(false);
  }, [currentMonth]);

  const diasCalendario = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const primerDiaSemana = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();

    const dias = [];
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null);
    for (let dia = 1; dia <= diasEnMes; dia++) dias.push(dia);
    return dias;
  }, [currentMonth]);

  const incidenciasPorDia = useMemo(() => {
    const mapa = {};
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let dia = 1; dia <= daysInMonth; dia++) {
      const fecha = new Date(year, month, dia);

      const incidenciasDia = incidencias.filter((i) => {
        const inicioDate = new Date(i.fecha_inicio);
        const finDate = i.fecha_fin ? new Date(i.fecha_fin) : inicioDate;
        return fecha >= new Date(inicioDate.setHours(0, 0, 0, 0)) &&
          fecha <= new Date(finDate.setHours(23, 59, 59, 999));
      });

      if (incidenciasDia.length > 0) {
        mapa[dia] = incidenciasDia;
      }
    }
    return mapa;
  }, [incidencias, currentMonth]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const renderCalendario = () => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
      <View style={styles.calendarSection}>
        { }
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={24} color={styles.monthButtonText.color} />
          </TouchableOpacity>

          <Text style={styles.monthText}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>

          <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={24} color={styles.monthButtonText.color} />
          </TouchableOpacity>
        </View>

        { }
        <View style={styles.calendar}>
          <View style={styles.weekDays}>
            {dayNames.map((day, index) =>
              <View key={index} style={styles.weekDay}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            )}
          </View>

          <View style={styles.daysGrid}>
            {diasCalendario.map((dia, index) => {
              const incidenciasDia = dia ? incidenciasPorDia[dia] || [] : [];
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
              const isToday = dia &&
                new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia).toDateString();

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.dayCell}
                  onPress={() => {
                    if (!dia) return;
                    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
                    if (!modoRango) {
                      // Tap simple: filtro de un día (comportamiento original)
                      setRangoFin(null);
                      setRangoInicio((prev) =>
                        prev && prev.toDateString() === fecha.toDateString() ? null : fecha
                      );
                    } else {
                      // Modo rango activo: cerrar rango
                      setModoRango(false);
                      if (!rangoInicio || fecha.toDateString() === rangoInicio.toDateString()) {
                        setRangoFin(null);
                      } else if (fecha < rangoInicio) {
                        setRangoFin(rangoInicio);
                        setRangoInicio(fecha);
                      } else {
                        setRangoFin(fecha);
                      }
                    }
                  }}
                  onLongPress={() => {
                    if (!dia) return;
                    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
                    setRangoInicio(fecha);
                    setRangoFin(null);
                    setModoRango(true);
                  }}
                  disabled={!dia}>

                  {dia &&
                    <View style={[
                      styles.dayContent,
                      isSelected && styles.dayContentSelected,
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
                      { }
                      {incidenciasDia.length > 0 && !isSelected && !isEnRango &&
                        <View style={styles.dayIndicators}>
                          <View style={styles.dayIndicator} />
                        </View>
                      }
                    </View>
                  }
                </TouchableOpacity>);

            })}
          </View>
        </View>
      </View>);

  };

  const renderIncidenciaCard = (incidencia) => {
    const isExpanded = expandedCard === incidencia.id;
    const diasTotal = calcularDiasDiferencia(incidencia.fecha_inicio, incidencia.fecha_fin);

    return (
      <TouchableOpacity
        key={incidencia.id}
        style={styles.incidenciaCard}
        onPress={() => setExpandedCard(isExpanded ? null : incidencia.id)}
        activeOpacity={0.7}>

        <View style={styles.cardHeader}>
          <View style={styles.tipoContainer}>
            <View style={[
              styles.tipoIcon,
              { backgroundColor: `${getTipoColor(incidencia.tipo)}20` }]
            }>
              <Ionicons
                name={getTipoIcon(incidencia.tipo)}
                size={20}
                color={getTipoColor(incidencia.tipo)} />

            </View>
            <View style={styles.tipoInfo}>
              <Text style={styles.tipoText}>
                {tiposIncidencia.find((t) => t.value === incidencia.tipo)?.label || incidencia.tipo}
              </Text>
              <Text style={styles.fechaText}>
                {formatearFecha(incidencia.fecha_inicio)}
                {incidencia.fecha_fin && ` - ${formatearFecha(incidencia.fecha_fin)}`}
              </Text>
            </View>
          </View>

          <View style={[
            styles.estadoBadge,
            { backgroundColor: `${getEstadoColor(incidencia.estado)}20` }]
          }>
            <Ionicons
              name={getEstadoIcon(incidencia.estado)}
              size={14}
              color={getEstadoColor(incidencia.estado)} />

          </View>
        </View>

        {incidencia.is_offline &&
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', gap: 4 }}>
            <Ionicons name="cloud-offline" size={14} color="#6366f1" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6366f1' }}>Pendiente de enviar</Text>
          </View>
        }

        <Text style={styles.motivoText} numberOfLines={isExpanded ? undefined : 2}>
          {incidencia.motivo}
        </Text>

        {incidencia.fecha_fin &&
          <View style={styles.diasBadge}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.diasText}>{diasTotal} {diasTotal === 1 ? 'día' : 'días'}</Text>
          </View>
        }

        {isExpanded &&
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estado:</Text>
              <Text style={[styles.detailValue, { color: getEstadoColor(incidencia.estado) }]}>
                {incidencia.estado}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Inicio:</Text>
              <Text style={styles.detailValue}>{formatearFechaCompleta(incidencia.fecha_inicio)}</Text>
            </View>

            {incidencia.fecha_fin &&
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fin:</Text>
                <Text style={styles.detailValue}>{formatearFechaCompleta(incidencia.fecha_fin)}</Text>
              </View>
            }

            {incidencia.observaciones &&
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {incidencia.estado === 'rechazado' ? 'Motivo de rechazo:' : 'Observaciones:'}
                </Text>
                <Text style={[
                  styles.detailValue,
                  incidencia.estado === 'rechazado' && { color: '#ef4444' }]
                }>
                  {incidencia.observaciones}
                </Text>
              </View>
            }
          </View>
        }
      </TouchableOpacity>);

  };

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const ListHeader = () =>
    <>
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewButton, vistaActual === 'lista' && styles.viewButtonActive]}
          onPress={() => {
            setVistaActual('lista');
            setRangoInicio(null);
            setRangoFin(null);
            setModoRango(false);
          }}>

          <Ionicons name="list" size={20} color={vistaActual === 'lista' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.viewButtonText, vistaActual === 'lista' && styles.viewButtonTextActive]}>Lista</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewButton, vistaActual === 'calendario' && styles.viewButtonActive]}
          onPress={() => setVistaActual('calendario')}>

          <Ionicons name="calendar" size={20} color={vistaActual === 'calendario' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.viewButtonText, vistaActual === 'calendario' && styles.viewButtonTextActive]}>Calendario</Text>
        </TouchableOpacity>
      </View>

      {vistaActual === 'lista' &&
        <View style={styles.filtrosContainer}>
          <TouchableOpacity style={styles.filtroChip} onPress={() => setModalFiltroVisible(true)}>
            <Ionicons name={filtrosEstado.find((f) => f.value === filtroEstado)?.icon || 'list'} size={16} color="#2563eb" />
            <Text style={styles.filtroChipText}>{filtrosEstado.find((f) => f.value === filtroEstado)?.label || 'Todos'}</Text>
            <View style={styles.filtroChipBadge}>
              <Text style={styles.filtroChipBadgeText}>
                {filtroEstado === 'todos' ? incidencias.length : incidencias.filter((i) => i.estado === filtroEstado).length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.filtroChip, { flex: 1 }]} onPress={() => setModalFiltroTipoVisible(true)}>
            <Ionicons name={filtrosTipo.find((f) => f.value === filtroTipo)?.icon || 'apps'} size={16} color={getTipoColor(filtroTipo)} />
            <Text style={styles.filtroChipText}>{filtroTipo === 'todos' ? 'Tipo' : filtrosTipo.find((f) => f.value === filtroTipo)?.label}</Text>
            <View style={[styles.filtroChipBadge, { backgroundColor: `${getTipoColor(filtroTipo)}20` }]}>
              <Text style={[styles.filtroChipBadgeText, { color: getTipoColor(filtroTipo) }]}>
                {filtroTipo === 'todos' ? incidencias.length : incidencias.filter((i) => i.tipo === filtroTipo).length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      }

      {vistaActual === 'calendario' && renderCalendario()}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {rangoInicio && rangoFin && vistaActual === 'calendario'
            ? `${rangoInicio.getDate()} – ${rangoFin.getDate()} de ${monthNames[rangoFin.getMonth()]}`
            : rangoInicio && vistaActual === 'calendario'
            ? `${rangoInicio.getDate()} de ${monthNames[rangoInicio.getMonth()]}`
            : vistaActual === 'calendario'
            ? 'Todas las incidencias'
            : 'Incidencias'
          }
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(rangoInicio || rangoFin) && vistaActual === 'calendario' &&
            <TouchableOpacity onPress={() => { setRangoInicio(null); setRangoFin(null); setModoRango(false); }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563eb' }}>Ver todas</Text>
            </TouchableOpacity>
          }
          <Text style={styles.sectionCount}>
            {incidenciasFiltradas.length} {incidenciasFiltradas.length === 1 ? 'registro' : 'registros'}
          </Text>
        </View>
      </View>
    </>;


  const ListEmpty = () =>
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>No hay incidencias</Text>
      <Text style={styles.emptyText}>
        {filtroEstado === 'todos' && filtroTipo === 'todos' ?
          'Toca el botón + para crear tu primera incidencia' :
          'Cambia los filtros para ver otras incidencias'
        }
      </Text>
    </View>;


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Incidencias</Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>);

  }

  return (
    <View style={styles.container}>
      { }
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Incidencias</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={seccionesFiltradas}
        extraData={expandedCard}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderIncidenciaCard(item)}
        renderSectionHeader={({ section }) => {
          const mNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const dia = section.fecha.getDate();
          const mes = mNames[section.fecha.getMonth()];
          const anio = section.fecha.getFullYear();
          return (
            <Text style={styles.sectionListHeader}>
              {dia} de {mes} {anio}
            </Text>
          );
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={<View style={{ height: 100 }} />}
        contentContainerStyle={seccionesFiltradas.length === 0 ? { flexGrow: 1 } : undefined}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'ios'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']} />
        } />


      { }
      <Modal
        visible={modalFiltroTipoVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalFiltroTipoVisible(false)}>

        <View style={styles.modalOverlayBottomSheet}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalFiltroTipoVisible(false)}>

            <View style={{ flex: 1 }} />
          </TouchableOpacity>

          <View style={styles.modalSheetContent}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalListHeader}>
              <Text style={styles.modalListTitle}>Filtrar por Tipo</Text>
              <TouchableOpacity onPress={() => setModalFiltroTipoVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {filtrosTipo.map((filtro, index) =>
              <TouchableOpacity
                key={filtro.value}
                style={[
                  styles.modalListItem,
                  filtroTipo === filtro.value && styles.modalListItemActive,
                  index === filtrosTipo.length - 1 && { borderBottomWidth: 0 }]
                }
                onPress={() => {
                  setFiltroTipo(filtro.value);
                  setModalFiltroTipoVisible(false);
                }}
                activeOpacity={0.7}>

                <View style={styles.modalListItemLeft}>
                  <View style={[
                    styles.tipoIconSmall,
                    { backgroundColor: `${filtro.color}20` }]
                  }>
                    <Ionicons
                      name={filtro.icon}
                      size={20}
                      color={filtro.color} />

                  </View>
                  <Text style={[
                    styles.modalListItemText,
                    filtroTipo === filtro.value && styles.modalListItemTextActive]
                  }>
                    {filtro.label}
                  </Text>
                </View>
                <View style={styles.modalListItemBadge}>
                  <Text style={styles.modalListItemBadgeText}>
                    {filtro.value === 'todos' ?
                      incidencias.length :
                      incidencias.filter((i) => i.tipo === filtro.value).length
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      { }
      <Modal
        visible={modalFiltroVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalFiltroVisible(false)}>

        <View style={styles.modalOverlayBottomSheet}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalFiltroVisible(false)}>

            <View style={{ flex: 1 }} />
          </TouchableOpacity>

          <View style={styles.modalSheetContent}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalListHeader}>
              <Text style={styles.modalListTitle}>Filtrar por Estado</Text>
              <TouchableOpacity onPress={() => setModalFiltroVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {filtrosEstado.map((filtro, index) =>
              <TouchableOpacity
                key={filtro.value}
                style={[
                  styles.modalListItem,
                  filtroEstado === filtro.value && styles.modalListItemActive,
                  index === filtrosEstado.length - 1 && { borderBottomWidth: 0 }]
                }
                onPress={() => {
                  setFiltroEstado(filtro.value);
                  setModalFiltroVisible(false);
                }}
                activeOpacity={0.7}>

                <View style={styles.modalListItemLeft}>
                  <Ionicons
                    name={filtro.icon}
                    size={22}
                    color={filtroEstado === filtro.value ? '#2563eb' : '#6b7280'} />

                  <Text style={[
                    styles.modalListItemText,
                    filtroEstado === filtro.value && styles.modalListItemTextActive]
                  }>
                    {filtro.label}
                  </Text>
                </View>
                <View style={styles.modalListItemBadge}>
                  <Text style={styles.modalListItemBadgeText}>
                    {filtro.value === 'todos' ?
                      incidencias.length :
                      incidencias.filter((i) => i.estado === filtro.value).length
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <CreationIncidentScreen
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          cargarIncidencias();
        }}
        userData={userData}
        darkMode={darkMode}
      />
    </View>
  );
};

export default IncidenciasScreen;