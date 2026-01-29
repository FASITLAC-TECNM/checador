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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Form state
  const [tipoSeleccionado, setTipoSeleccionado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const styles = darkMode ? incidenciasStylesDark : incidenciasStyles;

  const tiposIncidencia = [
    { value: 'retardo', label: 'Retardo', icon: 'time', color: '#f59e0b' },
    { value: 'justificante', label: 'Justificante', icon: 'document-text', color: '#3b82f6' },
    { value: 'permiso', label: 'Permiso', icon: 'calendar', color: '#8b5cf6' },
    { value: 'vacaciones', label: 'Vacaciones', icon: 'airplane', color: '#10b981' },
    { value: 'festivo', label: 'Festivo', icon: 'gift', color: '#ec4899' },
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
      setIncidencias(response.data || []);
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

    try {
      setCreando(true);

      const incidenciaData = {
        empleado_id: userData.empleado_id,
        tipo: tipoSeleccionado,
        motivo: motivo.trim(),
        fecha_inicio: fechaInicio || new Date().toISOString(),
        fecha_fin: fechaFin || null
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
      setFechaInicio('');
      setFechaFin('');
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

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return '#f59e0b';
      case 'aprobado':
        return '#10b981';
      case 'rechazado':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return 'time';
      case 'aprobado':
        return 'checkmark-circle';
      case 'rechazado':
        return 'close-circle';
      default:
        return 'help-circle';
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderIncidenciaCard = (incidencia) => (
    <View key={incidencia.id} style={styles.incidenciaCard}>
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
          <Text style={[
            styles.estadoText,
            { color: getEstadoColor(incidencia.estado) }
          ]}>
            {incidencia.estado}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.motivoContainer}>
          <Text style={styles.motivoLabel}>Motivo:</Text>
          <Text style={styles.motivoText}>{incidencia.motivo}</Text>
        </View>

        {incidencia.fecha_fin && (
          <View style={styles.rangoFechas}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.rangoFechasText}>
              Hasta: {formatearFecha(incidencia.fecha_fin)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderModalCrear = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva Incidencia</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Tipo de Incidencia</Text>
            <View style={styles.tiposGrid}>
              {tiposIncidencia.map((tipo) => (
                <TouchableOpacity
                  key={tipo.value}
                  style={[
                    styles.tipoButton,
                    tipoSeleccionado === tipo.value && styles.tipoButtonSelected,
                    { borderColor: tipo.color }
                  ]}
                  onPress={() => setTipoSeleccionado(tipo.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tipo.icon}
                    size={24}
                    color={tipoSeleccionado === tipo.value ? tipo.color : '#6b7280'}
                  />
                  <Text style={[
                    styles.tipoButtonText,
                    tipoSeleccionado === tipo.value && { color: tipo.color }
                  ]}>
                    {tipo.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Motivo</Text>
            <TextInput
              style={[styles.input, styles.inputLarge]}
              placeholder="Describe el motivo de la incidencia"
              placeholderTextColor="#9ca3af"
              value={motivo}
              onChangeText={setMotivo}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            <Text style={styles.infoText}>
              <Ionicons name="information-circle" size={14} color="#3b82f6" />
              {' '}Tu incidencia será enviada para aprobación
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
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
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header mientras carga - Sin gradiente */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Incidencias</Text>
              <Text style={styles.headerSubtitle}>Cargando...</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando incidencias...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header estandarizado - Sin gradiente */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Incidencias</Text>
            <Text style={styles.headerSubtitle}>
              {incidencias.length} {incidencias.length === 1 ? 'registro' : 'registros'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="time" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>
              {incidencias.filter(i => i.estado === 'pendiente').length}
            </Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
            <Text style={styles.statValue}>
              {incidencias.filter(i => i.estado === 'aprobado').length}
            </Text>
            <Text style={styles.statLabel}>Aprobadas</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </View>
            <Text style={styles.statValue}>
              {incidencias.filter(i => i.estado === 'rechazado').length}
            </Text>
            <Text style={styles.statLabel}>Rechazadas</Text>
          </View>
        </View>

        {/* Lista de incidencias */}
        {incidencias.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No hay incidencias</Text>
            <Text style={styles.emptyText}>
              Toca el botón + para crear tu primera incidencia
            </Text>
          </View>
        ) : (
          <View style={styles.incidenciasList}>
            {incidencias.map(renderIncidenciaCard)}
          </View>
        )}
      </ScrollView>

      {renderModalCrear()}
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
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    marginTop: 2,
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  incidenciasList: {
    gap: 12,
  },
  incidenciaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipoInfo: {
    flex: 1,
  },
  tipoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  fechaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    gap: 8,
  },
  motivoContainer: {
    gap: 4,
  },
  motivoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  motivoText: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  rangoFechas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  rangoFechasText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 16,
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tipoButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tipoButtonSelected: {
    backgroundColor: '#fff',
  },
  tipoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputLarge: {
    minHeight: 160,
    paddingTop: 14,
  },
  infoText: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 16,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
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
  statCard: {
    ...incidenciasStyles.statCard,
    backgroundColor: '#1e293b',
  },
  statValue: {
    ...incidenciasStyles.statValue,
    color: '#f9fafb',
  },
  incidenciaCard: {
    ...incidenciasStyles.incidenciaCard,
    backgroundColor: '#1e293b',
  },
  tipoText: {
    ...incidenciasStyles.tipoText,
    color: '#f9fafb',
  },
  motivoText: {
    ...incidenciasStyles.motivoText,
    color: '#e5e7eb',
  },
  emptyTitle: {
    ...incidenciasStyles.emptyTitle,
    color: '#f9fafb',
  },
  modalContent: {
    ...incidenciasStyles.modalContent,
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    ...incidenciasStyles.modalHeader,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    ...incidenciasStyles.modalTitle,
    color: '#f9fafb',
  },
  closeButton: {
    ...incidenciasStyles.closeButton,
    backgroundColor: '#334155',
  },
  label: {
    ...incidenciasStyles.label,
    color: '#f9fafb',
  },
  tipoButton: {
    ...incidenciasStyles.tipoButton,
    backgroundColor: '#334155',
  },
  tipoButtonSelected: {
    ...incidenciasStyles.tipoButtonSelected,
    backgroundColor: '#475569',
  },
  input: {
    ...incidenciasStyles.input,
    backgroundColor: '#334155',
    borderColor: '#475569',
    color: '#f9fafb',
  },
  modalFooter: {
    ...incidenciasStyles.modalFooter,
    borderTopColor: '#334155',
  },
  cancelButton: {
    ...incidenciasStyles.cancelButton,
    backgroundColor: '#334155',
  },
});

export default IncidenciasScreen;