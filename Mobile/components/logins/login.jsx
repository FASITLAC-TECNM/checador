import React, { useState } from 'react';
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
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { login } from '../../services/authService';
import { getEmpleadoById } from '../../services/empleadoServices';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usuarioError, setUsuarioError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

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

  const handleLogin = async () => {
    setUsuarioError('');
    setPasswordError('');
    setGeneralError('');

    if (!usuario || !password) {
      if (!usuario) setUsuarioError('El usuario o correo es requerido');
      if (!password) setPasswordError('La contraseña es requerida');
      return;
    }

    if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(usuario, password);

      if (response && response.success && response.usuario) {
        const token = response.token;
        let empresaId = null;

        if (response.usuario.es_empleado && response.usuario.empleado_id) {
          try {
            const empleadoData = await getEmpleadoById(response.usuario.empleado_id, token);
            
            if (empleadoData.success && empleadoData.data) {
              empresaId = empleadoData.data.empresa_id;
            }
          } catch (error) {
            console.warn('No se pudo obtener empresa_id del empleado:', error.message);
          }
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

        onLoginSuccess(datosCompletos);
      }
    } catch (error) {
      console.error('Error en login:', error);

      const errorMessage = error?.message || '';

      if (errorMessage.includes('Credenciales inválidas')) {
        setGeneralError('El usuario/correo o la contraseña son incorrectos');
      } else if (errorMessage.includes('Cuenta')) {
        setGeneralError(errorMessage);
      } else if (errorMessage.includes('respuesta no válida') || errorMessage.includes('servidor')) {
        setGeneralError('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else {
        setGeneralError(errorMessage || 'Ocurrió un error al iniciar sesión');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#2563eb"
        translucent={false}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <LinearGradient
                colors={['#ffffff', '#f0f9ff']}
                style={styles.logoContainer}
              >
                <Ionicons name="shield-checkmark" size={32} color="#2563eb" />
              </LinearGradient>
              
              <Text style={styles.title}>FASITLAC™</Text>
              <Text style={styles.subtitle}>Fábrica de Software del ITLAC</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.welcomeText}>Iniciar Sesión</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Usuario o Correo</Text>
                <View style={[styles.inputContainer, usuarioError ? styles.inputError : null]}>
                  <Ionicons name="person" size={18} color="#2563eb" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="usuario o correo@ejemplo.com"
                    placeholderTextColor="#94a3b8"
                    value={usuario}
                    onChangeText={handleUsuarioChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
                {usuarioError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={12} color="#ef4444" />
                    <Text style={styles.errorText}>{usuarioError}</Text>
                  </View>
                ) : null}
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
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={12} color="#ef4444" />
                    <Text style={styles.errorText}>{passwordError}</Text>
                  </View>
                ) : null}
              </View>

              {generalError ? (
                <View style={styles.generalErrorContainer}>
                  <Ionicons name="warning" size={16} color="#dc2626" />
                  <Text style={styles.generalErrorText}>{generalError}</Text>
                </View>
              ) : null}

              <TouchableOpacity disabled={isLoading} activeOpacity={0.7}>
                <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButtonWrapper}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isLoading ? ['#94a3b8', '#cbd5e1'] : ['#2563eb', '#1d4ed8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.buttonText}>Verificando...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Iniciar Sesión</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.footerText}>
                ¿No tienes cuenta?{' '}
                <Text style={styles.footerLink}>Contacta al admin</Text>
              </Text>
            </View>

            <Text style={styles.copyright}>© 2024 FASITLAC™</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  container: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  generalErrorText: {
    color: '#991b1b',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  forgotPassword: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 16,
  },
  loginButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 16,
  },
  loginButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  footerLink: {
    color: '#2563eb',
    fontWeight: '700',
  },
  copyright: {
    color: '#e0f2fe',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
});