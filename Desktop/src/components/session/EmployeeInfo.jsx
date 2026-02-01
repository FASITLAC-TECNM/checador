import React from "react";
import { Clock, AlertCircle, CheckCircle, User } from "lucide-react";
import { formatTime, formatDateShort, formatDay } from "../../utils/dateHelpers";

export default function EmployeeInfo({ time, empleado, horario, loading }) {
  // Calcular estado basado en horario
  const calcularEstado = () => {
    if (!horario?.hora_entrada) return { estado: "Sin horario", color: "gray", diferencia: null };

    const ahora = new Date();
    const [horaEntrada, minEntrada] = horario.hora_entrada.split(":").map(Number);
    const entradaProgramada = new Date(ahora);
    entradaProgramada.setHours(horaEntrada, minEntrada, 0, 0);

    const diffMinutos = Math.round((ahora - entradaProgramada) / 60000);

    if (diffMinutos < -15) {
      return { estado: "Temprano", color: "blue", diferencia: null };
    } else if (diffMinutos <= 0) {
      return { estado: "A tiempo", color: "green", diferencia: null };
    } else if (diffMinutos <= 15) {
      return { estado: "Retardo menor", color: "amber", diferencia: `+${diffMinutos} min` };
    } else {
      return { estado: "Retardo", color: "red", diferencia: `+${diffMinutos} min` };
    }
  };

  const estadoActual = calcularEstado();

  const colorClasses = {
    green: "border-green-500 text-green-600",
    amber: "border-amber-500 text-amber-600",
    red: "border-red-500 text-red-600",
    blue: "border-blue-500 text-blue-600",
    gray: "border-gray-500 text-gray-600",
  };

  const iconColor = {
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
    gray: "text-gray-600",
  };

  return (
    <>
      {/* Estado Actual */}
      <div className="bg-bg-primary rounded-2xl shadow-lg p-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-text-primary">
            Estado Actual
          </h2>
        </div>

        {/* Hora y Fecha */}
        <div className="bg-bg-secondary rounded-xl p-2 mb-2 border border-border-subtle">
          <p className="text-3xl font-bold text-text-primary">
            {formatTime(time).replace(/\s/g, "\u00A0")}
          </p>
          <p className="text-[10px] text-text-secondary">
            {formatDateShort(time)} • {formatDay(time)}
          </p>
        </div>

        {/* Estado del empleado */}
        <div className={`bg-bg-secondary border-l-4 ${colorClasses[estadoActual.color]} rounded-lg p-2 mb-2`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {estadoActual.color === "green" ? (
                <CheckCircle className={`w-3 h-3 ${iconColor[estadoActual.color]}`} />
              ) : (
                <AlertCircle className={`w-3 h-3 ${iconColor[estadoActual.color]}`} />
              )}
              <span className="font-bold text-text-primary text-xs">
                Estado: {estadoActual.estado}
              </span>
            </div>
            {estadoActual.diferencia && (
              <span className={`font-bold text-xs ${iconColor[estadoActual.color]}`}>
                {estadoActual.diferencia}
              </span>
            )}
          </div>
        </div>

        {/* Grid con horario de entrada y salida */}
        <div className="grid grid-cols-2 gap-2">
          {/* Hora de entrada */}
          <div className="bg-bg-secondary border-l-4 border-green-500 rounded-xl p-2">
            <div className="flex items-center gap-1 text-green-500 mb-0.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-[10px] font-bold">ENTRADA</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {horario?.hora_entrada || "--:--"}
            </p>
            <p className="text-[10px] text-green-500">Programada</p>
          </div>

          {/* Hora de salida */}
          <div className="bg-bg-secondary border-l-4 border-red-500 rounded-xl p-2">
            <div className="flex items-center gap-1 text-red-500 mb-0.5">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="text-[10px] font-bold">SALIDA</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {horario?.hora_salida || "--:--"}
            </p>
            <p className="text-[10px] text-red-500">Programada</p>
          </div>
        </div>
      </div>

      {/* Estadísticas Combinadas */}
      <div className="bg-bg-primary rounded-2xl shadow-lg p-4 flex-1 min-h-0 overflow-auto">
        {/* Resumen Semanal */}
        <h3 className="text-sm font-bold text-text-primary mb-2">
          Resumen Semanal
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-bg-secondary rounded-lg p-2 text-center">
            <p className="text-2xl font-bold text-blue-600">32.5</p>
            <p className="text-[10px] text-text-secondary">Horas esta semana</p>
          </div>
          <div className="bg-bg-secondary rounded-lg p-2 text-center">
            <p className="text-2xl font-bold text-green-600">5/7</p>
            <p className="text-[10px] text-text-secondary">Días laborales</p>
          </div>
        </div>

        {/* Estadísticas del Mes */}
        <h3 className="text-sm font-bold text-text-primary mb-2">
          Estadísticas del Mes
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-green-500">8</p>
            <p className="text-[10px] text-green-600 dark:text-green-400">Asistencias</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-red-500">2</p>
            <p className="text-[10px] text-red-600 dark:text-red-400">Faltas</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-blue-500">90%</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">Asistencia</p>
          </div>
        </div>
      </div>
    </>
  );
}
