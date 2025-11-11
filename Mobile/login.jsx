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
  Alert,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { login } from './services/authService';

export const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(username, password);

      if (response && response.success && response.usuario) {
        Alert.alert(
          '¡Bienvenido!',
          `Hola ${response.usuario.nombre}`,
          [
            {
              text: 'Continuar',
              onPress: () => {
                console.log('📤 Enviando al App:', response.usuario);
                onLoginSuccess({
                  id: response.usuario.id,
                  username: response.usuario.username,
                  email: response.usuario.email,
                  nombre: response.usuario.nombre,
                  telefono: response.usuario.telefono,
                  foto: response.usuario.foto,
                  activo: response.usuario.activo,
                  estado: response.usuario.estado,
                  role: 'Administrador'
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error en login:', error);
      const errorMessage = error?.message || 'Ocurrió un error al iniciar sesión';
      Alert.alert('Error de Autenticación', errorMessage);
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
      >
        <View style={loginStyles.header}>
          <View style={loginStyles.logoContainer}>
            <Ionicons name="shield-checkmark" size={40} color="#2563eb" />
          </View>
          <Text style={loginStyles.title}>FASITLAC™</Text>
          <Text style={loginStyles.subtitle}>Fábrica de Software del ITLAC</Text>
        </View>

        <View style={loginStyles.formContainer}>
          <Text style={loginStyles.label}>Usuario</Text>
          <View style={loginStyles.inputContainer}>
            <Ionicons name="person-outline" size={18} color="#9ca3af" style={loginStyles.inputIcon} />
            <TextInput
              style={loginStyles.input}
              placeholder="usuario123"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <Text style={loginStyles.label}>Contraseña</Text>
          <View style={loginStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={loginStyles.inputIcon} />
            <TextInput
              style={loginStyles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
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

          <TouchableOpacity disabled={isLoading}>
            <Text style={loginStyles.forgotPassword}>¿Olvidaste tus credenciales?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[loginStyles.loginButton, isLoading && loginStyles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
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
    opacity: 0.7,
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