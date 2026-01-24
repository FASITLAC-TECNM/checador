import { Clock, Lock, CheckCircle, XCircle, Info } from "lucide-react";
import StepIndicator from "./StepIndicator";

export default function ApprovalStep({
  requestStatus,
  companyId,
  error,
  onRetry,
  onCancel,
  onGoToLogin,
  onShowWelcome,
}) {
  if (requestStatus === "approved") {
    return (
      <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
        {/* Barra de progreso fija */}
        <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8 flex-shrink-0">
          <StepIndicator currentStep={4} totalSteps={4} />
        </div>

        {/* Botón de información */}
        <button
          onClick={onShowWelcome}
          className="fixed top-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
          title="Ver información de bienvenida"
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="max-w-2xl w-full p-6">
            <div className="bg-bg-secondary border-2 border-green-400 rounded-2xl p-6">
              <div className="mb-4">
                <h1 className="text-xl font-bold text-text-primary mb-1 text-center">
                  ¡Solicitud Aceptada!
                </h1>
                <p className="text-text-secondary text-sm text-center">
                  Su instalación ha sido vinculada exitosamente
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-2">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </div>
                </div>

                <div className="bg-bg-primary border border-green-500 rounded-lg p-3">
                  <p className="text-sm text-text-secondary text-center">
                    Ya puede iniciar sesión para comenzar a utilizar el sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fijo con botón */}
        <div className="bg-bg-secondary border-t border-border-subtle px-6 py-4 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex justify-end">
            <button
              onClick={onGoToLogin}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              Ir al Inicio de Sesión
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (requestStatus === "rejected") {
    return (
      <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
        {/* Barra de progreso fija */}
        <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8 flex-shrink-0">
          <StepIndicator currentStep={4} totalSteps={4} />
        </div>

        {/* Botón de información */}
        <button
          onClick={onShowWelcome}
          className="fixed top-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
          title="Ver información de bienvenida"
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="max-w-2xl w-full p-6">
            <div className="bg-bg-secondary border-2 border-red-400 rounded-2xl p-6">
              <div className="mb-4">
                <h1 className="text-xl font-bold text-text-primary mb-1 text-center">
                  Solicitud Rechazada
                </h1>
                <p className="text-text-secondary text-sm text-center">
                  Su solicitud de afiliación ha sido rechazada
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-2">
                    <XCircle className="w-16 h-16 text-red-500" />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-500 rounded-lg p-3">
                    <p className="text-sm text-red-700 text-center font-medium">
                      {error}
                    </p>
                  </div>
                )}

                <div className="bg-bg-primary border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-text-secondary text-center">
                    Puede intentar nuevamente o contactar al administrador para más información.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fijo con botón */}
        <div className="bg-bg-secondary border-t border-border-subtle px-6 py-4 flex-shrink-0">
          <div className="max-w-2xl mx-auto flex justify-center">
            <button
              onClick={onRetry}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all shadow-sm hover:shadow-md"
            >
              Intentar Nuevamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8 flex-shrink-0">
        <StepIndicator currentStep={4} totalSteps={4} />
      </div>

      {/* Botón de información */}
      <button
        onClick={onShowWelcome}
        className="fixed top-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
        title="Ver información de bienvenida"
      >
        <Info className="w-6 h-6" />
      </button>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="max-w-2xl w-full p-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-text-primary mb-1">
              Solicitud Pendiente
            </h1>
            <p className="text-text-secondary text-sm">
              Esperando aprobación del administrador
            </p>
          </div>

          <div className="bg-bg-secondary border-2 border-amber-400 rounded-xl p-5 space-y-3">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-2">
                <div className="relative">
                  <Clock className="w-14 h-14 text-amber-500 animate-pulse" />
                  <Lock className="w-5 h-5 text-amber-600 absolute bottom-0 right-0" />
                </div>
              </div>

              <div className="bg-bg-primary border border-amber-200 rounded-lg p-3 space-y-2 mb-3">
                <p className="text-sm text-text-secondary">
                  <strong>ID de la Empresa:</strong> {companyId || "No especificado"}
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Estado:</strong> En Revisión por el Administrador
                </p>
                <p className="text-base font-bold text-amber-600">
                  Verificando cada 5 segundos...
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <p className="text-sm text-text-secondary mb-3">
                La solicitud será procesada por el administrador. El sistema verificará automáticamente el estado.
              </p>

              <div className="space-y-2">
                <button
                  onClick={onRetry}
                  className="w-full px-6 py-2 bg-bg-primary text-text-secondary rounded-lg hover:bg-bg-tertiary text-sm font-medium transition-colors border border-border-subtle"
                >
                  Reenviar Solicitud
                </button>

                <button
                  onClick={onCancel}
                  className="w-full px-6 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  Cancelar Solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
