import { Clock, Lock, CheckCircle, Info } from "lucide-react";
import StepIndicator from "./StepIndicator";

export default function ApprovalStep({
  requestStatus,
  companyId,
  countdown,
  onRetry,
  onCancel,
  onGoToLogin,
  onShowWelcome,
}) {
  if (requestStatus === "approved") {
    return (
      <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
        {/* Barra de progreso fija */}
        <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8">
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
          <div className="max-w-2xl w-full p-8">
            <div className="bg-bg-secondary border-2 border-green-400 rounded-2xl p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-text-primary mb-2 text-center">
                  ¡Solicitud Aceptada!
                </h1>
                <p className="text-text-secondary text-sm text-center">
                  Su instalación ha sido vinculada exitosamente
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 mb-3">
                    <CheckCircle className="w-20 h-20 text-green-500" />
                  </div>
                </div>

                <div className="bg-bg-primary border border-green-500 rounded-lg p-4">
                  <p className="text-sm text-text-secondary text-center">
                    Ya puede iniciar sesión para comenzar a utilizar el sistema.
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
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
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8">
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
        <div className="max-w-2xl w-full p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Solicitud Pendiente
            </h1>
            <p className="text-text-secondary text-sm">
              Esperando aprobación del administrador
            </p>
          </div>

          <div className="bg-bg-secondary border-2 border-amber-400 rounded-xl p-6 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-3">
                <div className="relative">
                  <Clock className="w-16 h-16 text-amber-500" />
                  <Lock className="w-6 h-6 text-amber-600 absolute bottom-0 right-0" />
                </div>
              </div>

              <div className="bg-bg-primary border border-amber-200 rounded-lg p-3 space-y-2 mb-3">
                <p className="text-sm text-text-secondary">
                  <strong>ID de la Empresa:</strong> {companyId || "ABC-XYZ-123"}
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Estado:</strong> En Revisión por el Administrador
                </p>
                <p className="text-base font-bold text-amber-600">
                  Aprobación automática en: {countdown} segundos
                </p>
              </div>

              <p className="text-sm text-text-secondary mb-3">
                Recibirá una notificación cuando el administrador apruebe su
                solicitud.
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
