import { Check } from "lucide-react";

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
                  w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-500
                  ${currentStep > stepItem.number
                    ? "bg-[#2563eb] text-[#e0f2fe] shadow-md"
                    : currentStep === stepItem.number
                      ? "bg-[#2563eb] text-[#e0f2fe] ring-[3px] ring-[#6366f1]/40 ring-offset-2 ring-offset-bg-secondary shadow-lg scale-110"
                      : "bg-bg-primary text-text-disabled border-2 border-border-subtle"
                  }
                `}
              >
                {currentStep > stepItem.number ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <span>{stepItem.number}</span>
                )}
              </div>
              <span
                className={`
                  mt-2.5 text-xs font-medium text-center whitespace-pre-line leading-tight transition-colors duration-300
                  ${currentStep >= stepItem.number
                    ? "text-text-primary font-semibold"
                    : "text-text-disabled"
                  }
                `}
              >
                {stepItem.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 -mt-4 mx-1">
                <div
                  className={`
                    h-full rounded-full transition-all duration-500
                    ${currentStep > stepItem.number
                      ? "bg-[#2563eb]"
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
