import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Image, useImage, SweepGradient, vec, Group, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

const SplashScreen = () => {
    // Cargar la imagen del logo directamente
    const logo = useImage(require('../../assets/icon.png'));

    // Valor animado para la rotación (0 a 360 grados -> 0 a 2PI radianes)
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(2 * Math.PI, {
                duration: 2000,
                easing: Easing.linear
            }),
            -1 // Infinito
        );
    }, []);

    // Dimensiones del canvas y elementos
    const SIZE = 250;
    const CENTER = SIZE / 2;
    const RADIUS = 100;
    const STROKE_WIDTH = 8;
    const IMAGE_SIZE = 120;

    // Colores del degradado (puedes ajustarlos a tu paleta)
    const colors = [
        "rgba(37, 99, 235, 0)",   // Transparente (inicio del "tail")
        "rgba(37, 99, 235, 0.2)",
        "rgba(37, 99, 235, 0.5)",
        "#2563eb",                // Azul principal (cabeza del cometa)
        "#60a5fa",                // Azul claro (brillo extra)
        "rgba(37, 99, 235, 0)"    // Cierre suave
    ];

    // Derivamos la transformación
    const groupTransform = useDerivedValue(() => {
        return [{ rotate: rotation.value }];
    });

    if (!logo) {
        // Fallback mientras carga (o si falla)
        return (
            <View style={styles.container}>
                <View style={{ width: 50, height: 50, backgroundColor: '#2563eb', borderRadius: 25 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Canvas style={{ width: SIZE, height: SIZE }}>
                {/* Grupo rotatorio para el borde */}
                <Group
                    origin={vec(CENTER, CENTER)}
                    transform={groupTransform}
                >
                    {/* Anillo con degradado Sweep */}
                    <Circle
                        cx={CENTER}
                        cy={CENTER}
                        r={RADIUS}
                        style="stroke"
                        strokeWidth={STROKE_WIDTH}
                        color="lightblue" // Fallback color si el gradiente falla
                    >
                        <SweepGradient
                            c={vec(CENTER, CENTER)}
                            colors={colors}
                        />
                    </Circle>
                </Group>

                {/* Logo Central (Estatico) */}
                <Image
                    image={logo}
                    x={CENTER - IMAGE_SIZE / 2}
                    y={CENTER - IMAGE_SIZE / 2}
                    width={IMAGE_SIZE}
                    height={IMAGE_SIZE}
                    fit="contain"
                />
            </Canvas>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb', // O el color de fondo que prefieras
    },
});

export default SplashScreen;
