import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RegisterButton } from './RegisterButton'; 
const obtenerUrlFotoPerfil = (foto) => {
  if (!foto) {
    console.log('❌ No hay foto');
    return null;
  }
  if (foto.startsWith('http://') || foto.startsWith('https://')) {
    console.log('✅ Foto es URL completa:', foto);
    return foto;
  }
  const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
  const url = `${BASE_URL}${foto.startsWith('/') ? '' : '/'}${foto}`;
  console.log('✅ URL construida:', url);
  return url;
};

export const HomeScreen = ({ userData, darkMode }) => {
  const styles = darkMode ? homeStylesDark : homeStyles;
  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;
  const empleado = userData.empleado || null;
  const rol = userData.rol || null;
  const departamento = userData.departamento || null;
  const permisos = userData.permisos || [];
  const rolMostrar = empleado ? 'Empleado' : (rol?.nombre_rol || 'Usuario');
  const handleRegistroExitoso = (data) => {
    console.log('✅ Registro exitoso:', data);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>FASITLAC</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString('es-MX', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#fff" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {fotoUrl ? (
                  <Image 
                    source={{ uri: fotoUrl }}
                    style={styles.avatarImage}
                    onError={(error) => {
                      console.log('❌ Error cargando imagen:', error.nativeEvent.error);
                      console.log('📍 URL que falló:', fotoUrl);
                    }}
                    onLoad={() => console.log('✅ Imagen cargada correctamente')}
                  />
                ) : (
                  <Ionicons name="person" size={32} color="#9ca3af" />
                )}
              </View>
              {/* Indicador de estado al lado de la foto */}
              <View style={[
                styles.statusIndicator,
                { backgroundColor: userData.conexion === 'Conectado' ? '#10b981' : '#6b7280' }
              ]} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.greeting} numberOfLines={1}>
                Buenos días, {userData.username}
              </Text>
              <Text style={styles.userName} numberOfLines={2} ellipsizeMode="tail">
                {userData.nombre}
              </Text>
              {/* Mostrar departamento si existe */}
              {departamento && (
                <Text style={styles.departmentText} numberOfLines={1}>
                  {departamento.nombre_departamento}
                </Text>
              )}
              {/* Mostrar rol - Prioriza "Empleado" si es empleado */}
              <View style={[
                styles.roleBadge,
                empleado && { backgroundColor: '#10b98120' }, // Verde para empleados
                !empleado && departamento && departamento.color && { backgroundColor: `${departamento.color}20` }
              ]}>
                <Text style={[
                  styles.roleText,
                  empleado && { color: '#10b981' }, // Verde para empleados
                  !empleado && departamento && departamento.color && { color: departamento.color }
                ]} numberOfLines={1}>
                  {rolMostrar}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Register Button Component - REEMPLAZA la RegisterCard anterior */}
        <RegisterButton 
          userData={userData} 
          darkMode={darkMode}
          onRegistroExitoso={handleRegistroExitoso}
        />
      </ScrollView>
    </View>
  );
};

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#93c5fd',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  notificationButton: {
    position: 'relative',
    backgroundColor: '#1d4ed8',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 64,
    height: 64,
    backgroundColor: '#e5e7eb',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 2,
  },
  departmentText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
});

const homeStylesDark = StyleSheet.create({
  ...homeStyles,
  container: {
    ...homeStyles.container,
    backgroundColor: '#111827',
  },
  userCard: {
    ...homeStyles.userCard,
    backgroundColor: '#1f2937',
  },
  userName: {
    ...homeStyles.userName,
    color: '#fff',
  },
});