




import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEmpleados } from '../../services/empleadoServices';
import { AdminCredencialesScreen } from './AdminCredencialesScreen';

const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';

const fotoUrl = (foto) => {
  if (!foto) return null;
  if (foto.startsWith('data:') || foto.startsWith('http')) return foto;
  return `${BASE_URL}${foto.startsWith('/') ? '' : '/'}${foto}`;
};

const Avatar = ({ nombre, foto, size = 44 }) => {
  const url = fotoUrl(foto);
  const initials = nombre ?
  nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() :
  '?';

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e5e7eb' }} />);


  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center'
      }}>
      
            <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: '#2563eb' }}>{initials}</Text>
        </View>);

};

export const UsuariosCredencialesScreen = ({ userData, darkMode, onBack }) => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const styles = darkMode ? darkStyles : lightStyles;

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      const res = await getEmpleados(token);
      setEmpleados(res.data || []);
    } catch (e) {
      setError('No se pudieron cargar los empleados. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter(
      (e) =>
      e.nombre?.toLowerCase().includes(q) ||
      e.correo?.toLowerCase().includes(q) ||
      e.rfc?.toLowerCase().includes(q)
    );
  }, [busqueda, empleados]);

  if (usuarioSeleccionado) {
    return (
      <AdminCredencialesScreen
        empleado={usuarioSeleccionado}
        userData={userData}
        darkMode={darkMode}
        onBack={() => setUsuarioSeleccionado(null)} />);


  }

  return (
    <View style={styles.container}>
            <StatusBar
        barStyle="light-content"
        backgroundColor={darkMode ? '#1e40af' : '#2563eb'} />
      

            {}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Credenciales</Text>
                    <Text style={styles.headerSubtitle}>Selecciona un usuario</Text>
                </View>
                <TouchableOpacity onPress={cargarEmpleados} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {}
            <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={darkMode ? '#9ca3af' : '#6b7280'} style={styles.searchIcon} />
                <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, correo o RFC..."
          placeholderTextColor={darkMode ? '#6b7280' : '#9ca3af'}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCorrect={false} />
        
                {busqueda.length > 0 &&
        <TouchableOpacity onPress={() => setBusqueda('')}>
                        <Ionicons name="close-circle" size={18} color={darkMode ? '#6b7280' : '#9ca3af'} />
                    </TouchableOpacity>
        }
            </View>

            {}
            {loading ?
      <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Cargando empleados...</Text>
                </View> :
      error ?
      <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={48} color={darkMode ? '#4b5563' : '#d1d5db'} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={cargarEmpleados}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View> :

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
        <View style={styles.centered}>
                            <Ionicons name="people-outline" size={48} color={darkMode ? '#4b5563' : '#d1d5db'} />
                            <Text style={styles.emptyText}>
                                {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay empleados registrados'}
                            </Text>
                        </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) =>
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.7}
          onPress={() => setUsuarioSeleccionado(item)}>
          
                            <Avatar nombre={item.nombre} foto={item.foto} size={46} />
                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{item.nombre}</Text>
                                <Text style={styles.userEmail} numberOfLines={1}>{item.correo}</Text>
                            </View>
                            <Ionicons
            name="chevron-forward"
            size={18}
            color={darkMode ? '#6b7280' : '#9ca3af'} />
          
                        </TouchableOpacity>
        } />

      }
        </View>);

};


const base = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center'
  },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: '#bfdbfe', marginTop: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80, flexGrow: 1 },
  separator: { height: 1, marginLeft: 74 },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 14
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 240 },
  retryBtn: {
    backgroundColor: '#2563eb', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 4
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});

const lightStyles = StyleSheet.create({
  ...base,
  container: { ...base.container, backgroundColor: '#f8fafc' },
  header: { ...base.header, backgroundColor: '#2563eb' },
  searchWrap: { ...base.searchWrap, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  searchInput: { ...base.searchInput, color: '#111827' },
  separator: { ...base.separator, backgroundColor: '#f3f4f6' },
  userRow: { ...base.userRow, backgroundColor: '#fff' },
  userName: { ...base.userName, color: '#111827' },
  userEmail: { ...base.userEmail, color: '#6b7280' },
  loadingText: { ...base.loadingText, color: '#6b7280' },
  errorText: { ...base.errorText, color: '#6b7280' },
  emptyText: { ...base.emptyText, color: '#9ca3af' }
});

const darkStyles = StyleSheet.create({
  ...base,
  container: { ...base.container, backgroundColor: '#0f172a' },
  header: { ...base.header, backgroundColor: '#1e40af' },
  searchWrap: { ...base.searchWrap, backgroundColor: '#1f2937' },
  searchInput: { ...base.searchInput, color: '#f9fafb' },
  separator: { ...base.separator, backgroundColor: '#1f2937' },
  userRow: { ...base.userRow, backgroundColor: '#0f172a' },
  userName: { ...base.userName, color: '#f9fafb' },
  userEmail: { ...base.userEmail, color: '#9ca3af' },
  loadingText: { ...base.loadingText, color: '#9ca3af' },
  errorText: { ...base.errorText, color: '#9ca3af' },
  emptyText: { ...base.emptyText, color: '#6b7280' }
});