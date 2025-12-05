import React, { useState, useEffect } from "react";
import { X, Sliders, Save, Bell, Moon, Globe, Volume2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function PreferenciasModal({ onClose, onBack }) {
  const { isDarkMode, setDarkMode } = useTheme();

  // Valores por defecto
  const defaultPreferences = {
    notifications: true,
    darkMode: false,
    language: "es",
    soundEnabled: true,
  };

  const [preferences, setPreferences] = useState(() => {
    // Cargar preferencias guardadas
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        // Asegurar que todos los campos tengan un valor definido
        return {
          notifications: parsed.notifications ?? defaultPreferences.notifications,
          darkMode: isDarkMode,
          language: parsed.language ?? defaultPreferences.language,
          soundEnabled: parsed.soundEnabled ?? defaultPreferences.soundEnabled,
        };
      } catch (error) {
        console.error("Error al cargar preferencias:", error);
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

  const handleSave = () => {
    console.log("Preferencias guardadas:", preferences);
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
    alert("Preferencias guardadas exitosamente");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3">
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

        {/* Body */}
        <div className="p-3 space-y-2">
          {/* Notificaciones */}
          <div className="bg-bg-secondary border-2 border-purple-200 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">Notificaciones</h4>
                  <p className="text-xs text-text-secondary">
                    Recibir alertas y avisos del sistema
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      notifications: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-primary after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Modo Oscuro */}
          <div className="bg-bg-secondary border-2 border-purple-200 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-600" />
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
                <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-primary after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Sonido */}
          <div className="bg-bg-secondary border-2 border-purple-200 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-600" />
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
                <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-primary after:border-border-subtle after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Idioma */}
          <div className="bg-bg-secondary border-2 border-purple-200 rounded-2xl p-3">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-purple-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-text-primary mb-1.5 text-sm">Idioma</h4>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm bg-bg-primary border border-border-subtle rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-text-primary"
                >
                  <option value="es" className="bg-bg-primary text-text-primary">Español</option>
                  <option value="en" className="bg-bg-primary text-text-primary">English</option>
                  <option value="fr" className="bg-bg-primary text-text-primary">Français</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-bg-secondary p-3 border-t border-border-subtle">
          <div className="flex gap-3">
            <button
              onClick={onBack || onClose}
              className="flex-1 px-4 py-2 text-sm bg-bg-primary border-2 border-border-subtle text-text-secondary rounded-2xl font-semibold hover:bg-bg-secondary transition-colors"
            >
              {onBack ? "Volver" : "Cancelar"}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl font-semibold hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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
