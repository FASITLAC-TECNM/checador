/**
 * Fusiona bloques de turnos continuos (donde la salida de uno coincide con la entrada del siguiente).
 * Replica la lógica del backend para consistencia.
 */
export function fusionarBloquesContinuos(turnos) {
    if (!turnos || turnos.length <= 1) return turnos || [];

    const ordenados = [...turnos].sort((a, b) => {
        const [ha, ma] = (a.inicio || a.entrada).split(':').map(Number);
        const [hb, mb] = (b.inicio || b.entrada).split(':').map(Number);
        return (ha * 60 + ma) - (hb * 60 + mb);
    });

    const normalize = (t) => ({
        inicio: t.inicio || t.entrada,
        fin: t.fin || t.salida
    });

    const fusionados = [normalize(ordenados[0])];

    for (let i = 1; i < ordenados.length; i++) {
        const ultimo = fusionados[fusionados.length - 1];
        const actual = normalize(ordenados[i]);
        if (ultimo.fin === actual.inicio) {
            ultimo.fin = actual.fin;
            ultimo.fusionado = true;
        } else {
            fusionados.push(actual);
        }
    }

    return fusionados;
}

/**
 * Convierte "HH:MM" a minutos desde medianoche.
 */
export function timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Dias de la semana en orden y con labels.
 */
export const DIAS_SEMANA = [
    { key: 'lunes', label: 'Lunes', short: 'L' },
    { key: 'martes', label: 'Martes', short: 'M' },
    { key: 'miercoles', label: 'Miércoles', short: 'Mi' },
    { key: 'jueves', label: 'Jueves', short: 'J' },
    { key: 'viernes', label: 'Viernes', short: 'V' },
    { key: 'sabado', label: 'Sábado', short: 'S' },
    { key: 'domingo', label: 'Domingo', short: 'D' }
];

/**
 * Colores para asignar a empleados en el calendario global.
 */
export const EMPLOYEE_COLORS = [
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', hex: '#3b82f6' },
    { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', hex: '#10b981' },
    { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', hex: '#8b5cf6' },
    { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', hex: '#f59e0b' },
    { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', hex: '#f43f5e' },
    { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', hex: '#06b6d4' },
    { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', hex: '#f97316' },
    { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', hex: '#6366f1' },
];
