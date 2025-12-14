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
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { login } from './services/authService';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Validar formato de correo electrónico
  const validateEmail = (text) => {
    setEmail(text);
    setEmailError(''); // Limpiar error cuando escribe
    setGeneralError(''); // Limpiar error general

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (text && !emailRegex.test(text)) {
      setEmailError('Formato de correo inválido');
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    setPasswordError(''); // Limpiar error cuando escribe
    setGeneralError(''); // Limpiar error general
  };

  const handleLogin = async () => {
    // Limpiar errores anteriores
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    // Validar campos vacíos
    if (!email || !password) {
      if (!email) setEmailError('El correo es requerido');
      if (!password) setPasswordError('La contraseña es requerida');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(email, password);

      if (response && response.success && response.usuario) {
        // Construir objeto completo del usuario con toda la información
        const datosCompletos = {
          // Información del usuario
          id: response.usuario.id,
          id_empresa: response.usuario.id_empresa,
          username: response.usuario.username,
          email: response.usuario.email,
          nombre: response.usuario.nombre,
          telefono: response.usuario.telefono,
          foto: response.usuario.foto,
          activo: response.usuario.activo,
          conexion: response.usuario.conexion,

          // Información del empleado (si existe)
          empleado: response.empleado || null,

          // Información del rol
          rol: response.rol || null,

          // Permisos del usuario
          permisos: response.permisos || [],

          // Departamento del empleado
          departamento: response.departamento || null,

          // Token (si existe)
          token: response.token || null,

          // Bandera para saber si es empleado
          esEmpleado: response.empleado !== null
        };

        console.log('📤 Datos completos del usuario:', datosCompletos);
        console.log('👔 ¿Es empleado?', datosCompletos.esEmpleado);

        // Entrar directamente sin mostrar Alert
        onLoginSuccess(datosCompletos);
      }
    } catch (error) {
      console.error('❌ Error en login:', error);

      // Mensajes de error más específicos SIN ALERTS
      const errorMessage = error?.message || '';

      if (errorMessage.includes('Credenciales inválidas')) {
        // Error genérico - mostrar en ambos campos
        setGeneralError('El correo o la contraseña son incorrectos');
      } else if (errorMessage.includes('Email no encontrado') || errorMessage.includes('usuario no encontrado')) {
        setEmailError('No existe una cuenta con este correo');
      } else if (errorMessage.includes('Contraseña incorrecta')) {
        setPasswordError('La contraseña es incorrecta');
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={loginStyles.container}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={loginStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={loginStyles.header}>
          <View style={loginStyles.logoContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#2563eb" />
          </View>
          <Text style={loginStyles.title}>FASITLAC™</Text>
          <Text style={loginStyles.subtitle}>Fábrica de Software del ITLAC</Text>
        </View>

        <View style={loginStyles.formContainer}>
          <Text style={loginStyles.label}>Correo Electrónico</Text>
          <View style={[
            loginStyles.inputContainer,
            emailError ? loginStyles.inputError : null
          ]}>
            <Ionicons name="mail-outline" size={18} color="#9ca3af" style={loginStyles.inputIcon} />
            <TextInput
              style={loginStyles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={validateEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>
          {emailError ? (
            <View style={loginStyles.errorContainer}>
              <Ionicons name="information-circle" size={14} color="#dc2626" />
              <Text style={loginStyles.errorText}>{emailError}</Text>
            </View>
          ) : null}

          <Text style={loginStyles.label}>Contraseña</Text>
          <View style={[
            loginStyles.inputContainer,
            passwordError ? loginStyles.inputError : null
          ]}>
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={loginStyles.inputIcon} />
            <TextInput
              style={loginStyles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={loginStyles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#9ca3af"
              />
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <View style={loginStyles.errorContainer}>
              <Ionicons name="information-circle" size={14} color="#dc2626" />
              <Text style={loginStyles.errorText}>{passwordError}</Text>
            </View>
          ) : null}

          {/* Error general debajo de contraseña */}
          {generalError ? (
            <View style={loginStyles.generalErrorContainer}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={loginStyles.generalErrorText}>{generalError}</Text>
            </View>
          ) : null}

          <TouchableOpacity disabled={isLoading}>
            <Text style={loginStyles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              loginStyles.loginButton,
              (isLoading || emailError) && loginStyles.loginButtonDisabled
            ]}
            onPress={handleLogin}
            disabled={isLoading || !!emailError}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={loginStyles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={loginStyles.loadingText}>Verificando...</Text>
              </View>
            ) : (
              <Text style={loginStyles.loginButtonText}>Iniciar Sesión →</Text>
            )}
          </TouchableOpacity>

          <View style={loginStyles.footer}>
            <Text style={loginStyles.footerText}>
              ¿No tienes cuenta?
              <TouchableOpacity disabled={isLoading} style={loginStyles.linkWrapper}>
                <Text style={loginStyles.footerLink}> Contacta al administrador</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>

        <Text style={loginStyles.copyright}>© 2024 FASITLAC™</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#93c5fd',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  generalErrorText: {
    color: '#991b1b',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  eyeIcon: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  forgotPassword: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 12,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
  },
  linkWrapper: {
    display: 'inline',
  },
  footerLink: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  copyright: {
    color: '#93c5fd',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },
});
