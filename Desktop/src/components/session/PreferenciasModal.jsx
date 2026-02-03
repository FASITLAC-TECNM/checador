import React, { useState, useEffect } from "react";
import { X, Sliders, Save, Moon, Volume2, Camera, Fingerprint, User, ChevronUp, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function PreferenciasModal({ onClose, onBack }) {
  const { isDarkMode, setDarkMode } = useTheme();
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [showMinMethodWarning, setShowMinMethodWarning] = useState(false);

  // Valores por defecto (Sin notificaciones ni idioma)
  const defaultPreferences = {
    darkMode: false,
    soundEnabled: true,
    checkMethods: {
      facial: { enabled: true, order: 1 },
      fingerprint: { enabled: false, order: 2 },
      userLogin: { enabled: false, order: 3 },
    },
  };

  const [preferences, setPreferences] = useState(() => {
    // Cargar preferencias guardadas
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        return {
          darkMode: isDarkMode,
          soundEnabled: parsed.soundEnabled ?? defaultPreferences.soundEnabled,
          checkMethods: parsed.checkMethods ?? defaultPreferences.checkMethods,
        };
      } catch (error) {
        // Error al cargar, se usa el retorno por defecto de abajo
      }
    }
    return {
      ...defaultPreferences,
      darkMode: isDarkMode,
    };
  });

  useEffect(() => {
    setPreferences(prev => ({ ...prev, darkMode: isDarkMode }));
  }, [isDarkMode]);

  const handleDarkModeToggle = (checked) => {
    setPreferences({ ...preferences, darkMode: checked });
    setDarkMode(checked);
  };

  const handleCheckMethodToggle = (methodName, checked) => {
    // Si se intenta desactivar, verificar que quede al menos un método activo
    if (!checked) {
      const enabledCount = Object.values(preferences.checkMethods).filter(m => m.enabled).length;
      if (enabledCount <= 1) {
        setShowMinMethodWarning(true);
        setTimeout(() => setShowMinMethodWarning(false), 2500);
        return;
      }
    }

    setPreferences({
      ...preferences,
      checkMethods: {
        ...preferences.checkMethods,
        [methodName]: {
          ...preferences.checkMethods[methodName],
          enabled: checked,
        },
      },
    });
  };

  const handleMoveMethod = (methodName, direction) => {
    const methods = { ...preferences.checkMethods };
    const currentOrder = methods[methodName].order;

    const otherMethod = Object.keys(methods).find(
      key => methods[key].order === currentOrder + direction
    );

    if (otherMethod) {
      const temp = methods[methodName].order;
      methods[methodName].order = methods[otherMethod].order;
      methods[otherMethod].order = temp;

      setPreferences({ ...preferences, checkMethods: methods });
    }
  };

  const handleSave = () => {
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
    setShowSaveMessage(true);
    setTimeout(() => {
      setShowSaveMessage(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {showSaveMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <Save className="w-5 h-5" />
          <span className="font-semibold">Preferencias guardadas exitosamente</span>
        </div>
      )}
      {showMinMethodWarning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-amber-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
          <Sliders className="w-5 h-5" />
          <span className="font-semibold">Debe haber al menos un método de checado activo</span>
        </div>
      )}
      <div className="bg-bg-primary rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-bg-primary/20 rounded-xl flex items-center justify-center">
                <Sliders className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Preferencias</h3>
                <p className="text-purple-100 text-xs">
                  Personaliza tu experiencia y ajustes del usuario
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-bg-primary/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
          
          {/* Modo Oscuro */}
          <div className="bg-bg-secondary border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Modo Oscuro</h4>
                  <p className="text-xs text-text-secondary">
                    Cambiar la apariencia de todo el sistema
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.darkMode}
                  onChange={(e) => handleDarkModeToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-primary after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 dark:peer-checked:bg-purple-700"></div>
              </label>
            </div>
          </div>

          {/* Sonido */}
          <div className="bg-bg-secondary border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Sonidos del Sistema</h4>
                  <p className="text-xs text-text-secondary">
                    Activar alertas sonoras y notificaciones
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      soundEnabled: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-primary after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 dark:peer-checked:bg-purple-700"></div>
              </label>
            </div>
          </div>

          {/* Métodos de Checado */}
          <div className="bg-bg-secondary border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-3">
            <h4 className="font-semibold text-text-primary mb-3 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Métodos de Checado de Asistencia
            </h4>
            <p className="text-xs text-text-secondary mb-3">
              Configura qué métodos estarán disponibles en la pantalla de checado y su orden de aparición
            </p>

            <div className="space-y-2">
              {Object.entries(preferences.checkMethods)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([methodKey, methodValue]) => {
                  const methodInfo = {
                    facial: { icon: Camera, label: "Reconocimiento Facial", color: "text-blue-600 dark:text-blue-400" },
                    fingerprint: { icon: Fingerprint, label: "Huella Digital", color: "text-green-600 dark:text-green-400" },
                    userLogin: { icon: User, label: "Usuario/Correo", color: "text-purple-600 dark:text-purple-400" },
                  }[methodKey];

                  const Icon = methodInfo.icon;

                  return (
                    <div
                      key={methodKey}
                      className="flex items-center gap-2 bg-bg-primary rounded-lg p-2 border border-border-subtle"
                    >
                      <Icon className={`w-4 h-4 ${methodInfo.color}`} />
                      <span className="flex-1 text-xs font-medium text-text-primary">
                        {methodInfo.label}
                      </span>

                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMoveMethod(methodKey, -1)}
                          disabled={methodValue.order === 1}
                          className="p-0.5 hover:bg-bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-3 h-3 text-text-secondary" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMethod(methodKey, 1)}
                          disabled={methodValue.order === 3}
                          className="p-0.5 hover:bg-bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-3 h-3 text-text-secondary" />
                        </button>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={methodValue.enabled}
                          onChange={(e) =>
                            handleCheckMethodToggle(methodKey, e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-primary after:border-border-subtle after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  );
                })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-bg-secondary p-3 border-t border-border-subtle flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onBack || onClose}
              className="flex-1 px-4 py-2 text-sm bg-bg-primary border-2 border-border-subtle text-text-secondary rounded-2xl font-semibold hover:bg-bg-secondary transition-colors"
            >
              {onBack ? "Volver" : "Cancelar"}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-800 text-white rounded-2xl font-semibold hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Preferencias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}