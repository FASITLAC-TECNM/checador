/**
 * Evaluador de Asistencias Offline
 * 
 * Este módulo contiene la lógica copiada directamente del backend (asistencias.service.js)
 * para calcular los estados (puntual, retardo, etc.) dentro del dispositivo móvil 
 * cuando este no tiene acceso a internet, basándose en la configuración extraída.
 */

export function srvBuscarBloqueActual(turnosDelDia, horaMinutos, intervaloBloquesMinutos, anticipoEntradaMax, posteriorSalidaMax = 60) {
    console.log('[TOLERANCIA] ─── srvBuscarBloqueActual ───');
    console.log('[TOLERANCIA] anticipoEntradaMax (min)   :', anticipoEntradaMax ?? 0, '← minutos ANTES de la entrada que se permite registrar');
    console.log('[TOLERANCIA] posteriorSalidaMax (min)   :', posteriorSalidaMax, '← minutos DESPUÉS de la salida que se permite registrar');
    console.log('[TOLERANCIA] intervaloBloquesMinutos    :', intervaloBloquesMinutos, '← gap para fusionar turnos en un mismo bloque');
    console.log('[TOLERANCIA] horaActual (min desde 00:00):', horaMinutos);
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
    console.log('[TOLERANCIA] ─── srvEvaluarEstado ───');
    console.log('[TOLERANCIA] tipoAsistencia             :', tipoAsistencia);
    console.log('[TOLERANCIA] horaActual (min desde 00:00):', horaMinutos);
    console.log('[TOLERANCIA] bloque encontrado          :', bloque ? `entrada=${bloque.entrada}min  salida=${bloque.salida}min` : 'NINGUNO');
    console.log('[TOLERANCIA] ── Reglas generales ──');
    console.log('[TOLERANCIA]   aplica_tolerancia_entrada:', tolerancia?.aplica_tolerancia_entrada);
    console.log('[TOLERANCIA]   aplica_tolerancia_salida :', tolerancia?.aplica_tolerancia_salida);
    console.log('[TOLERANCIA]   permite_registro_anticipado:', tolerancia?.permite_registro_anticipado);
    console.log('[TOLERANCIA]   minutos_anticipado_max   :', tolerancia?.minutos_anticipado_max, 'min  ← máx de anticipación en entrada');
    console.log('[TOLERANCIA]   minutos_anticipo_salida  :', tolerancia?.minutos_anticipo_salida, 'min  ← anticipación permitida en salida');
    console.log('[TOLERANCIA]   minutos_posterior_salida :', tolerancia?.minutos_posterior_salida, 'min  ← cuánto puede tardarse en salida');
    console.log('[TOLERANCIA]   minutos_retardo          :', tolerancia?.minutos_retardo, 'min  ← retardo simple');
    console.log('[TOLERANCIA]   minutos_falta            :', tolerancia?.minutos_falta, 'min  ← a partir de aquí es falta');
    console.log('[TOLERANCIA]   minutos_retardo_a_max    :', tolerancia?.minutos_retardo_a_max, 'min');
    console.log('[TOLERANCIA]   minutos_retardo_b_max    :', tolerancia?.minutos_retardo_b_max, 'min');
    console.log('[TOLERANCIA]   equivalencia_retardo_a   :', tolerancia?.equivalencia_retardo_a);
    console.log('[TOLERANCIA]   equivalencia_retardo_b   :', tolerancia?.equivalencia_retardo_b);
    console.log('[TOLERANCIA]   dias_aplica              :', JSON.stringify(tolerancia?.dias_aplica));
    console.log('[TOLERANCIA]   reglas (ordenadas)       :', JSON.stringify((tolerancia?.reglas || []).sort((a,b) => a.limite_minutos - b.limite_minutos)));
    if (!bloque) return (tipoAsistencia === 'entrada') ? 'falta' : 'salida_fuera_horario';

    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaHoy = dias[new Date().getDay()];
    const aplicaHoy = tolerancia.dias_aplica?.[diaHoy] !== false;

    if (tipoAsistencia === 'entrada') {
        const diff = horaMinutos - bloque.entrada;
        console.log('[TOLERANCIA] ── Evaluación ENTRADA ──');
        console.log('[TOLERANCIA]   diff respecto a entrada  :', diff, 'min (negativo = anticipado, positivo = tarde)');
        console.log('[TOLERANCIA]   aplicaHoy (dia actual)   :', aplicaHoy, `(${diaHoy})`);
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
        const posteriorPermitido = tolerancia.minutos_posterior_salida || 60;
        console.log('[TOLERANCIA] ── Evaluación SALIDA ──');
        console.log('[TOLERANCIA]   diff respecto a salida   :', diffSalida, 'min (positivo = temprana, negativo = tardía)');
        console.log('[TOLERANCIA]   posteriorPermitido (min) :', posteriorPermitido, '← min_posterior_salida usada');
        if (diffSalida > 0) return 'salida_temprana';
        if (Math.abs(diffSalida) > posteriorPermitido) return 'salida_tarde';
        return 'salida_puntual';
    }
}
