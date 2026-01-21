import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NavItem = ({ item, isActive, onPress, darkMode, navStyles }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 40,
    }).start();
  };

  return (
    <TouchableOpacity
      style={navStyles.navItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Active Indicator - Línea superior */}
      {isActive && <View style={navStyles.activeIndicator} />}
      
      {/* Icon con animación */}
      <Animated.View 
        style={[
          navStyles.iconWrapper,
          isActive && navStyles.iconWrapperActive,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Ionicons 
          name={item.icon}
          size={20} 
          color={isActive ? '#2563eb' : (darkMode ? '#9ca3af' : '#6b7280')} 
        />
      </Animated.View>
      
      {/* Label */}
      <Text style={[
        navStyles.label,
        isActive && navStyles.labelActive,
        darkMode && !isActive && navStyles.labelDark
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
};

export const BottomNavigation = ({ currentScreen, onScreenChange, darkMode }) => {
  const insets = useSafeAreaInsets();
  const styles = darkMode ? navStylesDark : navStyles;

  const navItems = [
    { id: 'home', icon: 'home', label: 'Inicio' },
    { id: 'history', icon: 'time', label: 'Historial' },
    { id: 'schedule', icon: 'calendar', label: 'Horario' },
    { id: 'settings', icon: 'settings', label: 'Ajustes' },
  ];

  return (
    <View 
      style={[
        styles.container,
        { 
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 6) : insets.bottom,
        }
      ]}
    >
      {/* Sombra superior sutil */}
      <View style={styles.shadow} />
      
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          
          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              onPress={() => onScreenChange(item.id)}
              darkMode={darkMode}
              navStyles={styles}
            />
          );
        })}
      </View>
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
    borderTopWidth: 0, // ⭐ Sin borde
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 24,
    height: 3,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 1,
  },
  iconWrapperActive: {
    backgroundColor: '#eff6ff',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#6b7280',
  },
  labelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  labelDark: {
    color: '#9ca3af',
  },
});

const navStylesDark = StyleSheet.create({
  container: {
    ...navStyles.container,
    backgroundColor: '#1f2937',
  },
  shadow: {
    ...navStyles.shadow,
    backgroundColor: '#374151',
  },
  navBar: {
    ...navStyles.navBar,
    backgroundColor: '#1f2937',
  },
  navItem: navStyles.navItem,
  activeIndicator: {
    ...navStyles.activeIndicator,
    backgroundColor: '#60a5fa',
  },
  iconWrapper: navStyles.iconWrapper,
  iconWrapperActive: {
    ...navStyles.iconWrapperActive,
    backgroundColor: '#1e3a5f',
  },
  label: navStyles.label,
  labelActive: {
    ...navStyles.labelActive,
    color: '#60a5fa',
  },
  labelDark: navStyles.labelDark,
});