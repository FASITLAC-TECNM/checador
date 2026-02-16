import { Clock, Lock, CheckCircle, XCircle, Info, ChevronRight } from "lucide-react";
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
          className="fixed top-20 right-6 w-12 h-12 bg-[#2563eb] text-[#e0f2fe] rounded-full shadow-lg shadow-[#2563eb]/20 hover:bg-[#3b82f6] transition-all hover:scale-110 flex items-center justify-center z-10"
          title="Ver información de bienvenida"
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="max-w-2xl w-full p-6">
            <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-8">
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
                    <CheckCircle className="w-16 h-16 text-text-primary" />
                  </div>
                </div>

                <div className="bg-bg-primary border border-border-subtle rounded-xl p-4">
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
              className="group px-6 py-2.5 bg-[#2563eb] text-[#e0f2fe] rounded-xl hover:bg-[#3b82f6] font-medium transition-all duration-200 shadow-sm shadow-[#2563eb]/20 hover:shadow-lg hover:shadow-[#2563eb]/30 hover:-translate-y-0.5 flex items-center gap-2"
            >
              Ir al Inicio de Sesión
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
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
          className="fixed top-20 right-6 w-12 h-12 bg-[#2563eb] text-[#e0f2fe] rounded-full shadow-lg shadow-[#2563eb]/20 hover:bg-[#3b82f6] transition-all hover:scale-110 flex items-center justify-center z-10"
          title="Ver información de bienvenida"
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="max-w-2xl w-full p-6">
            <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-8">
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
                    <XCircle className="w-16 h-16 text-text-primary" />
                  </div>
                </div>

                {error && (
                  <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4">
                    <p className="text-sm text-text-secondary text-center font-medium">
                      {error}
                    </p>
                  </div>
                )}

                <div className="bg-bg-primary border border-border-subtle rounded-xl p-4">
                  <p className="text-sm text-text-secondary text-center">
                    Puede intentar nuevamente o contactar al administrador para
                    más información.
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
              className="px-6 py-2.5 bg-[#2563eb] text-[#e0f2fe] rounded-xl hover:bg-[#3b82f6] font-medium transition-all duration-200 shadow-sm shadow-[#2563eb]/20 hover:shadow-lg hover:shadow-[#2563eb]/30 hover:-translate-y-0.5"
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
        className="fixed top-20 right-6 w-12 h-12 bg-[#2563eb] text-[#e0f2fe] rounded-full shadow-lg shadow-[#2563eb]/20 hover:bg-[#3b82f6] transition-all hover:scale-110 flex items-center justify-center z-10"
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

          <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-2">
                <div className="relative">
                  <Clock className="w-14 h-14 text-text-secondary animate-pulse" />
                  <Lock className="w-5 h-5 text-text-primary absolute bottom-0 right-0" />
                </div>
              </div>

              <div className="bg-bg-primary border border-border-subtle rounded-xl p-4 space-y-2 mb-3">
                <p className="text-sm text-text-secondary">
                  <strong>ID de la Empresa:</strong>{" "}
                  {companyId || "No especificado"}
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Estado:</strong> En Revisión por el Administrador
                </p>
              </div>

              {error && (
                <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-4 mb-3">
                  <p className="text-sm text-text-secondary">{error}</p>
                </div>
              )}

              <p className="text-sm text-text-secondary mb-3">
                La solicitud será procesada por el administrador. El sistema
                verificará automáticamente el estado.
              </p>

              <div className="space-y-2">
                <button
                  onClick={onRetry}
                  className="w-full px-6 py-2.5 bg-bg-primary text-text-secondary rounded-xl hover:bg-bg-tertiary text-sm font-medium transition-all duration-200 border border-border-subtle hover:shadow-sm"
                >
                  Reenviar Solicitud
                </button>

                <button
                  onClick={onCancel}
                  className="w-full px-6 py-2.5 text-text-secondary hover:text-text-primary text-sm font-medium transition-all duration-200 rounded-xl hover:bg-bg-tertiary"
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
