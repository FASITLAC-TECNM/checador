import { CheckCircle } from "lucide-react";

export default function StepIndicator({ currentStep }) {
  const steps = [
    { number: 1, label: "Configurar Nodo" },
    { number: 2, label: "Dispositivos" },
    { number: 3, label: "Afiliación" },
    { number: 4, label: "Aprobación" },
  ];

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((stepItem, index) => (
          <div key={stepItem.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`
                  relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300
                  ${
                    currentStep > stepItem.number
                      ? "bg-green-500 text-white shadow-lg"
                      : currentStep === stepItem.number
                      ? "bg-blue-600 text-white ring-4 ring-blue-300 shadow-lg animate-pulse"
                      : "bg-white text-gray-400 border-2 border-gray-300"
                  }
                `}
              >
                {currentStep > stepItem.number ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <span>{stepItem.number}</span>
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium text-center
                  ${
                    currentStep >= stepItem.number
                      ? "text-gray-800"
                      : "text-gray-400"
                  }
                `}
              >
                {stepItem.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  h-1 flex-1 mx-2 transition-all duration-300 rounded
                  ${
                    currentStep > stepItem.number
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
