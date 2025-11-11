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

// Función helper para obtener URL de foto
const obtenerUrlFotoPerfil = (foto) => {
  if (!foto) {
    return null;
  }
  
  // Si ya es una URL completa, devolverla directamente
  if (foto.startsWith('http://') || foto.startsWith('https://')) {
    return foto;
  }
  
  // Si es una ruta relativa, construir la URL completa
  const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
  const url = `${BASE_URL}${foto.startsWith('/') ? '' : '/'}${foto}`;
  return url;
};

export const PersonalInfoScreen = ({ userData, darkMode, onBack }) => {
  const styles = darkMode ? personalInfoStylesDark : personalInfoStyles;
  
  // Obtener la URL completa de la foto si existe
  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color={darkMode ? '#93c5fd' : '#2563eb'} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value || 'No disponible'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información Personal</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            {fotoUrl ? (
              <Image 
                source={{ uri: fotoUrl }}
                style={styles.avatarImage}
                onError={(error) => {
                  console.log('❌ Error cargando imagen:', error.nativeEvent.error);
                }}
                onLoad={() => console.log('✅ Imagen cargada correctamente')}
              />
            ) : (
              <Ionicons name="person" size={60} color="#fff" />
            )}
          </View>
          <Text style={styles.profileName}>{userData.nombre}</Text>
          <Text style={styles.profileUsername}>@{userData.username}</Text>
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot,
              { backgroundColor: userData.estado === 'CONECTADO' ? '#10b981' : '#6b7280' }
            ]} />
            <Text style={styles.statusText}>
              {userData.estado === 'CONECTADO' ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>INFORMACIÓN DE CUENTA</Text>
          
          <InfoRow 
            icon="person-outline" 
            label="Nombre de usuario" 
            value={userData.username} 
          />
          
          <InfoRow 
            icon="mail-outline" 
            label="Correo electrónico" 
            value={userData.email} 
          />
          
          <InfoRow 
            icon="call-outline" 
            label="Teléfono" 
            value={userData.telefono || 'No registrado'} 
          />
          
          <InfoRow 
            icon="id-card-outline" 
            label="ID de usuario" 
            value={`#${userData.id}`} 
          />
        </View>

        {/* Status Information */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ESTADO Y PERMISOS</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={darkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={styles.infoLabel}>Rol</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{userData.role || 'Empleado'}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="checkmark-circle-outline" size={20} color={darkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={styles.infoLabel}>Estado de cuenta</Text>
            </View>
            <View style={[
              styles.statusChip,
              { backgroundColor: userData.activo ? '#dcfce7' : '#fee2e2' }
            ]}>
              <Text style={[
                styles.statusChipText,
                { color: userData.activo ? '#166534' : '#991b1b' }
              ]}>
                {userData.activo ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCIONES</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name="create-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.actionText}>Editar información</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name="camera-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.actionText}>Cambiar foto de perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.actionText}>Cambiar contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const personalInfoStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    backgroundColor: '#3b82f6',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#dbeafe',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  profileUsername: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 15,
    marginLeft: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '45%',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
    flex: 1,
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
});

const personalInfoStylesDark = StyleSheet.create({
  ...personalInfoStyles,
  container: {
    ...personalInfoStyles.container,
    backgroundColor: '#111827',
  },
  profileSection: {
    ...personalInfoStyles.profileSection,
    backgroundColor: '#1f2937',
  },
  profileName: {
    ...personalInfoStyles.profileName,
    color: '#fff',
  },
  profileUsername: {
    ...personalInfoStyles.profileUsername,
    color: '#d1d5db',
  },
  statusBadge: {
    ...personalInfoStyles.statusBadge,
    backgroundColor: '#374151',
  },
  section: {
    ...personalInfoStyles.section,
    backgroundColor: '#1f2937',
  },
  infoRow: {
    ...personalInfoStyles.infoRow,
    borderBottomColor: '#374151',
  },
  infoValue: {
    ...personalInfoStyles.infoValue,
    color: '#fff',
  },
  infoLabel: {
    ...personalInfoStyles.infoLabel,
    color: '#d1d5db',
  },
  actionButton: {
    ...personalInfoStyles.actionButton,
    borderBottomColor: '#374151',
  },
  actionText: {
    ...personalInfoStyles.actionText,
    color: '#fff',
  },
});