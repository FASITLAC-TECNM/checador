import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getIncidenciasEmpleado,
  createIncidencia,
  updateIncidencia
} from '../../services/incidenciasService';

export const IncidenciasScreen = ({ userData, darkMode, onBack }) => {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creando, setCreando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // NUEVO
  const [vistaActual, setVistaActual] = useState('lista');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [modalFiltroTipoVisible, setModalFiltroTipoVisible] = useState(false); // NUEVO

  // Form state
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date(new Date().getTime() + 86400000));
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);

  const styles = darkMode ? incidenciasStylesDark : incidenciasStyles;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const tiposIncidencia = [
    { value: 'retardo', label: 'Retardo', icon: 'time', color: '#f59e0b' },
    { value: 'justificante', label: 'Justificante', icon: 'document-text', color: '#3b82f6' },
    { value: 'permiso', label: 'Permiso', icon: 'calendar', color: '#8b5cf6' },
    { value: 'vacaciones', label: 'Vacaciones', icon: 'airplane', color: '#10b981' },
    { value: 'falta_justificada', label: 'Falta Justificada', icon: 'medkit', color: '#ec4899' },
  ];

  const filtrosEstado = [
    { value: 'todos', label: 'Todos', icon: 'list' },
    { value: 'pendiente', label: 'Pendientes', icon: 'time', color: '#f59e0b' },
    { value: 'aprobado', label: 'Aprobadas', icon: 'checkmark-circle', color: '#10b981' },
    { value: 'rechazado', label: 'Rechazadas', icon: 'close-circle', color: '#ef4444' },
  ];

  // NUEVO: Filtros de tipo
  const filtrosTipo = [
    { value: 'todos', label: 'Todos los tipos', icon: 'apps', color: '#6b7280' },
    ...tiposIncidencia
  ];

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

      const response = await getIncidenciasEmpleado(empleadoId, token);
      const incidenciasOrdenadas = (response.data || []).sort((a, b) => 
        new Date(b.fecha_inicio) - new Date(a.fecha_inicio)
      );
      setIncidencias(incidenciasOrdenadas);
    } catch (error) {
      console.error('Error cargando incidencias:', error);
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

  const handleCrearIncidencia = async () => {
    if (!tipoSeleccionado) {
      Alert.alert('Error', 'Selecciona un tipo de incidencia');
      return;
    }

    if (!motivo.trim()) {
      Alert.alert('Error', 'Ingresa el motivo de la incidencia');
      return;
    }

    if (!fechaFin) {
      Alert.alert('Error', 'La fecha de fin es obligatoria');
      return;
    }

    if (fechaFin < fechaInicio) {
      Alert.alert('Error', 'La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    try {
      setCreando(true);

      const incidenciaData = {
        empleado_id: userData.empleado_id,
        tipo: tipoSeleccionado,
        motivo: motivo.trim(),
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString()
      };

      await createIncidencia(incidenciaData, userData.token);

      Alert.alert(
        '¡Éxito!',
        'Incidencia creada correctamente. Está pendiente de aprobación.',
        [{ text: 'OK' }]
      );

      // Limpiar formulario
      setTipoSeleccionado('');
      setMotivo('');
      setFechaInicio(new Date());
      setFechaFin(new Date(new Date().getTime() + 86400000));
      setModalVisible(false);

      // Recargar lista
      await cargarIncidencias();
    } catch (error) {
      console.error('Error creando incidencia:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la incidencia');
    } finally {
      setCreando(false);
    }
  };

  const handleCancelarIncidencia = (incidenciaId) => {
    Alert.alert(
      'Cancelar Incidencia',
      '¿Estás seguro de que deseas cancelar esta incidencia?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateIncidencia(incidenciaId, { estado: 'cancelado' }, userData.token);
              Alert.alert('Éxito', 'Incidencia cancelada');
              await cargarIncidencias();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la incidencia');
            }
          }
        }
      ]
    );
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return '#f59e0b';
      case 'aprobado': return '#10b981';
      case 'rechazado': return '#ef4444';
      case 'cancelado': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'time';
      case 'aprobado': return 'checkmark-circle';
      case 'rechazado': return 'close-circle';
      case 'cancelado': return 'ban';
      default: return 'help-circle';
    }
  };

  const getTipoIcon = (tipo) => {
    const tipoObj = tiposIncidencia.find(t => t.value === tipo);
    return tipoObj?.icon || 'document';
  };

  const getTipoColor = (tipo) => {
    const tipoObj = tiposIncidencia.find(t => t.value === tipo);
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

  const calcularDiasDiferencia = (inicio, fin) => {
    if (!fin) return 1;
    const diff = new Date(fin) - new Date(inicio);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const getIncidenciasFiltradas = () => {
    let filtradas = incidencias;
    
    // Filtro de estado (solo en vista lista)
    if (filtroEstado !== 'todos' && vistaActual === 'lista') {
      filtradas = filtradas.filter(i => i.estado?.toLowerCase() === filtroEstado);
    }

    // NUEVO: Filtro de tipo
    if (filtroTipo !== 'todos') {
      filtradas = filtradas.filter(i => i.tipo === filtroTipo);
    }

    // Filtro de fecha (solo en calendario)
    if (selectedDate && vistaActual === 'calendario') {
      filtradas = filtradas.filter(i => {
        const inicioDate = new Date(i.fecha_inicio);
        const finDate = i.fecha_fin ? new Date(i.fecha_fin) : inicioDate;
        return selectedDate >= inicioDate && selectedDate <= finDate;
      });
    }

    return filtradas;
  };

  const cambiarMes = (direccion) => {
    const nuevoMes = new Date(currentMonth);
    nuevoMes.setMonth(currentMonth.getMonth() + direccion);
    setCurrentMonth(nuevoMes);
    setSelectedDate(null);
  };

  const generarDiasCalendario = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();

    const dias = [];
    
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(dia);
    }

    return dias;
  };

  const getIncidenciasDia = (dia) => {
    if (!dia) return [];
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
    
    return incidencias.filter(i => {
      const inicioDate = new Date(i.fecha_inicio);
      const finDate = i.fecha_fin ? new Date(i.fecha_fin) : inicioDate;
      return fecha >= new Date(inicioDate.setHours(0,0,0,0)) && 
             fecha <= new Date(finDate.setHours(23,59,59,999));
    });
  };

  const renderCalendario = () => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
      <View style={styles.calendarSection}>
        {/* Navegación mes */}
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

        {/* Calendario */}
        <View style={styles.calendar}>
          <View style={styles.weekDays}>
            {dayNames.map((day, index) => (
              <View key={index} style={styles.weekDay}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {generarDiasCalendario().map((dia, index) => {
              const incidenciasDia = getIncidenciasDia(dia);
              const isSelected = selectedDate && dia === selectedDate.getDate() &&
                selectedDate.getMonth() === currentMonth.getMonth();
              const isToday = dia && 
                new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia).toDateString();

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.dayCell}
                  onPress={() => dia && setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia))}
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
                      {/* MODIFICADO: Solo un indicador */}
                      {incidenciasDia.length > 0 && (
                        <View style={styles.dayIndicators}>
                          <View style={styles.dayIndicator} />
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderIncidenciaCard = (incidencia) => {
    const isExpanded = expandedCard === incidencia.id;
    const diasTotal = calcularDiasDiferencia(incidencia.fecha_inicio, incidencia.fecha_fin);

    return (
      <TouchableOpacity
        key={incidencia.id}
        style={styles.incidenciaCard}
        onPress={() => setExpandedCard(isExpanded ? null : incidencia.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.tipoContainer}>
            <View style={[
              styles.tipoIcon,
              { backgroundColor: `${getTipoColor(incidencia.tipo)}20` }
            ]}>
              <Ionicons
                name={getTipoIcon(incidencia.tipo)}
                size={20}
                color={getTipoColor(incidencia.tipo)}
              />
            </View>
            <View style={styles.tipoInfo}>
              <Text style={styles.tipoText}>
                {tiposIncidencia.find(t => t.value === incidencia.tipo)?.label || incidencia.tipo}
              </Text>
              <Text style={styles.fechaText}>
                {formatearFecha(incidencia.fecha_inicio)}
                {incidencia.fecha_fin && ` - ${formatearFecha(incidencia.fecha_fin)}`}
              </Text>
            </View>
          </View>

          <View style={[
            styles.estadoBadge,
            { backgroundColor: `${getEstadoColor(incidencia.estado)}20` }
          ]}>
            <Ionicons
              name={getEstadoIcon(incidencia.estado)}
              size={14}
              color={getEstadoColor(incidencia.estado)}
            />
          </View>
        </View>

        <Text style={styles.motivoText} numberOfLines={isExpanded ? undefined : 2}>
          {incidencia.motivo}
        </Text>

        {incidencia.fecha_fin && (
          <View style={styles.diasBadge}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.diasText}>{diasTotal} {diasTotal === 1 ? 'día' : 'días'}</Text>
          </View>
        )}

        {isExpanded && (
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

            {incidencia.fecha_fin && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fin:</Text>
                <Text style={styles.detailValue}>{formatearFechaCompleta(incidencia.fecha_fin)}</Text>
              </View>
            )}

            {incidencia.aprobado_por && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Aprobado por:</Text>
                <Text style={styles.detailValue}>{incidencia.aprobado_por}</Text>
              </View>
            )}

            {incidencia.motivo_rechazo && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Motivo de rechazo:</Text>
                <Text style={[styles.detailValue, { color: '#ef4444' }]}>
                  {incidencia.motivo_rechazo}
                </Text>
              </View>
            )}

            {incidencia.estado === 'pendiente' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelarIncidencia(incidencia.id)}
              >
                <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.cancelButtonText}>Cancelar Incidencia</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const incidenciasFiltradas = getIncidenciasFiltradas();

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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {/* Toggle Vista */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewButton, vistaActual === 'lista' && styles.viewButtonActive]}
            onPress={() => {
              setVistaActual('lista');
              setSelectedDate(null);
            }}
          >
            <Ionicons
              name="list"
              size={20}
              color={vistaActual === 'lista' ? '#2563eb' : '#6b7280'}
            />
            <Text style={[
              styles.viewButtonText,
              vistaActual === 'lista' && styles.viewButtonTextActive
            ]}>
              Lista
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewButton, vistaActual === 'calendario' && styles.viewButtonActive]}
            onPress={() => setVistaActual('calendario')}
          >
            <Ionicons
              name="calendar"
              size={20}
              color={vistaActual === 'calendario' ? '#2563eb' : '#6b7280'}
            />
            <Text style={[
              styles.viewButtonText,
              vistaActual === 'calendario' && styles.viewButtonTextActive
            ]}>
              Calendario
            </Text>
          </TouchableOpacity>
        </View>

        {/* NUEVO: Filtros (solo en vista lista) */}
        {vistaActual === 'lista' && (
          <View style={styles.filtrosContainer}>
            {/* Filtro de Estado */}
            <TouchableOpacity 
              style={styles.filtroChip}
              onPress={() => setModalFiltroVisible(true)}
            >
              <Ionicons 
                name={filtrosEstado.find(f => f.value === filtroEstado)?.icon || 'list'} 
                size={16} 
                color="#2563eb" 
              />
              <Text style={styles.filtroChipText}>
                {filtrosEstado.find(f => f.value === filtroEstado)?.label || 'Todos'}
              </Text>
              <View style={styles.filtroChipBadge}>
                <Text style={styles.filtroChipBadgeText}>
                  {filtroEstado === 'todos' 
                    ? incidencias.length 
                    : incidencias.filter(i => i.estado === filtroEstado).length
                  }
                </Text>
              </View>
            </TouchableOpacity>

            {/* NUEVO: Filtro de Tipo */}
            <TouchableOpacity 
              style={[styles.filtroChip, { flex: 1 }]}
              onPress={() => setModalFiltroTipoVisible(true)}
            >
              <Ionicons 
                name={filtrosTipo.find(f => f.value === filtroTipo)?.icon || 'apps'} 
                size={16} 
                color={getTipoColor(filtroTipo)} 
              />
              <Text style={styles.filtroChipText}>
                {filtroTipo === 'todos' ? 'Tipo' : filtrosTipo.find(f => f.value === filtroTipo)?.label}
              </Text>
              <View style={[styles.filtroChipBadge, { backgroundColor: `${getTipoColor(filtroTipo)}20` }]}>
                <Text style={[styles.filtroChipBadgeText, { color: getTipoColor(filtroTipo) }]}>
                  {filtroTipo === 'todos' 
                    ? incidencias.length 
                    : incidencias.filter(i => i.tipo === filtroTipo).length
                  }
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Vista Calendario */}
        {vistaActual === 'calendario' && renderCalendario()}

        {/* Título de sección */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedDate 
              ? `${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`
              : vistaActual === 'calendario' 
                ? 'Todas las incidencias'
                : 'Incidencias'
            }
          </Text>
          <Text style={styles.sectionCount}>
            {incidenciasFiltradas.length} {incidenciasFiltradas.length === 1 ? 'registro' : 'registros'}
          </Text>
        </View>

        {/* Lista de incidencias */}
        {incidenciasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No hay incidencias</Text>
            <Text style={styles.emptyText}>
              {filtroEstado === 'todos' && filtroTipo === 'todos'
                ? 'Toca el botón + para crear tu primera incidencia'
                : 'Cambia los filtros para ver otras incidencias'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.incidenciasList}>
            {incidenciasFiltradas.map(renderIncidenciaCard)}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* NUEVO: Modal Filtro de Tipo */}
      <Modal
        visible={modalFiltroTipoVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalFiltroTipoVisible(false)}
      >
        <View style={styles.modalOverlayBottomSheet}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalFiltroTipoVisible(false)}
          >
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
            
            {filtrosTipo.map((filtro, index) => (
              <TouchableOpacity
                key={filtro.value}
                style={[
                  styles.modalListItem,
                  filtroTipo === filtro.value && styles.modalListItemActive,
                  index === filtrosTipo.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => {
                  setFiltroTipo(filtro.value);
                  setModalFiltroTipoVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalListItemLeft}>
                  <View style={[
                    styles.tipoIconSmall,
                    { backgroundColor: `${filtro.color}20` }
                  ]}>
                    <Ionicons 
                      name={filtro.icon} 
                      size={20} 
                      color={filtro.color} 
                    />
                  </View>
                  <Text style={[
                    styles.modalListItemText,
                    filtroTipo === filtro.value && styles.modalListItemTextActive
                  ]}>
                    {filtro.label}
                  </Text>
                </View>
                <View style={styles.modalListItemBadge}>
                  <Text style={styles.modalListItemBadgeText}>
                    {filtro.value === 'todos' 
                      ? incidencias.length 
                      : incidencias.filter(i => i.tipo === filtro.value).length
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Filtros */}
      <Modal
        visible={modalFiltroVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalFiltroVisible(false)}
      >
        <View style={styles.modalOverlayBottomSheet}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalFiltroVisible(false)}
          >
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
            
            {filtrosEstado.map((filtro, index) => (
              <TouchableOpacity
                key={filtro.value}
                style={[
                  styles.modalListItem,
                  filtroEstado === filtro.value && styles.modalListItemActive,
                  index === filtrosEstado.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => {
                  setFiltroEstado(filtro.value);
                  setModalFiltroVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalListItemLeft}>
                  <Ionicons 
                    name={filtro.icon} 
                    size={22} 
                    color={filtroEstado === filtro.value ? '#2563eb' : '#6b7280'} 
                  />
                  <Text style={[
                    styles.modalListItemText,
                    filtroEstado === filtro.value && styles.modalListItemTextActive
                  ]}>
                    {filtro.label}
                  </Text>
                </View>
                <View style={styles.modalListItemBadge}>
                  <Text style={styles.modalListItemBadgeText}>
                    {filtro.value === 'todos' 
                      ? incidencias.length 
                      : incidencias.filter(i => i.estado === filtro.value).length
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Tipo de Incidencia */}
      <Modal
        visible={modalTipoVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalTipoVisible(false)}
      >
        <View style={styles.modalOverlayBottomSheet}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalTipoVisible(false)}
          >
            <View style={{ flex: 1 }} />
          </TouchableOpacity>
          
          <View style={styles.modalSheetContent}>
            <View style={styles.modalSheetHandle} />
            
            <View style={styles.modalListHeader}>
              <Text style={styles.modalListTitle}>Tipo de Incidencia</Text>
              <TouchableOpacity onPress={() => setModalTipoVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {tiposIncidencia.map((tipo, index) => (
              <TouchableOpacity
                key={tipo.value}
                style={[
                  styles.modalListItem,
                  tipoSeleccionado === tipo.value && styles.modalListItemActive,
                  index === tiposIncidencia.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => {
                  setTipoSeleccionado(tipo.value);
                  setModalTipoVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalListItemLeft}>
                  <View style={[
                    styles.tipoIconSmall,
                    { backgroundColor: `${tipo.color}20` }
                  ]}>
                    <Ionicons 
                      name={tipo.icon} 
                      size={20} 
                      color={tipo.color} 
                    />
                  </View>
                  <Text style={[
                    styles.modalListItemText,
                    tipoSeleccionado === tipo.value && styles.modalListItemTextActive
                  ]}>
                    {tipo.label}
                  </Text>
                </View>
                {tipoSeleccionado === tipo.value && (
                  <Ionicons name="checkmark" size={24} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Crear - MODIFICADO: 75% de altura */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlayCreate}>
          <TouchableOpacity 
            style={styles.modalBackdropCreate}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCreateContainer}
          >
            <View style={styles.modalCreateContent}>
              <View style={styles.modalSheetHandle} />
              
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color="#6b7280" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Nueva Incidencia</Text>
                <View style={styles.headerPlaceholder} />
              </View>

              <ScrollView 
                style={styles.modalBody} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                {/* Selector de Tipo */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionLabel}>Tipo de Incidencia *</Text>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setModalTipoVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.selectInputContent}>
                      {tipoSeleccionado ? (
                        <>
                          <View style={[
                            styles.tipoIconSmall,
                            { backgroundColor: `${getTipoColor(tipoSeleccionado)}20` }
                          ]}>
                            <Ionicons
                              name={getTipoIcon(tipoSeleccionado)}
                              size={18}
                              color={getTipoColor(tipoSeleccionado)}
                            />
                          </View>
                          <Text style={styles.selectInputText}>
                            {tiposIncidencia.find(t => t.value === tipoSeleccionado)?.label}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="list" size={20} color="#9ca3af" />
                          <Text style={styles.selectInputPlaceholder}>Selecciona el tipo</Text>
                        </>
                      )}
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Fechas compactas */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionLabel}>Período *</Text>

                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={[styles.dateCompact, showDatePickerInicio && Platform.OS === 'ios' && styles.dateCompactActive]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          setShowDatePickerFin(false);
                          setShowDatePickerInicio(!showDatePickerInicio);
                        } else {
                          setShowDatePickerInicio(true);
                        }
                      }}
                    >
                      <Ionicons name="calendar" size={18} color="#3b82f6" />
                      <View style={styles.dateCompactInfo}>
                        <Text style={styles.dateCompactLabel}>Inicio</Text>
                        <Text style={styles.dateCompactValue}>
                          {fechaInicio.getDate()} {monthNames[fechaInicio.getMonth()].substring(0, 3)} {fechaInicio.getFullYear()}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.dateArrow}>
                      <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                    </View>

                    <TouchableOpacity
                      style={[styles.dateCompact, showDatePickerFin && Platform.OS === 'ios' && styles.dateCompactActive]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          setShowDatePickerInicio(false);
                          setShowDatePickerFin(!showDatePickerFin);
                        } else {
                          setShowDatePickerFin(true);
                        }
                      }}
                    >
                      <Ionicons name="calendar" size={18} color="#10b981" />
                      <View style={styles.dateCompactInfo}>
                        <Text style={styles.dateCompactLabel}>Fin</Text>
                        <Text style={styles.dateCompactValue}>
                          {fechaFin.getDate()} {monthNames[fechaFin.getMonth()].substring(0, 3)} {fechaFin.getFullYear()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* iOS Date Pickers inline */}
                  {showDatePickerInicio && Platform.OS === 'ios' && (
                    <View style={styles.datePickerInline}>
                      <DateTimePicker
                        value={fechaInicio}
                        mode="date"
                        display="compact"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setFechaInicio(selectedDate);
                            if (fechaFin < selectedDate) {
                              setFechaFin(new Date(selectedDate.getTime() + 86400000));
                            }
                          }
                          setShowDatePickerInicio(false);
                        }}
                        style={{ alignSelf: 'center' }}
                      />
                    </View>
                  )}

                  {showDatePickerFin && Platform.OS === 'ios' && (
                    <View style={styles.datePickerInline}>
                      <DateTimePicker
                        value={fechaFin}
                        mode="date"
                        display="compact"
                        minimumDate={fechaInicio}
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setFechaFin(selectedDate);
                          }
                          setShowDatePickerFin(false);
                        }}
                        style={{ alignSelf: 'center' }}
                      />
                    </View>
                  )}

                  {/* DatePickers para Android */}
                  {Platform.OS === 'android' && showDatePickerInicio && (
                    <DateTimePicker
                      value={fechaInicio}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePickerInicio(false);
                        if (selectedDate) {
                          setFechaInicio(selectedDate);
                          if (fechaFin < selectedDate) {
                            setFechaFin(new Date(selectedDate.getTime() + 86400000));
                          }
                        }
                      }}
                    />
                  )}

                  {Platform.OS === 'android' && showDatePickerFin && (
                    <DateTimePicker
                      value={fechaFin}
                      mode="date"
                      display="default"
                      minimumDate={fechaInicio}
                      onChange={(event, selectedDate) => {
                        setShowDatePickerFin(false);
                        if (selectedDate) {
                          setFechaFin(selectedDate);
                        }
                      }}
                    />
                  )}

                  {/* Resumen de días */}
                  <View style={styles.durationSummary}>
                    <Ionicons name="time" size={16} color="#8b5cf6" />
                    <Text style={styles.durationText}>
                      Duración: <Text style={styles.durationValue}>
                        {calcularDiasDiferencia(fechaInicio, fechaFin)} {calcularDiasDiferencia(fechaInicio, fechaFin) === 1 ? 'día' : 'días'}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Motivo */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionLabel}>Motivo de la Incidencia *</Text>
                  <View style={styles.motivoCard}>
                    <View style={styles.motivoHeader}>
                      <Ionicons name="document-text" size={20} color="#6b7280" />
                      <Text style={styles.motivoPlaceholder}>
                        {motivo.length > 0 ? `${motivo.length} caracteres` : 'Describe el motivo'}
                      </Text>
                    </View>
                    <TextInput
                      style={styles.motivoInput}
                      placeholder="Escribe aquí el motivo detallado de tu incidencia..."
                      placeholderTextColor="#9ca3af"
                      value={motivo}
                      onChangeText={setMotivo}
                      multiline={true}
                      textAlignVertical="top"
                      scrollEnabled={true}
                      returnKeyType="default"
                      blurOnSubmit={false}
                      autoCorrect={true}
                      spellCheck={true}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButtonModal}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonModalText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.createButton,
                    (!tipoSeleccionado || !motivo.trim()) && styles.createButtonDisabled
                  ]}
                  onPress={handleCrearIncidencia}
                  disabled={creando || !tipoSeleccionado || !motivo.trim()}
                  activeOpacity={0.7}
                >
                  {creando ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Crear Incidencia</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const incidenciasStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewButtonActive: {
    backgroundColor: '#eff6ff',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  viewButtonTextActive: {
    color: '#2563eb',
  },
  // NUEVO: Filtros
  filtrosContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filtroChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  filtroChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  filtroChipBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filtroChipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  calendarSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonText: {
    color: '#2563eb',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  calendar: {},
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
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
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayContentSelected: {
    backgroundColor: '#2563eb',
  },
  dayContentToday: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  dayText: {
    fontSize: 13,
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
  // MODIFICADO: Un solo indicador
  dayIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    justifyContent: 'center',
  },
  dayIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3b82f6',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  incidenciasList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  incidenciaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  tipoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipoIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipoInfo: {
    flex: 1,
  },
  tipoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  fechaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  estadoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  motivoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  diasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  diasText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2937',
    flex: 2,
    textAlign: 'right',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlayBottomSheet: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  modalSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalListItemActive: {
    backgroundColor: '#eff6ff',
  },
  modalListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalListItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  modalListItemTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  modalListItemBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  modalListItemBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  // MODIFICADO: Modal de crear 75% altura
  modalOverlayCreate: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropCreate: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCreateContainer: {
    height: '75%',
  },
  modalCreateContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectInputText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  selectInputPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateCompactActive: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  dateCompactInfo: {
    flex: 1,
  },
  dateCompactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  dateCompactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  dateArrow: {
    paddingHorizontal: 2,
  },
  datePickerInline: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  durationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  durationText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  motivoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  motivoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  motivoPlaceholder: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  motivoInput: {
    padding: 16,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 140,
    maxHeight: 200,
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cancelButtonModal: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonModalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

const incidenciasStylesDark = StyleSheet.create({
  ...incidenciasStyles,
  container: {
    ...incidenciasStyles.container,
    backgroundColor: '#0f172a',
  },
  header: {
    ...incidenciasStyles.header,
    backgroundColor: '#1e40af',
  },
  viewToggle: {
    ...incidenciasStyles.viewToggle,
    backgroundColor: '#1e293b',
  },
  viewButtonActive: {
    ...incidenciasStyles.viewButtonActive,
    backgroundColor: '#334155',
  },
  filtroChip: {
    ...incidenciasStyles.filtroChip,
    backgroundColor: '#1e293b',
  },
  filtroChipText: {
    ...incidenciasStyles.filtroChipText,
    color: '#f1f5f9',
  },
  filtroChipBadge: {
    ...incidenciasStyles.filtroChipBadge,
    backgroundColor: '#334155',
  },
  calendarSection: {
    ...incidenciasStyles.calendarSection,
    backgroundColor: '#1e293b',
  },
  monthButtonText: {
    ...incidenciasStyles.monthButtonText,
    color: '#60a5fa',
  },
  monthText: {
    ...incidenciasStyles.monthText,
    color: '#f1f5f9',
  },
  weekDayText: {
    ...incidenciasStyles.weekDayText,
    color: '#94a3b8',
  },
  dayText: {
    ...incidenciasStyles.dayText,
    color: '#e2e8f0',
  },
  dayTextToday: {
    ...incidenciasStyles.dayTextToday,
    color: '#60a5fa',
  },
  sectionTitle: {
    ...incidenciasStyles.sectionTitle,
    color: '#f1f5f9',
  },
  incidenciaCard: {
    ...incidenciasStyles.incidenciaCard,
    backgroundColor: '#1e293b',
  },
  tipoText: {
    ...incidenciasStyles.tipoText,
    color: '#f1f5f9',
  },
  motivoText: {
    ...incidenciasStyles.motivoText,
    color: '#cbd5e1',
  },
  diasBadge: {
    ...incidenciasStyles.diasBadge,
    backgroundColor: '#334155',
  },
  divider: {
    ...incidenciasStyles.divider,
    backgroundColor: '#334155',
  },
  detailValue: {
    ...incidenciasStyles.detailValue,
    color: '#e2e8f0',
  },
  cancelButton: {
    ...incidenciasStyles.cancelButton,
    backgroundColor: '#4c1d1d',
  },
  emptyTitle: {
    ...incidenciasStyles.emptyTitle,
    color: '#f1f5f9',
  },
  modalSheetContent: {
    ...incidenciasStyles.modalSheetContent,
    backgroundColor: '#1e293b',
  },
  modalSheetHandle: {
    ...incidenciasStyles.modalSheetHandle,
    backgroundColor: '#475569',
  },
  modalListHeader: {
    ...incidenciasStyles.modalListHeader,
    borderBottomColor: '#334155',
  },
  modalListTitle: {
    ...incidenciasStyles.modalListTitle,
    color: '#f1f5f9',
  },
  modalListItem: {
    ...incidenciasStyles.modalListItem,
    borderBottomColor: '#334155',
  },
  modalListItemActive: {
    ...incidenciasStyles.modalListItemActive,
    backgroundColor: '#334155',
  },
  modalListItemText: {
    ...incidenciasStyles.modalListItemText,
    color: '#f1f5f9',
  },
  modalListItemBadge: {
    ...incidenciasStyles.modalListItemBadge,
    backgroundColor: '#475569',
  },
  modalListItemBadgeText: {
    ...incidenciasStyles.modalListItemBadgeText,
    color: '#e2e8f0',
  },
  modalCreateContent: {
    ...incidenciasStyles.modalCreateContent,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    ...incidenciasStyles.modalHeader,
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  modalTitle: {
    ...incidenciasStyles.modalTitle,
    color: '#f1f5f9',
  },
  closeButton: {
    ...incidenciasStyles.closeButton,
    backgroundColor: '#334155',
  },
  modalBody: {
    ...incidenciasStyles.modalBody,
    backgroundColor: '#0f172a',
  },
  sectionLabel: {
    ...incidenciasStyles.sectionLabel,
    color: '#f1f5f9',
  },
  selectInput: {
    ...incidenciasStyles.selectInput,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  selectInputText: {
    ...incidenciasStyles.selectInputText,
    color: '#f1f5f9',
  },
  dateCompact: {
    ...incidenciasStyles.dateCompact,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  dateCompactActive: {
    ...incidenciasStyles.dateCompactActive,
    borderColor: '#3b82f6',
  },
  dateCompactLabel: {
    ...incidenciasStyles.dateCompactLabel,
    color: '#94a3b8',
  },
  dateCompactValue: {
    ...incidenciasStyles.dateCompactValue,
    color: '#f1f5f9',
  },
  datePickerInline: {
    ...incidenciasStyles.datePickerInline,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  durationSummary: {
    ...incidenciasStyles.durationSummary,
    backgroundColor: '#1e3a5f',
  },
  durationText: {
    ...incidenciasStyles.durationText,
    color: '#cbd5e1',
  },
  durationValue: {
    ...incidenciasStyles.durationValue,
    color: '#a78bfa',
  },
  motivoCard: {
    ...incidenciasStyles.motivoCard,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  motivoHeader: {
    ...incidenciasStyles.motivoHeader,
    backgroundColor: '#0f172a',
    borderBottomColor: '#334155',
  },
  motivoPlaceholder: {
    ...incidenciasStyles.motivoPlaceholder,
    color: '#94a3b8',
  },
  motivoInput: {
    ...incidenciasStyles.motivoInput,
    color: '#f1f5f9',
  },
  modalFooter: {
    ...incidenciasStyles.modalFooter,
    borderTopColor: '#334155',
    backgroundColor: '#1e293b',
  },
  cancelButtonModal: {
    ...incidenciasStyles.cancelButtonModal,
    backgroundColor: '#334155',
  },
});

export default IncidenciasScreen;