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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
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
import sqliteManager, { saveOnlineAsistenciaToCache } from '../../services/offline/sqliteManager.mjs';
import offlineAuthService from '../../services/offline/offlineAuthService.mjs';
import syncManager from '../../services/offline/syncManager.mjs';
import pushService from '../../services/offline/pushService.mjs';

import { registerStyles, registerStylesDark } from './RegisterButtonStyles';

const API_URL = getApiEndpoint('/api');
const NOTIF_DIARIA_KEY = '@notif_asistencia_disponible';

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
  const [tipoSiguienteRegistro, setTipoSiguienteRegistro] = useState('entrada');
  const [estadoHorario, setEstadoHorario] = useState(null);
  const [jornadaCompletada, setJornadaCompletada] = useState(false);
  const [mensajeEspera, setMensajeEspera] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [diaFestivo, setDiaFestivo] = useState(null); // { nombre, tipo } si hoy es festivo

  const datosRegistroRef = useRef({
    ubicacion: null,
    departamento: null
  });
  const notificadoEstadoRef = useRef(null);

  // ─── Ref para notificaciones diarias persistentes ───────────────────────────
  // Estructura: { fecha: 'YYYY-MM-DD', entrada: bool, salida: bool }
  // Se carga desde AsyncStorage al montar para sobrevivir re-renders y desmontajes
  const notifDiariaRef = useRef({ fecha: '', entrada: false, salida: false });
  // ────────────────────────────────────────────────────────────────────────────

  const horarioInfoRef = useRef(null);
  const ultimoRegistroHoyRef = useRef(null);
  const registrosHoyTodosRef = useRef([]);
  const tipoSiguienteRegistroRef = useRef('entrada');
  const isOnlineRef = useRef(false);
  const ticksRef = useRef(0);
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

  // ─── Cargar estado de notificaciones diarias desde AsyncStorage ─────────────
  // Esto garantiza que aunque el componente se desmonte y remonte (cambio de
  // pantalla, etc.) no se vuelva a notificar si ya se hizo hoy.
  useEffect(() => {
    const cargarEstadoNotifDiaria = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIF_DIARIA_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const hoy = new Date().toISOString().split('T')[0];
          if (parsed.fecha === hoy) {
            // Es del día de hoy → restaurar estado para no re-notificar
            notifDiariaRef.current = parsed;
          } else {
            // Es de otro día → nuevo día laboral, resetear
            const nuevoEstado = { fecha: hoy, entrada: false, salida: false };
            notifDiariaRef.current = nuevoEstado;
            await AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(nuevoEstado));
          }
        }
      } catch (e) {
        // Si AsyncStorage falla, simplemente no persiste pero no rompe la app
      }
    };
    cargarEstadoNotifDiaria();
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

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

  // ─── Intervalo de 1 segundo — solo actualiza el reloj + refresco periódico ───
  useEffect(() => {
    const intervalo = setInterval(async () => {
      setHoraActual(new Date());
      ticksRef.current += 1;

      // ── Cada 60 segundos refrescar horario y últimos registros ───────────────
      if (ticksRef.current % 60 === 0) {
        try {
          let onlineNow = false;
          try { onlineNow = await syncManager.isOnline(); } catch (e) { /* offline */ }
          setIsOnline(onlineNow);

          const [nuevoHorario, resultadoRegistro] = await Promise.all([
            obtenerHorario(),
            obtenerUltimoRegistro()
          ]);
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
        } catch (_e) { /* fallo silencioso, se reintenta al siguiente minuto */ }
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [obtenerHorario, obtenerUltimoRegistro]);
  // ────────────────────────────────────────────────────────────────────────────

  // ─── Derivar estado de registro — 100% desde valores de la DB ────────────────
  // No se hace ningún cálculo propio. Solo se leen los campos que el backend ya
  // devuelve en ultimoRegistroHoy (tipo, estado) que provienen directamente de la DB.
  // El backend (srvVerificarLongitudYTipo, srvValidarVentanaDeRegistro) es quien decide
  // todo al momento de registrar; aquí solo actualizamos la UI para reflejarlo.
  useEffect(() => {
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

    // ── Sin registros hoy → siguiente es entrada ─────────────────────────────
    if (!ultimoRegistroHoy) {
      setPuedeRegistrar(true);
      setTipoSiguienteRegistro('entrada');
      setEstadoHorario(null);
      setJornadaCompletada(false);
      setMensajeEspera('');

      const hoy = new Date().toISOString().split('T')[0];
      if (notifDiariaRef.current.fecha !== hoy) {
        const nuevoEstado = { fecha: hoy, entrada: false, salida: false };
        notifDiariaRef.current = nuevoEstado;
        AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(nuevoEstado)).catch(() => { });
      }
      if (!notifDiariaRef.current.entrada) {
        notifDiariaRef.current = { ...notifDiariaRef.current, entrada: true };
        AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
        notificarEstadoAsistencia('entrada');
      }
      return;
    }

    // ── Leer estado y tipo directamente de la DB (sin recalcular) ────────────
    const ultimoEstado = ultimoRegistroHoy.estado; // viene del campo `estado` en DB
    const ultimoTipo = ultimoRegistroHoy.tipo;   // viene del campo `tipo` en DB

    // El backend marca la entrada como falta cuando el empleado llegó demasiado tarde.
    // srvVerificarLongitudYTipo cierra el bloque con motivoCierre='falta_previa' en ese caso,
    // lo que significa que NO se debe registrar salida — el bloque ya quedó cerrado.
    // Leemos el estado de la DB para reflejar esto en la UI sin recalcular nada.
    const ESTADOS_FALTA = ['falta', 'falta_directa', 'falta_automatica'];
    if (ultimoTipo === 'entrada' && ESTADOS_FALTA.includes(ultimoEstado)) {
      setPuedeRegistrar(false);
      setTipoSiguienteRegistro('entrada');
      setEstadoHorario('falta_previa');
      setJornadaCompletada(false);
      setMensajeEspera('Tu entrada fue registrada como falta. No es necesario registrar salida.');
      return;
    }

    // ── Último registro fue salida → jornada del bloque completa ─────────────
    if (ultimoTipo === 'salida') {
      setPuedeRegistrar(false);
      setTipoSiguienteRegistro('entrada');
      setEstadoHorario('bloque_completo');
      setJornadaCompletada(true);
      setMensajeEspera('');
      return;
    }

    // ── Último registro fue entrada válida → siguiente es salida ─────────────
    // (La ventana de salida la valida el backend al intentar registrar)
    setPuedeRegistrar(true);
    setTipoSiguienteRegistro('salida');
    setEstadoHorario(ultimoEstado || null);
    setJornadaCompletada(false);
    setMensajeEspera('');

    // ── Notificación diaria (una sola vez por tipo por día) ──────────────────
    const hoy = new Date().toISOString().split('T')[0];
    if (notifDiariaRef.current.fecha !== hoy) {
      const nuevoEstado = { fecha: hoy, entrada: false, salida: false };
      notifDiariaRef.current = nuevoEstado;
      AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(nuevoEstado)).catch(() => { });
    }
    if (!notifDiariaRef.current.salida) {
      notifDiariaRef.current = { ...notifDiariaRef.current, salida: true };
      AsyncStorage.setItem(NOTIF_DIARIA_KEY, JSON.stringify(notifDiariaRef.current)).catch(() => { });
      notificarEstadoAsistencia('salida');
    }
    // ────────────────────────────────────────────────────────────────────────
  }, [horarioInfo, ultimoRegistroHoy, diaFestivo]);
  // ──────────────────────────────────────────────────────────────────────────────



  const obtenerUltimoRegistro = useCallback(async () => {
    try {
      const empleadoId = userData?.empleado_id;
      if (!empleadoId) return { ultimo: null, todos: [] };

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
              // El backend devuelve ORDER BY fecha_registro DESC → [0] es el más reciente
              const registrosHoy = data.data.filter(r =>
                new Date(r.fecha_registro).toDateString() === hoy
              );

              if (registrosHoy.length > 0) {
                // ── Espejo en SQLite (background): garantiza datos offline ──────
                Promise.all(registrosHoy.map(r =>
                  saveOnlineAsistenciaToCache({
                    id: r.id,
                    empleado_id: empleadoId,
                    tipo: r.tipo,
                    estado: r.estado,
                    fecha_registro: r.fecha_registro,
                    dispositivo_origen: r.dispositivo_origen,
                    departamento_id: r.departamento_id,
                  })
                )).catch(() => { /* no crítico */ });

                const ultimoRaw = registrosHoy[0]; // más reciente
                const ultimo = {
                  tipo: ultimoRaw.tipo,
                  estado: ultimoRaw.estado,
                  fecha_registro: new Date(ultimoRaw.fecha_registro),
                  hora: new Date(ultimoRaw.fecha_registro).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit'
                  }),
                  totalRegistrosHoy: registrosHoy.length
                };
                // Ordenar ASC para filtrar por ventana de tiempo
                const todos = [...registrosHoy]
                  .sort((a, b) => new Date(a.fecha_registro) - new Date(b.fecha_registro))
                  .map(r => ({
                    tipo: r.tipo,
                    estado: r.estado,
                    fecha_registro: new Date(r.fecha_registro)
                  }));
                return { ultimo, todos };
              }
            }
          }
        } catch (e) {
          console.log('Online fetch failed, falling back to offline');
        }
      }

      // Fallback: SQLite local (offline_asistencias UNION cache_asistencias, ordenado ASC)
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
        const todos = registrosOffline.map(r => ({
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
        if (hLocal) horario = hLocal;
      }

      if (!horario?.configuracion) return { trabaja: false, numTurnos: 0, entrada: null, salida: null };

      let config = typeof horario.configuracion === 'string'
        ? JSON.parse(horario.configuracion)
        : horario.configuracion;

      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      // Igual que srvObtenerTurnosDeHoy: buscar clave insensible a mayúsculas
      const diaHoy = dias[new Date().getDay()];
      let turnosHoy = [];

      if (config.configuracion_semanal) {
        // Buscar coincidencia case-insensitive (igual que el backend con .toLowerCase())
        const keyEncontrada = Object.keys(config.configuracion_semanal).find(
          k => k.toLowerCase() === diaHoy
        );
        if (keyEncontrada) {
          turnosHoy = config.configuracion_semanal[keyEncontrada].map(t => ({
            entrada: t.inicio || t.entrada,
            salida: t.fin || t.salida
          }));
        }
      }
      if (turnosHoy.length === 0 && config.dias) {
        const tieneHoy = config.dias.some(d => d.toLowerCase() === diaHoy);
        if (tieneHoy) turnosHoy = (config.turnos || []).map(t => ({
          entrada: t.inicio || t.entrada,
          salida: t.fin || t.salida
        }));
      }

      if (!turnosHoy || turnosHoy.length === 0) {
        return { trabaja: false, numBloques: 0, entrada: null, salida: null };
      }

      // Fusionar turnos en bloques igual que srvBuscarBloqueActual (intervalo de 60 min por defecto)
      // El backend fusiona turnos separados por ≤ intervaloBloquesMinutos en un solo bloque
      const INTERVALO_FUSION = 60; // default del backend cuando no hay config
      const rangos = turnosHoy
        .map(t => {
          const [he, me] = (t.entrada || '00:00').split(':').map(Number);
          const [hs, ms] = (t.salida || '00:00').split(':').map(Number);
          return { entrada: he * 60 + me, salida: hs * 60 + ms };
        })
        .sort((a, b) => a.entrada - b.entrada);

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

      // Devuelve solo info estructural — el backend decide ventanas y tolerancias
      const minToHHMM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      return {
        trabaja: true,
        numBloques: bloques.length, // bloques reales fusionados (igual que el backend)
        entrada: minToHHMM(bloques[0].entrada),
        salida: minToHHMM(bloques[bloques.length - 1].salida),
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

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      try {
        let onlineNow = false;
        try { onlineNow = await syncManager.isOnline(); } catch (e) { /* offline */ }
        setIsOnline(onlineNow);

        // Verificar si hoy es día festivo obligatorio (solo online)
        if (onlineNow) {
          try {
            const hoy = new Date().toISOString().split('T')[0];
            const yearActual = new Date().getFullYear();
            const festivoResp = await fetch(
              `${API_URL}/dias-festivos?year=${yearActual}`,
              { headers: { 'Authorization': `Bearer ${userData.token}`, 'Content-Type': 'application/json' } }
            );
            if (festivoResp.ok) {
              const festivoData = await festivoResp.json();
              const festivosObligatorios = (festivoData.data || []).filter(
                f => f.es_obligatorio && f.es_activo && f.fecha?.split('T')[0] === hoy
              );
              if (festivosObligatorios.length > 0) {
                setDiaFestivo({ nombre: festivosObligatorios[0].nombre, tipo: festivosObligatorios[0].tipo });
              } else {
                setDiaFestivo(null);
              }
            }
          } catch (_e) { /* Si falla, no bloqueamos — el backend validará */ }
        }

        // Tolerancia ya NO se carga aquí — el backend la aplica en cada registro
        const [resultadoRegistro, horario, deptos] = await Promise.all([
          obtenerUltimoRegistro(),
          obtenerHorario(),
          obtenerDepartamentos()
        ]);

        const { ultimo, todos } = resultadoRegistro || { ultimo: null, todos: [] };
        setUltimoRegistroHoy(ultimo);
        setRegistrosHoyTodos(todos);
        setHorarioInfo(horario);
        setDepartamentos(deptos);

        // El estado (puedeRegistrar, tipoSiguienteRegistro, etc.) se deriva
        // automáticamente vía el useEffect que observa horarioInfo y ultimoRegistroHoy
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

      if (departamentoSeleccionado && !deptsDisponibles.find(d => d.id === departamentoSeleccionado.id)) {
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

      const esErrorDeRed = (
        e.message.includes('Network request failed') ||
        e.message.includes('Failed to fetch') ||
        e.message.includes('Timeout') ||
        e.message.includes('network') ||
        e.name === 'AbortError'
      );

      if (!esErrorDeRed) {
        setRegistrando(false);
        throw e;
      }

      console.log('PIN online falló por red, intentando offline...');

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
      setMostrarAutenticacion(false);
      setRegistrando(true);

      const resultado = await capturarHuellaDigital(userData.empleado_id);

      if (resultado.success) {
        setRegistrando(false); // Detenemos loader principal
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
      console.log(' Captura facial completada para autenticación de registro');

      if (!captureData.faceDetectionUsed || !captureData.validated) {
        throw new Error('No se detectó un rostro válido en la captura');
      }

      const faceFeatures = processFaceData(captureData.faceData);
      const validation = validateFaceQuality(faceFeatures);

      if (!validation.isValid) {
        console.warn('️ Validación de calidad falló:', validation.errors);
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

      console.log(' Validación facial exitosa, verificando identidad...');

      const empleadoId = userData?.empleado?.id || userData?.empleado_id || userData?.id;
      const verification = await verifyFace(empleadoId, captureData.faceData);

      if (!verification.verified) {
        console.warn(' Verificación facial falló:', verification);
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

      console.log(` Identidad verificada (${verification.similarity.toFixed(1)}% similitud), procediendo con el registro`);

      await procederConRegistro();
    } catch (error) {
      console.error(' Error en autenticación facial:', error);
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

      // tipoActual se usa SOLO para el fallback offline y el update optimista de UI
      // El backend calcula el tipo real con srvVerificarLongitudYTipo
      const tipoActual = tipoSiguienteRegistroRef.current;

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 3000,
        });
        ubicacionFinal = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
      } catch (locationError) { }

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

      // ── Obtener Información de Red (IP y WiFi) ─────────────────────────────
      let networkIp = null;
      let networkWifi = null;
      try {
        const netState = await Network.getNetworkStateAsync();
        networkIp = await Network.getIpAddressAsync();

        // El wifi BSSID normalmente requiere permisos especiales
        // pero podemos mandar el tipo de red para diagnosticar
        if (netState.type === Network.NetworkStateType.WIFI) {
          networkWifi = { tipo: netState.type, isConnected: netState.isConnected };
        }
      } catch (netErr) {
        console.log('No se pudo obtener la IP local:', netErr);
      }

      // ── Payload: el backend calcula tipo y estado con sus propias reglas ─────
      // NO se envía "estado" ni se calcula nada aquí. El controlador usa:
      //   srvVerificarLongitudYTipo → tipo (entrada/salida)
      //   srvEvaluarEstado          → estado según reglas configuradas por el admin
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
          // Si el backend indica que no puede registrar (ventana cerrada, bloque completo, etc.)
          // actualizar el estado del cliente para reflejar la realidad del servidor
          if (data.noPuedeRegistrar === true) {
            setPuedeRegistrar(false);
            if (data.estadoHorario) setEstadoHorario(data.estadoHorario);
          }
          throw new Error(errorMsg);
        }

        success = true;
        // Cachear en SQLite para garantía offline (type y estado vienen del backend)
        try {
          await saveOnlineAsistenciaToCache({
            id: data?.data?.id || `local_online_${Date.now()}`,
            empleado_id: payload.empleado_id,
            tipo: data?.data?.tipo || tipoActual,
            estado: data?.data?.estado || 'puntual',
            fecha_registro: new Date().toISOString(),
            dispositivo_origen: 'movil',
            departamento_id: payload.departamento_id,
          });
        } catch (cacheErr) {
          console.log('No crítico: no se pudo cachear registro online:', cacheErr.message);
        }

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

        // El estado es 'pendiente' — el backend recalculará con sus reglas al sincronizar
        // ubicacion viene del payload (ya es [lat, lng])
        // ip y wifi se capturan para la validación de segmentación
        await sqliteManager.saveOfflineAsistencia({
          ...payload,
          tipo: tipoActual,
          estado: 'pendiente',
          metodo_registro: 'PIN',
          fecha_registro: new Date().toISOString(),
          ubicacion: payload.ubicacion || [ubicacionFinal.lat, ubicacionFinal.lng],
          ip: payload.ip,
          wifi: payload.wifi,
        });

        // Removed the `- pendiente` pushService.postEvent call to prevent duplicate offline telemetry log events.

        data = {
          data: {
            tipo: tipoActual,
            estado: 'pendiente',
            _offline: true
          }
        };
      }

      // ── Optimistic update inmediato (evita flash visual de estado incorrecto) ──
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
      // ─────────────────────────────────────────────────────────────────────────

      const resultadoNuevo = await obtenerUltimoRegistro();
      const { ultimo: nuevoUltimo, todos: nuevosTodos } = resultadoNuevo || { ultimo: null, todos: [] };
      setUltimoRegistroHoy(nuevoUltimo);
      setRegistrosHoyTodos(nuevosTodos);
      ultimoRegistroHoyRef.current = nuevoUltimo;
      registrosHoyTodosRef.current = nuevosTodos;

      // ── Mostrar resultado usando estado REAL del backend ──────────────────────
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
          // Manejo genérico para retardos tipo A, B y cualquier tipo N configurado por el admin
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
    if (registrando) return; // Prevent double taps

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
      } else if (estadoHorario === 'falta_previa') {
        mensaje = 'Tu entrada fue marcada como falta en este turno. No es necesario registrar salida.';
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

  const getButtonColor = () => {
    if (jornadaCompletada) return '#6b7280';
    if (estadoHorario === 'dia_festivo') return '#8b5cf6'; // púrpura
    if (estadoHorario === 'falta_previa') return '#6b7280'; // gris — bloque cerrado por falta
    if (!dentroDelArea || !puedeRegistrar) return '#ef4444';
    // El color refleja el próximo tipo a registrar — el backend asignará el estado real
    if (tipoSiguienteRegistro === 'salida') return '#10b981'; // verde para salida
    return '#3b82f6'; // azul para entrada
  };

  const getIcon = () => {
    if (jornadaCompletada) return 'checkmark-done-circle';
    if (estadoHorario === 'dia_festivo') return 'calendar-outline';
    if (estadoHorario === 'falta_previa') return 'alert-circle-outline';
    if (!dentroDelArea) return 'location';
    if (!puedeRegistrar) return 'time';
    if (tipoSiguienteRegistro === 'salida') return 'log-out';
    return 'log-in';
  };

  const getStatusText = () => {
    if (jornadaCompletada) return 'Jornada completada';
    if (estadoHorario === 'dia_festivo') return diaFestivo ? `Día festivo: ${diaFestivo.nombre}` : 'Día festivo';
    if (estadoHorario === 'falta_previa') return 'Falta registrada — turno cerrado';
    if (estadoHorario === 'bloque_completo') return 'Bloque completado';
    if (!dentroDelArea) return 'Fuera del área';
    if (!puedeRegistrar) return 'Fuera de horario';
    if (tipoSiguienteRegistro === 'salida') return 'Listo para salida';
    return 'Listo para entrada';
  };

  const getButtonText = () => {
    if (jornadaCompletada || estadoHorario === 'bloque_completo') return 'Jornada completada';
    if (estadoHorario === 'falta_previa') return 'Turno cerrado por falta';
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
                    !puedeRegistrar ? 'time-outline' :
                      tipoSiguienteRegistro === 'salida' ? 'log-out' : 'log-in'
                  }
                  size={16}
                  color={
                    !puedeRegistrar ? '#ef4444' :
                      tipoSiguienteRegistro === 'salida' ? '#10b981' : '#3b82f6'
                  }
                />
                <Text style={[
                  styles.indicatorText,
                  {
                    color: !puedeRegistrar ? '#ef4444' :
                      tipoSiguienteRegistro === 'salida' ? '#10b981' : '#3b82f6'
                  }
                ]}>
                  {estadoHorario === 'falta_previa'
                    ? 'Turno cerrado (falta)'
                    : estadoHorario === 'bloque_completo'
                      ? 'Bloque completado'
                      : !puedeRegistrar
                        ? 'Fuera de horario'
                        : tipoSiguienteRegistro === 'salida'
                          ? 'Siguiente: Salida'
                          : 'Siguiente: Entrada'
                  }
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
        onRequestClose={() => {
          setRegistrando(false);
          setMostrarAutenticacion(false);
        }}
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
              onPress={() => {
                setRegistrando(false);
                setMostrarAutenticacion(false);
              }}
            >
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

export default RegisterButton;