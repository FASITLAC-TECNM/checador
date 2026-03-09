import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated } from
'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../../services/authService';
import { getEmpleadoById } from '../../services/empleadoServices';
import { getEmpresaPublicaById } from '../../services/empresaService';
import syncManager from '../../services/offline/syncManager.mjs';
import sqliteManager from '../../services/offline/sqliteManager.mjs';
import { SeleccionEmpresaScreen } from './SeleccionEmpresaScreen';
const SECURE_KEYS = {
  CACHED_USER: 'offline_cached_user',
  CACHED_PASS_HASH: 'offline_cached_pass_hash',
  CACHED_USER_DATA: 'offline_cached_user_data'
};

const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
};

export const LoginScreen = ({ onLoginSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usuarioError, setUsuarioError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isOfflineLogin, setIsOfflineLogin] = useState(false);
  const [isWifiConnected, setIsWifiConnected] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [showEmpresaSelector, setShowEmpresaSelector] = useState(false);
  const [empresasList, setEmpresasList] = useState([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsWifiConnected(state.isConnected && state.isInternetReachable);
    });
    NetInfo.fetch().then((state) => {
      setIsWifiConnected(state.isConnected && state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkDb = async () => {
      try {
        await sqliteManager.initDatabase();
        setIsDbReady(true);
      } catch (e) {
        setIsDbReady(false);
      }
    };
    checkDb();
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })]
      )
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleUsuarioChange = (text) => {
    setUsuario(text);
    setUsuarioError('');
    setGeneralError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordError('');
    setGeneralError('');
  };

  const cacheCredentials = async (user, pass, datosCompletos) => {
    try {
      await Promise.all([
      SecureStore.setItemAsync(SECURE_KEYS.CACHED_USER, user.trim().toLowerCase()),
      SecureStore.setItemAsync(SECURE_KEYS.CACHED_PASS_HASH, simpleHash(pass)),
      AsyncStorage.setItem(SECURE_KEYS.CACHED_USER_DATA, JSON.stringify(datosCompletos))]
      );
    } catch (e) {
      (function () {})('Error cacheando credenciales:', e);
    }
  };

  const validateOffline = async (user, pass) => {
    try {
      const cachedUser = await SecureStore.getItemAsync(SECURE_KEYS.CACHED_USER);
      const cachedHash = await SecureStore.getItemAsync(SECURE_KEYS.CACHED_PASS_HASH);
      const cachedData = await AsyncStorage.getItem(SECURE_KEYS.CACHED_USER_DATA);

      if (!cachedUser || !cachedHash || !cachedData) {
        return { success: false, error: 'No hay sesión guardada. Inicia sesión con internet al menos una vez.' };
      }

      const inputUser = user.trim().toLowerCase();
      const inputHash = simpleHash(pass);

      if (inputUser !== cachedUser || inputHash !== cachedHash) {
        return { success: false, error: 'Usuario o contraseña incorrectos (modo offline)' };
      }
      const userData = JSON.parse(cachedData);
      if (userData.token) {
        await AsyncStorage.setItem('userToken', userData.token);
      }
      await AsyncStorage.setItem('@user_data', JSON.stringify(userData));

      if (userData.token) {
        syncManager.setAuthToken(userData.token);
      }

      (function () {})(' [Login] Login offline exitoso para:', inputUser);
      return { success: true, data: userData };
    } catch (e) {
      (function () {})('Error en validación offline:', e);
      return { success: false, error: 'Error al validar credenciales offline' };
    }
  };

  const handleLogin = () => {
    executeLogin();
  };

  const executeLogin = async (empresaId = null) => {
    setUsuarioError('');
    setPasswordError('');
    setGeneralError('');
    setIsOfflineLogin(false);

    if (!usuario || !password) {
      if (!usuario) setUsuarioError('El usuario o correo es requerido');
      if (!password) setPasswordError('La contraseña es requerida');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(usuario, password, empresaId);

      if (response && response.isMultiCompany) {
        try {
          const empresasConLogo = await Promise.all(
            response.empresas.map(async (emp) => {
              try {
                const publicData = await getEmpresaPublicaById(emp.empresa_id);
                if (publicData.success && publicData.data) {
                  return { ...emp, logo: publicData.data.logo };
                }
                return emp;
              } catch (err) {
                (function () {})(`Error fetching public info for company ${emp.empresa_id}:`, err);
                return emp;
              }
            })
          );
          setEmpresasList(empresasConLogo);
        } catch (error) {
          (function () {})('Error processing public company data:', error);
          setEmpresasList(response.empresas);
        }

        setShowEmpresaSelector(true);
        setIsLoading(false);
        return;
      }

      if (response && response.success && response.usuario) {
        const token = response.token;
        let empresaId = null;
        if (response.usuario.es_empleado && response.usuario.empleado_id) {
          try {
            const empleadoData = await getEmpleadoById(response.usuario.empleado_id, token);
            if (empleadoData.success && empleadoData.data) {
              empresaId = empleadoData.data.empresa_id;
            }
          } catch (error) {}
        }
        const datosCompletos = {
          id: response.usuario.id,
          usuario: response.usuario.usuario,
          correo: response.usuario.correo,
          nombre: response.usuario.nombre,
          telefono: response.usuario.telefono,
          foto: response.usuario.foto,
          es_empleado: response.usuario.es_empleado,
          empleado_id: response.usuario.empleado_id,
          rfc: response.usuario.rfc,
          nss: response.usuario.nss,
          empresa_id: empresaId,
          empleadoInfo: response.empleadoInfo || null,
          roles: response.roles || [],
          permisos: response.permisos || '0',
          esAdmin: response.esAdmin || false,
          token: token
        };


        const verificarDispositivo = async () => {
          try {
            const tokenSolicitud = await AsyncStorage.getItem('token_solicitud');
            if (tokenSolicitud) {
              const { getSolicitudPorToken } = require('../../services/solicitudMovilService');
              const solicitud = await getSolicitudPorToken(tokenSolicitud);
              const emailUsuario = datosCompletos.usuario.correo.trim().toLowerCase();
              const emailDispositivo = solicitud.correo.trim().toLowerCase();

              if (emailUsuario !== emailDispositivo) {

                const { logout } = require('../../services/authService');
                await logout(token);
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('@user_data');
                alert(`ACCESO DENEGADO\n\nEste dispositivo está registrado para:\n${emailDispositivo}\n\nNo puedes iniciar sesión con:\n${emailUsuario}`);
                return false;
              }
            }
          } catch (verifyError) {
            (function () {})('[Login] Error verificando dispositivo:', verifyError);
          }
          return true;
        };


        const [verificacionOk] = await Promise.all([
        verificarDispositivo(),
        cacheCredentials(usuario, password, datosCompletos)]
        );

        if (!verificacionOk) {
          setIsLoading(false);
          return;
        }


        if (token) {
          syncManager.setAuthToken(token, datosCompletos.empleado_id?.toString());
        }

        try {
          await sqliteManager.saveOfflineSession({
            usuario_id: datosCompletos.id?.toString(),
            empleado_id: datosCompletos.empleado_id?.toString(),
            tipo: 'login',
            modo: 'online'
          });
        } catch (e) {
          (function () {})('[Login] Error guardando sesión:', e.message || e);
        }


        syncManager.pushSessions().catch((e) =>
        function () {}('[Login] pushSessions background error:', e.message)
        );

        onLoginSuccess(datosCompletos, false);
      }
    } catch (error) {
      (function () {})('Login online falló:', error.message);
      const msg = error.message || '';
      const isNetworkError = msg.includes('Network') || msg.includes('Failed to fetch') || msg.includes('connection') || msg.includes('timeout');
      const isServerError = msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('Error del servidor') || msg.includes('JSON') || msg.includes('inactivo');

      if (isNetworkError || isServerError) {

        (function () {})(` [Login] Intentando login offline... (${isNetworkError ? 'red' : 'servidor'} no disponible)`);
        setIsOfflineLogin(true);
        const offlineResult = await validateOffline(usuario, password);

        if (offlineResult.success) {
          try {
            const sessionData = {
              usuario_id: offlineResult.data.id?.toString(),
              empleado_id: offlineResult.data.empleado_id?.toString(),
              tipo: 'login',
              modo: 'offline'
            };
            (function () {})(' [Login] Guardando sesión OFFLINE en SQLite:', JSON.stringify(sessionData));
            await sqliteManager.saveOfflineSession(sessionData);
            (function () {})(' [Login] Sesión offline guardada en SQLite');


            if (offlineResult.data.token) {
              syncManager.setAuthToken(offlineResult.data.token, offlineResult.data.empleado_id?.toString());
            }


            (function () {})(' [Login] Intentando push de sesión offline...');
            const pushResult = await syncManager.pushSessions();
            (function () {})(' [Login] Resultado pushSessions (offline):', JSON.stringify(pushResult));
          } catch (e) {
            (function () {})(' [Login] Error guardando sesión offline:', e);
          }

          onLoginSuccess(offlineResult.data, true);
        } else {

          setGeneralError(offlineResult.error || 'Credenciales inválidas (offline)');
          setIsLoading(false);

          Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true })]
          ).start();
        }
      } else if (msg.includes('401') || msg.includes('credentials') || msg.includes('Credenciales')) {
        setGeneralError('Usuario o contraseña incorrectos');
      } else {
        setGeneralError(error.message || 'Error al iniciar sesión');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showEmpresaSelector) {
    return (
      <SeleccionEmpresaScreen
        empresasList={empresasList}
        onSelect={(empresaId) => {
          setShowEmpresaSelector(false);
          executeLogin(empresaId);
        }}
        onCancel={() => {
          setShowEmpresaSelector(false);
        }} />);


  }

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never">
            
            <View style={styles.headerContainer}>
              <View style={styles.iconFrame}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain" />
                
              </View>
              <Text style={styles.title}>FASITLAC™</Text>
              <Text style={styles.subtitle}>Fábrica de Software del ITLAC</Text>
            </View>

            {}
            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <Animated.View style={[
                styles.statusDot,
                { backgroundColor: isWifiConnected ? '#4ade80' : '#f87171', opacity: pulseAnim }]
                } />
                <Ionicons
                  name={isWifiConnected ? 'wifi' : 'wifi'}
                  size={18}
                  color="#ffffff" />
                
              </View>

              <View style={styles.statusPill}>
                <Animated.View style={[
                styles.statusDot,
                { backgroundColor: isDbReady ? '#4ade80' : '#f87171', opacity: pulseAnim }]
                } />
                <Ionicons
                  name="server"
                  size={18}
                  color="#ffffff" />
                
              </View>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.welcomeText}>Iniciar Sesión</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Usuario o Correo</Text>
                <View style={[styles.inputContainer, usuarioError ? styles.inputError : null]}>
                  <Ionicons name="person" size={18} color="#2563eb" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="usuario@ejemplo.com"
                    placeholderTextColor="#94a3b8"
                    value={usuario}
                    onChangeText={handleUsuarioChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading} />
                  
                </View>
                {usuarioError ?
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={12} color="#ef4444" />
                    <Text style={styles.errorText}>{usuarioError}</Text>
                  </View> :
                null}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                  <Ionicons name="lock-closed" size={18} color="#2563eb" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!isLoading} />
                  
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    disabled={isLoading}>
                    
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#64748b" />
                    
                  </TouchableOpacity>
                </View>
                {passwordError ?
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={12} color="#ef4444" />
                    <Text style={styles.errorText}>{passwordError}</Text>
                  </View> :
                null}
              </View>

              {generalError ?
              <View style={styles.generalErrorContainer}>
                  <Ionicons name="warning" size={16} color="#dc2626" />
                  <Text style={styles.generalErrorText}>{generalError}</Text>
                </View> :
              null}

              <TouchableOpacity
                style={styles.loginButtonWrapper}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.9}>
                
                <LinearGradient
                  colors={isLoading ? ['#94a3b8', '#cbd5e1'] : ['#2563eb', '#1d4ed8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}>
                  
                  {isLoading ?
                  <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.buttonText}>Verificando...</Text>
                    </View> :

                  <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Iniciar Sesión</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.copyright}>© {new Date().getFullYear()} FASITLAC™</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>);

};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#2563eb'
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#2563eb'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  iconFrame: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  logoImage: {
    width: 80,
    height: 80
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
    letterSpacing: 0.5
  },
  subtitle: {
    fontSize: 12,
    color: '#e0f2fe',
    fontWeight: '500'
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    gap: 10
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 0
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b'
  },
  offlineBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  },
  inputWrapper: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  icon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500'
  },
  eyeButton: {
    padding: 6
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 2
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500'
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  generalErrorText: {
    color: '#991b1b',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600'
  },
  loginButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 16
  },
  loginButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  copyright: {
    color: '#e0f2fe',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500'
  }
});