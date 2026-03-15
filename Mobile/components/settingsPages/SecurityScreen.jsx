import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';


import { checkBiometricSupport } from '../../services/biometricservice';
import { getCredencialesByEmpleado } from '../../services/credencialesService';


import sqliteManager from '../../services/offline/sqliteManager.mjs';
import syncManager from '../../services/offline/syncManager.mjs';


const ESTADOS = {
  activo: {
    bg: '#16a34a',
    texto: '#fff',
    icono: '#fff',
    etiqueta: 'Habilitada',
    iconoEstado: 'checkmark-circle'
  },
  inactivo: {
    bg: '#6b7280',
    texto: '#fff',
    icono: '#fff',
    etiqueta: 'Sin registrar',
    iconoEstado: 'ellipse-outline'
  },
  noDisponible: {
    bg: '#dc2626',
    texto: '#fff',
    icono: '#fff',
    etiqueta: 'No disponible',
    iconoEstado: 'ban'
  }
};

export const SecurityScreen = ({ darkMode, onBack, userData }) => {

  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [hasFacial, setHasFacial] = useState(false);
  const [hasPin, setHasPin] = useState(false);


  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);


  const [biometricSupport, setBiometricSupport] = useState(null);


  const [isOffline, setIsOffline] = useState(false);

  const styles = darkMode ? securityStylesDark : securityStyles;


  const handleEliminarDatos = () => {
    Alert.alert(
      'Eliminación de datos biométricos',
      'Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición), tienes todo el derecho de solicitar la eliminación de tus datos biométricos registrados en el sistema.\n\nPara ejercer este derecho, comunícate con el área de Recursos Humanos o con el administrador del sistema, quien procesará tu solicitud conforme a los plazos y procedimientos establecidos por la ley.',
      [{ text: 'Entendido', style: 'default' }],
      { cancelable: true }
    );
  };

  useEffect(() => {
    initializeSecurity();
  }, []);


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


      let onlineNow = false;
      try {
        onlineNow = await syncManager.isOnline();
      } catch (netErr) {
        (function () {})('[Security] No se pudo verificar red:', netErr.message);
      }

      let cargoOnline = false;


      if (onlineNow && token && !syncManager.getIsBackendDown()) {
        try {
          const credenciales = await getCredencialesByEmpleado(empleadoId, token);
          if (credenciales.success && credenciales.data) {
            setHasFingerprint(credenciales.data.tiene_dactilar || false);
            setHasFacial(credenciales.data.tiene_facial || false);
            setHasPin(credenciales.data.tiene_pin || false);
            cargoOnline = true;
          }
        } catch (e) {
          (function () {})('[Security] Error cargando credenciales online:', e.message);
        }
      }


      if (!cargoOnline) {
        try {
          const creds = await sqliteManager.getAllCredenciales();
          const misCreds = creds.filter((c) => c.empleado_id === empleadoId);

          setHasFingerprint(misCreds.some((c) => c.dactilar_template));
          setHasFacial(misCreds.some((c) => c.facial_descriptor));
          setHasPin(misCreds.some((c) => c.pin_hash));

          if (!onlineNow) setIsOffline(true);
        } catch (dbErr) {
          (function () {})('[Security] Error cargando credenciales offline:', dbErr.message);
          if (!onlineNow) setIsOffline(true);
        }
      }
    } catch (error) {
      (function () {})('[Security] Error en initializeSecurity:', error);
    } finally {
      setIsLoadingCredentials(false);
    }
  };


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
      </View>);

  }


  const metodos = [
  {
    id: 'dactilar',
    nombre: 'Huella Digital',
    icono: 'finger-print',
    estado: getEstado('dactilar')
  },
  {
    id: 'facial',
    nombre: 'Facial',
    icono: 'scan',
    estado: getEstado('facial')
  },
  {
    id: 'pin',
    nombre: 'PIN',
    icono: 'keypad',
    estado: getEstado('pin')
  }];



  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            
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
        showsVerticalScrollIndicator={false}>
        
        {}
        <View style={styles.infoCard}>
          <Ionicons
            name={isOffline ? 'cloud-offline' : 'shield-checkmark'}
            size={32}
            color={isOffline ? '#f59e0b' : darkMode ? '#93c5fd' : '#2563eb'} />
          
          <Text style={styles.infoTitle}>
            {isOffline ? 'Modo sin conexión' : 'Mis credenciales'}
          </Text>
          <Text style={styles.infoText}>
            {isOffline ?
            'Mostrando estado local. Conéctate al servidor para ver información actualizada.' :
            'Aquí puedes ver qué métodos de autenticación tienes registrados en el sistema.'
            }
          </Text>
        </View>

        {}
        <View style={styles.metodosContainer}>
          {metodos.map((metodo) => {
            const cfg = ESTADOS[metodo.estado];

            return (
              <View
                key={metodo.id}
                style={[styles.tarjetaMetodo, { backgroundColor: cfg.bg }]}>
                
                {}
                <View style={styles.botonIconContainer}>
                  <Ionicons name={metodo.icono} size={30} color={cfg.icono} />
                </View>

                {}
                <View style={styles.textoContainer}>
                  <Text style={[styles.botonNombre, { color: cfg.texto }]}>
                    {metodo.nombre}
                  </Text>
                  <Text style={[styles.etiquetaEstado, { color: cfg.texto }]}>
                    {cfg.etiqueta}
                  </Text>
                </View>

                {}
                <View style={styles.botonIndicador}>
                  <Ionicons
                    name={cfg.iconoEstado}
                    size={28}
                    color={
                    metodo.estado === 'activo' ?
                    '#fff' :
                    'rgba(255,255,255,0.55)'
                    } />
                  
                </View>
              </View>);

          })}
        </View>

        {}
        <View style={styles.separador}>
          <View style={styles.separadorLinea} />
          <Text style={styles.separadorTexto}>Privacidad</Text>
          <View style={styles.separadorLinea} />
        </View>

        {}
        <TouchableOpacity
          style={styles.eliminarBoton}
          onPress={handleEliminarDatos}
          activeOpacity={0.75}>
          
          <View style={styles.eliminarIconContainer}>
            <Ionicons name="trash-outline" size={22} color="#dc2626" />
          </View>
          <View style={styles.eliminarTextoContainer}>
            <Text style={styles.eliminarTitulo}>Eliminación de datos biométricos</Text>
            <Text style={styles.eliminarSubtitulo}>Conoce tus derechos · Ley ARCO</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={darkMode ? '#6b7280' : '#9ca3af'} />
        </TouchableOpacity>
      </ScrollView>
    </View>);

};


const securityStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 14 : 46,
    paddingBottom: 16,
    paddingHorizontal: 16
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#bfdbfe',
    marginTop: 2
  },
  headerPlaceholder: {
    width: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280'
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 90
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 5
  },
  infoText: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 19
  },
  metodosContainer: {
    gap: 10,
    marginBottom: 16
  },
  tarjetaMetodo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3
  },
  botonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  textoContainer: {
    flex: 1,
    gap: 2
  },
  botonNombre: {
    fontSize: 15,
    fontWeight: '600'
  },
  etiquetaEstado: {
    fontSize: 12,
    opacity: 0.85
  },
  botonIndicador: {},
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10
  },
  separadorLinea: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0'
  },
  separadorTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  eliminarBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  eliminarIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  eliminarTextoContainer: {
    flex: 1,
    gap: 2
  },
  eliminarTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626'
  },
  eliminarSubtitulo: {
    fontSize: 11,
    color: '#9ca3af'
  }
});


const securityStylesDark = StyleSheet.create({
  ...securityStyles,
  container: {
    ...securityStyles.container,
    backgroundColor: '#0f172a'
  },
  header: {
    ...securityStyles.header,
    backgroundColor: '#1e40af'
  },
  infoCard: {
    ...securityStyles.infoCard,
    backgroundColor: '#1e3a8a'
  },
  infoTitle: {
    ...securityStyles.infoTitle,
    color: '#f9fafb'
  },
  infoText: {
    ...securityStyles.infoText,
    color: '#cbd5e1'
  },
  loadingText: {
    ...securityStyles.loadingText,
    color: '#9ca3af'
  },
  separadorLinea: {
    ...securityStyles.separadorLinea,
    backgroundColor: '#334155'
  },
  separadorTexto: {
    ...securityStyles.separadorTexto,
    color: '#64748b'
  },
  eliminarBoton: {
    ...securityStyles.eliminarBoton,
    backgroundColor: '#1e293b',
    borderColor: '#7f1d1d'
  },
  eliminarIconContainer: {
    ...securityStyles.eliminarIconContainer,
    backgroundColor: '#450a0a'
  },
  eliminarTitulo: {
    ...securityStyles.eliminarTitulo,
    color: '#f87171'
  },
  eliminarSubtitulo: {
    ...securityStyles.eliminarSubtitulo,
    color: '#6b7280'
  }
});