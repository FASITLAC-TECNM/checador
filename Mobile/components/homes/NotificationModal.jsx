import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getNotificaciones } from '../../services/notificacionesService';

const { width } = Dimensions.get('window');

export const NotificacionesModal = ({
  visible = false,
  onClose = () => {},
  userData = null,
  token = null
}) => {
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [eventoExpandido, setEventoExpandido] = useState(null);
  const [slideAnim] = useState(new Animated.Value(300));

  // Estados para la API
  const [eventos, setEventos] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    notificaciones: 0,
    anuncios: 0,
    alertas: 0,
    recordatorios: 0
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Cargar notificaciones desde la API
  const cargarNotificaciones = useCallback(async (isRefresh = false) => {
    if (!token) {
      setError('No hay token de autenticación');
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Obtener notificaciones - filtramos por empleado_id si existe (notificaciones exclusivas)
      // o todas las generales disponibles
      const filtros = {
        limit: 50
      };

      // Si el usuario tiene empleado_id, obtener sus notificaciones específicas
      if (userData?.empleado_id) {
        filtros.empleado_id = userData.empleado_id;
      }

      const response = await getNotificaciones(token, filtros);

      if (response.success && response.data) {
        const notificacionesData = response.data;
        setEventos(notificacionesData);

        // Calcular estadísticas
        const stats = {
          total: notificacionesData.length,
          notificaciones: notificacionesData.filter(e => e.tipo_evento === 'notificacion').length,
          anuncios: notificacionesData.filter(e => e.tipo_evento === 'anuncio').length,
          alertas: notificacionesData.filter(e => e.tipo_evento === 'alerta').length,
          recordatorios: notificacionesData.filter(e => e.tipo_evento === 'recordatorio').length
        };
        setEstadisticas(stats);
      } else {
        setEventos([]);
        setEstadisticas({
          total: 0,
          notificaciones: 0,
          anuncios: 0,
          alertas: 0,
          recordatorios: 0
        });
      }
    } catch (err) {
      setError('No se pudieron cargar las notificaciones');
      setEventos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, userData?.empleado_id]);

  // Cargar datos cuando el modal se abre
  useEffect(() => {
    if (visible && token) {
      cargarNotificaciones();
    }
  }, [visible, token, cargarNotificaciones]);

  // Animación del modal
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  // Filtrar eventos según el filtro activo
  const eventosFiltrados = filtroActivo === 'todos'
    ? eventos
    : eventos.filter(e => e.tipo_evento === filtroActivo);

  const getEventoInfo = (tipoEvento) => {
    const configs = {
      notificacion: {
        icono: 'notifications',
        color: '#3b82f6',
        bg: '#dbeafe',
        label: 'Notificacion',
        gradient: ['#3b82f6', '#2563eb']
      },
      anuncio: {
        icono: 'megaphone',
        color: '#8b5cf6',
        bg: '#ede9fe',
        label: 'Anuncio',
        gradient: ['#8b5cf6', '#7c3aed']
      },
      alerta: {
        icono: 'warning',
        color: '#ef4444',
        bg: '#fee2e2',
        label: 'Alerta',
        gradient: ['#ef4444', '#dc2626']
      },
      recordatorio: {
        icono: 'time',
        color: '#f59e0b',
        bg: '#fef3c7',
        label: 'Recordatorio',
        gradient: ['#f59e0b', '#d97706']
      }
    };
    return configs[tipoEvento] || configs.notificacion;
  };

  const getPrioridadInfo = (prioridad) => {
    const configs = {
      alta: { color: '#ef4444', label: 'Alta' },
      media: { color: '#f59e0b', label: 'Media' },
      baja: { color: '#10b981', label: 'Baja' }
    };
    return configs[prioridad] || configs.media;
  };

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora - date;

    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos}m`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;

    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatearFechaCompleta = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEvento = (evento) => {
    const info = getEventoInfo(evento.tipo_evento);
    const prioridadInfo = getPrioridadInfo(evento.prioridad);
    const isExpandido = eventoExpandido === evento.id;
    const fechaCampo = evento.fecha_registro || evento.created_at;

    return (
      <TouchableOpacity
        key={evento.id}
        style={[
          styles.eventoCard,
          isExpandido && styles.eventoCardExpandido
        ]}
        activeOpacity={0.7}
        onPress={() => setEventoExpandido(isExpandido ? null : evento.id)}
      >
        {/* Contenido principal */}
        <View style={styles.eventoMainContent}>
          <LinearGradient
            colors={info.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.eventoIconGradient}
          >
            <Ionicons name={info.icono} size={24} color="#fff" />
          </LinearGradient>

          <View style={styles.eventoTextContainer}>
            <View style={styles.eventoHeader}>
              <Text
                style={styles.eventoTitulo}
                numberOfLines={isExpandido ? undefined : 2}
              >
                {evento.titulo}
              </Text>
              <View style={[styles.eventoBadge, { backgroundColor: info.bg }]}>
                <Text style={[styles.eventoBadgeText, { color: info.color }]}>
                  {info.label}
                </Text>
              </View>
            </View>

            <View style={styles.eventoFooter}>
              <View style={styles.eventoFechaContainer}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.eventoFecha}>
                  {formatearFecha(fechaCampo)}
                </Text>
              </View>

              <Ionicons
                name={isExpandido ? "chevron-up" : "chevron-down"}
                size={20}
                color="#9ca3af"
              />
            </View>
          </View>
        </View>

        {/* Contenido expandido */}
        {isExpandido && (
          <View style={styles.eventoExpandedContent}>
            <View style={styles.eventoDivider} />

            {/* Descripcion */}
            {evento.descripcion && (
              <View style={styles.descripcionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={18} color={info.color} />
                  <Text style={styles.sectionTitle}>Descripcion</Text>
                </View>
                <Text style={styles.descripcionText}>
                  {evento.descripcion}
                </Text>
              </View>
            )}

            {/* Detalles */}
            <View style={styles.detallesContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle-outline" size={18} color={info.color} />
                <Text style={styles.sectionTitle}>Detalles</Text>
              </View>

              {/* Fecha completa */}
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Fecha y hora</Text>
                  <Text style={styles.detailValue}>
                    {formatearFechaCompleta(fechaCampo)}
                  </Text>
                </View>
              </View>

              {/* Prioridad */}
              {evento.prioridad && (
                <View style={styles.detailRow}>
                  <Ionicons name="flag-outline" size={16} color={prioridadInfo.color} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Prioridad</Text>
                    <Text style={[styles.detailValue, { color: prioridadInfo.color }]}>
                      {prioridadInfo.label}
                    </Text>
                  </View>
                </View>
              )}

              {/* Empleado relacionado */}
              {evento.empleado_nombre && (
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Relacionado con</Text>
                    <Text style={styles.detailValue}>{evento.empleado_nombre}</Text>
                  </View>
                </View>
              )}

              {/* Tipo */}
              <View style={styles.detailRow}>
                <Ionicons name="pricetag-outline" size={16} color="#6b7280" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Tipo</Text>
                  <Text style={styles.detailValue}>{info.label}</Text>
                </View>
              </View>

              {/* ID */}
              <View style={styles.detailRow}>
                <Ionicons name="key-outline" size={16} color="#6b7280" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>ID del evento</Text>
                  <Text style={styles.detailValue}>#{evento.id}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Cargando notificaciones...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Error de conexion</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => cargarNotificaciones()}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (eventosFiltrados.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No hay eventos</Text>
          <Text style={styles.emptySubtitle}>
            {filtroActivo === 'todos'
              ? 'No tienes notificaciones en este momento'
              : `No hay ${filtroActivo}s disponibles`}
          </Text>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.eventosHint}>
          Toca cualquier evento para ver mas detalles
        </Text>
        {eventosFiltrados.map(evento => renderEvento(evento))}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header con gradiente */}
          <LinearGradient
            colors={['#2563eb', '#1d4ed8', '#4338ca']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="notifications" size={28} color="#fff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Notificaciones</Text>
                  <Text style={styles.headerSubtitle}>
                    {estadisticas.total} {estadisticas.total === 1 ? 'evento' : 'eventos'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Filtros */}
          <View style={styles.filtrosWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtrosContainer}
            >
              {[
                { key: 'todos', label: 'Todos', count: estadisticas.total },
                { key: 'notificacion', label: 'Notificaciones', count: estadisticas.notificaciones },
                { key: 'anuncio', label: 'Anuncios', count: estadisticas.anuncios },
                { key: 'alerta', label: 'Alertas', count: estadisticas.alertas },
                { key: 'recordatorio', label: 'Recordatorios', count: estadisticas.recordatorios }
              ].map(filtro => (
                <TouchableOpacity
                  key={filtro.key}
                  style={[
                    styles.filtroChip,
                    filtroActivo === filtro.key && styles.filtroChipActive
                  ]}
                  onPress={() => {
                    setFiltroActivo(filtro.key);
                    setEventoExpandido(null);
                  }}
                >
                  <Text style={[
                    styles.filtroChipText,
                    filtroActivo === filtro.key && styles.filtroChipTextActive
                  ]}>
                    {filtro.label}
                  </Text>
                  {filtro.count > 0 && (
                    <View style={[
                      styles.filtroBadge,
                      filtroActivo === filtro.key && styles.filtroBadgeActive
                    ]}>
                      <Text style={[
                        styles.filtroBadgeText,
                        filtroActivo === filtro.key && styles.filtroBadgeTextActive
                      ]}>
                        {filtro.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Lista de eventos */}
          <ScrollView
            style={styles.eventosScrollView}
            contentContainerStyle={styles.eventosContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => cargarNotificaciones(true)}
                colors={['#2563eb']}
                tintColor="#2563eb"
              />
            }
          >
            {renderContent()}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtrosWrapper: {
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtrosContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
    marginRight: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtroChipActive: {
    backgroundColor: '#2563eb',
    elevation: 4,
    shadowOpacity: 0.25,
  },
  filtroChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filtroChipTextActive: {
    color: '#fff',
  },
  filtroBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  filtroBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filtroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  filtroBadgeTextActive: {
    color: '#fff',
  },
  eventosScrollView: {
    flex: 1,
  },
  eventosContent: {
    padding: 20,
    paddingBottom: 40,
  },
  eventosHint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  eventoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#f3f4f6',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  eventoCardExpandido: {
    borderColor: '#2563eb',
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  eventoMainContent: {
    flexDirection: 'row',
    gap: 14,
  },
  eventoIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  eventoTextContainer: {
    flex: 1,
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  eventoTitulo: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
  },
  eventoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventoFechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eventoFecha: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  eventoExpandedContent: {
    marginTop: 16,
  },
  eventoDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  descripcionContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  detallesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  descripcionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // Estados de carga y error
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificacionesModal;
