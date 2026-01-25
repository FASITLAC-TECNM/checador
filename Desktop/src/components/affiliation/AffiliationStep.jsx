import { Building2, Info } from "lucide-react";
import StepIndicator from "./StepIndicator";

export default function AffiliationStep({
  companyId,
  setCompanyId,
  onSubmit,
  onPrevious,
  onShowWelcome,
}) {
  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8 flex-shrink-0">
        <StepIndicator currentStep={3} totalSteps={4} />
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
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-text-primary mb-1">
              Paso 3: Afiliación a Empresa
            </h1>
            <p className="text-text-secondary text-sm">
              Ingrese el ID único de su empresa para vincular este nodo
            </p>
          </div>

          <div className="bg-bg-secondary border-2 border-purple-200 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-text-primary mb-2">
                  ID de la Empresa
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  Este código único fue proporcionado por el administrador de su
                  empresa. Tiene el formato EMA-XXXXX
                </p>
                <input
                  type="text"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="EMA-XXXXX"
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono"
                />
              </div>
            </div>

            <div className="text-center text-sm text-text-secondary pt-4">
              ¿No conoce el ID de su empresa?{" "}
              <button className="text-blue-600 hover:underline font-medium">
                Click aquí
              </button>{" "}
              para soporte
            </div>
          </div>
        </div>
      </div>

      {/* Footer fijo con botones */}
      <div className="bg-bg-secondary border-t border-border-subtle px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between">
          <button
            onClick={onPrevious}
            className="px-6 py-2.5 text-text-secondary hover:text-text-primary font-medium transition-colors flex items-center gap-2"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Anterior
          </button>
          <button
            onClick={onSubmit}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            Solicitar Afiliación
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
