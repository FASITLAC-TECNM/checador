import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { getApiEndpoint } from '../../config/api';
import { getCredencialesByEmpleado, verificarPin } from '../../services/credencialesService';
import { getOrdenCredenciales } from '../../services/configurationService';
import { capturarHuellaDigital } from '../../services/biometricservice';
import { processFaceData, validateFaceQuality, generateFacialTemplate } from '../../services/facialCameraService';
import { verifyFace } from '../../services/faceComparisonService';
import { PinInputModal } from '../settingsPages/PinModal';
import { FacialCaptureScreen } from '../../services/FacialCaptureScreen';
import MapaZonasPermitidas from './MapScreen';
import { notificarRegistro, notificarEstadoAsistencia } from '../../services/localNotificationService';

// Offline Services
import sqliteManager from '../../services/offline/sqliteManager.mjs';
import offlineAuthService from '../../services/offline/offlineAuthService.mjs';
import syncManager from '../../services/offline/syncManager.mjs';
import pushService from '../../services/offline/pushService.mjs';

const API_URL = getApiEndpoint('/api');
const MINUTOS_SEPARACION_TURNOS = 15;

export const RegisterButton = ({ userData, darkMode, onRegistroExitoso }) => {
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [mostrarDepartamentos, setMostrarDepartamentos] = useState(false);

  const [mostrarAutenticacion, setMostrarAutenticacion] = useState(false);
  const [mostrarPinAuth, setMostrarPinAuth] = useState(false);
  const [mostrarCapturaFacial, setMostrarCapturaFacial] = useState(false);
  const [credencialesUsuario, setCredencialesUsuario] = useState(null);
  const [metodosDisponibles, setMetodosDisponibles] = useState([]);
  const [ordenCredenciales, setOrdenCredenciales] = useState([]);

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
  const [mensajeEspera, setMensajeEspera] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  const datosRegistroRef = useRef({
    ubicacion: null,
    departamento: null
  });
  const notificadoEstadoRef = useRef(null);

  // ─── refs para que procederConRegistro siempre lea valores frescos ───
  const horarioInfoRef = useRef(null);
  const toleranciaInfoRef = useRef(null);
  const ultimoRegistroHoyRef = useRef(null);
  const tipoSiguienteRegistroRef = useRef('entrada');
  const isOnlineRef = useRef(false);
  // ──────────────────────────────────────────────────────────────────────────

  const styles = darkMode ? registerStylesDark : registerStyles;
  const [horaActual, setHoraActual] = useState(new Date());

  // Mantener refs sincronizados con el estado
  useEffect(() => { horarioInfoRef.current = horarioInfo; }, [horarioInfo]);
  useEffect(() => { toleranciaInfoRef.current = toleranciaInfo; }, [toleranciaInfo]);
  useEffect(() => { ultimoRegistroHoyRef.current = ultimoRegistroHoy; }, [ultimoRegistroHoy]);
  useEffect(() => { tipoSiguienteRegistroRef.current = tipoSiguienteRegistro; }, [tipoSiguienteRegistro]);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  useEffect(() => {
    cargarCredencialesYOrden();
    syncManager.initAutoSync();
  }, []);

  const cargarCredencialesYOrden = async () => {
    try {
      const credsResponse = await getCredencialesByEmpleado(
        userData.empleado_id,
        userData.token
      );

      const creds = credsResponse.data || {
        tiene_dactilar: false,
        tiene_facial: false,
        tiene_pin: false
      };
      setCredencialesUsuario(creds);

      const ordenResponse = await getOrdenCredenciales(userData.token);
      const orden = ordenResponse.ordenCredenciales || ['pin', 'dactilar', 'facial'];
      const ordenArray = Array.isArray(orden)
        ? orden
        : Object.entries(orden)
          .sort((a, b) => (a[1]?.prioridad ?? 99) - (b[1]?.prioridad ?? 99))
          .map(([key]) => key);

      setOrdenCredenciales(ordenArray);
      construirMetodosDisponibles(creds, ordenArray);

    } catch (error) {
      console.log('Using offline credentials');
      try {
        const creds = await sqliteManager.getAllCredenciales();
        const misCreds = creds.filter(c => c.empleado_id === userData.empleado_id);

        const tienePin = misCreds.some(c => c.pin_hash);
        const tieneDactilar = misCreds.some(c => c.dactilar_template);
        const tieneFacial = misCreds.some(c => c.facial_descriptor);

        const offlineCreds = {
          tiene_pin: tienePin,
          tiene_dactilar: tieneDactilar,
          tiene_facial: tieneFacial,
          _offlineMode: true
        };

        setCredencialesUsuario(offlineCreds);
        construirMetodosDisponibles(offlineCreds, ['pin', 'dactilar']);

      } catch (offlineError) {
        setCredencialesUsuario({
          tiene_dactilar: false,
          tiene_facial: false,
          tiene_pin: false
        });
      }
    }
  };

  const construirMetodosDisponibles = (credenciales, orden) => {
    const metodosBase = {
      'pin': {
        id: 'pin',
        nombre: 'PIN',
        icono: 'keypad',
        disponible: credenciales?.tiene_pin || false,
      },
      'dactilar': {
        id: 'dactilar',
        nombre: 'Huella',
        icono: 'finger-print',
        disponible: credenciales?.tiene_dactilar || false,
      },
      'facial': {
        id: 'facial',
        nombre: 'Facial',
        icono: 'scan',
        disponible: credenciales?.tiene_facial || false,
      }
    };

    const metodosOrdenados = orden
      .map(key => metodosBase[key])
      .filter(metodo => metodo && metodo.disponible);

    setMetodosDisponibles(metodosOrdenados);
  };

  const getHandlerForMetodo = (metodoId) => {
    switch (metodoId) {
      case 'pin': return handleAutenticacionPin;
      case 'dactilar': return handleAutenticacionHuella;
      case 'facial': return handleAutenticacionFacial;
      default: return () => { };
    }
  };

  const handleAutenticacionPin = useCallback(() => {
    setMostrarAutenticacion(false);
    setTimeout(() => {
      setMostrarPinAuth(true);
    }, 150);
  }, []);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      setHoraActual(new Date());

      if (horarioInfoRef.current && toleranciaInfoRef.current) {
        let onlineNow = false;
        try { onlineNow = await syncManager.isOnline(); } catch (e) { /* offline */ }
        setIsOnline(onlineNow);
        const estado = calcularEstadoRegistro(
          ultimoRegistroHoyRef.current,
          horarioInfoRef.current,
          toleranciaInfoRef.current,
          onlineNow
        );
        setPuedeRegistrar(estado.puedeRegistrar);
        setTipoSiguienteRegistro(estado.tipoRegistro);
        setEstadoHorario(estado.estadoHorario);
        setJornadaCompletada(estado.jornadaCompleta);
        setMensajeEspera(estado.mensajeEspera || '');

        const claveEstado = `${estado.puedeRegistrar}-${estado.tipoRegistro}`;
        if (estado.puedeRegistrar && claveEstado !== notificadoEstadoRef.current) {
          notificadoEstadoRef.current = claveEstado;
          notificarEstadoAsistencia(estado.tipoRegistro);
        } else if (!estado.puedeRegistrar) {
          notificadoEstadoRef.current = null;
        }
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [calcularEstadoRegistro]);

  const getDiaSemana = () => {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return dias[new Date().getDay()];
  };

  const getMinutosDelDia = (fecha = new Date()) => {
    return fecha.getHours() * 60 + fecha.getMinutes();
  };

  const agruparTurnosConcatenados = (turnos) => {
    if (!turnos || !Array.isArray(turnos) || turnos.length === 0) {
      return [];
    }

    if (turnos.length === 1) {
      return [turnos];
    }

    const grupos = [];
    let grupoActual = [turnos[0]];

    for (let i = 1; i < turnos.length; i++) {
      const turnoAnterior = grupoActual[grupoActual.length - 1];
      const turnoActual = turnos[i];

      if (!turnoAnterior?.salida || !turnoActual?.entrada) {
        continue;
      }

      const [hSalida, mSalida] = turnoAnterior.salida.split(':').map(Number);
      const minutosSalida = hSalida * 60 + mSalida;

      const [hEntrada, mEntrada] = turnoActual.entrada.split(':').map(Number);
      const minutosEntrada = hEntrada * 60 + mEntrada;

      const diferencia = minutosEntrada - minutosSalida;

      if (diferencia <= MINUTOS_SEPARACION_TURNOS) {
        grupoActual.push(turnoActual);
      } else {
        grupos.push(grupoActual);
        grupoActual = [turnoActual];
      }
    }

    grupos.push(grupoActual);
    return grupos;
  };

  const getEntradaSalidaGrupo = (grupo) => {
    if (!grupo || !Array.isArray(grupo) || grupo.length === 0) {
      return { entrada: '00:00', salida: '00:00' };
    }

    return {
      entrada: grupo[0]?.entrada || '00:00',
      salida: grupo[grupo.length - 1]?.salida || '00:00'
    };
  };

  const obtenerUltimoRegistro = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return null;

      const online = await syncManager.isOnline();

      if (online) {
        try {
          const response = await fetch(
            `${API_URL}/asistencias/empleado/${empleadoId}`,
            {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.data?.length) {
              const hoy = new Date().toDateString();
              const registrosHoy = data.data.filter(registro => {
                const fechaRegistro = new Date(registro.fecha_registro);
                return fechaRegistro.toDateString() === hoy;
              });

              if (registrosHoy.length > 0) {
                const ultimo = registrosHoy[0];
                return {
                  tipo: ultimo.tipo,
                  estado: ultimo.estado,
                  fecha_registro: new Date(ultimo.fecha_registro),
                  hora: new Date(ultimo.fecha_registro).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }),
                  totalRegistrosHoy: registrosHoy.length
                };
              }
            }
          }
        } catch (e) {
          console.log('Online fetch failed, falling back to offline');
        }
      }

      const registrosOffline = await sqliteManager.getRegistrosHoy(empleadoId);

      if (registrosOffline && registrosOffline.length > 0) {
        const ultimo = registrosOffline[registrosOffline.length - 1];

        return {
          tipo: ultimo.tipo,
          estado: ultimo.estado,
          fecha_registro: new Date(ultimo.fecha_registro),
          hora: new Date(ultimo.fecha_registro).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          totalRegistrosHoy: registrosOffline.length
        };
      }

      return null;
    } catch (err) {
      return null;
    }
  }, [userData]);

  const obtenerHorario = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return null;

      let horario = null;
      const online = await syncManager.isOnline();

      if (online) {
        try {
          const response = await fetch(
            `${API_URL}/empleados/${empleadoId}/horario`,
            {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            horario = data.data || data.horario || data;
          }
        } catch (e) { console.log('Online horario failed'); }
      }

      if (!horario) {
        const hLocal = await sqliteManager.getHorario(empleadoId);
        if (hLocal) {
          horario = hLocal;
        }
      }

      if (!horario?.configuracion) return null;

      let config = typeof horario.configuracion === 'string'
        ? JSON.parse(horario.configuracion)
        : horario.configuracion;

      const diaHoy = getDiaSemana();
      let turnosHoy = [];

      if (config.configuracion_semanal?.[diaHoy]) {
        turnosHoy = config.configuracion_semanal[diaHoy].map(t => ({
          entrada: t.inicio,
          salida: t.fin
        }));
      } else if (config.dias?.includes(diaHoy)) {
        turnosHoy = config.turnos || [];
      }

      if (!turnosHoy || !Array.isArray(turnosHoy) || turnosHoy.length === 0) {
        return {
          trabaja: false,
          turnos: [],
          gruposTurnos: [],
          entrada: null,
          salida: null,
          tipo: 'continuo'
        };
      }

      const gruposTurnos = agruparTurnosConcatenados(turnosHoy);

      return {
        trabaja: true,
        turnos: turnosHoy,
        gruposTurnos: gruposTurnos,
        entrada: turnosHoy[0]?.entrada || null,
        salida: turnosHoy[turnosHoy.length - 1]?.salida || null,
        tipo: gruposTurnos.length > 1 ? 'quebrado' : 'continuo'
      };
    } catch (err) {
      return null;
    }
  }, [userData]);

  const obtenerTolerancia = useCallback(async () => {
    const defaultTolerancia = {
      minutos_retardo: 10,
      minutos_falta: 30,
      permite_registro_anticipado: true,
      minutos_anticipado_max: 60,
      aplica_tolerancia_salida: false,
      minutos_anticipado_salida: 10
    };

    try {
      let tolerancia = null;
      const online = await syncManager.isOnline();

      if (online) {
        try {
          const rolesResponse = await fetch(
            `${API_URL}/usuarios/${userData.id}/roles`,
            {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            const roles = rolesData.data || [];
            const rolConTolerancia = roles
              .filter(r => r.tolerancia_id)
              .sort((a, b) => b.posicion - a.posicion)[0];

            if (rolConTolerancia) {
              const toleranciaResponse = await fetch(
                `${API_URL}/tolerancias/${rolConTolerancia.tolerancia_id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${userData.token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              if (toleranciaResponse.ok) {
                const toleranciaData = await toleranciaResponse.json();
                tolerancia = toleranciaData.data || toleranciaData;
              }
            }
          }
        } catch (e) { console.log('Online tolerancia failed'); }
      }

      if (!tolerancia) {
        tolerancia = await sqliteManager.getTolerancia(userData.empleado_id);
      }

      if (!tolerancia) return defaultTolerancia;

      return {
        ...defaultTolerancia,
        ...tolerancia,
        minutos_anticipado_salida: tolerancia.minutos_anticipado_salida || tolerancia.minutos_retardo || 10
      };
    } catch (err) {
      return defaultTolerancia;
    }
  }, [userData]);

  const obtenerDepartamentos = useCallback(async () => {
    try {
      const departamentosAsignados = userData?.empleadoInfo?.departamentos;

      if (!departamentosAsignados || departamentosAsignados.length === 0) {
        return [];
      }

      const promesas = departamentosAsignados.map(async (depto) => {
        try {
          const online = await syncManager.isOnline();
          if (online) {
            const response = await fetch(
              `${API_URL}/departamentos/${depto.id}`,
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
          }
          return null;
        } catch (err) {
          return null;
        }
      });

      let resultados = await Promise.all(promesas);
      resultados = resultados.filter(d => d !== null);

      if (resultados.length === 0) {
        const cached = await sqliteManager.getDepartamentos(userData.empleado_id);
        if (cached && cached.length > 0) {
          resultados = cached.map(c => ({
            id: c.departamento_id,
            nombre: c.nombre,
            ubicacion: c.ubicacion || null,
            es_activo: c.es_activo
          }));
        }
      }

      return resultados;
    } catch (err) {
      return [];
    }
  }, [userData]);

  // ============================================================
  // VALIDACIÓN DE ENTRADA
  // ============================================================
  const validarEntrada = (horario, tolerancia, minutosActuales, totalRegistrosHoy = 0) => {
    if (!horario?.gruposTurnos || !Array.isArray(horario.gruposTurnos) || horario.gruposTurnos.length === 0) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        mensaje: 'No hay turnos configurados'
      };
    }

    const numeroGrupo = Math.floor(totalRegistrosHoy / 2);

    if (numeroGrupo >= horario.gruposTurnos.length) {
      let hayTurnoFuturo = false;
      for (const grupo of horario.gruposTurnos) {
        const { entrada: horaEntrada } = getEntradaSalidaGrupo(grupo);
        const [hE, mE] = horaEntrada.split(':').map(Number);
        const ventanaInicio = hE * 60 + mE - (tolerancia.minutos_anticipado_max || 60);
        if (minutosActuales < ventanaInicio) {
          hayTurnoFuturo = true;
          break;
        }
      }
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: !hayTurnoFuturo,
        hayTurnoFuturo,
        mensaje: hayTurnoFuturo ? 'Aún no es hora de entrada' : 'Jornada completada'
      };
    }

    const grupoActual = horario.gruposTurnos[numeroGrupo];
    const { entrada: horaEntrada, salida: horaSalida } = getEntradaSalidaGrupo(grupoActual);

    if (!horaEntrada || !horaSalida) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        mensaje: 'Configuración de turno inválida'
      };
    }

    const [hE, mE] = horaEntrada.split(':').map(Number);
    const [hS, mS] = horaSalida.split(':').map(Number);
    const minEntrada = hE * 60 + mE;
    const minSalida = hS * 60 + mS;

    const ventanaInicio = minEntrada - (tolerancia.minutos_anticipado_max || 60);
    const ventanaRetardo = minEntrada + (tolerancia.minutos_retardo || 10);
    const ventanaFalta = minEntrada + (tolerancia.minutos_falta || 30);

    if (minutosActuales < ventanaInicio) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        hayTurnoFuturo: true,
        mensaje: 'Aún no es hora de entrada'
      };
    }

    if (minutosActuales >= ventanaInicio && minutosActuales <= ventanaRetardo) {
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        estadoHorario: 'puntual',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        mensaje: 'Puedes registrar tu entrada'
      };
    }

    if (minutosActuales > ventanaRetardo && minutosActuales <= ventanaFalta) {
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        estadoHorario: 'retardo',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        mensaje: 'Registro con retardo'
      };
    }

    if (minutosActuales > ventanaFalta && minutosActuales <= minSalida) {
      return {
        puedeRegistrar: true,
        tipoRegistro: 'entrada',
        estadoHorario: 'falta',
        jornadaCompleta: false,
        hayTurnoFuturo: false,
        mensaje: 'Fuera de tolerancia (falta)'
      };
    }

    return {
      puedeRegistrar: false,
      tipoRegistro: 'entrada',
      estadoHorario: 'fuera_horario',
      jornadaCompleta: false,
      hayTurnoFuturo: false,
      mensaje: 'Fuera de horario'
    };
  };

  // ============================================================
  // VALIDACIÓN DE SALIDA
  // ============================================================
  const validarSalida = (horario, minutosActuales, ultimoRegistro, tolerancia, esOnline = false) => {
    if (!horario?.gruposTurnos || !Array.isArray(horario.gruposTurnos) || horario.gruposTurnos.length === 0) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'salida',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        mensaje: 'No hay turnos configurados'
      };
    }

    const totalRegistros = ultimoRegistro?.totalRegistrosHoy || 1;
    const numeroGrupo = Math.floor((totalRegistros - 1) / 2);

    if (numeroGrupo < 0 || numeroGrupo >= horario.gruposTurnos.length) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'salida',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        mensaje: 'Fuera de horario'
      };
    }

    const grupoActual = horario.gruposTurnos[numeroGrupo];
    const { entrada: horaEntrada, salida: horaSalida } = getEntradaSalidaGrupo(grupoActual);
    const [hS, mS] = horaSalida.split(':').map(Number);
    const minSalida = hS * 60 + mS;

    if (ultimoRegistro && ultimoRegistro.tipo === 'entrada' && ultimoRegistro.fecha_registro && tolerancia) {
      const ahora = new Date();
      const horaUltimoRegistro = new Date(ultimoRegistro.fecha_registro);
      const minutosUltimaEntrada = horaUltimoRegistro.getHours() * 60 + horaUltimoRegistro.getMinutes();

      const [hE, mE] = horaEntrada.split(':').map(Number);
      const minEntrada = hE * 60 + mE;
      const toleranciaEntrada = tolerancia?.minutos_anticipado_max || 60;
      const ventanaInicioTurno = minEntrada - toleranciaEntrada;

      if (minutosUltimaEntrada >= ventanaInicioTurno && minutosUltimaEntrada <= minSalida) {
        const diferenciaMinutos = (ahora - horaUltimoRegistro) / 1000 / 60;

        const duracionTurno = minSalida - minEntrada;
        const toleranciaSalidaAnticipada = tolerancia.aplica_tolerancia_salida === false
          ? 0
          : (tolerancia.minutos_anticipado_salida || tolerancia.minutos_retardo || 10);

        const tiempoMinimoRequerido = Math.max(5, duracionTurno - toleranciaSalidaAnticipada);

        if (diferenciaMinutos < tiempoMinimoRequerido) {
          const minutosRestantes = Math.ceil(tiempoMinimoRequerido - diferenciaMinutos);
          return {
            puedeRegistrar: false,
            tipoRegistro: 'salida',
            estadoHorario: 'tiempo_insuficiente',
            jornadaCompleta: false,
            mensaje: 'Tiempo insuficiente trabajado',
            mensajeEspera: `Espera ${minutosRestantes} min más`,
            minutosRestantes
          };
        }
      }
    }

    const toleranciaMinutos = tolerancia?.aplica_tolerancia_salida
      ? (tolerancia.minutos_retardo || 10)
      : 10;
    const inicioVentanaSalida = minSalida - toleranciaMinutos;

    let estadoSalida = 'salida_puntual';
    if (minutosActuales < inicioVentanaSalida) {
      estadoSalida = 'salida_temprano';
    }

    return {
      puedeRegistrar: true,
      tipoRegistro: 'salida',
      estadoHorario: estadoSalida === 'salida_puntual' ? 'puntual' : 'salida_temprano',
      estadoAsistencia: estadoSalida,
      jornadaCompleta: false,
      mensaje: estadoSalida === 'salida_puntual' ? 'Puedes registrar tu salida' : 'Salida anticipada'
    };
  };

  // ============================================================
  // CALCULAR ESTADO DE REGISTRO
  // ============================================================
  const calcularEstadoRegistro = useCallback((ultimo, horario, tolerancia, isOnlineNow = false) => {
    if (!horario?.trabaja) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        mensaje: 'No tienes horario configurado para hoy'
      };
    }

    if (!horario.gruposTurnos || !Array.isArray(horario.gruposTurnos) || horario.gruposTurnos.length === 0) {
      return {
        puedeRegistrar: false,
        tipoRegistro: 'entrada',
        estadoHorario: 'fuera_horario',
        jornadaCompleta: false,
        mensaje: 'No hay turnos configurados'
      };
    }

    const ahora = getMinutosDelDia();
    const totalRegistrosHoy = ultimo?.totalRegistrosHoy || 0;
    const totalGrupos = horario.gruposTurnos.length;
    const gruposCompletados = Math.floor(totalRegistrosHoy / 2);

    if (!ultimo) {
      return validarEntrada(horario, tolerancia, ahora, 0);
    }

    if (ultimo.tipo === 'entrada') {
      return validarSalida(horario, ahora, ultimo, tolerancia, isOnlineNow);
    }

    if (ultimo.tipo === 'salida') {
      if (gruposCompletados >= totalGrupos) {
        const resultadoEntrada = validarEntrada(horario, tolerancia, ahora, totalRegistrosHoy);

        if (!resultadoEntrada.hayTurnoFuturo) {
          return {
            puedeRegistrar: false,
            tipoRegistro: 'entrada',
            estadoHorario: 'fuera_horario',
            jornadaCompleta: false,
            mensaje: 'Fuera de horario'
          };
        }

        return resultadoEntrada;
      }

      return validarEntrada(horario, tolerancia, ahora, totalRegistrosHoy);
    }

    return validarEntrada(horario, tolerancia, ahora, totalRegistrosHoy);
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      try {
        let onlineNow = false;
        try { onlineNow = await syncManager.isOnline(); } catch (e) { /* offline */ }
        setIsOnline(onlineNow);

        const [ultimo, horario, tolerancia, deptos] = await Promise.all([
          obtenerUltimoRegistro(),
          obtenerHorario(),
          obtenerTolerancia(),
          obtenerDepartamentos()
        ]);

        setUltimoRegistroHoy(ultimo);
        setHorarioInfo(horario);
        setToleranciaInfo(tolerancia);
        setDepartamentos(deptos);

        if (horario && tolerancia) {
          const estado = calcularEstadoRegistro(ultimo, horario, tolerancia, onlineNow);
          setPuedeRegistrar(estado.puedeRegistrar);
          setTipoSiguienteRegistro(estado.tipoRegistro);
          setEstadoHorario(estado.estadoHorario);
          setJornadaCompletada(estado.jornadaCompleta);
          setMensajeEspera(estado.mensajeEspera || '');
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [obtenerUltimoRegistro, obtenerHorario, obtenerTolerancia, obtenerDepartamentos, calcularEstadoRegistro]);

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
      }
    };

    iniciarUbicacion();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    const validarArea = async () => {
      if (!ubicacionActual || !departamentos.length) {
        setDentroDelArea(false);
        setDepartamentosDisponibles([]);
        setDepartamentoSeleccionado(null);
        return;
      }

      const deptsDisponibles = [];

      for (const depto of departamentos) {
        try {
          if (!depto.ubicacion) continue;

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
    };

    validarArea();

  }, [ubicacionActual, departamentos]);

  const handleVerificarPin = async (pin) => {
    // ─── FIX: Separar verificación de PIN del proceso de registro.
    // Si mezclamos ambos en el mismo try/catch, un error de registro
    // (GPS, red, etc.) sube al modal y aparece como "PIN incorrecto".
    let pinVerificado = false;

    try {
      const resultado = await verificarPin(
        userData.empleado_id,
        pin,
        userData.token
      );

      if (resultado.success && resultado.data?.valido) {
        pinVerificado = true;
      } else {
        throw new Error('PIN incorrecto');
      }
    } catch (e) {
      if (e.message === 'PIN incorrecto') throw e;

      const esErrorDeRed = (
        e.message.includes('Network request failed') ||
        e.message.includes('Failed to fetch') ||
        e.message.includes('Timeout') ||
        e.message.includes('network') ||
        e.name === 'AbortError'
      );

      if (!esErrorDeRed) {
        throw e;
      }

      console.log('PIN online falló por red, intentando offline...');

      // FIX: String() en ambos lados — SQLite puede devolver pin_hash o
      // empleado_id como número (INTEGER) y === fallaría silenciosamente.
      const identified = await offlineAuthService.identificarPorPinOffline(pin);
      if (identified && String(identified.empleado_id) === String(userData.empleado_id)) {
        pinVerificado = true;
      } else {
        throw new Error('PIN incorrecto');
      }
    }

    // PIN correcto: cerrar modal ANTES de proceder con el registro.
    // Sin await en procederConRegistro — sus errores se manejan internamente
    // con Alert, no deben subir al modal del PIN.
    if (pinVerificado) {
      setMostrarPinAuth(false);
      setMostrarAutenticacion(false);
      procederConRegistro();
    }
  };

  const handleAutenticacionHuella = async () => {
    try {
      setMostrarAutenticacion(false);
      setRegistrando(true);

      const resultado = await capturarHuellaDigital(userData.empleado_id);

      if (resultado.success) {
        await procederConRegistro();
      } else {
        throw new Error('Autenticación biométrica fallida');
      }
    } catch (error) {
      let mensaje = 'No se pudo verificar tu identidad';

      if (error.message?.includes('cancelada') || error.message?.includes('cancel')) {
        mensaje = 'Autenticación cancelada';
      } else if (error.message?.includes('sensor') || error.message?.includes('hardware')) {
        mensaje = 'No se detectó el sensor de huella. Verifica que tu dispositivo tenga sensor biométrico.';
      } else if (error.message) {
        mensaje = error.message;
      }

      Alert.alert(
        'Error de Autenticación',
        mensaje,
        [{ text: 'OK' }]
      );
      setRegistrando(false);
    }
  };

  const handleAutenticacionFacial = async () => {
    try {
      setMostrarAutenticacion(false);
      setMostrarCapturaFacial(true);
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo iniciar la captura facial',
        [{ text: 'OK' }]
      );
    }
  };

  const handleFacialCaptureComplete = async (captureData) => {
    setMostrarCapturaFacial(false);
    setRegistrando(true);

    try {
      console.log('📸 Captura facial completada para autenticación de registro');

      if (!captureData.faceDetectionUsed || !captureData.validated) {
        throw new Error('No se detectó un rostro válido en la captura');
      }

      const faceFeatures = processFaceData(captureData.faceData);
      const validation = validateFaceQuality(faceFeatures);

      if (!validation.isValid) {
        console.warn('⚠️ Validación de calidad falló:', validation.errors);
        Alert.alert(
          '⚠️ Calidad insuficiente',
          validation.errors.join('\n') + '\n\n¿Deseas intentar de nuevo?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setRegistrando(false) },
            { text: 'Reintentar', onPress: () => setMostrarCapturaFacial(true) },
          ]
        );
        setRegistrando(false);
        return;
      }

      console.log('✅ Validación facial exitosa, verificando identidad...');

      const empleadoId = userData?.empleado?.id || userData?.empleado_id || userData?.id;
      const verification = await verifyFace(empleadoId, captureData.faceData);

      if (!verification.verified) {
        console.warn('❌ Verificación facial falló:', verification);
        Alert.alert(
          'Identidad no verificada',
          `No se pudo confirmar tu identidad.\nSimilitud: ${verification.similarity?.toFixed(1) || 0}% (mínimo 65%)\n\nAsegúrate de que eres la persona registrada e intenta de nuevo.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setRegistrando(false) },
            { text: 'Reintentar', onPress: () => setMostrarCapturaFacial(true) },
          ]
        );
        setRegistrando(false);
        return;
      }

      console.log(`✅ Identidad verificada (${verification.similarity.toFixed(1)}% similitud), procediendo con el registro`);

      await procederConRegistro();
    } catch (error) {
      console.error('❌ Error en autenticación facial:', error);
      Alert.alert(
        'Error de Autenticación',
        error.message || 'No se pudo verificar tu identidad',
        [{ text: 'OK' }]
      );
      setRegistrando(false);
    }
  };

  const handleFacialCaptureCancel = () => {
    setMostrarCapturaFacial(false);
    setRegistrando(false);
  };

  const procederConRegistro = async () => {
    try {
      const departamento = datosRegistroRef.current.departamento;
      let ubicacionFinal = datosRegistroRef.current.ubicacion;

      const horarioActual = horarioInfoRef.current;
      const toleranciaActual = toleranciaInfoRef.current;
      const ultimoActual = ultimoRegistroHoyRef.current;
      const tipoActual = tipoSiguienteRegistroRef.current;
      const onlineActual = isOnlineRef.current;

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 3000,
        });

        ubicacionFinal = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
      } catch (locationError) {
      }

      if (!ubicacionFinal || !ubicacionFinal.lat || !ubicacionFinal.lng) {
        throw new Error('No se pudo obtener la ubicación');
      }

      if (!departamento || !departamento.id) {
        throw new Error('No se pudo obtener el departamento');
      }

      if (departamento.ubicacion) {
        const coordsDepto = extraerCoordenadas(departamento.ubicacion);
        if (coordsDepto && coordsDepto.length >= 3) {
          const dentroAhora = isPointInPolygon(ubicacionFinal, coordsDepto);
          if (!dentroAhora) {
            throw new Error('Te has movido fuera de la zona permitida. Regresa al área del departamento para registrar tu asistencia.');
          }
        }
      }

      setRegistrando(true);

      const payload = {
        empleado_id: userData.empleado_id,
        dispositivo_origen: 'movil',
        ubicacion: [ubicacionFinal.lat, ubicacionFinal.lng],
        departamento_id: departamento.id,
        tipo: tipoActual,
      };

      let success = false;
      let data = null;

      try {
        const response = await fetch(`${API_URL}/asistencias/registrar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userData.token}`,
          },
          body: JSON.stringify(payload)
        });

        const responseText = await response.text();

        if (response.status === 502 || response.status === 500) {
          throw new Error('Server Error');
        }

        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          throw new Error('Error del servidor: respuesta inválida');
        }

        if (!response.ok) {
          const errorMsg = data.message || data.error || `Error del servidor (${response.status})`;
          throw new Error(errorMsg);
        }

        success = true;

      } catch (e) {
        const esErrorDeRed = (
          e.message === 'Server Error' ||
          e.message.includes('Network request failed') ||
          e.message.includes('Failed to fetch') ||
          e.message.includes('Timeout') ||
          e.message.includes('network') ||
          e.name === 'AbortError'
        );

        if (!esErrorDeRed) {
          throw e;
        }
        console.log('Error de red, guardando offline:', e.message);
      }

      if (!success) {
        console.log('Saving offline attendance...');

        let estadoOffline = 'puntual';
        if (horarioActual && toleranciaActual) {
          const minutosAhora = new Date().getHours() * 60 + new Date().getMinutes();
          const totalRegs = ultimoActual?.totalRegistrosHoy || 0;
          if (tipoActual === 'entrada') {
            const r = validarEntrada(horarioActual, toleranciaActual, minutosAhora, totalRegs);
            if (r.estadoHorario === 'retardo') estadoOffline = 'retardo';
            else if (r.estadoHorario === 'falta') estadoOffline = 'falta';
          } else {
            const r = validarSalida(horarioActual, minutosAhora, ultimoActual, toleranciaActual, onlineActual);
            estadoOffline = r.estadoAsistencia || 'salida_puntual';
          }
        }

        await sqliteManager.saveOfflineAsistencia({
          ...payload,
          estado: estadoOffline,
          metodo_registro: 'PIN',
          fecha_registro: new Date().toISOString()
        });

        try {
          await pushService.postEvent(
            `Registro de ${tipoActual} - ${estadoOffline}`,
            'asistencia',
            `${userData.nombre || 'Empleado'} registró ${tipoActual}`,
            userData.empleado_id,
            'baja'
          );
        } catch (evtErr) {
          console.log('⚠️ Error guardando evento offline:', evtErr.message);
        }

        data = {
          data: {
            tipo: tipoActual,
            estado: estadoOffline,
            _offline: true
          }
        };
      }

      const nuevoUltimo = await obtenerUltimoRegistro();
      setUltimoRegistroHoy(nuevoUltimo);

      if (horarioActual && toleranciaActual) {
        const nuevoEstado = calcularEstadoRegistro(nuevoUltimo, horarioActual, toleranciaActual);
        setPuedeRegistrar(nuevoEstado.puedeRegistrar);
        setTipoSiguienteRegistro(nuevoEstado.tipoRegistro);
        setEstadoHorario(nuevoEstado.estadoHorario);
        setJornadaCompletada(nuevoEstado.jornadaCompleta);
        setMensajeEspera(nuevoEstado.mensajeEspera || '');
      }

      const tipoRegistrado = data.data?.tipo || tipoActual;
      const estadoRegistrado = data.data?.estado || 'puntual';
      const esOffline = data.data?._offline === true;

      let estadoTexto = estadoRegistrado;
      let emoji = '✅';

      if (tipoRegistrado === 'salida') {
        if (estadoRegistrado === 'salida_temprano') {
          estadoTexto = 'salida anticipada';
          emoji = '⚠️';
        } else {
          estadoTexto = 'salida registrada';
          emoji = '✅';
        }
      } else {
        if (estadoRegistrado === 'retardo') {
          estadoTexto = 'retardo';
          emoji = '⚠️';
        } else if (estadoRegistrado === 'falta') {
          estadoTexto = 'falta';
          emoji = '❌';
        } else {
          estadoTexto = 'puntual';
          emoji = '✅';
        }
      }

      const tipoMayuscula = tipoRegistrado === 'entrada' ? 'Entrada' : 'Salida';
      const horaStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      Alert.alert(
        esOffline ? '☁️ Guardado sin conexión' : '¡Éxito!',
        [
          `${emoji} ${tipoMayuscula} registrada como ${estadoTexto}`,
          `Departamento: ${departamento.nombre}`,
          `Hora: ${horaStr}`,
          esOffline ? '\nSe sincronizará automáticamente cuando haya conexión.' : ''
        ].filter(Boolean).join('\n'),
        [{ text: 'OK' }]
      );

      notificarRegistro(tipoRegistrado, estadoRegistrado);

      if (onRegistroExitoso) {
        onRegistroExitoso(data);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo registrar', [{ text: 'OK' }]);
    } finally {
      setRegistrando(false);
    }
  };

  const handleRegistro = async () => {
    if (!userData || !userData.empleado_id || !userData.token) {
      Alert.alert('Error', 'No se pudo identificar tu información de usuario. Intenta cerrar sesión y volver a iniciar.');
      return;
    }

    if (!userData.es_empleado) {
      Alert.alert('Sin acceso', 'Solo empleados pueden registrar asistencia. Tu cuenta no está asociada a un empleado.', [{ text: 'Entendido' }]);
      return;
    }

    if (!horarioInfo) {
      Alert.alert('Error', 'No tienes un horario configurado. Contacta al administrador.', [{ text: 'OK' }]);
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
      } else if (estadoHorario === 'tiempo_insuficiente') {
        mensaje = `Aún no puedes salir.\n\n${mensajeEspera}`;
      } else if (estadoHorario === 'fuera_horario') {
        mensaje = 'Estás fuera de tu horario laboral';
      } else if (!horarioInfo.trabaja) {
        mensaje = 'No tienes horario configurado para hoy';
      }
      Alert.alert('No disponible', mensaje, [{ text: 'Entendido' }]);
      return;
    }

    if (!ubicacionActual || !ubicacionActual.lat || !ubicacionActual.lng) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.');
      return;
    }

    if (!credencialesUsuario?.tiene_pin && !credencialesUsuario?.tiene_dactilar) {
      Alert.alert(
        'Configuración Requerida',
        'Debes configurar al menos un método de autenticación (PIN o Huella) antes de registrar asistencias.\n\nVe a Configuración > Seguridad para configurar.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    datosRegistroRef.current = {
      ubicacion: ubicacionActual,
      departamento: departamentoSeleccionado
    };

    setMostrarAutenticacion(true);
  };

  const getButtonColor = () => {
    if (jornadaCompletada) return '#6b7280';
    if (!dentroDelArea || !puedeRegistrar) return '#ef4444';
    if (tipoSiguienteRegistro === 'salida' && puedeRegistrar) return '#10b981';
    if (estadoHorario === 'puntual') return '#10b981';
    if (estadoHorario === 'retardo') return '#f59e0b';
    if (estadoHorario === 'falta') return '#ef4444';
    return '#6b7280';
  };

  const getIcon = () => {
    if (jornadaCompletada) return 'checkmark-done-circle';
    if (!dentroDelArea) return 'location';
    if (estadoHorario === 'tiempo_insuficiente') return 'time-outline';
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
    if (estadoHorario === 'tiempo_insuficiente' && tipoSiguienteRegistro === 'salida') {
      return mensajeEspera || 'Tiempo insuficiente';
    }
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
    return `Registrar ${tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida'}`;
  };

  const puedePresionarBoton = puedeRegistrar && dentroDelArea && !jornadaCompletada && !registrando && departamentoSeleccionado;

  if (mostrarCapturaFacial) {
    return (
      <FacialCaptureScreen
        onCapture={handleFacialCaptureComplete}
        onCancel={handleFacialCaptureCancel}
        darkMode={darkMode}
      />
    );
  }

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
                    estadoHorario === 'tiempo_insuficiente' ? 'time-outline' :
                      tipoSiguienteRegistro === 'salida' ? 'checkmark-circle' :
                        estadoHorario === 'puntual' ? 'checkmark-circle' :
                          estadoHorario === 'retardo' ? 'time' :
                            estadoHorario === 'falta' ? 'alert-circle' :
                              'close-circle'
                  }
                  size={16}
                  color={
                    estadoHorario === 'tiempo_insuficiente' ? '#f59e0b' :
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
                    color: estadoHorario === 'tiempo_insuficiente' ? '#f59e0b' :
                      tipoSiguienteRegistro === 'salida' && puedeRegistrar ? '#10b981' :
                        estadoHorario === 'puntual' ? '#10b981' :
                          estadoHorario === 'retardo' ? '#f59e0b' :
                            estadoHorario === 'falta' ? '#ef4444' :
                              '#ef4444'
                  }
                ]}>
                  {estadoHorario === 'tiempo_insuficiente' ? 'Trabajando...' :
                    tipoSiguienteRegistro === 'salida' && puedeRegistrar ? 'Hora de salida' :
                      estadoHorario === 'puntual' ? 'A tiempo' :
                        estadoHorario === 'retardo' ? 'Con retardo' :
                          estadoHorario === 'falta' ? 'Fuera tolerancia' :
                            'Fuera de horario'}
                </Text>
              </View>
            </View>
          )}

          {!loading && departamentos.length > 0 && (
            <>
              {departamentosDisponibles.length > 0 ? (
                <TouchableOpacity
                  style={styles.locationInfo}
                  onPress={() => setMostrarDepartamentos(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={14} color="#10b981" />
                  <Text style={[styles.locationText, { color: '#10b981' }]} numberOfLines={1}>
                    {departamentoSeleccionado
                      ? departamentoSeleccionado.nombre
                      : `${departamentosDisponibles.length} ${departamentosDisponibles.length === 1 ? 'disponible' : 'disponibles'}`
                    }
                  </Text>
                  {departamentosDisponibles.length > 1 && (
                    <Ionicons name="chevron-down" size={14} color="#10b981" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.locationInfo, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="location-outline" size={14} color="#ef4444" />
                  <Text style={[styles.locationText, { color: '#ef4444' }]} numberOfLines={1}>
                    Fuera de zona
                  </Text>
                </View>
              )}

              {isOnline ? (
                <TouchableOpacity
                  style={styles.viewMapButton}
                  onPress={() => setMostrarMapa(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={16} color="#3b82f6" />
                  <Text style={styles.viewMapText}>Ver mapa</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.viewMapButton, { opacity: 0.5 }]}>
                  <Ionicons name="cloud-offline-outline" size={14} color="#9ca3af" />
                  <Text style={[styles.viewMapText, { color: '#9ca3af', fontSize: 11 }]}>Sin conexión</Text>
                </View>
              )}
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

      <Modal
        visible={mostrarAutenticacion}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarAutenticacion(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.authModalContent}>
            <View style={styles.authHeader}>
              <Ionicons name="shield-checkmark" size={48} color="#3b82f6" />
              <Text style={styles.authTitle}>Verificar Identidad</Text>
              <Text style={styles.authSubtitle}>
                Elige cómo deseas autenticarte
              </Text>
            </View>

            <View style={styles.authMethodsContainer}>
              {metodosDisponibles
                .filter(metodo => metodo.id !== 'facial' || !credencialesUsuario?._offlineMode)
                .map((metodo) => (
                  <TouchableOpacity
                    key={metodo.id}
                    style={styles.authMethodCard}
                    onPress={getHandlerForMetodo(metodo.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.authMethodIcon}>
                      <Ionicons name={metodo.icono} size={32} color="#3b82f6" />
                    </View>
                    <Text style={styles.authMethodName}>{metodo.nombre}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
              style={styles.authCancelButton}
              onPress={() => setMostrarAutenticacion(false)}
            >
              <Text style={styles.authCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PinInputModal
        visible={mostrarPinAuth}
        onClose={() => setMostrarPinAuth(false)}
        onConfirm={handleVerificarPin}
        title="Verificar PIN"
        subtitle="Ingresa tu PIN de seguridad"
        darkMode={darkMode}
        requireConfirmation={false}
      />

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

      {departamentos.length > 0 && (
        <Modal
          visible={mostrarMapa}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMostrarMapa(false)}
        >
          <MapaZonasPermitidas
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
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#3b82f6',
    lineHeight: 16,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  viewMapText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  authModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  authMethodsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  authMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  authMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authMethodName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  authCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  authCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});

const registerStylesDark = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
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
    color: '#f9fafb',
    letterSpacing: -1,
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
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#9ca3af',
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
    borderTopColor: '#374151',
    marginTop: 2,
  },
  lastRegisterIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastRegisterText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
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
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
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
    backgroundColor: '#374151',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  departamentoItemActivo: {
    backgroundColor: '#065f46',
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
    color: '#f9fafb',
    flex: 1,
  },
  departamentoNombreActivo: {
    color: '#10b981',
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
    borderTopColor: '#374151',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#93c5fd',
    lineHeight: 16,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  viewMapText: {
    fontSize: 13,
    color: '#93c5fd',
    fontWeight: '600',
  },
  authModalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
    marginTop: 12,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  authMethodsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  authMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  authMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authMethodName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  authCancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  authCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
});

export default RegisterButton;