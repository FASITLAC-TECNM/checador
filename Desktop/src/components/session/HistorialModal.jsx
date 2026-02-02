import React, { useState, useEffect, useCallback } from "react";
import { X, Calendar, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { API_CONFIG, fetchApi } from "../../config/apiEndPoint";

export default function HistorialModal({ onClose, usuario }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    puntuales: 0,
    retardos: 0,
    faltas: 0
  });

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Cargar asistencias del mes
  const cargarAsistencias = useCallback(async () => {
    if (!usuario?.empleado_id) {
      setLoading(false);
      return;
    }

    try {
      const primerDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const ultimoDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const fechaInicio = primerDia.toISOString().split('T')[0];
      const fechaFin = ultimoDia.toISOString().split('T')[0];

      const url = `${API_CONFIG.ENDPOINTS.ASISTENCIAS}/empleado/${usuario.empleado_id}?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;

      const response = await fetchApi(url);

      if (response?.data && Array.isArray(response.data)) {
        const asistenciasOrdenadas = response.data.sort((a, b) =>
          new Date(b.fecha_registro) - new Date(a.fecha_registro)
        );

        setAsistencias(asistenciasOrdenadas);
        calcularEstadisticas(asistenciasOrdenadas);
      } else if (Array.isArray(response)) {
        const asistenciasOrdenadas = response.sort((a, b) =>
          new Date(b.fecha_registro) - new Date(a.fecha_registro)
        );

        setAsistencias(asistenciasOrdenadas);
        calcularEstadisticas(asistenciasOrdenadas);
      } else {
        setAsistencias([]);
        setEstadisticas({ puntuales: 0, retardos: 0, faltas: 0 });
      }
    } catch (error) {
      console.error('Error cargando asistencias:', error);
      setAsistencias([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [usuario, currentMonth]);

  // Calcular estadísticas
  const calcularEstadisticas = (data) => {
    const stats = { puntuales: 0, retardos: 0, faltas: 0 };

    data.forEach(registro => {
      if (registro.tipo === 'entrada') {
        if (registro.estado === 'puntual') stats.puntuales++;
        if (registro.estado === 'retardo') stats.retardos++;
        if (registro.estado === 'falta') stats.faltas++;
      }
    });

    setEstadisticas(stats);
  };

  useEffect(() => {
    cargarAsistencias();
  }, [cargarAsistencias]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarAsistencias();
  };

  const cambiarMes = (direccion) => {
    const nuevoMes = new Date(currentMonth);
    nuevoMes.setMonth(currentMonth.getMonth() + direccion);
    setCurrentMonth(nuevoMes);
    setSelectedDate(null);
    setLoading(true);
  };

  // Generar días del calendario
  const generarDiasCalendario = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();

    const dias = [];

    // Días vacíos al inicio
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null);
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(dia);
    }

    return dias;
  };

  // Obtener estado del día (puntual, retardo, falta)
  const getEstadoDia = (dia) => {
    if (!dia) return null;
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);
    const registrosDia = asistencias.filter(registro => {
      const registroFecha = new Date(registro.fecha_registro);
      return registroFecha.toDateString() === fecha.toDateString() && registro.tipo === 'entrada';
    });

    if (registrosDia.length === 0) return null;

    // Prioridad: falta > retardo > puntual
    if (registrosDia.some(r => r.estado === 'falta')) return 'falta';
    if (registrosDia.some(r => r.estado === 'retardo')) return 'retardo';
    if (registrosDia.some(r => r.estado === 'puntual')) return 'puntual';

    return null;
  };

  // Seleccionar día
  const seleccionarDia = (dia) => {
    if (!dia) return;
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia);

    // Si ya está seleccionado, deseleccionar
    if (selectedDate && selectedDate.toDateString() === fecha.toDateString()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(fecha);
    }
  };

  // Filtrar registros por día seleccionado
  const getRegistrosDia = () => {
    if (!selectedDate) return asistencias;

    return asistencias.filter(registro => {
      const registroFecha = new Date(registro.fecha_registro);
      return registroFecha.toDateString() === selectedDate.toDateString();
    });
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}`;
  };

  const formatearHora = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'puntual': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' };
      case 'retardo': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' };
      case 'falta': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'puntual': return '✓';
      case 'retardo': return '⏱';
      case 'falta': return '✕';
      default: return '';
    }
  };

  const registrosFiltrados = getRegistrosDia();
  const hoy = new Date();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Historial de Asistencias
              </h3>
              <p className="text-green-100 text-sm">
                Registro de entradas y salidas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-text-secondary">Cargando asistencias...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Navegación de mes */}
            <div className="flex items-center justify-between bg-bg-secondary rounded-xl p-4 mb-4">
              <button
                onClick={() => cambiarMes(-1)}
                className="p-2 hover:bg-bg-primary rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-text-primary" />
              </button>

              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-bg-primary rounded-lg transition-colors"
              >
                <span className="text-lg font-bold text-text-primary">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <ChevronLeft className={`w-4 h-4 text-text-secondary transition-transform ${showCalendar ? 'rotate-90' : '-rotate-90'}`} />
              </button>

              <button
                onClick={() => cambiarMes(1)}
                disabled={currentMonth.getMonth() >= hoy.getMonth() && currentMonth.getFullYear() >= hoy.getFullYear()}
                className="p-2 hover:bg-bg-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-text-primary" />
              </button>
            </div>

            {/* Calendario */}
            {showCalendar && (
              <div className="bg-bg-secondary rounded-xl p-4 mb-4">
                {/* Nombres de días */}
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map((day, index) => (
                    <div key={index} className="text-center py-2">
                      <span className="text-xs font-semibold text-text-secondary">{day}</span>
                    </div>
                  ))}
                </div>

                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-1">
                  {generarDiasCalendario().map((dia, index) => {
                    const estado = getEstadoDia(dia);
                    const isSelected = selectedDate && dia === selectedDate.getDate() &&
                      currentMonth.getMonth() === selectedDate.getMonth() &&
                      currentMonth.getFullYear() === selectedDate.getFullYear();
                    const isToday = dia &&
                      hoy.toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia).toDateString();

                    return (
                      <button
                        key={index}
                        onClick={() => seleccionarDia(dia)}
                        disabled={!dia}
                        className={`
                          aspect-square flex flex-col items-center justify-center rounded-lg transition-all relative
                          ${!dia ? 'cursor-default' : 'hover:bg-bg-primary cursor-pointer'}
                          ${isSelected ? 'bg-green-500 text-white' : ''}
                          ${isToday && !isSelected ? 'ring-2 ring-green-500' : ''}
                        `}
                      >
                        {dia && (
                          <>
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : isToday ? 'text-green-600 font-bold' : 'text-text-primary'}`}>
                              {dia}
                            </span>
                            {estado && !isSelected && (
                              <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${obtenerColorEstado(estado).dot}`} />
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Estadísticas */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-semibold text-green-700">{estadisticas.puntuales} Puntual{estadisticas.puntuales !== 1 ? 'es' : ''}</span>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-semibold text-yellow-700">{estadisticas.retardos} Retardo{estadisticas.retardos !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-semibold text-red-700">{estadisticas.faltas} Falta{estadisticas.faltas !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Encabezado de registros */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold text-text-primary">
                {selectedDate
                  ? `${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`
                  : 'Todos los registros'
                }
              </h4>
              <span className="text-sm text-text-secondary">
                {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {/* Lista de registros */}
            {registrosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="w-16 h-16 text-text-secondary/30 mb-4" />
                <p className="text-lg font-semibold text-text-secondary">Sin registros</p>
                <p className="text-sm text-text-secondary/70">
                  {selectedDate ? 'No hay registros para este día' : 'No hay registros este mes'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {registrosFiltrados.map((registro, index) => {
                  const colorEstado = obtenerColorEstado(registro.estado);

                  return (
                    <div
                      key={registro.id || index}
                      className="flex items-center gap-4 bg-bg-secondary rounded-xl p-4 hover:bg-bg-secondary/80 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${registro.tipo === 'entrada' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {registro.tipo === 'entrada' ? (
                          <ArrowDown className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUp className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-text-primary">
                          {registro.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <span className="font-medium">{formatearHora(registro.fecha_registro)}</span>
                          <span>•</span>
                          <span>{formatearFecha(registro.fecha_registro)}</span>
                        </div>
                      </div>

                      {registro.tipo === 'entrada' && registro.estado && (
                        <div className={`px-3 py-1.5 rounded-lg ${colorEstado.bg} ${colorEstado.border} border`}>
                          <span className={`text-sm font-semibold ${colorEstado.text}`}>
                            {getEstadoIcon(registro.estado)} {registro.estado.charAt(0).toUpperCase() + registro.estado.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-bg-secondary border-t border-border-subtle flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl font-bold text-base shadow-lg transition-all"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
}
