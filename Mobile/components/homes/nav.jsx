import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NavItem = ({ item, isActive, onPress, darkMode, navStyles }) => {
  const customAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(customAnim, {
      toValue: isActive ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width/backgroundColor requires false
    }).start();
  }, [isActive]);

  const handlePressIn = () => {
    if (!isActive) {
      Animated.timing(customAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!isActive) {
      Animated.timing(customAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  };

  const indicatorWidth = customAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%']
  });

  const indicatorOpacity = customAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <TouchableOpacity
      style={navStyles.navItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Top Line Indicator */}
      <View style={navStyles.indicatorContainer}>
        <Animated.View
          style={[
            navStyles.activeIndicator,
            { width: indicatorWidth, opacity: indicatorOpacity }
          ]}
        />
      </View>

      <View style={navStyles.iconWrapper}>
        <Ionicons
          name={isActive ? item.icon : `${item.icon}-outline`}
          size={26} // Ligeramente más grande ya que no hay texto
          color={isActive ? '#2563eb' : (darkMode ? '#9ca3af' : '#6b7280')}
        />
      </View>
    </TouchableOpacity>
  );
};

export const BottomNavigation = ({ currentScreen, onScreenChange, darkMode, userData }) => {
  const insets = useSafeAreaInsets();
  const styles = darkMode ? navStylesDark : navStyles;

  const navItems = [
    { id: 'home', icon: 'home', label: 'Inicio' },
    { id: 'history', icon: 'time', label: 'Historial' },
    { id: 'schedule', icon: 'calendar', label: 'Horario' },
  ];

  if (userData?.esAdmin) {
    navItems.push({ id: 'admin', icon: 'shield-checkmark', label: 'Admin' });
  }

  navItems.push({ id: 'settings', icon: 'settings', label: 'Ajustes' });

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom + 8,
        }
      ]}
    >
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
    borderTopWidth: 0,
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
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
    height: 60,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
  },
  indicatorContainer: {
    position: 'absolute',
    top: -10, // Se alinea con la parte superior del navBar
    left: 0,
    right: 0,
    height: 3,
    alignItems: 'center',
  },
  activeIndicator: {
    height: 3,
    backgroundColor: '#2563eb',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  }
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
  indicatorContainer: navStyles.indicatorContainer,
  activeIndicator: {
    ...navStyles.activeIndicator,
    backgroundColor: '#60a5fa',
  },
  iconWrapper: navStyles.iconWrapper,
});