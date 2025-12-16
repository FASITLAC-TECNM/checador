import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import config from './config/onboardingConfig.json';

export const WelcomeScreen = ({ onNext }) => {
  const { welcome } = config;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1e40af', '#2563eb']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={40} color="#2563eb" />
            </View>
            <Text style={styles.title}>{welcome.title}</Text>
            <Text style={styles.subtitle}>{welcome.subtitle}</Text>
          </View>

          {/* Steps Grid */}
          <View style={styles.stepsGrid}>
            {welcome.steps.map((step) => (
              <View key={step.number} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                <Ionicons name={step.icon} size={24} color="#fff" style={styles.stepIcon} />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
            ))}
          </View>

          {/* Note */}
          <View style={styles.noteCard}>
            <Ionicons name="information-circle" size={18} color="#60a5fa" />
            <Text style={styles.noteText}>{welcome.note}</Text>
          </View>
        </ScrollView>

        {/* Start Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={onNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#fff', '#f3f4f6']}
            style={styles.startButtonGradient}
          >
            <Text style={styles.startButtonText}>Comenzar</Text>
            <Ionicons name="arrow-forward" size={20} color="#2563eb" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#93c5fd',
    textAlign: 'center',
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumberText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepIcon: {
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: '#fff',
    marginLeft: 8,
    lineHeight: 16,
  },
  startButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginRight: 8,
  },
});
