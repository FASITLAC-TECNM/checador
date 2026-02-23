import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar servicios de consulta
import { checkBiometricSupport } from '../../services/biometricservice';
import { getCredencialesByEmpleado } from '../../services/credencialesService';

// Offline Services
import sqliteManager from '../../services/offline/sqliteManager.mjs';
import syncManager from '../../services/offline/syncManager.mjs';

// ─── Constantes de estado ────────────────────────────────────────────────────
const ESTADOS = {
  activo: {
    bg: '#16a34a',
    texto: '#fff',
    icono: '#fff',
    etiqueta: 'Habilitada',
    iconoEstado: 'checkmark-circle',
  },
  inactivo: {
    bg: '#6b7280',
    texto: '#fff',
    icono: '#fff',
    etiqueta: 'Sin registrar',
    iconoEstado: 'ellipse-outline',
  },
  noDisponible: {
    bg: '#dc2626',
    texto: '#fff',
    icono: '#fff',
    etiqueta: 'No disponible',
    iconoEstado: 'ban',
  },
};

export const SecurityScreen = ({ darkMode, onBack, userData }) => {
  // ─── Estado de credenciales ───────────────────────────────────────────
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [hasFacial, setHasFacial] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  // ─── Carga inicial ────────────────────────────────────────────────────
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // ─── Soporte de hardware ──────────────────────────────────────────────
  const [biometricSupport, setBiometricSupport] = useState(null);

  // ─── Modo offline ─────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(false);

  const styles = darkMode ? securityStylesDark : securityStyles;

  useEffect(() => {
    initializeSecurity();
  }, []);

  // ─── Inicialización: solo carga y muestra credenciales ──────────────────
  const initializeSecurity = async () => {
    try {
      const support = await checkBiometricSupport();
      setBiometricSupport(support);

      const empleadoId =
        userData?.empleado?.id || userData?.empleado_id || userData?.id;

      if (!empleadoId) {
        setIsLoadingCredentials(false);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');

      // Verificar conectividad real
      let onlineNow = false;
      try {
        onlineNow = await syncManager.isOnline();
      } catch (netErr) {
        console.log('[Security] No se pudo verificar red:', netErr.message);
      }

      let cargoOnline = false;

      // Intentar cargar desde el servidor si hay red y token
      if (onlineNow && token) {
        try {
          const credenciales = await getCredencialesByEmpleado(empleadoId, token);
          if (credenciales.success && credenciales.data) {
            setHasFingerprint(credenciales.data.tiene_dactilar || false);
            setHasFacial(credenciales.data.tiene_facial || false);
            setHasPin(credenciales.data.tiene_pin || false);
            cargoOnline = true;
          }
        } catch (e) {
          console.log('[Security] Error cargando credenciales online:', e.message);
        }
      }

      // Fallback: cargar desde SQLite
      if (!cargoOnline) {
        try {
          const creds = await sqliteManager.getAllCredenciales();
          const misCreds = creds.filter(c => c.empleado_id === empleadoId);

          setHasFingerprint(misCreds.some(c => c.dactilar_template));
          setHasFacial(misCreds.some(c => c.facial_descriptor));
          setHasPin(misCreds.some(c => c.pin_hash));

          if (!onlineNow) setIsOffline(true);
        } catch (dbErr) {
          console.log('[Security] Error cargando credenciales offline:', dbErr.message);
          if (!onlineNow) setIsOffline(true);
        }
      }
    } catch (error) {
      console.error('[Security] Error en initializeSecurity:', error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  // ─── Determinar estado visual de cada credencial ─────────────────────────
  const getEstado = (tipo) => {
    switch (tipo) {
      case 'dactilar':
        if (hasFingerprint) return 'activo';
        if (!biometricSupport?.hasFingerprint) return 'noDisponible';
        return 'inactivo';
      case 'facial':
        return hasFacial ? 'activo' : 'inactivo';
      case 'pin':
        return hasPin ? 'activo' : 'inactivo';
      default:
        return 'inactivo';
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoadingCredentials) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Seguridad</Text>
              <Text style={styles.headerSubtitle}>Cargando...</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            Cargando configuración de seguridad...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Datos de los métodos ──────────────────────────────────────────────
  const metodos = [
    {
      id: 'dactilar',
      nombre: 'Huella Digital',
      icono: 'finger-print',
      estado: getEstado('dactilar'),
    },
    {
      id: 'facial',
      nombre: 'Facial',
      icono: 'scan',
      estado: getEstado('facial'),
    },
    {
      id: 'pin',
      nombre: 'PIN',
      icono: 'keypad',
      estado: getEstado('pin'),
    },
  ];

  // ─── RENDER PRINCIPAL ───────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Seguridad</Text>
            <Text style={styles.headerSubtitle}>
              {isOffline ? 'Sin conexión' : 'Estado de credenciales'}
            </Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons
            name={isOffline ? 'cloud-offline' : 'shield-checkmark'}
            size={32}
            color={isOffline ? '#f59e0b' : (darkMode ? '#93c5fd' : '#2563eb')}
          />
          <Text style={styles.infoTitle}>
            {isOffline ? 'Modo sin conexión' : 'Mis credenciales'}
          </Text>
          <Text style={styles.infoText}>
            {isOffline
              ? 'Mostrando estado local. Conéctate al servidor para ver información actualizada.'
              : 'Aquí puedes ver qué métodos de autenticación tienes registrados en el sistema.'
            }
          </Text>
        </View>

        {/* Tarjetas de estado */}
        <View style={styles.metodosContainer}>
          {metodos.map((metodo) => {
            const cfg = ESTADOS[metodo.estado];

            return (
              <View
                key={metodo.id}
                style={[styles.tarjetaMetodo, { backgroundColor: cfg.bg }]}
              >
                {/* Icono del método */}
                <View style={styles.botonIconContainer}>
                  <Ionicons name={metodo.icono} size={30} color={cfg.icono} />
                </View>

                {/* Nombre y etiqueta */}
                <View style={styles.textoContainer}>
                  <Text style={[styles.botonNombre, { color: cfg.texto }]}>
                    {metodo.nombre}
                  </Text>
                  <Text style={[styles.etiquetaEstado, { color: cfg.texto }]}>
                    {cfg.etiqueta}
                  </Text>
                </View>

                {/* Indicador de estado */}
                <View style={styles.botonIndicador}>
                  <Ionicons
                    name={cfg.iconoEstado}
                    size={28}
                    color={
                      metodo.estado === 'activo'
                        ? '#fff'
                        : 'rgba(255,255,255,0.55)'
                    }
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// ─── ESTILOS LIGHT ──────────────────────────────────────────────────────────
const securityStyles = StyleSheet.create({
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 60,
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 10,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 20,
  },
  metodosContainer: {
    gap: 12,
    marginBottom: 24,
  },
  tarjetaMetodo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  botonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textoContainer: {
    flex: 1,
    gap: 2,
  },
  botonNombre: {
    fontSize: 17,
    fontWeight: '600',
  },
  etiquetaEstado: {
    fontSize: 13,
    opacity: 0.85,
  },
  botonIndicador: {},
  leyendaContainer: {
    gap: 6,
    marginBottom: 24,
    paddingLeft: 2,
  },
  leyendaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leyendaPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  leyendaTexto: {
    fontSize: 12,
    color: '#6b7280',
  },
});

// ─── ESTILOS DARK ───────────────────────────────────────────────────────────
const securityStylesDark = StyleSheet.create({
  ...securityStyles,
  container: {
    ...securityStyles.container,
    backgroundColor: '#0f172a',
  },
  header: {
    ...securityStyles.header,
    backgroundColor: '#1e40af',
  },
  infoCard: {
    ...securityStyles.infoCard,
    backgroundColor: '#1e3a8a',
  },
  infoTitle: {
    ...securityStyles.infoTitle,
    color: '#f9fafb',
  },
  infoText: {
    ...securityStyles.infoText,
    color: '#cbd5e1',
  },
  loadingText: {
    ...securityStyles.loadingText,
    color: '#9ca3af',
  },
  leyendaTexto: {
    ...securityStyles.leyendaTexto,
    color: '#9ca3af',
  },
});