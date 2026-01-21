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
      <div className="bg-bg-primary rounded-2xl shadow-lg p-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-text-primary">
            Estado Actual
          </h2>
        </div>

        {/* Hora y Fecha */}
        <div className="bg-bg-secondary rounded-xl p-3 mb-3 border border-border-subtle">
          <p className="text-4xl font-bold text-text-primary">
            {formatTime(time).replace(/\s/g, "\u00A0")}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {formatDateShort(time)} • {formatDay(time)}
          </p>
        </div>

        {/* Estado del empleado */}
        <div className={`bg-bg-secondary border-l-4 ${colorClasses[estadoActual.color]} rounded-lg p-2 mb-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {estadoActual.color === "green" ? (
                <CheckCircle className={`w-4 h-4 ${iconColor[estadoActual.color]}`} />
              ) : (
                <AlertCircle className={`w-4 h-4 ${iconColor[estadoActual.color]}`} />
              )}
              <span className="font-bold text-text-primary text-sm">
                Estado: {estadoActual.estado}
              </span>
            </div>
            {estadoActual.diferencia && (
              <span className={`font-bold text-sm ${iconColor[estadoActual.color]}`}>
                {estadoActual.diferencia}
              </span>
            )}
          </div>
        </div>

        {/* Grid con horario de entrada y salida */}
        <div className="grid grid-cols-2 gap-2">
          {/* Hora de entrada */}
          <div className="bg-bg-secondary border-l-4 border-green-500 rounded-xl p-3">
            <div className="flex items-center gap-1 text-green-500 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-bold">ENTRADA</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">
              {horario?.hora_entrada || "--:--"}
            </p>
            <p className="text-xs text-green-500 mt-1">Programada</p>
          </div>

          {/* Hora de salida */}
          <div className="bg-bg-secondary border-l-4 border-red-500 rounded-xl p-3">
            <div className="flex items-center gap-1 text-red-500 mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs font-bold">SALIDA</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">
              {horario?.hora_salida || "--:--"}
            </p>
            <p className="text-xs text-red-500 mt-1">Programada</p>
          </div>
        </div>
      </div>

      {/* Resumen Semanal */}
      <div className="bg-bg-primary rounded-2xl shadow-lg p-4 flex-shrink-0">
        <h3 className="text-base font-bold text-text-primary mb-3">
          Resumen Semanal
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600">32.5</p>
            <p className="text-xs text-text-secondary mt-1">Total de horas</p>
            <p className="text-xs text-text-tertiary">esta semana</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600">5</p>
            <p className="text-xs text-text-secondary mt-1">Días laborales</p>
            <p className="text-xs text-text-tertiary">de 7 días</p>
          </div>
        </div>
      </div>

      {/* Estadísticas de Noviembre */}
      <div className="bg-bg-primary rounded-2xl shadow-lg p-4 flex-shrink-0">
        <h3 className="text-base font-bold text-text-primary mb-3">
          Estadísticas de Noviembre
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">8</p>
            <p className="text-xs text-text-secondary mt-1">Días asistidos</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">2</p>
            <p className="text-xs text-text-secondary mt-1">Faltas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">90%</p>
            <p className="text-xs text-text-secondary mt-1">Asistencia</p>
          </div>
        </div>
      </div>
    </>
  );
}
