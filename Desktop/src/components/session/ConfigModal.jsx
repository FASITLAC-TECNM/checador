import React from "react";
import { X, Settings, Smartphone, Sliders } from "lucide-react";

export default function ConfigModal({ onClose, onSelectOption }) {
  const configOptions = [
    {
      id: "general",
      title: "General del Nodo",
      description: "Configuración general del sistema y nodo de trabajo",
      icon: Settings,
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-500",
      borderColor: "border-blue-200",
    },
    {
      id: "dispositivos",
      title: "Dispositivos Conectados",
      description: "Gestiona los dispositivos vinculados a tu cuenta",
      icon: Smartphone,
      bgColor: "bg-green-50",
      iconBg: "bg-green-500",
      borderColor: "border-green-200",
    },
    {
      id: "preferencias",
      title: "Preferencias",
      description: "Personaliza tu experiencia y ajustes del usuario",
      icon: Sliders,
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-500",
      borderColor: "border-purple-200",
    },
  ];

  const handleOptionClick = (optionId) => {
    onSelectOption(optionId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-white" />
              <div>
                <h3 className="text-2xl font-bold text-white">Configuración</h3>
                <p className="text-slate-200 text-sm mt-1">
                  Gestiona la configuración del sistema
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {configOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className={`w-full ${option.bgColor} border-2 ${option.borderColor} rounded-xl p-5 hover:shadow-lg transition-all group`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 ${option.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-gray-800 text-lg mb-1">
                      {option.title}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      {option.description}
                    </p>
                  </div>
                  <svg
                    className="w-6 h-6 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
