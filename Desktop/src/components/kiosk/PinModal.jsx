import { User, UserX, CalendarX, Lock, Eye, EyeOff, X, Clock, CheckCircle, XCircle, Loader2, Timer, AlertTriangle, LogIn } from "lucide-react";
import { useAttendanceRegistration } from "../../hooks/useAttendanceRegistration";
import { formatearTiempoRestante } from "../../services/asistenciaLogicService";

export default function PinModal({ onClose, onSuccess, onLoginRequest }) {
  const {
    showPassword,
    usuarioOCorreo,
    setUsuarioOCorreo,
    pin,
    setPin,
    loading,
    result,
    errorMessage,
    countdown,
    handleSubmit,
    handleRetry,
    togglePasswordVisibility,
    handleLoginRequest
  } = useAttendanceRegistration(onClose, onSuccess, onLoginRequest);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Checador</h2>
            <p className="text-white/80 text-sm">
              Sistema de Control de Asistencias
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {!result ? (
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xl font-semibold text-text-primary text-center mb-4">
                Ingresa tu usuario/correo y PIN
              </h3>

              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                  <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Usuario o Correo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-disabled" />
                  </div>
                  <input
                    type="text"
                    value={usuarioOCorreo}
                    onChange={(e) => setUsuarioOCorreo(e.target.value)}
                    placeholder="tu.usuario o correo@ejemplo.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 border border-border-subtle rounded-lg bg-bg-secondary text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-disabled" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2.5 border border-border-subtle rounded-lg bg-bg-secondary text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-disabled hover:text-text-secondary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 text-white rounded-lg font-semibold text-base shadow-lg transition-all mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Registrar Asistencia"
                )}
              </button>
            </form>
          ) : (
            /* Resultado */
            <div
              className={`rounded-xl p-6 text-center ${result.success
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : result.noPuedeRegistrar
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                  : result.noEsEmpleado
                    ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                    : result.sinHorario
                      ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
            >
              {result.success ? (
                <>
                  {/* Icono según clasificación */}
                  {result.clasificacion === 'retardo' || result.clasificacion === 'salida_temprana' ? (
                    <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-yellow-600 dark:text-yellow-400" />
                  ) : result.clasificacion === 'falta' ? (
                    <XCircle className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle className="w-16 h-16 mx-auto mb-3 text-green-600 dark:text-green-400" />
                  )}

                  <p className={`font-bold text-lg mb-1 ${result.clasificacion === 'falta'
                    ? "text-red-800 dark:text-red-300"
                    : result.clasificacion === 'retardo' || result.clasificacion === 'salida_temprana'
                      ? "text-yellow-800 dark:text-yellow-300"
                      : "text-green-800 dark:text-green-300"
                    }`}>
                    Asistencia Registrada
                  </p>
                  {result.empleado?.nombre && (
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      {result.empleado.nombre}
                    </p>
                  )}
                  {result.tipoMovimiento && (
                    <div className="mt-2">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {result.tipoMovimiento === "ENTRADA" ? "Entrada" : "Salida"}{" "}
                        registrada {result.hora && `a las ${result.hora}`}
                      </p>
                      {/* Badge de clasificación */}
                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${result.clasificacion === "entrada" || result.clasificacion === "salida_puntual"
                          ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300"
                          : result.clasificacion === "retardo" || result.clasificacion === "salida_temprana"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                            : result.clasificacion === "falta"
                              ? "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300"
                              : result.estado === "puntual"
                                ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300"
                                : result.estado === "retardo" || result.estado === "temprana"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                                  : result.estado === "falta"
                                    ? "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300"
                          }`}
                      >
                        {result.estadoTexto || result.estado || "Registrado"}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  {/* Botón para iniciar sesión */}
                  {onLoginRequest && (
                    <button
                      onClick={() => handleLoginRequest()}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
                </>
              ) : result.noPuedeRegistrar ? (
                <>
                  <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-yellow-800 dark:text-yellow-300 font-bold text-lg mb-1">
                    No Disponible
                  </p>
                  {result.empleado?.nombre && (
                    <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                      {result.empleado.nombre}
                    </p>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {result.message}
                  </p>
                  <span
                    className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${result.estadoHorario === "completado"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300"
                      : result.estadoHorario === "tiempo_insuficiente"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300"
                      }`}
                  >
                    {result.estadoHorario === "completado"
                      ? "Jornada completada"
                      : result.estadoHorario === "tiempo_insuficiente"
                        ? `Espera ${formatearTiempoRestante(result.minutosRestantes)}`
                        : "Fuera de horario"}
                  </span>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  {/* Botón para iniciar sesión */}
                  {onLoginRequest && (
                    <button
                      onClick={() => handleLoginRequest()}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
                </>
              ) : result.noEsEmpleado ? (
                <>
                  <UserX className="w-16 h-16 mx-auto mb-3 text-orange-600 dark:text-orange-400" />
                  <p className="text-orange-800 dark:text-orange-300 font-bold text-lg mb-1">
                    Usuario sin Acceso
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                    {result.usuario?.nombre || result.usuario?.username || "Usuario"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Tu cuenta no está registrada como empleado en el sistema de asistencias.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300">
                    Solo empleados pueden registrar asistencia
                  </span>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  {/* Botón para iniciar sesión si tiene permisos */}
                  {onLoginRequest && (
                    <button
                      onClick={() => handleLoginRequest()}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
                </>
              ) : result.sinHorario ? (
                <>
                  <CalendarX className="w-16 h-16 mx-auto mb-3 text-purple-600 dark:text-purple-400" />
                  <p className="text-purple-800 dark:text-purple-300 font-bold text-lg mb-1">
                    Sin Horario Asignado
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">
                    {result.empleado?.nombre || result.usuario?.username || "Empleado"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    No tienes un horario configurado en el sistema. Contacta a tu administrador.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-300">
                    Requiere asignación de horario
                  </span>

                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>
                      Esta ventana se cerrará en <strong className="text-gray-700 dark:text-gray-300">{countdown}</strong> segundos
                    </span>
                  </div>

                  {/* Botón para iniciar sesión si tiene permisos */}
                  {onLoginRequest && (
                    <button
                      onClick={() => handleLoginRequest()}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}
                </>
              ) : (
                /* Fallback para errores genéricos */
                <>
                  <X className="w-16 h-16 mx-auto mb-3 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 font-bold text-lg mb-1">
                    Error
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {result.message}
                  </p>

                  {/* Botón para iniciar sesión si hay datos de usuario (aunque hubo error) */}
                  {onLoginRequest && result.usuario && (
                    <button
                      onClick={() => handleLoginRequest()}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </button>
                  )}

                  <button
                    onClick={handleRetry}
                    className="mt-4 text-purple-600 hover:text-purple-800 font-medium text-sm"
                  >
                    Intentar de nuevo
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
