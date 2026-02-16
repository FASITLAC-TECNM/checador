import { useState } from "react";
import { Building2, Info, X, HelpCircle, ChevronRight, ChevronLeft } from "lucide-react";
import StepIndicator from "./StepIndicator";

export default function AffiliationStep({
  companyId,
  setCompanyId,
  onSubmit,
  onPrevious,
  onShowWelcome,
}) {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Barra de progreso fija */}
      <div className="bg-bg-secondary border-b border-border-subtle py-4 px-8 flex-shrink-0">
        <StepIndicator currentStep={3} totalSteps={4} />
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

          <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 hover:shadow-sm transition-shadow duration-300">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-[#2563eb] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#2563eb]/20">
                <Building2 className="w-5 h-5 text-[#e0f2fe]" />
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
                  className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-xl focus:ring-2 focus:ring-[#6366f1]/50 focus:border-transparent text-center font-mono text-lg tracking-widest transition-all duration-200"
                />
              </div>
            </div>

            <div className="text-center text-sm text-text-secondary pt-4">
              ¿No conoce el ID de su empresa?{" "}
              <button
                onClick={() => setShowHelpModal(true)}
                className="text-text-primary hover:underline font-semibold transition-colors duration-200"
              >
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
            className="px-6 py-2.5 text-text-secondary hover:text-text-primary font-medium transition-all duration-200 flex items-center gap-2 rounded-xl hover:bg-bg-tertiary"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={onSubmit}
            className="group px-6 py-2.5 bg-[#2563eb] text-[#e0f2fe] rounded-xl hover:bg-[#3b82f6] font-medium transition-all duration-200 shadow-sm shadow-[#2563eb]/20 hover:shadow-lg hover:shadow-[#2563eb]/30 hover:-translate-y-0.5 flex items-center gap-2"
          >
            Solicitar Afiliación
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>
      </div>

      {/* Modal de ayuda para conocer el ID de empresa */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-primary rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-bg-primary p-5 border-b border-border-subtle">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-7 h-7 text-text-primary" />
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">
                      ¿Cómo obtener el ID?
                    </h3>
                    <p className="text-text-secondary text-sm mt-1">
                      Sugerencias para conocer su ID de empresa
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-text-secondary hover:bg-bg-secondary rounded-lg p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5">
              <ul className="space-y-3">
                <li className="flex items-start gap-3 p-3 bg-bg-secondary rounded-xl border border-border-subtle">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#2563eb] text-[#e0f2fe] rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <p className="text-text-primary text-sm">
                    Revise el <strong>contrato de licencia</strong> con FASITLAC
                  </p>
                </li>
                <li className="flex items-start gap-3 p-3 bg-bg-secondary rounded-xl border border-border-subtle">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#2563eb] text-[#e0f2fe] rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <p className="text-text-primary text-sm">
                    Revise el <strong>manual de usuario</strong> en el apartado
                    "Creación de una empresa"
                  </p>
                </li>
                <li className="flex items-start gap-3 p-3 bg-bg-secondary rounded-xl border border-border-subtle">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#2563eb] text-[#e0f2fe] rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <p className="text-text-primary text-sm">
                    Contacte al <strong>administrador del sistema</strong> en su
                    institución/empresa
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
