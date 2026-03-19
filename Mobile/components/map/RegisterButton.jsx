import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Vibration
} from
  'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import * as LocalAuthentication from 'expo-local-authentication';
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


import sqliteManager, { saveOnlineAsistenciaToCache } from '../../services/offline/sqliteManager.mjs';
import offlineAuthService from '../../services/offline/offlineAuthService.mjs';
import syncManager from '../../services/offline/syncManager.mjs';
import pushService from '../../services/offline/pushService.mjs';

import { registerStyles, registerStylesDark } from './RegisterButtonStyles';

const API_URL = getApiEndpoint('/api');
const NOTIF_DIARIA_KEY = '@notif_asistencia_disponible';
const JORNADA_COMPLETADA_KEY = '@jornada_completada_hoy';

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
  const [ultimoRegistroHoy, setUltimoRegistroHoy] = useState(null);
  const [registrosHoyTodos, setRegistrosHoyTodos] = useState([]);
  const [dentroDelArea, setDentroDelArea] = useState(false);
  const [puedeRegistrar, setPuedeRegistrar] = useState(false);
  const [tipoSiguienteRegistro, setTipoSiguienteRegistro] = useState(null);
  const [estadoHorario, setEstadoHorario] = useState(null);
  const [jornadaCompletada, setJornadaCompletada] = useState(false);
  const [mensajeEspera, setMensajeEspera] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [internetReachable, setInternetReachable] = useState(false);
  const [usandoEstadoBackend, setUsandoEstadoBackend] = useState(false);
  const [diaFestivo, setDiaFestivo] = useState(null);
  const [jornadaCompletadaHoy, setJornadaCompletadaHoy] = useState(false);

  const datosRegistroRef = useRef({
    ubicacion: null,
    departamento: null,
    metodo: null,
    payloadBiometrico: null
  });
  const notificadoEstadoRef = useRef(null);
  const notifDiariaRef = useRef({ fecha: '', entrada: false, salida: false });
  const horarioInfoRef = useRef(null);
  const ultimoRegistroHoyRef = useRef(null);
  const registrosHoyTodosRef = useRef([]);
  const tipoSiguienteRegistroRef = useRef(null);
  const isOnlineRef = useRef(false);
  const ticksRef = useRef(0);
  const currentDateRef = useRef((() => {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().split('T')[0];
  })());
  const styles = darkMode ? registerStylesDark : registerStyles;
  const [horaActual, setHoraActual] = useState(new Date());
  useEffect(() => { horarioInfoRef.current = horarioInfo; }, [horarioInfo]);
  useEffect(() => { ultimoRegistroHoyRef.current = ultimoRegistroHoy; }, [ultimoRegistroHoy]);
  useEffect(() => { registrosHoyTodosRef.current = registrosHoyTodos; }, [registrosHoyTodos]);
  useEffect(() => { tipoSiguienteRegistroRef.current = tipoSiguienteRegistro; }, [tipoSiguienteRegistro]);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  useEffect(() => {
    cargarCredencialesYOrden();
    syncManager.initAutoSync();
  }, []);

  useEffect(() => {
    const cargarEstadoNotifDiaria = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIF_DIARIA_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const tzDate = new Date();
          const tzOffset = tzDate.getTimezoneOffset() * 60000;
          const hoy = new Date(tzDate.getTime() - tzOffset).toISOString().split('T')[0];
          if (parsed.fecha === hoy) {

            notifDiariaRef.current = parsed;
          } else {

            const nuevoEstado = { fecha: hoy, entrada: false, salida: false };
            notifDiariaRef.current = nuevoEstado;
            await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(nuevoEstado));
          }
        }
      } catch (e) {

      }
    };
    cargarEstadoNotifDiaria();
  }, []);

  // Cargar flag de jornada completada del día de hoy
  useEffect(() => {
    const cargarJornadaCompletada = async () => {
      try {
        const stored = await AsyncStorage.getItem(JORNADA_COMPLETADA_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const hoy = new Date();
          const fechaHoy = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
            .toISOString().split('T')[0];
          if (parsed.fecha === fechaHoy) {
            setJornadaCompletadaHoy(true);
          } else {
            // Flag de otro día — limpiar
            await AsyncStorage.removeItem(JORNADA_COMPLETADA_KEY);
            setJornadaCompletadaHoy(false);
          }
        }
      } catch (e) { }
    };
    cargarJornadaCompletada();
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

      // Normalizar a array de objetos {metodo, activo, nivel}
      const ordenRaw = ordenResponse.ordenCredenciales || [
        { metodo: 'pin', activo: true, nivel: 1 },
        { metodo: 'dactilar', activo: true, nivel: 2 },
        { metodo: 'facial', activo: true, nivel: 3 }
      ];

      // Always keep objects — preserve activo flag
      const ordenObjetos = Array.isArray(ordenRaw)
        ? ordenRaw.map((item, index) =>
          typeof item === 'string'
            ? { metodo: item, activo: true, nivel: index + 1 }
            : { metodo: item.metodo, activo: item.activo !== false, nivel: item.nivel || index + 1 }
        ).sort((a, b) => a.nivel - b.nivel)
        : Object.entries(ordenRaw)
          .map(([key, val], i) => ({ metodo: key, activo: val?.activo !== false, nivel: val?.prioridad || val?.nivel || i + 1 }))
          .sort((a, b) => a.nivel - b.nivel);

      // Store only method names for display ordering
      setOrdenCredenciales(ordenObjetos.map(o => o.metodo));
      await construirMetodosDisponibles(creds, ordenObjetos);

    } catch (error) {
      (function () { })('Using offline credentials');
      try {
        const creds = await sqliteManager.getAllCredenciales();
        const misCreds = creds.filter((c) => c.empleado_id === userData.empleado_id);

        const tienePin = misCreds.some((c) => c.pin_hash);
        const tieneDactilar = misCreds.some((c) => c.dactilar_template);
        const tieneFacial = misCreds.some((c) => c.facial_descriptor);

        const offlineCreds = {
          tiene_pin: tienePin,
          tiene_dactilar: tieneDactilar,
          tiene_facial: tieneFacial,
          _offlineMode: true
        };

        setCredencialesUsuario(offlineCreds);

        // Read cached credential order from SQLite (saved during last online sync)
        let ordenOffline = null;
        try {
          ordenOffline = await sqliteManager.getOrdenCredenciales();
        } catch { /* ignore */ }

        // ordenOffline is [{metodo, activo, nivel}] or null
        const ordenFallback = ordenOffline || [
          { metodo: 'pin', activo: true, nivel: 1 },
          { metodo: 'dactilar', activo: true, nivel: 2 },
          { metodo: 'facial', activo: true, nivel: 3 }
        ];
        await construirMetodosDisponibles(offlineCreds, ordenFallback);

      } catch (offlineError) {
        setCredencialesUsuario({
          tiene_dactilar: false,
          tiene_facial: false,
          tiene_pin: false
        });
      }
    }
  };

  // orden: array of {metodo, activo, nivel} objects (or strings for offline fallback)
  const construirMetodosDisponibles = async (credenciales, orden) => {

    let biometricSupported = false;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      biometricSupported = hasHardware && isEnrolled;
    } catch (e) {
      (function () { })('Error verificando biometría local:', e);
    }

    const metodosBase = {
      'pin': {
        id: 'pin',
        nombre: 'PIN',
        icono: 'keypad',
        disponible: credenciales?.tiene_pin || false
      },
      'dactilar': {
        id: 'dactilar',
        nombre: 'Huella',
        icono: 'finger-print',
        disponible: biometricSupported
      },
      'facial': {
        id: 'facial',
        nombre: 'Facial',
        icono: 'scan',
        disponible: credenciales?._offlineMode ? true : (credenciales?.tiene_facial || false)
      }
    };

    // Normalize orden to objects: support both string[] (offline) and {metodo,activo,nivel}[]
    const ordenNorm = Array.isArray(orden)
      ? orden.map((item, i) =>
        typeof item === 'string'
          ? { metodo: item, activo: true, nivel: i + 1 }
          : item
      )
      : [];

    const metodosOrdenados = ordenNorm
      // Filter out methods disabled by the admin config
      .filter(o => o.activo !== false)
      .sort((a, b) => (a.nivel ?? 99) - (b.nivel ?? 99))
      .map(o => metodosBase[o.metodo])
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
    datosRegistroRef.current.metodo = 'PIN';
    setMostrarAutenticacion(false);
    setTimeout(() => {
      setMostrarPinAuth(true);
    }, 150);
  }, []);

  const actualizarEstadoPreflight = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return false;

      let onlineNow = false;
      try { onlineNow = await syncManager.isOnline() && !syncManager.getIsBackendDown(); } catch (e) { }

      if (!onlineNow) {
        setUsandoEstadoBackend(false);
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `${API_URL}/asistencias/estado/${empleadoId}`,
        {
          headers: {
            'Authorization': `Bearer ${userData.token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const data = json.data;
        if (data) {
          // Si hay día festivo, el frontend manda: el backend no checa días festivos
          // en el preflight, así que ignoramos su respuesta y mantenemos el bloqueo.
          if (diaFestivo) {
            setPuedeRegistrar(false);
            setEstadoHorario('dia_festivo');
            setJornadaCompletada(false);
            setUsandoEstadoBackend(true);
            return true;
          }

          // ── Guardia offline: si los registros locales muestran jornada completa,
          //    no dejar que el backend (que puede no tener aún los registros offline)
          //    habilite el botón incorrectamente.
          const registrosLocales = registrosHoyTodosRef.current || [];
          const horarioLocal = horarioInfoRef.current;
          if (data.puedeRegistrar && horarioLocal?.bloques?.length) {
            const numSalidasLocales = registrosLocales.filter(r => r.tipo === 'salida').length;
            const numBloquesLocales = horarioLocal.bloques.length;
            if (numSalidasLocales >= numBloquesLocales) {
              // Verificar si hay un bloque extra con ventana abierta (5 min antes de su entrada)
              const MINUTOS_ANTES = 5;
              const bloqueExtra = horarioLocal.bloques[numSalidasLocales];
              const ahora = new Date();
              const ahoraMins = ahora.getHours() * 60 + ahora.getMinutes();
              const ventanaAbierta = bloqueExtra && ahoraMins >= (bloqueExtra.entrada - MINUTOS_ANTES);
              if (!ventanaAbierta) {
                // Jornada completa localmente — bloquear aunque el backend diga lo contrario
                setPuedeRegistrar(false);
                setTipoSiguienteRegistro('entrada');
                setEstadoHorario('bloque_completo');
                setJornadaCompletada(true);
                setMensajeEspera('Jornada completa. No es necesario registrar más asistencias por hoy.');
                setUsandoEstadoBackend(true);
                return true;
              }
            }
          }

          setPuedeRegistrar(data.puedeRegistrar);
          if (data.estadoHorario) setEstadoHorario(data.estadoHorario);
          if (data.tipoSiguienteRegistro) setTipoSiguienteRegistro(data.tipoSiguienteRegistro);
          if (data.motivo) setMensajeEspera(data.motivo);

          if (data.estadoHorario === 'bloque_completo') {
            setJornadaCompletada(true);
          } else {
            setJornadaCompletada(false);
          }

          setUsandoEstadoBackend(true);
          return true;
        }
      }
      setUsandoEstadoBackend(false);
      return false;
    } catch (err) {
      setUsandoEstadoBackend(false);
      return false;
    }
  }, [userData]);


  useEffect(() => {
    const intervalo = setInterval(async () => {
      setHoraActual(new Date());
      ticksRef.current += 1;

      // ── Verificar cambio de día (medianoche) para re-evaluar festivo offline ──
      const ahora = new Date();
      const ahoraOffset = ahora.getTimezoneOffset() * 60000;
      const fechaHoyStr = new Date(ahora.getTime() - ahoraOffset).toISOString().split('T')[0];
      if (fechaHoyStr !== currentDateRef.current) {
        currentDateRef.current = fechaHoyStr;
        // Limpiar flag de jornada completada al cambiar de día
        try {
          await AsyncStorage.removeItem(JORNADA_COMPLETADA_KEY);
          setJornadaCompletadaHoy(false);
        } catch (e) { }
        // Re-verificar festivo para el nuevo día
        try {
          let onlineNow = false;
          try { onlineNow = await syncManager.isOnline() && !syncManager.getIsBackendDown(); } catch (e) { }
          if (!onlineNow) {
            // Offline: consultar SQLite con la nueva fecha
            try {
              const festivoNuevoDia = await sqliteManager.getDiaFestivo(fechaHoyStr);
              if (festivoNuevoDia) {
                setDiaFestivo({ nombre: festivoNuevoDia.nombre, tipo: festivoNuevoDia.tipo });
              } else {
                setDiaFestivo(null);
              }
            } catch (e) {
              setDiaFestivo(null);
            }
          }
          // Si está online cargarDatos completo no es necesario; el preflight lo manejará
        } catch (e) { }
      }

      if (ticksRef.current % 15 === 0) {
        await actualizarEstadoPreflight();
      }


      if (ticksRef.current % 60 === 0) {
        try {
          let onlineNow = false;
          try { onlineNow = await syncManager.isOnline(); } catch (e) { }
          setIsOnline(onlineNow);

          const [nuevoHorario, resultadoRegistro] = await Promise.all([
            obtenerHorario(),
            obtenerUltimoRegistro()]
          );
          if (nuevoHorario) {
            setHorarioInfo(nuevoHorario);
            horarioInfoRef.current = nuevoHorario;
          }
          if (resultadoRegistro) {
            const { ultimo: nuevoUltimo, todos: nuevosTodos } = resultadoRegistro;
            setUltimoRegistroHoy(nuevoUltimo);
            setRegistrosHoyTodos(nuevosTodos);
            ultimoRegistroHoyRef.current = nuevoUltimo;
            registrosHoyTodosRef.current = nuevosTodos;
          }
        } catch (_e) { }
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [obtenerHorario, obtenerUltimoRegistro, actualizarEstadoPreflight]);
  useEffect(() => {
    if (usandoEstadoBackend) return;
    if (!horarioInfo && !diaFestivo) return;

    if (diaFestivo) {
      setPuedeRegistrar(false);
      setTipoSiguienteRegistro('entrada');
      setEstadoHorario('dia_festivo');
      setJornadaCompletada(false);
      setMensajeEspera('');
      return;
    }

    if (!horarioInfo?.trabaja) {
      setPuedeRegistrar(false);
      setTipoSiguienteRegistro('entrada');
      setEstadoHorario('fuera_horario');
      setJornadaCompletada(false);
      setMensajeEspera('');
      return;
    }


    if (!ultimoRegistroHoy) {
      // Si la jornada ya fue marcada como completa hoy (flag persistido), bloquear aunque
      // el refresh de registros devuelva vacío momentáneamente
      if (jornadaCompletadaHoy) {
        setPuedeRegistrar(false);
        setTipoSiguienteRegistro('entrada');
        setEstadoHorario('bloque_completo');
        setJornadaCompletada(true);
        setMensajeEspera('Jornada completa. No es necesario registrar más asistencias por hoy.');
        return;
      }
      setPuedeRegistrar(true);
      setTipoSiguienteRegistro('entrada');
      setEstadoHorario(null);
      setJornadaCompletada(false);
      setMensajeEspera('');
      return;
    }


    const ultimoEstado = ultimoRegistroHoy.estado;
    const ultimoTipo = ultimoRegistroHoy.tipo;





    const ESTADOS_FALTA = ['falta', 'falta_directa', 'falta_automatica'];
    if (ultimoTipo === 'entrada' && ESTADOS_FALTA.includes(ultimoEstado)) {
      const numEntradas = (registrosHoyTodos || []).filter(r => r.tipo === 'entrada').length;
      const numBloques = horarioInfo?.bloques?.length || 0;
      const tieneMasBloques = numBloques > numEntradas;

      setPuedeRegistrar(true);
      setTipoSiguienteRegistro('entrada');
      // Si hay más turnos, lo ponemos en 'activo' (verde) para que pueda checar el siguiente
      setEstadoHorario(tieneMasBloques ? 'activo' : 'falta_previa');
      setJornadaCompletada(!tieneMasBloques);
      setMensajeEspera(tieneMasBloques
        ? 'Tu entrada anterior fue marcada como falta. Ya puedes registrar la entrada de tu siguiente turno.'
        : 'Tu entrada fue registrada como falta. No es necesario registrar salida.');
      return;
    }



    if (ultimoTipo === 'salida') {
      // Contar cuántas salidas hay hoy y cuántos bloques tiene el horario
      const numSalidas = (registrosHoyTodos || []).filter(r => r.tipo === 'salida').length;
      const numBloques = horarioInfo?.bloques?.length || 0;

      // Si aún quedan bloques sin cubrir → comportamiento normal (siguiente entrada)
      if (numSalidas < numBloques) {
        setPuedeRegistrar(true);
        setTipoSiguienteRegistro('entrada');
        setEstadoHorario('activo');
        setJornadaCompletada(false);
        setMensajeEspera('');
        return;
      }

      // ── Último turno completado: jornada terminada ──
      // Revisar si el admin configuró un bloque extra (índice numSalidas en adelante)
      // y si ya es hora de abrir la ventana (5 min antes de su entrada).
      const MINUTOS_ANTES = 5;
      const bloqueExtra = horarioInfo?.bloques?.[numSalidas]; // bloque que correspondería al siguiente turno
      if (bloqueExtra) {
        const ahora = horaActual; // actualizado cada segundo por el ticker
        const ahoraMins = ahora.getHours() * 60 + ahora.getMinutes();
        const apertura = bloqueExtra.entrada - MINUTOS_ANTES;
        if (ahoraMins >= apertura) {
          // Ya se abrió la ventana para el bloque extra → habilitar registro
          setPuedeRegistrar(true);
          setTipoSiguienteRegistro('entrada');
          setEstadoHorario('activo');
          setJornadaCompletada(false);
          setMensajeEspera('');
          return;
        }
      }

      // No hay bloque extra o aún no es hora → bloquear botón y persistir flag
      const hoy = new Date();
      const fechaHoy = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
        .toISOString().split('T')[0];
      AsyncStorage.setItem(JORNADA_COMPLETADA_KEY, JSON.stringify({ fecha: fechaHoy }))
        .catch(() => { });
      setJornadaCompletadaHoy(true);
      setPuedeRegistrar(false);
      setTipoSiguienteRegistro('entrada');
      setEstadoHorario('bloque_completo');
      setJornadaCompletada(true);
      setMensajeEspera('Jornada completa. No es necesario registrar más asistencias por hoy.');
      return;
    }




    setPuedeRegistrar(true);
    setTipoSiguienteRegistro('salida');
    setEstadoHorario(ultimoEstado);
    setJornadaCompletada(false);
    setMensajeEspera('');

  }, [horarioInfo, ultimoRegistroHoy, registrosHoyTodos, diaFestivo, usandoEstadoBackend, horaActual, jornadaCompletadaHoy]);




  const obtenerUltimoRegistro = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return { ultimo: null, todos: [] };

      const online = await syncManager.isOnline() && !syncManager.getIsBackendDown();

      if (online) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(
            `${API_URL}/asistencias/empleado/${empleadoId}`,
            {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
              },
              signal: controller.signal
            }
          );
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.data?.length) {
              const hoy = new Date().toDateString();

              const registrosHoy = data.data.filter((r) =>
                new Date(r.fecha_registro).toDateString() === hoy
              );

              if (registrosHoy.length > 0) {

                Promise.all(registrosHoy.map((r) =>
                  saveOnlineAsistenciaToCache({
                    id: r.id,
                    empleado_id: empleadoId,
                    tipo: r.tipo,
                    estado: r.estado,
                    fecha_registro: r.fecha_registro,
                    dispositivo_origen: r.dispositivo_origen,
                    departamento_id: r.departamento_id
                  })
                )).catch(() => { });

                const ultimoRaw = registrosHoy[0];
                const ultimo = {
                  tipo: ultimoRaw.tipo,
                  estado: ultimoRaw.estado,
                  fecha_registro: new Date(ultimoRaw.fecha_registro),
                  hora: new Date(ultimoRaw.fecha_registro).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit'
                  }),
                  totalRegistrosHoy: registrosHoy.length
                };

                const todos = [...registrosHoy].
                  sort((a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro)).
                  map((r) => ({
                    tipo: r.tipo,
                    estado: r.estado,
                    fecha_registro: new Date(r.fecha_registro)
                  }));
                return { ultimo, todos };
              }
            }
          }
        } catch (e) {
          (function () { })('Online fetch failed, falling back to offline');
        }
      }


      const registrosOffline = await sqliteManager.getRegistrosHoy(empleadoId);

      if (registrosOffline && registrosOffline.length > 0) {
        const ultimoRaw = registrosOffline[registrosOffline.length - 1];
        const ultimo = {
          tipo: ultimoRaw.tipo,
          estado: ultimoRaw.estado,
          fecha_registro: new Date(ultimoRaw.fecha_registro),
          hora: new Date(ultimoRaw.fecha_registro).toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit'
          }),
          totalRegistrosHoy: registrosOffline.length
        };
        const todos = registrosOffline.map((r) => ({
          tipo: r.tipo,
          estado: r.estado,
          fecha_registro: new Date(r.fecha_registro)
        }));
        return { ultimo, todos };
      }

      return { ultimo: null, todos: [] };
    } catch (err) {
      return { ultimo: null, todos: [] };
    }
  }, [userData]);

  const obtenerHorario = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return null;

      let horario = null;
      const online = await syncManager.isOnline() && !syncManager.getIsBackendDown();

      if (online) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(
            `${API_URL}/empleados/${empleadoId}/horario`,
            {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
              },
              signal: controller.signal
            }
          );
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            horario = data.data || data.horario || data;
          }
        } catch (e) { (function () { })('Online horario failed'); }
      }

      if (!horario) {
        const hLocal = await sqliteManager.getHorario(empleadoId);
        if (hLocal) horario = hLocal;
      }


      let toleranciasSqlite = null;
      try { toleranciasSqlite = await sqliteManager.getTolerancia(empleadoId); } catch (e) { }

      if (!horario?.configuracion) return { trabaja: false, numTurnos: 0, entrada: null, salida: null };

      let config = typeof horario.configuracion === 'string' ?
        JSON.parse(horario.configuracion) :
        horario.configuracion;

      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

      const diaHoy = dias[new Date().getDay()];
      let turnosHoy = [];

      if (config.configuracion_semanal) {

        const keyEncontrada = Object.keys(config.configuracion_semanal).find(
          (k) => k.toLowerCase() === diaHoy
        );
        if (keyEncontrada) {
          turnosHoy = config.configuracion_semanal[keyEncontrada].map((t) => ({
            entrada: t.inicio || t.entrada,
            salida: t.fin || t.salida
          }));
        }
      }
      if (turnosHoy.length === 0 && config.dias) {
        const tieneHoy = config.dias.some((d) => d.toLowerCase() === diaHoy);
        if (tieneHoy) turnosHoy = (config.turnos || []).map((t) => ({
          entrada: t.inicio || t.entrada,
          salida: t.fin || t.salida
        }));
      }

      if (!turnosHoy || turnosHoy.length === 0) {
        return { trabaja: false, numBloques: 0, entrada: null, salida: null };
      }



      // No fusionar turnos a menos que sean literalmente continuos (sin descanso intermedio)
      const INTERVALO_FUSION = 0;
      const rangos = turnosHoy.
        map((t) => {
          const [he, me] = (t.entrada || '00:00').split(':').map(Number);
          const [hs, ms] = (t.salida || '00:00').split(':').map(Number);
          return { entrada: he * 60 + me, salida: hs * 60 + ms };
        }).
        sort((a, b) => a.entrada - b.entrada);

      const bloques = [];
      let bActual = { ...rangos[0] };
      for (let i = 1; i < rangos.length; i++) {
        const sep = rangos[i].entrada - bActual.salida;
        if (sep <= INTERVALO_FUSION) {
          bActual.salida = Math.max(bActual.salida, rangos[i].salida);
        } else {
          bloques.push({ ...bActual });
          bActual = { ...rangos[i] };
        }
      }
      bloques.push(bActual);


      const minToHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      return {
        trabaja: true,
        numBloques: bloques.length,
        bloques,
        tolerancias: {
          anticipoEntrada: toleranciasSqlite?.minutos_anticipado_max != null ? parseInt(toleranciasSqlite.minutos_anticipado_max) : parseInt(config?.minutos_anticipado_max) || 0,
          anticipoSalida: toleranciasSqlite?.minutos_anticipo_salida != null ? parseInt(toleranciasSqlite.minutos_anticipo_salida) : parseInt(config?.minutos_anticipo_salida) || 0,
          posteriorSalida: toleranciasSqlite?.minutos_posterior_salida != null ? parseInt(toleranciasSqlite.minutos_posterior_salida) : parseInt(config?.minutos_posterior_salida) || 0
        },
        entrada: minToHHMM(bloques[0].entrada),
        salida: minToHHMM(bloques[bloques.length - 1].salida)
      };
    } catch (err) {
      return null;
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
          const online = await syncManager.isOnline() && !syncManager.getIsBackendDown();
          if (online) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(
              `${API_URL}/departamentos/${depto.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${userData.token}`,
                  'Content-Type': 'application/json'
                },
                signal: controller.signal
              }
            );
            clearTimeout(timeoutId);
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
      resultados = resultados.filter((d) => d !== null);

      if (resultados.length === 0) {
        const cached = await sqliteManager.getDepartamentos(userData.empleado_id);
        if (cached && cached.length > 0) {
          resultados = cached.map((c) => ({
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

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      try {
        let onlineNow = false;
        let reachable = false;
        try {
          const state = await Network.getNetworkStateAsync();
          onlineNow = state.isConnected;
          reachable = state.isInternetReachable;
        } catch (e) { }

        setIsOnline(onlineNow);
        setInternetReachable(reachable !== false && onlineNow);


        const tzDate = new Date();
        const tzOffset = tzDate.getTimezoneOffset() * 60000;
        const hoyStr = new Date(tzDate.getTime() - tzOffset).toISOString().split('T')[0];

        if (onlineNow && !syncManager.getIsBackendDown()) {
          try {
            const yearActual = new Date().getFullYear();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const festivoResp = await fetch(
              `${API_URL}/dias-festivos?year=${yearActual}`,
              {
                headers: { 'Authorization': `Bearer ${userData.token}`, 'Content-Type': 'application/json' },
                signal: controller.signal
              }
            );
            clearTimeout(timeoutId);
            if (festivoResp.ok) {
              const festivoData = await festivoResp.json();
              const festivosObligatorios = (festivoData.data || []).filter(
                (f) => f.es_obligatorio && f.es_activo && f.fecha?.split('T')[0] === hoyStr
              );
              if (festivosObligatorios.length > 0) {
                const diaFest = { nombre: festivosObligatorios[0].nombre, tipo: festivosObligatorios[0].tipo };
                setDiaFestivo(diaFest);
                // Guardar en SQLite oficial para el modo offline
                try {
                  await sqliteManager.upsertDiasFestivos([{
                    fecha: hoyStr,
                    nombre: diaFest.nombre,
                    tipo: diaFest.tipo
                  }]);
                } catch (e) { }
              } else {
                setDiaFestivo(null);
                // No hay API nativa expuesta para borrar un festivo individual desde el client frontend, 
                // pero si no detecta hoy no pasa nada, en el fetch original se filtra limpiamente.
              }
            }
          } catch (_e) { }
        } else {
          // OFFLINE: Recuperar el día festivo oficial de SQLite
          try {
            const cachedFestivo = await sqliteManager.getDiaFestivo(hoyStr);
            if (cachedFestivo) {
              setDiaFestivo({ nombre: cachedFestivo.nombre, tipo: cachedFestivo.tipo });
            } else {
              setDiaFestivo(null);
            }
          } catch (e) { }
        }


        const [resultadoRegistro, horario, deptos] = await Promise.all([
          obtenerUltimoRegistro(),
          obtenerHorario(),
          obtenerDepartamentos()]
        );

        const { ultimo, todos } = resultadoRegistro || { ultimo: null, todos: [] };
        setUltimoRegistroHoy(ultimo);
        setRegistrosHoyTodos(todos);
        setHorarioInfo(horario);
        setDepartamentos(deptos);


        await actualizarEstadoPreflight();



      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [obtenerUltimoRegistro, obtenerHorario, obtenerDepartamentos]);



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

      if (departamentoSeleccionado && !deptsDisponibles.find((d) => d.id === departamentoSeleccionado.id)) {
        setDepartamentoSeleccionado(deptsDisponibles[0] || null);
      }
    };

    validarArea();

  }, [ubicacionActual, departamentos]);

  const handleVerificarPin = async (pin) => {
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
      if (e.message === 'PIN incorrecto') {
        setRegistrando(false);
        throw e;
      }

      const esErrorDeRed =
        e.message.includes('Network request failed') ||
        e.message.includes('Failed to fetch') ||
        e.message.includes('Timeout') ||
        e.message.includes('network') ||
        e.message.includes('Servidor inactivo') ||
        e.message.includes('JSON') ||
        e.name === 'AbortError';


      if (!esErrorDeRed) {
        setRegistrando(false);
        throw e;
      }

      (function () { })('PIN online falló por red, intentando offline...');

      const identified = await offlineAuthService.identificarPorPinOffline(pin);
      if (identified && String(identified.empleado_id) === String(userData.empleado_id)) {
        pinVerificado = true;
      } else {
        setRegistrando(false);
        throw new Error('PIN incorrecto');
      }
    }

    if (pinVerificado) {
      setMostrarPinAuth(false);
      setMostrarAutenticacion(false);
      procederConRegistro();
    }
  };

  const handleAutenticacionHuella = async () => {
    try {
      datosRegistroRef.current.metodo = 'HUELLA';
      setMostrarAutenticacion(false);
      setRegistrando(true);

      const resultado = await capturarHuellaDigital(userData.empleado_id);

      if (resultado.success) {
        setRegistrando(false);
        Alert.alert(
          'Doble Seguridad',
          'Huella verificada localmente.\n\nPor favor, realiza el reconocimiento facial para completar tu registro.',
          [{ text: 'Continuar a Cámara', onPress: () => setMostrarCapturaFacial(true) }]
        );
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
      datosRegistroRef.current.metodo = 'FACIAL';
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
      (function () { })(' Captura facial completada para autenticación de registro');

      if (!captureData.faceDetectionUsed || !captureData.validated) {
        throw new Error('No se detectó un rostro válido en la captura');
      }

      const faceFeatures = processFaceData(captureData.faceData);
      const validation = validateFaceQuality(faceFeatures);

      if (!validation.isValid) {
        (function () { })('️ Validación de calidad falló:', validation.errors);
        Alert.alert(
          'Calidad insuficiente',
          validation.errors.join('\n') + '\n\n¿Deseas intentar de nuevo?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setRegistrando(false) },
            { text: 'Reintentar', onPress: () => setMostrarCapturaFacial(true) }]

        );
        setRegistrando(false);
        return;
      }

      (function () { })(' Validación facial detectó rostro de calidad, enviando imagen al servidor para verificar identidad...');

      const empleadoId = userData?.empleado?.id || userData?.empleado_id || userData?.id;

      let verifyOffline = false;
      try {
        const response = await fetch(`${API_URL}/credenciales/facial/verify-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userData.token}`
          },
          body: JSON.stringify({
            empleado_id: empleadoId,
            imagen_base64: captureData.photoBase64
          })
        });

        const verification = await response.json();

        if (!response.ok || !verification.success) {
          (function () { })(' Verificación facial falló en el servidor:', verification);
          Alert.alert(
            'Identidad no verificada',
            verification.message || 'El rostro capturado no coincide con tu registro.',
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => setRegistrando(false) },
              { text: 'Reintentar', onPress: () => setMostrarCapturaFacial(true) }]

          );
          setRegistrando(false);
          return;
        }

        (function () { })(` Identidad verificada (${verification.data?.matchScore || 100}% similitud), procediendo con el registro`);
      } catch (networkError) {
        const esErrorDeRed = networkError.message.includes('Network') || networkError.message.includes('fetch');
        if (esErrorDeRed || !isOnline) {
          verifyOffline = true;
          (function () { })(' Error de red en verificación facial. Procedimiento offline.');
        } else {
          throw networkError;
        }
      }

      datosRegistroRef.current.payloadBiometrico = captureData.photoBase64;
      await procederConRegistro();
    } catch (error) {
      (function () { })(' Error en autenticación facial:', error);
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



      const tipoActual = tipoSiguienteRegistroRef.current;

      try {
        const location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            maximumAge: 3000
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))]
        );
        ubicacionFinal = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
      } catch (locationError) { (function () { })('Location real-time failed, using last known'); }

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


      let networkIp = null;
      let networkWifi = null;
      try {
        const netState = await Network.getNetworkStateAsync();
        networkIp = await Promise.race([
          Network.getIpAddressAsync(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))]
        );



        if (netState.type === Network.NetworkStateType.WIFI) {
          networkWifi = { tipo: netState.type, isConnected: netState.isConnected };
        }
      } catch (netErr) {
        (function () { })('No se pudo obtener la IP local:', netErr);
      }





      const payload = {
        empleado_id: userData.empleado_id,
        dispositivo_origen: 'movil',
        ubicacion: [ubicacionFinal.lat, ubicacionFinal.lng],
        departamento_id: departamento.id,
        ip: networkIp,
        wifi: networkWifi,
        fecha_captura: new Date().toISOString()
      };

      let success = false;
      let data = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${API_URL}/asistencias/registrar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userData.token}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

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


          if (data.noPuedeRegistrar === true) {
            setPuedeRegistrar(false);
            if (data.estadoHorario) setEstadoHorario(data.estadoHorario);
          }
          throw new Error(errorMsg);
        }

        success = true;

        try {
          await saveOnlineAsistenciaToCache({
            id: data?.data?.id || `local_online_${Date.now()}`,
            empleado_id: payload.empleado_id,
            tipo: data?.data?.tipo || tipoActual,
            estado: data?.data?.estado || 'puntual',
            fecha_registro: new Date().toISOString(),
            dispositivo_origen: 'movil',
            departamento_id: payload.departamento_id
          });
        } catch (cacheErr) {
          (function () { })('No crítico: no se pudo cachear registro online:', cacheErr.message);
        }

      } catch (e) {
        const esErrorDeRed =
          e.message === 'Server Error' ||
          e.message.includes('Network request failed') ||
          e.message.includes('Failed to fetch') ||
          e.message.includes('Timeout') ||
          e.message.includes('network') ||
          e.name === 'AbortError';


        if (!esErrorDeRed) {
          throw e;
        }
        (function () { })('Error de red, guardando offline:', e.message);
      }

      if (!success) {
        (function () { })('Saving offline attendance...');




        await sqliteManager.saveOfflineAsistencia({
          ...payload,
          tipo: tipoActual,
          estado: 'pendiente',
          metodo_registro: datosRegistroRef.current.metodo || 'PIN',
          fecha_registro: new Date().toISOString(),
          ubicacion: payload.ubicacion || [ubicacionFinal.lat, ubicacionFinal.lng],
          ip: payload.ip,
          wifi: payload.wifi,
          payload_biometrico: datosRegistroRef.current.payloadBiometrico
        });



        data = {
          data: {
            tipo: tipoActual,
            estado: 'pendiente',
            _offline: true
          }
        };
      }


      const tipoRegistrado = data?.data?.tipo || tipoActual;
      const estadoRegistrado = data?.data?.estado || 'puntual';

      const registroOptimista = {
        tipo: tipoRegistrado,
        estado: estadoRegistrado,
        fecha_registro: new Date()
      };
      const todosOptimistas = [...(registrosHoyTodosRef.current || []), registroOptimista];
      const ultimoOptimista = {
        tipo: tipoRegistrado,
        estado: estadoRegistrado,
        fecha_registro: registroOptimista.fecha_registro,
        hora: registroOptimista.fecha_registro.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        totalRegistrosHoy: todosOptimistas.length
      };
      registrosHoyTodosRef.current = todosOptimistas;
      ultimoRegistroHoyRef.current = ultimoOptimista;


      const resultadoNuevo = await obtenerUltimoRegistro();
      const { ultimo: nuevoUltimo, todos: nuevosTodos } = resultadoNuevo || { ultimo: null, todos: [] };
      setUltimoRegistroHoy(nuevoUltimo);
      setRegistrosHoyTodos(nuevosTodos);
      ultimoRegistroHoyRef.current = nuevoUltimo;
      registrosHoyTodosRef.current = nuevosTodos;


      await actualizarEstadoPreflight();


      const esOffline = data?.data?._offline === true;
      let estadoTexto = estadoRegistrado;


      if (tipoRegistrado === 'salida') {
        if (estadoRegistrado === 'salida_temprana' || estadoRegistrado === 'salida_temprano') {
          estadoTexto = 'salida anticipada';
        } else {
          estadoTexto = 'salida registrada';
        }
      } else {
        if (estadoRegistrado === 'pendiente') {
          estadoTexto = 'pendiente (sin conexión)';
        } else if (estadoRegistrado === 'entrada_temprana') {
          estadoTexto = 'entrada anticipada';
        } else if (estadoRegistrado === 'puntual') {
          estadoTexto = 'puntual';
        } else if (estadoRegistrado === 'falta') {
          estadoTexto = 'falta';
        } else if (estadoRegistrado === 'falta_por_retardo') {
          estadoTexto = 'falta por retardo';
        } else {

          estadoTexto = estadoRegistrado.replace(/_/g, ' ');

        }
      }

      const tipoMayuscula = tipoRegistrado === 'entrada' ? 'Entrada' : 'Salida';
      const horaStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      Vibration.vibrate(500);
      Alert.alert(
        esOffline ? 'Pendiente a revisar' : '¡Éxito!',
        [
          `${tipoMayuscula} registrada como ${estadoTexto}`,
          `Departamento: ${departamento.nombre}`,
          `Hora: ${horaStr}`,
          esOffline ? '\nSe sincronizará y se analizará tu asistencia automáticamente cuando haya conexión de la base de datos o internet.' : ''].
          filter(Boolean).join('\n'),
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
    if (registrando) return;

    // Bloqueo inmediato en día festivo — antes de cualquier otra validación
    if (diaFestivo) {
      Alert.alert(
        'Día Festivo',
        `Hoy es ${diaFestivo.nombre}.\n\nEl registro de asistencia no está disponible en días festivos obligatorios.`,
        [{ text: 'Entendido' }]
      );
      return;
    }

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


    const continuarProcesoRegistro = () => {
      if (!puedeRegistrar || !dentroDelArea || !departamentoSeleccionado) {
        let mensaje = 'No puedes registrar en este momento';

        if (!dentroDelArea) {
          mensaje = 'Debes estar dentro de un área permitida';
        } else if (!departamentoSeleccionado) {
          mensaje = 'Selecciona un departamento para registrar';
        } else if (estadoHorario === 'falta_previa') {
          Alert.alert(
            'Aviso de Falta',
            'Tu entrada anterior fue marcada como falta. Se recomienda esperar a tu siguiente turno, ¿deseas continuar con un nuevo registro?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Continuar', onPress: () => {
                  setRegistrando(true);
                  setMostrarAutenticacion(true);
                }
              }
            ]
          );
          return;
        } else if (jornadaCompletada || estadoHorario === 'bloque_completo') {
          mensaje = 'Ya completaste tu jornada de hoy';
        } else if (estadoHorario === 'tiempo_insuficiente') {
          mensaje = `Aún no puedes salir.\n\n${mensajeEspera}`;
        } else if (estadoHorario === 'fuera_horario' || estadoHorario === 'sin_horario') {
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

      setRegistrando(true);
      setMostrarAutenticacion(true);
    };

    if (!usandoEstadoBackend && horarioInfo && horarioInfo.bloques && !jornadaCompletada) {
      const ahora = new Date();
      const minsAhora = ahora.getHours() * 60 + ahora.getMinutes();
      const { bloques, tolerancias } = horarioInfo;
      const { anticipoEntrada = 0, anticipoSalida = 0, posteriorSalida = 0 } = tolerancias || {};

      const _minsToHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

      if (tipoSiguienteRegistro === 'entrada') {

        const regsTodos = registrosHoyTodosRef.current || [];

        // Tolerancia offline de entrada: mínimo 5 minutos de anticipo garantizado.
        // Si el admin configuró más (ej. 15 min), se respeta ese valor.
        const ANTICIPO_OFFLINE_MIN = 5;
        const anticipoEntradaEfectivo = Math.max(anticipoEntrada, ANTICIPO_OFFLINE_MIN);

        const getMinutosLocales = (fechaStr) => {
          if (!fechaStr) return -1;


          try {
            const d = new Date(fechaStr);
            if (isNaN(d.getTime())) return -1;
            return d.getHours() * 60 + d.getMinutes();
          } catch (e) {
            return -1;
          }
        };


        const bloqueSinEntrada = bloques.find((b) => {
          const tieneEntrada = regsTodos.some((r) => {
            if (r.tipo !== 'entrada') return false;
            const m = getMinutosLocales(r.fecha_registro);
            return m >= b.entrada - anticipoEntrada && m <= b.salida + posteriorSalida;
          });
          // Sin límite de tiempo máximo: permitir entrada aunque haya pasado la hora
          return !tieneEntrada;
        });

        if (bloqueSinEntrada) {
          if (minsAhora < bloqueSinEntrada.entrada - anticipoEntradaEfectivo) {
            // Bloqueo total: aún no es la hora permitida (máx. 5 min de anticipo offline).
            Alert.alert(
              'Aún no es tu hora',
              `Tu próxima entrada está programada a las ${_minsToHHMM(bloqueSinEntrada.entrada)}.\n` +
              `\nEl registro se habilitará a las ${_minsToHHMM(bloqueSinEntrada.entrada - anticipoEntradaEfectivo)}.`,
              [{ text: 'Entendido' }]
            );
            return;
          }
        } else {
          Alert.alert(
            'Aviso',
            'Parece que ya has registrado todas tus entradas programadas para hoy.\nSe procederá con el registro adicional.',
            [{ text: 'OK', onPress: continuarProcesoRegistro }]
          );
          return;
        }
      }

      if (tipoSiguienteRegistro === 'salida') {
        const MARGEN_SALIDA = 5;

        const bloqueActivoSalida = bloques.find((b) => minsAhora <= b.salida + posteriorSalida);

        if (bloqueActivoSalida) {
          const horaSalidaPermitida = bloqueActivoSalida.salida - MARGEN_SALIDA;

          if (minsAhora < horaSalidaPermitida) {
            Alert.alert(
              'Aviso',
              `Aún no es momento de registrarte, tu salida es a las ${_minsToHHMM(bloqueActivoSalida.salida)}.\n\nEl sistema se habilitará a las ${_minsToHHMM(horaSalidaPermitida)}.`
            );
            return;
          }
        } else {
          Alert.alert(
            'Aviso',
            'Tu jornada ha terminado o el tiempo para registrar tu salida ya finalizó.\nSe procederá con el registro adicional.',
            [{ text: 'OK', onPress: continuarProcesoRegistro }]
          );
          return;
        }
      }
    }

    continuarProcesoRegistro();
  };

  const getButtonColor = () => {
    if (estadoHorario === 'espera') return '#f59e0b';
    if (jornadaCompletada) return '#6b7280';
    if (estadoHorario === 'dia_festivo' || diaFestivo) return '#8b5cf6';
    if (estadoHorario === 'falta_previa') return '#6b7280';
    if (!dentroDelArea || !puedeRegistrar) return '#ef4444';
    if (!tipoSiguienteRegistro) return '#6b7280';

    if (tipoSiguienteRegistro === 'salida') return '#10b981';
    return '#10b981';
  };

  const getIcon = () => {
    if (estadoHorario === 'espera') return 'hourglass-outline';
    if (jornadaCompletada) return 'checkmark-done-circle';
    if (estadoHorario === 'dia_festivo' || diaFestivo) return 'calendar-outline';
    if (estadoHorario === 'falta_previa') return 'alert-circle-outline';
    if (!dentroDelArea) return 'location';
    if (!puedeRegistrar) return 'time';
    if (!tipoSiguienteRegistro) return 'sync';
    if (tipoSiguienteRegistro === 'salida') return 'log-out';
    return 'log-in';
  };

  const getStatusText = () => {
    if (estadoHorario === 'espera') return 'Espera requerida';
    if (jornadaCompletada) return 'Jornada completada';
    if (estadoHorario === 'dia_festivo' || diaFestivo) return diaFestivo ? `Día festivo: ${diaFestivo.nombre}` : 'Día festivo';
    if (estadoHorario === 'falta_previa') return 'Falta registrada — turno cerrado';
    if (estadoHorario === 'bloque_completo') return 'Bloque completado';
    if (!dentroDelArea) return 'Fuera del área';
    if (!puedeRegistrar) return 'Fuera de horario';
    if (!tipoSiguienteRegistro) return 'Calculando estado...';
    if (tipoSiguienteRegistro === 'salida') return 'Listo para salida';
    return 'Listo para entrada';
  };

  const getButtonText = () => {
    if (estadoHorario === 'espera') return 'Espera temporal activa';
    if (jornadaCompletada || estadoHorario === 'bloque_completo') return 'Jornada completada';
    if (estadoHorario === 'dia_festivo' || diaFestivo) return 'Día festivo';
    if (estadoHorario === 'falta_previa') return 'Turno cerrado por falta';
    if (!puedeRegistrar || !dentroDelArea || !tipoSiguienteRegistro) return 'No disponible';
    return `Registrar ${tipoSiguienteRegistro === 'entrada' ? 'Entrada' : 'Salida'}`;
  };

  const puedePresionarBoton = puedeRegistrar && !diaFestivo && dentroDelArea && !jornadaCompletada && !registrando && departamentoSeleccionado && tipoSiguienteRegistro;

  // Render de Captura Facial
  if (mostrarCapturaFacial) {
    return (
      <FacialCaptureScreen
        onCapture={handleFacialCaptureComplete}
        onCancel={handleFacialCaptureCancel}
        darkMode={darkMode} />);


  }

  // Aquí se renderiza la vista principal del botón
  return (
    <>
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: `${getButtonColor()}15` }]}>
            {loading || !tipoSiguienteRegistro ?
              <ActivityIndicator size="small" color={getButtonColor()} /> :

              <Ionicons name={getIcon()} size={16} color={getButtonColor()} />
            }
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

          {!loading && !jornadaCompletada &&
            <View style={styles.statusIndicators}>
              <View style={styles.indicator}>
                <Ionicons
                  name={dentroDelArea ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={dentroDelArea ? '#10b981' : '#ef4444'} />

                <Text style={[styles.indicatorText, { color: dentroDelArea ? '#10b981' : '#ef4444' }]}>
                  {dentroDelArea ? 'Dentro de zona' : 'Fuera de zona'}
                </Text>
              </View>

              <View style={styles.indicator}>
                <Ionicons
                  name={
                    estadoHorario === 'espera' ? 'hourglass-outline' :
                      !puedeRegistrar ? 'time-outline' :
                        tipoSiguienteRegistro === 'salida' ? 'log-out' : 'log-in'
                  }
                  size={16}
                  color={
                    estadoHorario === 'espera' ? '#f59e0b' :
                      !puedeRegistrar ? '#ef4444' :
                        tipoSiguienteRegistro === 'salida' ? '#10b981' : '#10b981'
                  } />

                <Text style={[
                  styles.indicatorText,
                  {
                    color: estadoHorario === 'espera' ? '#f59e0b' :
                      !puedeRegistrar ? '#ef4444' :
                        tipoSiguienteRegistro === 'salida' ? '#10b981' : '#10b981'
                  }]
                }>
                  {estadoHorario === 'espera' ?
                    '1 min. entre registros' :
                    estadoHorario === 'falta_previa' ?
                      'Turno cerrado (falta)' :
                      estadoHorario === 'bloque_completo' ?
                        'Bloque completado' :
                        !puedeRegistrar ?
                          'Fuera de horario' :
                          tipoSiguienteRegistro === 'salida' ?
                            'Siguiente: Salida' :
                            'Siguiente: Entrada'
                  }
                </Text>
              </View>
            </View>
          }

          {!loading && departamentos.length > 0 &&
            <>
              {departamentosDisponibles.length > 0 ?
                <TouchableOpacity
                  style={styles.locationInfo}
                  onPress={() => setMostrarDepartamentos(true)}
                  activeOpacity={0.7}>

                  <Ionicons name="location" size={14} color="#10b981" />
                  <Text style={[styles.locationText, { color: '#10b981' }]} numberOfLines={1}>
                    {departamentoSeleccionado ?
                      departamentoSeleccionado.nombre :
                      `${departamentosDisponibles.length} ${departamentosDisponibles.length === 1 ? 'disponible' : 'disponibles'}`
                    }
                  </Text>
                  {departamentosDisponibles.length > 1 &&
                    <Ionicons name="chevron-down" size={14} color="#10b981" style={{ marginLeft: 4 }} />
                  }
                </TouchableOpacity> :

                <View style={[styles.locationInfo, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="location-outline" size={14} color="#ef4444" />
                  <Text style={[styles.locationText, { color: '#ef4444' }]} numberOfLines={1}>
                    Fuera de zona
                  </Text>
                </View>
              }

              {internetReachable ?
                <TouchableOpacity
                  style={styles.viewMapButton}
                  onPress={() => setMostrarMapa(true)}
                  activeOpacity={0.7}>

                  <Ionicons
                    name={usandoEstadoBackend ? "map-outline" : "cloud-offline-outline"}
                    size={16}
                    color={usandoEstadoBackend ? "#3b82f6" : "#f59e0b"}
                  />
                  <Text style={[styles.viewMapText, !usandoEstadoBackend && { color: '#f59e0b' }]}>
                    {usandoEstadoBackend ? "Ver mapa" : "Mapa (Servidor Caído)"}
                  </Text>
                </TouchableOpacity> :

                <View style={[styles.viewMapButton, { opacity: 0.5 }]}>
                  <Ionicons name="cloud-offline-outline" size={14} color="#9ca3af" />
                  <Text style={[styles.viewMapText, { color: '#9ca3af', fontSize: 11 }]}>Sin conexión</Text>
                </View>
              }
            </>
          }

          <TouchableOpacity
            style={[
              styles.registerButton,
              { backgroundColor: getButtonColor() },
              !puedePresionarBoton && styles.registerButtonDisabled]
            }
            onPress={handleRegistro}
            disabled={!puedePresionarBoton}
            activeOpacity={0.7}>

            {registrando ?
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.registerButtonText}>Registrando...</Text>
              </> :

              <>
                <Ionicons
                  name={estadoHorario === 'espera' ? 'hourglass-outline' : puedePresionarBoton ? 'finger-print' : jornadaCompletada ? 'checkmark-done' : 'lock-closed'}
                  size={20}
                  color="#fff" />

                <Text style={styles.registerButtonText}>
                  {getButtonText()}
                </Text>
              </>
            }
          </TouchableOpacity>

          {ultimoRegistroHoy &&
            <View style={styles.lastRegisterContainer}>
              <View style={styles.lastRegisterIcon}>
                <Ionicons
                  name={ultimoRegistroHoy.tipo === 'entrada' ? 'log-in' : 'log-out'}
                  size={12}
                  color="#9ca3af" />

              </View>
              <Text style={styles.lastRegisterText}>
                Último: {ultimoRegistroHoy.tipo === 'entrada' ? 'Entrada' : 'Salida'} · {ultimoRegistroHoy.hora}
                {ultimoRegistroHoy.estado && ` · ${ultimoRegistroHoy.estado}`}
              </Text>
            </View>
          }
        </View>
      </View>

      <Modal
        visible={mostrarAutenticacion}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setRegistrando(false);
          setMostrarAutenticacion(false);
        }}>

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
              {metodosDisponibles.
                map((metodo) =>
                  <TouchableOpacity
                    key={metodo.id}
                    style={styles.authMethodCard}
                    onPress={getHandlerForMetodo(metodo.id)}
                    activeOpacity={0.7}>

                    <View style={styles.authMethodIcon}>
                      <Ionicons name={metodo.icono} size={32} color="#3b82f6" />
                    </View>
                    <Text style={styles.authMethodName}>{metodo.nombre}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
              style={styles.authCancelButton}
              onPress={() => {
                setRegistrando(false);
                setMostrarAutenticacion(false);
              }}>

              <Text style={styles.authCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PinInputModal
        visible={mostrarPinAuth}
        onClose={() => {
          setRegistrando(false);
          setMostrarPinAuth(false);
        }}
        onConfirm={handleVerificarPin}
        title="Verificar PIN"
        subtitle="Ingresa tu PIN de seguridad"
        darkMode={darkMode}
        requireConfirmation={false} />


      {departamentosDisponibles.length > 0 &&
        <Modal
          visible={mostrarDepartamentos}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMostrarDepartamentos(false)}>

          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMostrarDepartamentos(false)}>

            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Departamentos Disponibles</Text>
                <TouchableOpacity
                  onPress={() => setMostrarDepartamentos(false)}
                  style={styles.modalCloseButton}>

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
                        esSeleccionado && styles.departamentoItemActivo]
                      }
                      onPress={() => {
                        setDepartamentoSeleccionado(depto);
                        setMostrarDepartamentos(false);
                      }}
                      activeOpacity={0.7}>

                      <View style={styles.departamentoInfo}>
                        <View style={styles.departamentoHeader}>
                          <Ionicons
                            name={esSeleccionado ? 'location' : 'location-outline'}
                            size={20}
                            color={esSeleccionado ? '#10b981' : '#6b7280'} />

                          <Text style={[
                            styles.departamentoNombre,
                            esSeleccionado && styles.departamentoNombreActivo]
                          }>
                            {depto.nombre}
                          </Text>
                        </View>

                        {esSeleccionado &&
                          <View style={styles.departamentoBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.departamentoBadgeText}>Seleccionado para registro</Text>
                          </View>
                        }
                      </View>

                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>);

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
      }

      {departamentos.length > 0 &&
        <Modal
          visible={mostrarMapa}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setMostrarMapa(false)}>

          <MapaZonasPermitidas
            departamento={departamentoSeleccionado}
            departamentos={departamentos}
            ubicacionActual={ubicacionActual}
            onClose={() => setMostrarMapa(false)}
            onDepartamentoSeleccionado={(depto) => {
              if (departamentosDisponibles.find((d) => d.id === depto.id)) {
                setDepartamentoSeleccionado(depto);
              }
            }}
            darkMode={darkMode} />

        </Modal>
      }
    </>);

};

export default RegisterButton;