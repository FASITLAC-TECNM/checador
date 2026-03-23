/**
 * Evaluador de Asistencias Offline
 * 
 * Este módulo contiene la lógica copiada directamente del backend (asistencias.service.js)
 * para calcular los estados (puntual, retardo, etc.) dentro del dispositivo móvil 
 * cuando este no tiene acceso a internet, basándose en la configuración extraída.
 */

export function srvBuscarBloqueActual(turnosDelDia, horaMinutos, intervaloBloquesMinutos, anticipoEntradaMax, posteriorSalidaMax = 60) {
    if (!turnosDelDia || turnosDelDia.length === 0) return null;

    // Convertir a minutos y ordenar
    const rangos = turnosDelDia.map(t => {
        const [he, me] = (t.inicio || t.entrada || "00:00").split(':').map(Number);
        const [hs, ms] = (t.fin || t.salida || "00:00").split(':').map(Number);
        return { entrada: he * 60 + me, salida: hs * 60 + ms };
    }).sort((a, b) => a.entrada - b.entrada);

    // Fusión de rangos en Bloques usando el intervalo configurado
    const bloques = [];
    let bActual = { ...rangos[0] };

    for (let i = 1; i < rangos.length; i++) {
        const rSiguiente = rangos[i];
        const separacion = rSiguiente.entrada - bActual.salida;
        if (separacion <= intervaloBloquesMinutos) {
            bActual.salida = Math.max(bActual.salida, rSiguiente.salida);
        } else {
            bloques.push({ ...bActual });
            bActual = { ...rSiguiente };
        }
    }
    bloques.push(bActual);

    // Retorna el bloque donde el usuario está "operando" actualmente.
    // Un bloque absorbe la hora actual si está dentro de su rango +/- un margen de búsqueda.
    for (let i = 0; i < bloques.length; i++) {
        const b = bloques[i];
        let inicioBusqueda = b.entrada - (anticipoEntradaMax || 0);
        let finBusqueda = b.salida + (posteriorSalidaMax || 60);

        // Limitar la ventana de búsqueda a la mitad entre bloques para evitar solapamientos
        if (i > 0) {
            const bPrev = bloques[i - 1];
            const mid = bPrev.salida + (b.entrada - bPrev.salida) / 2;
            inicioBusqueda = Math.max(inicioBusqueda, mid);
        }
        if (i < bloques.length - 1) {
            const bNext = bloques[i + 1];
            const mid = b.salida + (bNext.entrada - b.salida) / 2;
            finBusqueda = Math.min(finBusqueda, mid);
        }

        if (horaMinutos >= inicioBusqueda && Math.floor(horaMinutos) <= Math.floor(finBusqueda)) {
            return b;
        }
    }

    return null;
}

export function srvEvaluarEstado(tipoAsistencia, horaMinutos, bloque, tolerancia) {
    if (!bloque) return (tipoAsistencia === 'entrada') ? 'falta' : 'salida_fuera_horario';

    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaHoy = dias[new Date().getDay()];
    const aplicaHoy = tolerancia.dias_aplica?.[diaHoy] !== false;

    if (tipoAsistencia === 'entrada') {
        const diff = horaMinutos - bloque.entrada;
        if (diff < 0) return 'entrada_temprana';
        if (diff === 0) return 'puntual';
        if (!aplicaHoy) return 'falta';

        const reglas = [...(tolerancia.reglas || [])].sort((a, b) => a.limite_minutos - b.limite_minutos);
        for (const r of reglas) {
            if (diff <= r.limite_minutos) return r.id;
        }
        return 'falta';
    } else {
        const diffSalida = bloque.salida - horaMinutos;
        if (diffSalida > 0) return 'salida_temprana';
        const posteriorPermitido = tolerancia.minutos_posterior_salida || 60;
        if (Math.abs(diffSalida) > posteriorPermitido) return 'salida_tarde';
        return 'salida_puntual';
    }
}
