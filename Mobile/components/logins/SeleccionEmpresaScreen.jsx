import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Platform,
    Image,
    Dimensions,
    Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import getApiEndpoint from '../../config/api.js';

const { width } = Dimensions.get('window');

const obtenerUrlLogo = (logo) => {
    if (!logo) {
        return null;
    }
    if (logo.startsWith('data:image/')) {
        return logo;
    }
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
        return logo;
    }
    // Remove leading slash if exists to avoid double slash from getApiEndpoint
    const cleanPath = logo.startsWith('/') ? logo.substring(1) : logo;
    return getApiEndpoint(`/${cleanPath}`);
};

export const SeleccionEmpresaScreen = ({ empresasList, onSelect, onCancel }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={styles.headerWrapper}>
                <View style={styles.header}>
                    <SafeAreaView edges={['top']} style={{ flex: 0 }}>
                        <View style={styles.headerTop}>
                            <View style={styles.headerLeft}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={onCancel}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="chevron-back" size={28} color="#ffffff" />
                                </TouchableOpacity>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerSubtitle}>Autenticación</Text>
                                    <Text style={styles.headerTitle}>Múltiples empresas detectadas</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.mainCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="business" size={40} color="#2563eb" />
                    </View>

                    <Text style={styles.title}>Selecciona tu Empresa</Text>
                    <Text style={styles.description}>
                        Tu cuenta está asociada a varias empresas. Elige a cuál sistema deseas ingresar en este momento.
                    </Text>

                    <FlatList
                        data={empresasList}
                        keyExtractor={(item) => item.empresa_id.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        renderItem={({ item, index }) => (
                            <Animated.View>
                                <TouchableOpacity
                                    style={styles.empresaCard}
                                    activeOpacity={0.8}
                                    onPress={() => onSelect(item.empresa_id)}
                                >
                                    <LinearGradient
                                        colors={['#ffffff', '#f8fafc']}
                                        style={styles.cardGradient}
                                    >
                                        <View style={styles.logoContainer}>
                                            {item.logo ? (
                                                <Image
                                                    source={{ uri: obtenerUrlLogo(item.logo) }}
                                                    style={styles.logoImage}
                                                    resizeMode="contain"
                                                />
                                            ) : (
                                                <View style={styles.logoPlaceholder}>
                                                    <Text style={styles.logoText}>
                                                        {item.nombre.substring(0, 2).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.empresaInfo}>
                                            <Text style={styles.empresaName} numberOfLines={1}>
                                                {item.nombre}
                                            </Text>
                                        </View>

                                        <View style={styles.actionIcon}>
                                            <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                        ListFooterComponent={() => (
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={onCancel}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelBtnText}>Volver al login</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    headerWrapper: {
        backgroundColor: '#2563eb',
    },
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'android' ? 16 : 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: 14,
    },
    headerInfo: {
        flex: 1,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#e0f2fe',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#ffffff',
        marginTop: 2,
        marginBottom: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    mainCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginBottom: 20,
    },
    iconCircle: {
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 30,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 10,
        lineHeight: 20,
    },
    listContainer: {
        paddingBottom: 20,
    },
    separator: {
        height: 12,
    },
    empresaCard: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    logoImage: {
        width: '80%',
        height: '80%',
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#bfdbfe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1d4ed8',
    },
    empresaInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    empresaName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0f172a',
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    cancelBtn: {
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cancelBtnText: {
        color: '#64748b',
        fontSize: 15,
        fontWeight: '700',
    },
});
