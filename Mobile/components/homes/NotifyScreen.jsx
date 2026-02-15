import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAvisosGlobales, getAvisosDeEmpleado } from '../../services/avisosService';
import sqliteManager from '../../services/offline/sqliteManager';

const PINNED_STORAGE_KEY = '@avisos_pinned';

export const NotifyScreen = ({
  userData = null,
  darkMode = false,
  onGoBack = () => {},
}) => {
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [avisoSeleccionado, setAvisoSeleccionado] = useState(null);

  const [avisosGlobales, setAvisosGlobales] = useState([]);
  const [avisosEmpleado, setAvisosEmpleado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pinnedIds, setPinnedIds] = useState(new Set());

  const token = userData?.token;
  const empleadoId = userData?.empleado_id;
  const esEmpleado = userData?.es_empleado && empleadoId;

  const cargarAvisos = useCallback(async (isRefresh = false) => {
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

      let cargoOnline = false;

      // Intentar online primero
      try {
        const globalRes = await getAvisosGlobales(token, isRefresh);
        if (globalRes.success && globalRes.data) {
          setAvisosGlobales(globalRes.data);
          cargoOnline = true;
          // Cachear en SQLite
          await sqliteManager.upsertAvisosGlobales(globalRes.data).catch(e =>
            console.warn('⚠️ No se pudo cachear avisos globales:', e.message)
          );
        }

        if (esEmpleado) {
          const empRes = await getAvisosDeEmpleado(token, empleadoId);
          if (empRes.success && empRes.data) {
            setAvisosEmpleado(empRes.data);
            // Cachear en SQLite
            await sqliteManager.upsertAvisosEmpleado(empleadoId, empRes.data).catch(e =>
              console.warn('⚠️ No se pudo cachear avisos empleado:', e.message)
            );
          }
        }
      } catch (onlineErr) {
        console.warn('⚠️ No se pudieron cargar avisos online:', onlineErr.message);
      }

      // Fallback: cargar desde SQLite si no cargo online
      if (!cargoOnline) {
        try {
          const globalesLocal = await sqliteManager.getAvisosGlobalesLocal();
          setAvisosGlobales(globalesLocal || []);

          if (esEmpleado) {
            const personalLocal = await sqliteManager.getAvisosEmpleadoLocal(empleadoId);
            setAvisosEmpleado(personalLocal || []);
          }

          if ((globalesLocal && globalesLocal.length > 0)) {
            console.log('📦 [Offline] Avisos cargados desde caché local');
          }
        } catch (localErr) {
          console.warn('⚠️ Error cargando avisos desde SQLite:', localErr.message);
          setError('No se pudieron cargar los avisos');
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, empleadoId, esEmpleado]);

  useEffect(() => {
    cargarAvisos();
  }, [cargarAvisos]);

  useEffect(() => {
    const cargarPins = async () => {
      try {
        const stored = await AsyncStorage.getItem(PINNED_STORAGE_KEY);
        if (stored) {
          setPinnedIds(new Set(JSON.parse(stored)));
        }
      } catch (_) {}
    };
    cargarPins();
  }, []);

  const togglePin = async (avisoKey) => {
    const updated = new Set(pinnedIds);
    if (updated.has(avisoKey)) {
      updated.delete(avisoKey);
    } else {
      updated.add(avisoKey);
    }
    setPinnedIds(updated);
    await AsyncStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...updated]));
  };

  // Combinar avisos según filtro, pinneados primero
  const obtenerAvisosFiltrados = () => {
    let lista;
    if (filtroActivo === 'globales') {
      lista = avisosGlobales.map(a => ({ ...a, _tipo: 'global' }));
    } else if (filtroActivo === 'personales') {
      lista = avisosEmpleado.map(a => ({ ...a, _tipo: 'personal' }));
    } else {
      lista = [
        ...avisosGlobales.map(a => ({ ...a, _tipo: 'global' })),
        ...avisosEmpleado.map(a => ({ ...a, _tipo: 'personal' })),
      ];
    }

    lista.sort((a, b) => {
      const keyA = `${a._tipo || 'global'}-${a.id}`;
      const keyB = `${b._tipo || 'global'}-${b.id}`;
      const pinA = pinnedIds.has(keyA) ? 1 : 0;
      const pinB = pinnedIds.has(keyB) ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return new Date(b.fecha_registro) - new Date(a.fecha_registro);
    });

    return lista;
  };

  const avisosFiltrados = obtenerAvisosFiltrados();

  const estadisticas = {
    total: avisosGlobales.length + avisosEmpleado.length,
    globales: avisosGlobales.length,
    personales: avisosEmpleado.length,
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

  const getAvisoTipoInfo = (aviso) => {
    const esPersonal = aviso._tipo === 'personal';
    if (esPersonal) {
      return {
        icono: 'person-circle',
        color: '#8b5cf6',
        bg: '#ede9fe',
        label: 'Personal',
        iconBg: '#8b5cf6',
      };
    }
    return {
      icono: 'globe',
      color: '#3b82f6',
      bg: '#dbeafe',
      label: 'Global',
      iconBg: '#3b82f6',
    };
  };

  const styles = darkMode ? stylesDark : stylesLight;

  // ─── Vista de detalle ──────────────────────────────────────────────
  if (avisoSeleccionado) {
    const aviso = avisoSeleccionado;
    const info = getAvisoTipoInfo(aviso);
    const avisoKey = `${aviso._tipo || 'global'}-${aviso.id}`;
    const isPinned = pinnedIds.has(avisoKey);

    return (
      <View style={styles.mainContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={darkMode ? "#1e40af" : "#2563eb"}
        />

        {/* Header detalle */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => setAvisoSeleccionado(null)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>Avisos</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => togglePin(avisoKey)}
              style={styles.headerPinButton}
            >
              <Ionicons
                name={isPinned ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isPinned ? "#f59e0b" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.avisosScrollView}
          contentContainerStyle={styles.detalleScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Badge tipo */}
          <View style={[styles.detalleBadge, { backgroundColor: info.bg, alignSelf: 'flex-start' }]}>
            <View style={styles.detalleBadgeInner}>
              <Ionicons name={info.icono} size={14} color={info.color} />
              <Text style={[styles.detalleBadgeText, { color: info.color }]}>
                {info.label}
              </Text>
            </View>
          </View>

          {/* Titulo */}
          <Text style={styles.detalleTitulo}>{aviso.titulo}</Text>

          {/* Fecha */}
          <View style={styles.detalleMeta}>
            <View style={styles.detalleFechaRow}>
              <Ionicons name="calendar-outline" size={15} color="#9ca3af" />
              <Text style={styles.detalleFechaText}>
                {formatearFechaCompleta(aviso.fecha_registro)}
              </Text>
            </View>

            {aviso.fecha_asignacion && (
              <View style={styles.detalleFechaRow}>
                <Ionicons name="person-add-outline" size={15} color="#8b5cf6" />
                <Text style={styles.detalleFechaText}>
                  Asignado: {formatearFechaCompleta(aviso.fecha_asignacion)}
                </Text>
              </View>
            )}
          </View>

          {/* Separador */}
          <View style={styles.detalleDivider} />

          {/* Contenido */}
          {aviso.contenido ? (
            <Text style={styles.detalleContenidoText}>{aviso.contenido}</Text>
          ) : (
            <View style={styles.detalleSinContenido}>
              <Ionicons name="document-text-outline" size={36} color={darkMode ? '#334155' : '#d1d5db'} />
              <Text style={styles.detalleSinContenidoText}>
                Este aviso no tiene contenido adicional
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Vista de lista ────────────────────────────────────────────────
  const renderAviso = (aviso) => {
    const info = getAvisoTipoInfo(aviso);
    const avisoKey = `${aviso._tipo || 'global'}-${aviso.id}`;
    const isPinned = pinnedIds.has(avisoKey);

    return (
      <TouchableOpacity
        key={avisoKey}
        style={styles.avisoCard}
        activeOpacity={0.7}
        onPress={() => setAvisoSeleccionado(aviso)}
      >
        <View style={styles.avisoMainContent}>
          <View style={[styles.avisoIconCircle, { backgroundColor: info.iconBg }]}>
            <Ionicons name={info.icono} size={24} color="#fff" />
          </View>

          <View style={styles.avisoTextContainer}>
            <Text style={styles.avisoTitulo} numberOfLines={2}>
              {aviso.titulo}
            </Text>

            <View style={styles.avisoFooter}>
              <View style={styles.avisoFechaContainer}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.avisoFecha}>
                  {formatearFecha(aviso.fecha_registro)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  togglePin(avisoKey);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isPinned ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={isPinned ? "#f59e0b" : "#9ca3af"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Cargando avisos...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Error de conexión</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => cargarAvisos()}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (avisosFiltrados.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="megaphone-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>Sin avisos</Text>
          <Text style={styles.emptySubtitle}>
            {filtroActivo === 'todos'
              ? 'No hay avisos disponibles en este momento'
              : filtroActivo === 'globales'
                ? 'No hay avisos globales disponibles'
                : 'No tienes avisos personales asignados'}
          </Text>
        </View>
      );
    }

    return avisosFiltrados.map(aviso => renderAviso(aviso));
  };

  const filtros = [
    { key: 'todos', label: 'Todos', count: estadisticas.total },
    { key: 'globales', label: 'Globales', count: estadisticas.globales },
  ];
  if (esEmpleado) {
    filtros.push({ key: 'personales', label: 'Personales', count: estadisticas.personales });
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerIconContainer}>
              <Ionicons name="megaphone" size={26} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Avisos</Text>
              <Text style={styles.headerSubtitle}>
                {estadisticas.total} {estadisticas.total === 1 ? 'aviso' : 'avisos'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtrosWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosContainer}
        >
          {filtros.map(filtro => (
            <TouchableOpacity
              key={filtro.key}
              style={[
                styles.filtroChip,
                filtroActivo === filtro.key && styles.filtroChipActive
              ]}
              onPress={() => setFiltroActivo(filtro.key)}
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

      {/* Lista de avisos */}
      <ScrollView
        style={styles.avisosScrollView}
        contentContainerStyle={styles.avisosContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => cargarAvisos(true)}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

// ─── Estilos Light ──────────────────────────────────────────────────────
const stylesLight = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerPinButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Filtros
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
  // Lista
  avisosScrollView: {
    flex: 1,
  },
  avisosContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Tarjeta de aviso (simplificada)
  avisoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avisoMainContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avisoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avisoTextContainer: {
    flex: 1,
  },
  avisoTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 20,
    marginBottom: 6,
  },
  avisoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avisoFechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avisoFecha: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  // ─── Vista de detalle ────────────────────────────────────────────────
  detalleScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  detalleTipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  detalleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  detalleBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detalleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detalleTitulo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    lineHeight: 32,
    marginBottom: 16,
  },
  detalleMeta: {
    gap: 6,
    marginBottom: 4,
  },
  detalleFechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detalleFechaText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  detalleDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  detalleContenidoText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  detalleSinContenido: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  detalleSinContenidoText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 10,
  },
  // Estados
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

// ─── Estilos Dark ───────────────────────────────────────────────────────
const stylesDark = StyleSheet.create({
  ...stylesLight,
  mainContainer: {
    ...stylesLight.mainContainer,
    backgroundColor: '#0f172a',
  },
  header: {
    ...stylesLight.header,
    backgroundColor: '#1e40af',
  },
  filtrosWrapper: {
    ...stylesLight.filtrosWrapper,
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  filtroChip: {
    ...stylesLight.filtroChip,
    backgroundColor: '#334155',
  },
  filtroChipText: {
    ...stylesLight.filtroChipText,
    color: '#9ca3af',
  },
  filtroBadge: {
    ...stylesLight.filtroBadge,
    backgroundColor: '#475569',
  },
  filtroBadgeText: {
    ...stylesLight.filtroBadgeText,
    color: '#d1d5db',
  },
  avisoCard: {
    ...stylesLight.avisoCard,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  avisoTitulo: {
    ...stylesLight.avisoTitulo,
    color: '#f1f5f9',
  },
  detalleTitulo: {
    ...stylesLight.detalleTitulo,
    color: '#f1f5f9',
  },
  detalleContenidoText: {
    ...stylesLight.detalleContenidoText,
    color: '#cbd5e1',
  },
  detalleDivider: {
    ...stylesLight.detalleDivider,
    backgroundColor: '#334155',
  },
  detalleFechaText: {
    ...stylesLight.detalleFechaText,
    color: '#9ca3af',
  },
  detalleSinContenidoText: {
    ...stylesLight.detalleSinContenidoText,
    color: '#64748b',
  },
  loadingText: {
    ...stylesLight.loadingText,
    color: '#9ca3af',
  },
  errorTitle: {
    ...stylesLight.errorTitle,
    color: '#f1f5f9',
  },
  errorIconContainer: {
    ...stylesLight.errorIconContainer,
    backgroundColor: '#3b1111',
  },
  emptyTitle: {
    ...stylesLight.emptyTitle,
    color: '#f1f5f9',
  },
  emptyIconContainer: {
    ...stylesLight.emptyIconContainer,
    backgroundColor: '#1e293b',
  },
});

export default NotifyScreen;
