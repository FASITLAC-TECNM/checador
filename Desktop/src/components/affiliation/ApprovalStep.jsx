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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <button
          onClick={onShowWelcome}
          className="fixed top-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
          title="Ver información de bienvenida"
        >
          <Info className="w-6 h-6" />
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl border-2 border-green-400">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
              ¡Solicitud Aceptada!
            </h1>
            <p className="text-gray-600 text-sm text-center">
              Su instalación ha sido vinculada exitosamente
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-3">
                <CheckCircle className="w-20 h-20 text-green-500" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 text-center">
                Ya puede iniciar sesión para comenzar a utilizar el sistema.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6 mb-6">
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

          <StepIndicator currentStep={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <button
        onClick={onShowWelcome}
        className="fixed top-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-10"
        title="Ver información de bienvenida"
      >
        <Info className="w-6 h-6" />
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Solicitud Pendiente
          </h1>
          <p className="text-gray-600 text-sm">
            Esperando aprobación del administrador
          </p>
        </div>

        <div className="border-2 border-amber-400 rounded-xl p-6 space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-3">
              <div className="relative">
                <Clock className="w-16 h-16 text-amber-500" />
                <Lock className="w-6 h-6 text-amber-600 absolute bottom-0 right-0" />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 mb-3">
              <p className="text-sm text-gray-700">
                <strong>ID de la Empresa:</strong> {companyId || "ABC-XYZ-123"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Estado:</strong> En Revisión por el Administrador
              </p>
              <p className="text-base font-bold text-amber-600">
                Aprobación automática en: {countdown} segundos
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Recibirá una notificación cuando el administrador apruebe su
              solicitud.
            </p>

            <div className="space-y-2">
              <button
                onClick={onRetry}
                className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
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

        <div className="mt-6 mb-6">
          <StepIndicator currentStep={4} />
        </div>
      </div>
    </div>
  );
}
