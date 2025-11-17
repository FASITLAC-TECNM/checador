import React from "react";
import { Clock, AlertCircle } from "lucide-react";
import { formatTime, formatDateShort, formatDay } from "../../utils/dateHelpers";

export default function EmployeeInfo({ time }) {
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

        {/* Estado - Retardo */}
        <div className="bg-bg-secondary border-l-4 border-amber-500 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-text-primary text-sm">
                Estado: Retardo
              </span>
            </div>
            <span className="text-amber-600 font-bold text-sm">
              +5 min
            </span>
          </div>
        </div>

        {/* Grid con ÚLTIMO y PRÓXIMO */}
        <div className="grid grid-cols-2 gap-2">
          {/* Último registro */}
          <div className="bg-bg-secondary border-l-4 border-green-500 rounded-xl p-3">
            <div className="flex items-center gap-1 text-green-500 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-bold">ÚLTIMO</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">08:05</p>
            <p className="text-xs text-green-500 mt-1">Entrada</p>
            <p className="text-xs text-text-tertiary">02/11/2025</p>
          </div>

          {/* Próximo registro */}
          <div className="bg-bg-secondary border-l-4 border-red-500 rounded-xl p-3">
            <div className="flex items-center gap-1 text-red-500 mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs font-bold">PRÓXIMO</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">13:00</p>
            <p className="text-xs text-red-500 mt-1">Comida</p>
            <p className="text-xs text-text-tertiary">02/11/2025</p>
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
