import { CheckCircle } from "lucide-react";

export default function StepIndicator({ currentStep }) {
  const steps = [
    { number: 1, label: "Configurar\nNodo" },
    { number: 2, label: "Dispositivos" },
    { number: 3, label: "Afiliación" },
    { number: 4, label: "Aprobación" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-start">
        {steps.map((stepItem, index) => (
          <div key={stepItem.number} className="flex items-center flex-1">
            {/* Step circle and label */}
            <div className="flex flex-col items-center w-20">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300
                  ${
                    currentStep > stepItem.number
                      ? "bg-green-500 text-white shadow-md"
                      : currentStep === stepItem.number
                      ? "bg-blue-600 text-white ring-4 ring-blue-200 shadow-md"
                      : "bg-bg-primary text-text-disabled border-2 border-border-subtle"
                  }
                `}
              >
                {currentStep > stepItem.number ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span>{stepItem.number}</span>
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium text-center whitespace-pre-line leading-tight
                  ${
                    currentStep >= stepItem.number
                      ? "text-text-primary"
                      : "text-text-disabled"
                  }
                `}
              >
                {stepItem.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 -mt-4 mx-1">
                <div
                  className={`
                    h-full rounded transition-all duration-300
                    ${
                      currentStep > stepItem.number
                        ? "bg-green-500"
                        : "bg-border-subtle"
                    }
                  `}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
