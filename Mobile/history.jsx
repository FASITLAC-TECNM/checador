import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const HistoryScreen = ({ darkMode }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const historyData = [
    { id: 1, type: 'Entrada', date: '2025-10-16', time: '08:00:15 a.m.', location: 'Edificio A' },
    { id: 2, type: 'Salida', date: '2025-10-16', time: '02:30:42 p.m.', location: 'Edificio A' },
    { id: 3, type: 'Entrada', date: '2025-10-15', time: '07:58:22 a.m.', location: 'Edificio A' },
    { id: 4, type: 'Salida', date: '2025-10-15', time: '02:32:18 p.m.', location: 'Edificio A' },
  ];

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const styles = darkMode ? historyStylesDark : historyStyles;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial</Text>
        <Text style={styles.headerSubtitle}>Registro de asistencias</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Records Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos Registros</Text>
          <Text style={styles.sectionSubtitle}>Historial de entradas y salidas</Text>
          
          {historyData.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordLeft}>
                  <View style={[
                    styles.recordIcon,
                    { backgroundColor: record.type === 'Entrada' ? '#d1fae5' : '#fed7aa' }
                  ]}>
                    <Ionicons 
                      name={record.type === 'Entrada' ? 'arrow-back' : 'arrow-forward'} 
                      size={20} 
                      color={record.type === 'Entrada' ? '#059669' : '#ea580c'}
                      style={record.type === 'Entrada' ? { transform: [{ rotate: '180deg' }] } : {}}
                    />
                  </View>
                  <View>
                    <Text style={styles.recordType}>{record.type}</Text>
                    <Text style={styles.recordLocation}>{record.location}</Text>
                  </View>
                </View>
                <View style={styles.recordRight}>
                  <Text style={styles.recordTime}>{record.time}</Text>
                  <Text style={styles.recordDate}>{record.date}</Text>
                </View>
              </View>
              <View style={styles.recordStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Registrado correctamente</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Calendar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendario de Asistencia</Text>
          
          <View style={styles.calendarHeader}>
            <TouchableOpacity style={styles.calendarButton}>
              <Ionicons name="chevron-back" size={24} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.calendarMonth}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity style={styles.calendarButton}>
              <Ionicons name="chevron-forward" size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
              <Text style={styles.legendText}>Hoy</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#6ee7b7' }]} />
              <Text style={styles.legendText}>Con registro</Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estadísticas de {monthNames[currentMonth.getMonth()]}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
                <Text style={[styles.statNumber, { color: '#059669' }]}>8</Text>
              </View>
              <Text style={styles.statLabel}>Días asistidos</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fed7aa' }]}>
                <Text style={[styles.statNumber, { color: '#ea580c' }]}>2</Text>
              </View>
              <Text style={styles.statLabel}>Faltas</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.statNumber, { color: '#2563eb' }]}>90%</Text>
              </View>
              <Text style={styles.statLabel}>Asistencia</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>Ver todo el historial</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const historyStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#93c5fd',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 15,
  },
  recordCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  recordLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  recordDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  recordStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: '#10b981',
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
  },
  calendarButton: {
    padding: 8,
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: '#dbeafe',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
});

const historyStylesDark = StyleSheet.create({
  ...historyStyles,
  container: {
    ...historyStyles.container,
    backgroundColor: '#111827',
  },
  section: {
    ...historyStyles.section,
    backgroundColor: '#1f2937',
  },
  sectionTitle: {
    ...historyStyles.sectionTitle,
    color: '#fff',
  },
  sectionSubtitle: {
    ...historyStyles.sectionSubtitle,
    color: '#d1d5db',
  },
  recordCard: {
    ...historyStyles.recordCard,
    backgroundColor: '#374151',
  },
  recordType: {
    ...historyStyles.recordType,
    color: '#fff',
  },
  recordTime: {
    ...historyStyles.recordTime,
    color: '#fff',
  },
  calendarMonth: {
    ...historyStyles.calendarMonth,
    color: '#fff',
  },
  viewAllButton: {
    ...historyStyles.viewAllButton,
    backgroundColor: '#1f2937',
  },
});