import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export const ScheduleScreen = ({ darkMode }) => {
  const scheduleData = [
    { day: 'Lunes', location: 'Edificio A', time: '8:00 AM - 2:30 PM', hours: '6.5 horas', active: true },
    { day: 'Martes', location: 'Edificio A', time: '8:00 AM - 2:30 PM', hours: '6.5 horas', active: true },
    { day: 'Miércoles', location: 'Edificio A', time: '8:00 AM - 2:30 PM', hours: '6.5 horas', active: true },
    { day: 'Jueves', location: 'Edificio A', time: '8:00 AM - 2:30 PM', hours: '6.5 horas', active: true },
    { day: 'Viernes', location: 'Edificio A', time: '8:00 AM - 2:30 PM', hours: '6.5 horas', active: true },
    { day: 'Sábado', location: 'Día de descanso', time: '---', hours: '', active: false },
    { day: 'Domingo', location: 'Día de descanso', time: '---', hours: '', active: false },
  ];

  const styles = darkMode ? scheduleStylesDark : scheduleStyles;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Horario</Text>
        <Text style={styles.headerSubtitle}>Tu horario semanal de trabajo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Schedule Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horario Asignado</Text>
          <Text style={styles.sectionSubtitle}>Semana del 14 al 18 de Octubre</Text>
          
          {scheduleData.map((schedule, index) => (
            <View 
              key={index} 
              style={[
                styles.scheduleCard,
                { 
                  borderLeftColor: schedule.active ? '#2563eb' : '#d1d5db',
                  backgroundColor: schedule.active 
                    ? (darkMode ? '#374151' : '#eff6ff')
                    : (darkMode ? '#374151' : '#f9fafb')
                }
              ]}
            >
              <View style={styles.scheduleContent}>
                <Text style={[
                  styles.scheduleDay,
                  { color: schedule.active ? (darkMode ? '#fff' : '#1f2937') : '#9ca3af' }
                ]}>
                  {schedule.day}
                </Text>
                <Text style={[
                  styles.scheduleLocation,
                  { color: darkMode ? '#d1d5db' : '#6b7280' }
                ]}>
                  {schedule.location}
                </Text>
              </View>
              <View style={styles.scheduleRight}>
                <Text style={[
                  styles.scheduleTime,
                  { color: schedule.active ? (darkMode ? '#fff' : '#1f2937') : '#9ca3af' }
                ]}>
                  {schedule.time}
                </Text>
                {schedule.hours && (
                  <Text style={[
                    styles.scheduleHours,
                    { color: darkMode ? '#d1d5db' : '#6b7280' }
                  ]}>
                    {schedule.hours}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Semanal</Text>
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: darkMode ? '#374151' : '#eff6ff' }]}>
              <Text style={[styles.summaryLabel, { color: darkMode ? '#d1d5db' : '#6b7280' }]}>
                Total de horas
              </Text>
              <Text style={styles.summaryValue}>32.5</Text>
              <Text style={[styles.summarySubtext, { color: darkMode ? '#9ca3af' : '#9ca3af' }]}>
                esta semana
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: darkMode ? '#374151' : '#d1fae5' }]}>
              <Text style={[styles.summaryLabel, { color: darkMode ? '#d1d5db' : '#6b7280' }]}>
                Días laborales
              </Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>5</Text>
              <Text style={[styles.summarySubtext, { color: darkMode ? '#9ca3af' : '#9ca3af' }]}>
                de 7 días
              </Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Horario de entrada</Text>
              <Text style={styles.infoText}>8:00 AM con tolerancia de 10 minutos</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color="#ea580c" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Horario de salida</Text>
              <Text style={styles.infoText}>2:30 PM</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={20} color="#10b981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Ubicación</Text>
              <Text style={styles.infoText}>Edificio A - Entrada Principal</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight + 20 : 50,
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
  scheduleCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleDay: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduleLocation: {
    fontSize: 14,
    marginTop: 2,
  },
  scheduleRight: {
    alignItems: 'flex-end',
  },
  scheduleTime: {
    fontSize: 15,
    fontWeight: '600',
  },
  scheduleHours: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

const scheduleStylesDark = StyleSheet.create({
  ...scheduleStyles,
  container: {
    ...scheduleStyles.container,
    backgroundColor: '#111827',
  },
  section: {
    ...scheduleStyles.section,
    backgroundColor: '#1f2937',
  },
  sectionTitle: {
    ...scheduleStyles.sectionTitle,
    color: '#fff',
  },
  sectionSubtitle: {
    ...scheduleStyles.sectionSubtitle,
    color: '#d1d5db',
  },
  infoTitle: {
    ...scheduleStyles.infoTitle,
    color: '#fff',
  },
  infoText: {
    ...scheduleStyles.infoText,
    color: '#d1d5db',
  },
});