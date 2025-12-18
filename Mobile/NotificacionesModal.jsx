import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Datos simulados
const eventosSimulados = [
  {
    id: 1,
    titulo: "Nueva entrada registrada en Acceso Principal",
    descripcion: "Se ha registrado una nueva entrada al sistema. El usuario accedió por la puerta principal a las 08:45 AM.",
    estado: "Entrada",
    tipo_evento: "notificacion",
    created_at: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 2,
    titulo: "Mantenimiento programado del sistema",
    descripcion: "El sistema estará en mantenimiento el próximo domingo de 2:00 AM a 6:00 AM. Durante este tiempo, algunos servicios podrían no estar disponibles.",
    estado: "Ambos",
    tipo_evento: "anuncio",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  },
  {
    id: 3,
    titulo: "¡Atención! Intento de acceso no autorizado",
    descripcion: "Se detectó un intento de acceso no autorizado en la puerta trasera. El sistema de seguridad se activó automáticamente y se notificó al personal de seguridad.",
    estado: "Entrada",
    tipo_evento: "alerta",
    created_at: new Date(Date.now() - 6 * 3600000).toISOString()
  },
  {
    id: 4,
    titulo: "Recordatorio: Revisión de accesos pendiente",
    descripcion: "Tienes pendiente revisar los logs de acceso de la semana pasada. Por favor, completa esta tarea antes del viernes.",
    estado: "Ambos",
    tipo_evento: "recordatorio",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString()
  },
  {
    id: 5,
    titulo: "Salida registrada - Zona de estacionamiento",
    descripcion: "Usuario salió del estacionamiento vehicular. Duración total de estadía: 8 horas 15 minutos.",
    estado: "Salida",
    tipo_evento: "notificacion",
    created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString()
  },
  {
    id: 6,
    titulo: "Actualización de políticas de seguridad",
    descripcion: "Se han actualizado las políticas de seguridad del edificio. Todos los empleados deben revisar y aceptar los nuevos términos en el portal.",
    estado: "Ambos",
    tipo_evento: "anuncio",
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString()
  },
  {
    id: 7,
    titulo: "Temperatura elevada detectada en Servidor Principal",
    descripcion: "Los sensores detectaron una temperatura de 45°C en la sala de servidores. Se activó el sistema de enfriamiento de emergencia.",
    estado: "Ambos",
    tipo_evento: "alerta",
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString()
  }
];

const estadisticasSimuladas = {
  total: 7,
  notificaciones: 2,
  anuncios: 2,
  alertas: 2,
  recordatorios: 1
};

export const NotificacionesModal = ({ visible = true, onClose = () => {} }) => {
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [eventoExpandido, setEventoExpandido] = useState(null);
  const [slideAnim] = useState(new Animated.Value(300));

  React.useEffect(() => {
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

  const eventos = filtroActivo === 'todos' 
    ? eventosSimulados 
    : eventosSimulados.filter(e => e.tipo_evento === filtroActivo);

  const getEventoInfo = (tipoEvento) => {
    const configs = {
      notificacion: {
        icono: 'notifications',
        color: '#3b82f6',
        bg: '#dbeafe',
        label: 'Notificación',
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

  const getEstadoIcon = (estado) => {
    if (estado === 'Entrada') return 'log-in-outline';
    if (estado === 'Salida') return 'log-out-outline';
    return 'swap-horizontal-outline';
  };

  const renderEvento = (evento) => {
    const info = getEventoInfo(evento.tipo_evento);
    const isExpandido = eventoExpandido === evento.id;

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
                  {formatearFecha(evento.created_at)}
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

            {/* Descripción */}
            {evento.descripcion && (
              <View style={styles.descripcionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={18} color={info.color} />
                  <Text style={styles.sectionTitle}>Descripción</Text>
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
                    {formatearFechaCompleta(evento.created_at)}
                  </Text>
                </View>
              </View>

              {/* Estado */}
              {evento.estado && (
                <View style={styles.detailRow}>
                  <Ionicons name={getEstadoIcon(evento.estado)} size={16} color="#6b7280" />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Estado</Text>
                    <Text style={styles.detailValue}>{evento.estado}</Text>
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
                    {estadisticasSimuladas.total} {estadisticasSimuladas.total === 1 ? 'evento' : 'eventos'}
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
                { key: 'todos', label: 'Todos', emoji: '', count: estadisticasSimuladas.total },
                { key: 'notificacion', label: 'Notificaciones', emoji: '🔔', count: estadisticasSimuladas.notificaciones },
                { key: 'anuncio', label: 'Anuncios', emoji: '📢', count: estadisticasSimuladas.anuncios },
                { key: 'alerta', label: 'Alertas', emoji: '⚠️', count: estadisticasSimuladas.alertas },
                { key: 'recordatorio', label: 'Recordatorios', emoji: '⏰', count: estadisticasSimuladas.recordatorios }
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
                    {filtro.emoji} {filtro.label}
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
          >
            {eventos.length === 0 ? (
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
            ) : (
              <>
                <Text style={styles.eventosHint}>
                  👆 Toca cualquier evento para ver más detalles
                </Text>
                {eventos.map(evento => renderEvento(evento))}
              </>
            )}
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