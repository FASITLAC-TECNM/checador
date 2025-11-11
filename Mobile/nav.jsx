import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const BottomNavigation = ({ currentScreen, onScreenChange, darkMode }) => {
  const styles = darkMode ? navStylesDark : navStyles;

  const navItems = [
    { id: 'home', icon: 'home', label: 'Inicio' },
    { id: 'history', icon: 'time', label: 'Historial' },
    { id: 'schedule', icon: 'calendar', label: 'Horario' },
    { id: 'settings', icon: 'settings', label: 'Config' },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => onScreenChange(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <Ionicons 
                name={isActive ? item.icon : `${item.icon}-outline`}
                size={24} 
                color={isActive ? '#2563eb' : (darkMode ? '#9ca3af' : '#6b7280')} 
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const navStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: '#dbeafe',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 4,
  },
  labelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
});

const navStylesDark = StyleSheet.create({
  container: {
    ...navStyles.container,
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  navItem: navStyles.navItem,
  iconContainer: navStyles.iconContainer,
  iconContainerActive: navStyles.iconContainerActive,
  label: navStyles.label,
  labelActive: navStyles.labelActive,
});