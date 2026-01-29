import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { isPointInPolygon, extraerCoordenadas } from '../../services/ubicacionService';
import MapScreen from './MapScreen';
import asistenciaService from '../../services/asistenciasService';
import toleranciaService from '../../services/toleranciaService';
import horariosService from '../../services/horariosService';

export const RegisterButton = ({ userData, darkMode, onRegistroExitoso }) => {
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [mostrarDepartamentos, setMostrarDepartamentos] = useState(false);
  
  const [ubicacionActual, setUbicacionActual] = useState(null);
  const [departamentos, setDepartamentos] = useState([]);
  const [departamentosDisponibles, setDepartamentosDisponibles] = useState([]);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState(null);
  const [horarioInfo, setHorarioInfo] = useState(null);
  const [toleranciaInfo, setToleranciaInfo] = useState(null);
  const [ultimoRegistroHoy, setUltimoRegistroHoy] = useState(null);
  
  const [dentroDelArea, setDentroDelArea] = useState(false);
  const [puedeRegistrar, setPuedeRegistrar] = useState(false);
  const [tipoSiguienteRegistro, setTipoSiguienteRegistro] = useState('entrada');
  const [estadoHorario, setEstadoHorario] = useState(null);
  const [jornadaCompletada, setJornadaCompletada] = useState(false);
  const [turnoActual, setTurnoActual] = useState(null);

  const styles = darkMode ? registerStylesDark : registerStyles;
  const [horaActual, setHoraActual] = useState(new Date());

  // ⏰ Actualizar hora cada segundo y recalcular estado
  useEffect(() => {
    const intervalo = setInterval(() => {
      setHoraActual(new Date());
      
      if (horarioInfo && toleranciaInfo) {
        const estado = calcularEstadoRegistro(ultimoRegistroHoy, horarioInfo, toleranciaInfo);
        setPuedeRegistrar(estado.puedeRegistrar);
        setTipoSiguienteRegistro(estado.tipoRegistro);
        setEstadoHorario(estado.estadoHorario);
        setJornadaCompletada(estado.jornadaCompleta);
        setTurnoActual(estado.turnoActual);
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [horarioInfo, toleranciaInfo, ultimoRegistroHoy]);

  const getDiaSemana = () => {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return dias[new Date().getDay()];
  };

  const getMinutosDelDia = (fecha = new Date()) => {
    return fecha.getHours() * 60 + fecha.getMinutes();
  };

  // 🆕 Obtener último registro usando servicio
  const obtenerUltimoRegistro = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return null;

      const ultimoRegistro = await asistenciaService.getUltimoRegistroHoy(
        empleadoId, 
        userData.token
      );

      if (!ultimoRegistro) return null;

      // Obtener todos los registros del día para contar total
      const todosRegistros = await asistenciaService.getAsistenciasEmpleado(
        empleadoId,
        userData.token
      );

      const hoy = new Date().toDateString();
      const registrosHoy = todosRegistros.data?.filter(registro => {
        const fechaRegistro = new Date(registro.fecha_registro);
        return fechaRegistro.toDateString() === hoy;
      }) || [];

      return {
        tipo: ultimoRegistro.esEntrada ? 'entrada' : 'salida',
        estado: ultimoRegistro.estado,
        hora: ultimoRegistro.hora,
        totalRegistrosHoy: registrosHoy.length
      };
    } catch (err) {
      console.error('❌ Error obteniendo último registro:', err);
      return null;
    }
  }, [userData]);

  // 🆕 Obtener horario usando servicio
  const obtenerHorario = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return null;

      console.log('📅 Obteniendo horario para empleado:', empleadoId);

      const horario = await horariosService.getHorarioPorEmpleado(
        empleadoId,
        userData.token
      );

      console.log('📅 Horario obtenido:', horario);

      if (!horario?.configuracion) {
        console.warn('⚠️ No hay configuración en el horario');
        return null;
      }

      let config = typeof horario.configuracion === 'string' 
        ? JSON.parse(horario.configuracion) 
        : horario.configuracion;

      const diaHoy = getDiaSemana();
      let turnosHoy = [];

      // Soportar estructura nueva (configuracion_semanal)
      if (config.configuracion_semanal?.[diaHoy]) {
        turnosHoy = config.configuracion_semanal[diaHoy].map(t => ({
          entrada: t.inicio,
          salida: t.fin
        }));
      } 
      // Soportar estructura antigua (dias + turnos)
      else if (config.dias?.includes(diaHoy)) {
        turnosHoy = config.turnos || [];
      }

      if (!turnosHoy.length) {
        console.log('📅 No trabaja hoy:', diaHoy);
        return { trabaja: false, turnos: [] };
      }

      // Ordenar turnos por hora de entrada
      turnosHoy.sort((a, b) => {
        const [haA, maA] = a.entrada.split(':').map(Number);
        const [haB, maB] = b.entrada.split(':').map(Number);
        return (haA * 60 + maA) - (haB * 60 + maB);
      });

      console.log('✅ Turnos de hoy:', turnosHoy);

      return {
        trabaja: true,
        turnos: turnosHoy,
        entrada: turnosHoy[0].entrada,
        salida: turnosHoy[turnosHoy.length - 1].salida,
        tipo: turnosHoy.length > 1 ? 'quebrado' : 'continuo'
      };
    } catch (err) {
      console.error('❌ Error obteniendo horario:', err);
      return null;
    }
  }, [userData]);

  // 🆕 Obtener tolerancia usando servicio
  const obtenerTolerancia = useCallback(async () => {
    const defaultTolerancia = {
      minutos_retardo: 10,
      minutos_falta: 30,
      permite_registro_anticipado: true,
      minutos_anticipado_max: 60,
      aplica_tolerancia_salida: true
    };

    try {
      console.log('🕐 Obteniendo tolerancia para usuario:', userData.id);

      const toleranciaData = await toleranciaService.getToleranciaEmpleado(
        userData.id,
        userData.token
      );

      console.log('✅ Tolerancia obtenida:', toleranciaData);

      const tolerancia = toleranciaData.data || toleranciaData;

      // Asegurar valores por defecto si faltan
      return {
        minutos_retardo: tolerancia.minutos_retardo || 10,
        minutos_falta: tolerancia.minutos_falta || 30,
        permite_registro_anticipado: tolerancia.permite_registro_anticipado !== false,
        minutos_anticipado_max: tolerancia.minutos_anticipado_max || 60,
        aplica_tolerancia_salida: tolerancia.aplica_tolerancia_salida !== false
      };
    } catch (err) {
      console.error('❌ Error obteniendo tolerancia:', err);
      console.log('⚠️ Usando tolerancia por defecto');
      return defaultTolerancia;
    }
  }, [userData]);

  // 🆕 Obtener departamentos (mantener lógica actual)
  const obtenerDepartamentos = useCallback(async () => {
    try {
      const departamentosAsignados = userData?.empleadoInfo?.departamentos;
      
      if (!departamentosAsignados || departamentosAsignados.length === 0) {
        return [];
      }

      const promesas = departamentosAsignados.map(async (depto) => {
        try {
          const response = await fetch(
            `${asistenciaService.API_URL || '/api'}/departamentos/${depto.id}`,
            {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            return data.data || data;
          }
          return null;
        } catch (err) {
          return null;
        }
      });

      const resultados = await Promise.all(promesas);
      return resultados.filter(depto => depto !== null && depto.ubicacion);
    } catch (err) {
      console.error('❌ Error obteniendo departamentos:', err);
      return [];
    }
  }, [userData]);

  // 🆕 Detectar si dos turnos son consecutivos (diferencia <= 1 minuto)
  const sonTurnosConsecutivos = (turno1, turno2) => {
    if (!turno1 || !turno2) return false;
    
    const [h1, m1] = turno1.salida.split(':').map(Number);
    const [h2, m2] = turno2.entrada.split(':').map(Number);
    
    const minutosSalida1 = h1 * 60 + m1;
    const minutosEntrada2 = h2 * 60 + m2;
    
    // Consecutivos si la diferencia es <= 1 minuto
    const diferencia = minutosEntrada2 - minutosSalida1;
    
    console.log('🔗 Verificando si son consecutivos:', {
      turno1: `${turno1.entrada}-${turno1.salida}`,
      turno2: `${turno2.entrada}-${turno2.salida}`,
      diferencia,
      sonConsecutivos: diferencia >= 0 && diferencia <= 1
    });
    
    return diferencia >= 0 && diferencia <= 1;
  };

  // 🆕 Agrupar turnos consecutivos en bloques
  const agruparTurnosConsecutivos = (turnos) => {
    if (!turnos || turnos.length === 0) return [];
    
    const bloques = [];
    let bloqueActual = [turnos[0]];
    
    for (let i = 1; i < turnos.length; i++) {
      const turnoAnterior = turnos[i - 1];
      const turnoActual = turnos[i];
      
      if (sonTurnosConsecutivos(turnoAnterior, turnoActual)) {
        // Agregar al bloque actual
        bloqueActual.push(turnoActual);
      } else {
        // Finalizar bloque actual y empezar uno nuevo
        bloques.push(bloqueActual);
        bloqueActual = [turnoActual];
      }
    }
    
    // Agregar último bloque
    bloques.push(bloqueActual);
    
    console.log('📦 Bloques de turnos consecutivos:', bloques.map((bloque, idx) => ({
      bloque: idx + 1,
      turnos: bloque.length,
      rango: `${bloque[0].entrada} - ${bloque[bloque.length - 1].salida}`
    })));
    
    return bloques;
  };

  // 🔍 Encontrar turno/bloque correspondiente según registros
  const encontrarTurnoCorrespondiente = (turnos, totalRegistros) => {
    if (!turnos || turnos.length === 0) return null;
    
    // Agrupar turnos consecutivos
    const bloques = agruparTurnosConsecutivos(turnos);
    
    // Calcular en qué bloque estamos según la cantidad de registros
    // Par = esperando entrada, Impar = esperando salida
    const bloqueIndex = Math.floor(totalRegistros / 2);
    
    // Si ya completamos todos los bloques
    if (bloqueIndex >= bloques.length) {
      return null;
    }
    
    const bloqueActual = bloques[bloqueIndex];
    const primerTurnoDelBloque = bloqueActual[0];
    const ultimoTurnoDelBloque = bloqueActual[bloqueActual.length - 1];
    
    console.log('🎯 Turno/Bloque correspondiente:', {
      totalRegistros,
      bloqueIndex,
      turnosEnBloque: bloqueActual.length,
      entrada: primerTurnoDelBloque.entrada,
      salida: ultimoTurnoDelBloque.salida
    });
    
    return {
      entrada: primerTurnoDelBloque.entrada,
      salida: ultimoTurnoDelBloque.salida,
      index: bloqueIndex,
      esUltimo: bloqueIndex === bloques.length - 1,
      esBloque: bloqueActual.length > 1,
      turnosEnBloque: bloqueActual.length,
      turnos: bloqueActual // Todos los turnos del bloque
    };
  };

  // ✅ Validación de entrada CON TOLERANCIA APLICADA Y DESACTIVACIÓN
  const validarEntrada = (horario, tolerancia, minutosActuales, totalRegistros = 0) => {
    const turnoActual = encontrarTurnoCorrespondiente(horario.turnos, totalRegistros);
    
    if (!turnoActual) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'completado',
        jornadaCompleta: true,
        turnoActual: null,
        mensaje: 'Todos los turnos completados'
      };
    }

    const [hE, mE] = turnoActual.entrada.split(':').map(Number);
    const [hS, mS] = turnoActual.salida.split(':').map(Number);
    
    const minEntrada = hE * 60 + mE;
    const minSalida = hS * 60 + mS;
    
    // 🆕 APLICAR TOLERANCIA CORRECTAMENTE
    const ventanaInicio = minEntrada - (tolerancia.minutos_anticipado_max || 60);
    const ventanaRetardo = minEntrada + (tolerancia.minutos_retardo || 10);
    const ventanaFalta = minEntrada + (tolerancia.minutos_falta || 30);

    console.log('🕐 Validando entrada:', {
      minutosActuales,
      minEntrada,
      minSalida,
      ventanaInicio,
      ventanaRetardo,
      ventanaFalta,
      turno: turnoActual.index + 1,
      esBloque: turnoActual.esBloque
    });

    // ✅ Dentro de ventana puntual (desde ventanaInicio hasta ventanaRetardo)
    if (minutosActuales >= ventanaInicio && minutosActuales <= ventanaRetardo) {
      console.log('✅ PUNTUAL');
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        estadoHorario: 'puntual',
        jornadaCompleta: false,
        turnoActual,
        mensaje: turnoActual.esBloque 
          ? `Entrada al bloque ${turnoActual.index + 1} (${turnoActual.turnosEnBloque} turnos)`
          : `Entrada al turno ${turnoActual.index + 1}`
      };
    }

    // ⚠️ Con retardo (después de ventanaRetardo hasta ventanaFalta)
    if (minutosActuales > ventanaRetardo && minutosActuales <= ventanaFalta) {
      console.log('⚠️ RETARDO');
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        estadoHorario: 'retardo',
        jornadaCompleta: false,
        turnoActual,
        mensaje: turnoActual.esBloque
          ? `Retardo - Bloque ${turnoActual.index + 1}`
          : `Retardo - Turno ${turnoActual.index + 1}`
      };
    }

    // ❌ Falta (después de ventanaFalta pero antes de salida)
    // 🆕 IMPORTANTE: Se desabilita después de ventanaFalta
    if (minutosActuales > ventanaFalta && minutosActuales <= minSalida) {
      console.log('❌ FALTA - REGISTRO DESHABILITADO');
      return {
        puedeRegistrar: false, // ⚠️ CAMBIADO A FALSE - se desabilita después de tolerancia
        tipoRegistro: 'entrada',
        estadoHorario: 'falta',
        jornadaCompleta: false,
        turnoActual,
        mensaje: turnoActual.esBloque
          ? `Fuera de tolerancia - Bloque ${turnoActual.index + 1}`
          : `Fuera de tolerancia - Turno ${turnoActual.index + 1}`
      };
    }

    // Verificar si hay un bloque/turno futuro
    const bloques = agruparTurnosConsecutivos(horario.turnos);
    const siguienteBloque = bloques[turnoActual.index + 1];
    
    if (siguienteBloque) {
      const primerTurnoSiguiente = siguienteBloque[0];
      const [hESig, mESig] = primerTurnoSiguiente.entrada.split(':').map(Number);
      const minEntradaSiguiente = hESig * 60 + mESig;
      const ventanaInicioSiguiente = minEntradaSiguiente - (tolerancia.minutos_anticipado_max || 60);
      
      if (minutosActuales < ventanaInicioSiguiente) {
        console.log('⏸️ Entre bloques/turnos');
        return {
          puedeRegistrar: false,
          tipoRegistro: 'entrada',
          estadoHorario: 'fuera_horario',
          jornadaCompleta: false,
          turnoActual,
          mensaje: `Entre ${turnoActual.esBloque ? 'bloques' : 'turnos'} ${turnoActual.index + 1} y ${turnoActual.index + 2}`
        };
      }
    }

    // Antes del primer turno/bloque
    if (minutosActuales < ventanaInicio) {
      console.log('⏰ Demasiado temprano');
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        turnoActual,
        mensaje: 'Aún no es hora de entrada'
      };
    }

    // Después del último turno/bloque
    console.log('🔚 Fuera de horario');
    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      turnoActual,
      mensaje: 'Fuera de horario'
    };
  };

  // ✅ Validación de salida CON TOLERANCIA APLICADA Y DESACTIVACIÓN
  const validarSalida = (horario, tolerancia, minutosActuales, totalRegistros = 1) => {
    const turnoActual = encontrarTurnoCorrespondiente(horario.turnos, totalRegistros);
    
    if (!turnoActual) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'salida',
        estadoHorario: 'completado',
        jornadaCompleta: true,
        turnoActual: null,
        mensaje: 'Todos los turnos completados'
      };
    }

    const [hS, mS] = turnoActual.salida.split(':').map(Number);
    const minSalida = hS * 60 + mS;

    // 🆕 APLICAR TOLERANCIA DE SALIDA
    const minutosTolerancia = tolerancia.aplica_tolerancia_salida 
      ? (tolerancia.minutos_retardo || 10) 
      : 10;
    
    const ventanaSalidaInicio = minSalida - minutosTolerancia;
    const ventanaSalidaFin = minSalida + minutosTolerancia; // 🆕 Límite superior de tolerancia

    console.log('🕐 Validando salida:', {
      minutosActuales,
      minSalida,
      ventanaSalidaInicio,
      ventanaSalidaFin,
      turno: turnoActual.index + 1,
      esBloque: turnoActual.esBloque
    });

    // ⚠️ Muy temprano para salida (antes de la ventana)
    if (minutosActuales < ventanaSalidaInicio) {
      console.log('⏰ Muy temprano para salida');
      return {
        puedeRegistrar: false,
        tipoRegistro: 'salida',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        turnoActual,
        mensaje: 'Aún no es hora de salida'
      };
    }

    // ✅ Dentro de la ventana de tolerancia (puede registrar salida)
    if (minutosActuales >= ventanaSalidaInicio && minutosActuales <= ventanaSalidaFin) {
      const esPuntual = minutosActuales >= minSalida;
      console.log(esPuntual ? '✅ SALIDA PUNTUAL' : '⚠️ SALIDA TEMPRANA');
      
      return {
        puedeRegistrar: true,
        tipoRegistro: 'salida',
        estadoHorario: esPuntual ? 'salida_puntual' : 'salida_temprano',
        jornadaCompleta: turnoActual.esUltimo,
        turnoActual,
        mensaje: turnoActual.esBloque
          ? `Salida del bloque ${turnoActual.index + 1}`
          : `Salida del turno ${turnoActual.index + 1}`
      };
    }

    // ❌ Después de la ventana de tolerancia - DESHABILITADO
    if (minutosActuales > ventanaSalidaFin) {
      console.log('❌ FUERA DE TOLERANCIA DE SALIDA - DESHABILITADO');
      return {
        puedeRegistrar: false, // ⚠️ Se desabilita después de la tolerancia
        tipoRegistro: 'salida',
        estadoHorario: 'fuera_tolerancia_salida',
        jornadaCompleta: false,
        turnoActual,
        mensaje: 'Fuera de tolerancia de salida'
      };
    }

    // Fallback
    return {
      puedeRegistrar: false,
      tipoRegistro: 'salida',
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      turnoActual,
      mensaje: 'Fuera de horario'
    };
  };

  // 🆕 Función principal de cálculo de estado
  const calcularEstadoRegistro = useCallback((ultimo, horario, tolerancia) => {
    if (!horario?.trabaja) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        turnoActual: null,
        mensaje: 'No trabajas hoy'
      };
    }

    const ahora = getMinutosDelDia();
    const totalRegistros = ultimo?.totalRegistrosHoy || 0;
    
    console.log('📊 Calculando estado:', {
      ahora,
      totalRegistros,
      ultimoTipo: ultimo?.tipo
    });
    
    // Sin registros previos = primera entrada
    if (!ultimo || totalRegistros === 0) {
      return validarEntrada(horario, tolerancia, ahora, 0);
    }

    // Si el último fue entrada, toca salida
    if (ultimo.tipo === 'entrada') {
      return validarSalida(horario, tolerancia, ahora, totalRegistros);
    }
    
    // Si el último fue salida, toca entrada (del siguiente turno o completado)
    if (ultimo.tipo === 'salida') {
      return validarEntrada(horario, tolerancia, ahora, totalRegistros);
    }

    // Fallback
    return validarEntrada(horario, tolerancia, ahora, totalRegistros);
  }, []);

  // 📥 Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      try {
        console.log('📥 Cargando datos...');
        
        const [ultimo, horario, tolerancia, deptos] = await Promise.all([
          obtenerUltimoRegistro(),
          obtenerHorario(),
          obtenerTolerancia(),
          obtenerDepartamentos()
        ]);

        console.log('📊 Datos cargados:', {
          ultimo,
          horario,
          tolerancia,
          totalDeptos: deptos.length
        });

        setUltimoRegistroHoy(ultimo);
        setHorarioInfo(horario);
        setToleranciaInfo(tolerancia);
        setDepartamentos(deptos);

        if (horario && tolerancia) {
          const estado = calcularEstadoRegistro(ultimo, horario, tolerancia);
          console.log('📊 Estado calculado:', estado);
          
          setPuedeRegistrar(estado.puedeRegistrar);
          setTipoSiguienteRegistro(estado.tipoRegistro);
          setEstadoHorario(estado.estadoHorario);
          setJornadaCompletada(estado.jornadaCompleta);
          setTurnoActual(estado.turnoActual);
        }
      } catch (err) {
        console.error('❌ Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [obtenerUltimoRegistro, obtenerHorario, obtenerTolerancia, obtenerDepartamentos, calcularEstadoRegistro]);

  // 📍 Gestión de ubicación
  useEffect(() => {
    let locationSubscription = null;

    const iniciarUbicacion = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        setUbicacionActual({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10
          },
          (newLocation) => {
            setUbicacionActual({
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude
            });
          }
        );
      } catch (err) {
        console.error('❌ Error ubicación:', err);
      }
    };

    iniciarUbicacion();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // 🗺️ Validar si está dentro del área
  useEffect(() => {
    if (!ubicacionActual || !departamentos.length) {
      setDentroDelArea(false);
      setDepartamentosDisponibles([]);
      setDepartamentoSeleccionado(null);
      return;
    }

    const deptsDisponibles = [];

    for (const depto of departamentos) {
      try {
        const coordenadas = extraerCoordenadas(depto.ubicacion);
        if (!coordenadas || coordenadas.length < 3) continue;

        const dentro = isPointInPolygon(ubicacionActual, coordenadas);
        
        if (dentro) {
          deptsDisponibles.push(depto);
        }
      } catch (err) {
        continue;
      }
    }

    setDepartamentosDisponibles(deptsDisponibles);
    setDentroDelArea(deptsDisponibles.length > 0);
    
    if (deptsDisponibles.length > 0 && !departamentoSeleccionado) {
      setDepartamentoSeleccionado(deptsDisponibles[0]);
    }
    
    if (departamentoSeleccionado && !deptsDisponibles.find(d => d.id === departamentoSeleccionado.id)) {
      setDepartamentoSeleccionado(deptsDisponibles[0] || null);
    }
  }, [ubicacionActual, departamentos, departamentoSeleccionado]);

  // 📝 Manejar registro de asistencia
  const handleRegistro = async () => {
    if (!userData || !userData.empleado_id || !userData.token) {
      Alert.alert('Error', 'No se pudo identificar tu información de usuario.');
      return;
    }

    if (!horarioInfo?.trabaja) {
      Alert.alert('Error', 'No tienes un horario configurado para hoy.');
      return;
    }

    if (!puedeRegistrar || !dentroDelArea || !departamentoSeleccionado) {
      let mensaje = 'No puedes registrar en este momento';
      
      if (!dentroDelArea) {
        mensaje = 'Debes estar dentro de un área permitida';
      } else if (!departamentoSeleccionado) {
        mensaje = 'Selecciona un departamento para registrar';
      } else if (jornadaCompletada) {
        mensaje = 'Ya completaste tu jornada de hoy';
      } else if (estadoHorario === 'fuera_horario') {
        mensaje = 'Estás fuera de tu horario laboral';
      }
      Alert.alert('No disponible', mensaje);
      return;
    }

    if (!ubicacionActual?.lat || !ubicacionActual?.lng) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación.');
      return;
    }

    let estadoMensaje = '';
    
    if (tipoSiguienteRegistro === 'salida') {
      estadoMensaje = '✅ Salida';
    } else {
      if (estadoHorario === 'puntual') {
        estadoMensaje = '✅ Puntual';
      } else if (estadoHorario === 'retardo') {
        estadoMensaje = '⚠️ Con retardo';
      } else if (estadoHorario === 'falta') {
        estadoMensaje = '❌ Fuera de tolerancia';
      }
    }

    const tipoTexto = tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida';
    const identificador = turnoActual 
      ? (turnoActual.esBloque 
          ? `Bloque ${turnoActual.index + 1} (${turnoActual.turnosEnBloque} turnos consecutivos)`
          : `Turno ${turnoActual.index + 1}`)
      : '';

    Alert.alert(
      `Confirmar ${tipoTexto}`,
      `¿Deseas registrar tu ${tipoTexto.toLowerCase()}?\n\n${estadoMensaje}${identificador ? `\n${identificador}` : ''}\n\nDepartamento: ${departamentoSeleccionado.nombre}\nHora: ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setRegistrando(true);

            try {
              console.log('📤 Registrando asistencia...');
              
              // 🆕 Usar servicio de asistencia
              const data = await asistenciaService.registrarAsistencia(
                userData.empleado_id,
                ubicacionActual,
                userData.token,
                departamentoSeleccionado.id
              );

              console.log('✅ Registro exitoso:', data);

              // Actualizar estado local
              const nuevoUltimo = await obtenerUltimoRegistro();
              setUltimoRegistroHoy(nuevoUltimo);
              
              if (horarioInfo && toleranciaInfo) {
                const nuevoEstado = calcularEstadoRegistro(nuevoUltimo, horarioInfo, toleranciaInfo);
                setPuedeRegistrar(nuevoEstado.puedeRegistrar);
                setTipoSiguienteRegistro(nuevoEstado.tipoRegistro);
                setEstadoHorario(nuevoEstado.estadoHorario);
                setJornadaCompletada(nuevoEstado.jornadaCompleta);
                setTurnoActual(nuevoEstado.turnoActual);
              }

              let estadoTexto = '';
              let emojiResultado = '✅';

              if (data.data?.tipo === 'salida') {
                estadoTexto = data.data.estado === 'salida_temprano' ? 'salida temprana' : 'salida';
                emojiResultado = '✅';
              } else {
                if (data.data?.estado === 'retardo') {
                  estadoTexto = 'retardo';
                  emojiResultado = '⚠️';
                } else if (data.data?.estado === 'falta') {
                  estadoTexto = 'falta';
                  emojiResultado = '❌';
                } else {
                  estadoTexto = 'puntual';
                  emojiResultado = '✅';
                }
              }

              Alert.alert(
                '¡Éxito!',
                `${emojiResultado} ${data.data?.tipo === 'salida' ? 'Salida' : 'Entrada'} registrada como ${estadoTexto}\nDepartamento: ${departamentoSeleccionado.nombre}\nHora: ${new Date(data.data?.fecha_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
                [{ text: 'OK' }]
              );

              if (onRegistroExitoso) {
                onRegistroExitoso(data);
              }
            } catch (err) {
              console.error('❌ Error al registrar:', err);
              Alert.alert('Error', err.message || 'No se pudo registrar');
            } finally {
              setRegistrando(false);
            }
          }
        }
      ]
    );
  };

  const getButtonColor = () => {
    if (jornadaCompletada) return '#6b7280';
    if (!dentroDelArea || !puedeRegistrar) return '#ef4444';
    if (tipoSiguienteRegistro === 'salida' && puedeRegistrar) return '#10b981';
    if (estadoHorario === 'puntual') return '#10b981';
    if (estadoHorario === 'retardo') return '#f59e0b';
    if (estadoHorario === 'falta') return '#ef4444';
    if (estadoHorario === 'salida_temprano') return '#f59e0b';
    return '#6b7280';
  };

  const getIcon = () => {
    if (jornadaCompletada) return 'checkmark-done-circle';
    if (!dentroDelArea) return 'location';
    if (!puedeRegistrar) return 'time';
    if (tipoSiguienteRegistro === 'salida') return 'log-out';
    if (estadoHorario === 'puntual') return 'checkmark-circle';
    if (estadoHorario === 'retardo') return 'time';
    if (estadoHorario === 'falta') return 'alert-circle';
    return 'time';
  };

  const getStatusText = () => {
    if (jornadaCompletada) return 'Jornada completada';
    if (!dentroDelArea) return 'Fuera del área';
    if (!puedeRegistrar) return 'Fuera de horario';
    if (tipoSiguienteRegistro === 'salida' && puedeRegistrar) return 'Listo para salida';
    if (estadoHorario === 'puntual') return 'Listo para registrar';
    if (estadoHorario === 'retardo') return 'Registro con retardo';
    if (estadoHorario === 'falta') return 'Fuera de tolerancia';
    return 'Verificando...';
  };

  const getButtonText = () => {
    if (jornadaCompletada) return 'Jornada completada';
    if (!puedeRegistrar || !dentroDelArea) return 'No disponible';
    
    if (turnoActual) {
      if (turnoActual.esBloque) {
        const bloqueTexto = `B${turnoActual.index + 1}`;
        return `Registrar ${tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida'} ${bloqueTexto}`;
      } else {
        const turnoTexto = `T${turnoActual.index + 1}`;
        return `Registrar ${tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida'} ${turnoTexto}`;
      }
    }
    
    return `Registrar ${tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida'}`;
  };

  const puedePresionarBoton = puedeRegistrar && dentroDelArea && !jornadaCompletada && !registrando && departamentoSeleccionado;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: `${getButtonColor()}15` }]}>
            {loading ? (
              <ActivityIndicator size="small" color={getButtonColor()} />
            ) : (
              <Ionicons name={getIcon()} size={16} color={getButtonColor()} />
            )}
            <Text style={[styles.statusText, { color: getButtonColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Hora actual</Text>
            <Text style={styles.timeValue}>
              {horaActual.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </Text>
            {turnoActual && horarioInfo?.tipo === 'quebrado' && (
              <Text style={styles.turnoInfo}>
                {turnoActual.esBloque 
                  ? `Bloque ${turnoActual.index + 1} (${turnoActual.turnosEnBloque} turnos) · ${turnoActual.entrada} - ${turnoActual.salida}`
                  : `Turno ${turnoActual.index + 1} de ${horarioInfo.turnos.length} · ${turnoActual.entrada} - ${turnoActual.salida}`
                }
              </Text>
            )}
          </View>

          {!loading && !jornadaCompletada && (
            <View style={styles.statusIndicators}>
              <View style={styles.indicator}>
                <Ionicons 
                  name={dentroDelArea ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color={dentroDelArea ? '#10b981' : '#ef4444'} 
                />
                <Text style={[styles.indicatorText, { color: dentroDelArea ? '#10b981' : '#ef4444' }]}>
                  {dentroDelArea ? 'Dentro de zona' : 'Fuera de zona'}
                </Text>
              </View>

              <View style={styles.indicator}>
                <Ionicons 
                  name={
                    tipoSiguienteRegistro === 'salida' ? 'checkmark-circle' :
                    estadoHorario === 'puntual' ? 'checkmark-circle' :
                    estadoHorario === 'retardo' ? 'time' :
                    estadoHorario === 'falta' ? 'alert-circle' :
                    'close-circle'
                  } 
                  size={16} 
                  color={
                    tipoSiguienteRegistro === 'salida' && puedeRegistrar ? '#10b981' :
                    estadoHorario === 'puntual' ? '#10b981' :
                    estadoHorario === 'retardo' ? '#f59e0b' :
                    estadoHorario === 'falta' ? '#ef4444' :
                    '#ef4444'
                  } 
                />
                <Text style={[
                  styles.indicatorText, 
                  { 
                    color: tipoSiguienteRegistro === 'salida' && puedeRegistrar ? '#10b981' :
                           estadoHorario === 'puntual' ? '#10b981' :
                           estadoHorario === 'retardo' ? '#f59e0b' :
                           estadoHorario === 'falta' ? '#ef4444' :
                           '#ef4444'
                  }
                ]}>
                  {tipoSiguienteRegistro === 'salida' && puedeRegistrar ? 'Hora de salida' :
                   estadoHorario === 'puntual' ? 'A tiempo' :
                   estadoHorario === 'retardo' ? 'Con retardo' :
                   estadoHorario === 'falta' ? 'Fuera tolerancia' :
                   'Fuera de horario'}
                </Text>
              </View>
            </View>
          )}

          {!loading && ubicacionActual && departamentos.length > 0 && (
            <>
              <TouchableOpacity 
                style={styles.locationInfo}
                onPress={() => {
                  if (departamentosDisponibles.length > 0) {
                    setMostrarDepartamentos(true);
                  } else {
                    setMostrarMapa(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={dentroDelArea ? "location" : "location-outline"} 
                  size={14} 
                  color={dentroDelArea ? "#10b981" : "#6b7280"} 
                />
                <Text style={styles.locationText} numberOfLines={1}>
                  {dentroDelArea && departamentoSeleccionado
                    ? departamentoSeleccionado.nombre
                    : dentroDelArea && departamentosDisponibles.length > 0
                    ? `${departamentosDisponibles.length} ${departamentosDisponibles.length === 1 ? 'disponible' : 'disponibles'}`
                    : 'Mi ubicación'
                  }
                </Text>
                {departamentosDisponibles.length > 1 ? (
                  <Ionicons name="chevron-down" size={14} color="#6b7280" style={{ marginLeft: 4 }} />
                ) : !dentroDelArea ? (
                  <Ionicons name="map-outline" size={14} color="#6b7280" style={{ marginLeft: 4 }} />
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.viewMapButton}
                onPress={() => setMostrarMapa(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="map-outline" size={14} color="#3b82f6" />
                <Text style={styles.viewMapText}>
                  {dentroDelArea ? 'Ver mapa de zonas' : 'Ver mi ubicación en el mapa'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.registerButton,
              { backgroundColor: getButtonColor() },
              !puedePresionarBoton && styles.registerButtonDisabled
            ]}
            onPress={handleRegistro}
            disabled={!puedePresionarBoton}
            activeOpacity={0.7}
          >
            {registrando ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.registerButtonText}>Registrando...</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={puedePresionarBoton ? 'finger-print' : jornadaCompletada ? 'checkmark-done' : 'lock-closed'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.registerButtonText}>
                  {getButtonText()}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {ultimoRegistroHoy && (
            <View style={styles.lastRegisterContainer}>
              <View style={styles.lastRegisterIcon}>
                <Ionicons
                  name={ultimoRegistroHoy.tipo === 'entrada' ? 'log-in' : 'log-out'}
                  size={12}
                  color="#9ca3af"
                />
              </View>
              <Text style={styles.lastRegisterText}>
                Último: {ultimoRegistroHoy.tipo === 'entrada' ? 'Entrada' : 'Salida'} · {ultimoRegistroHoy.hora}
                {ultimoRegistroHoy.estado && ` · ${ultimoRegistroHoy.estado}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal de departamentos disponibles */}
      {departamentosDisponibles.length > 0 && (
        <Modal
          visible={mostrarDepartamentos}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMostrarDepartamentos(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMostrarDepartamentos(false)}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Departamentos Disponibles</Text>
                <TouchableOpacity 
                  onPress={() => setMostrarDepartamentos(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.departamentosList}>
                {departamentosDisponibles.map((depto, index) => {
                  const esSeleccionado = departamentoSeleccionado?.id === depto.id;
                  
                  return (
                    <TouchableOpacity
                      key={depto.id || index}
                      style={[
                        styles.departamentoItem,
                        esSeleccionado && styles.departamentoItemActivo
                      ]}
                      onPress={() => {
                        setDepartamentoSeleccionado(depto);
                        setMostrarDepartamentos(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.departamentoInfo}>
                        <View style={styles.departamentoHeader}>
                          <Ionicons 
                            name={esSeleccionado ? 'location' : 'location-outline'} 
                            size={20} 
                            color={esSeleccionado ? '#10b981' : '#6b7280'} 
                          />
                          <Text style={[
                            styles.departamentoNombre,
                            esSeleccionado && styles.departamentoNombreActivo
                          ]}>
                            {depto.nombre}
                          </Text>
                        </View>
                        
                        {esSeleccionado && (
                          <View style={styles.departamentoBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.departamentoBadgeText}>Seleccionado para registro</Text>
                          </View>
                        )}
                      </View>

                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={16} color="#3b82f6" />
                  <Text style={styles.infoBoxText}>
                    Estás dentro de {departamentosDisponibles.length} {departamentosDisponibles.length === 1 ? 'departamento' : 'departamentos'}. Selecciona uno para registrar.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Modal del mapa */}
      {departamentos.length > 0 && (
        <Modal
          visible={mostrarMapa}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMostrarMapa(false)}
        >
          <MapScreen
            departamento={departamentoSeleccionado}
            departamentos={departamentos}
            ubicacionActual={ubicacionActual}
            onClose={() => setMostrarMapa(false)}
            onDepartamentoSeleccionado={(depto) => {
              if (departamentosDisponibles.find(d => d.id === depto.id)) {
                setDepartamentoSeleccionado(depto);
              }
            }}
            darkMode={darkMode}
          />
        </Modal>
      )}
    </>
  );
};

// Estilos (mantener los mismos)
const registerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    gap: 8,
  },
  timeContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  timeLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -1,
  },
  turnoInfo: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  statusIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 2,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  lastRegisterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 2,
  },
  lastRegisterIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastRegisterText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  departamentosList: {
    padding: 16,
  },
  departamentoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  departamentoItemActivo: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  departamentoInfo: {
    flex: 1,
    gap: 6,
  },
  departamentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  departamentoNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  departamentoNombreActivo: {
    color: '#059669',
  },
  departamentoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 28,
  },
  departamentoBadgeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewMapText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

const registerStylesDark = StyleSheet.create({
  ...registerStyles,
  container: {
    ...registerStyles.container,
    backgroundColor: '#1f2937',
  },
  timeValue: {
    ...registerStyles.timeValue,
    color: '#fff',
  },
  turnoInfo: {
    ...registerStyles.turnoInfo,
    color: '#9ca3af',
  },
  locationInfo: {
    ...registerStyles.locationInfo,
    backgroundColor: '#374151',
  },
  lastRegisterContainer: {
    ...registerStyles.lastRegisterContainer,
    borderTopColor: '#374151',
  },
  lastRegisterIcon: {
    ...registerStyles.lastRegisterIcon,
    backgroundColor: '#374151',
  },
  modalContent: {
    ...registerStyles.modalContent,
    backgroundColor: '#1f2937',
  },
  modalHeader: {
    ...registerStyles.modalHeader,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    ...registerStyles.modalTitle,
    color: '#fff',
  },
  modalCloseButton: {
    ...registerStyles.modalCloseButton,
    backgroundColor: '#374151',
  },
  departamentoItem: {
    ...registerStyles.departamentoItem,
    backgroundColor: '#374151',
  },
  departamentoItemActivo: {
    ...registerStyles.departamentoItemActivo,
    backgroundColor: '#1e3a2f',
  },
  departamentoNombre: {
    ...registerStyles.departamentoNombre,
    color: '#fff',
  },
  modalFooter: {
    ...registerStyles.modalFooter,
    borderTopColor: '#374151',
  },
  infoBox: {
    ...registerStyles.infoBox,
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  infoBoxText: {
    ...registerStyles.infoBoxText,
    color: '#93c5fd',
  },
  viewMapButton: {
    ...registerStyles.viewMapButton,
    backgroundColor: '#1e3a5f',
  },
});

export default RegisterButton;