import React, { useState, useEffect } from "react";
import { X, Sliders, Save, Bell, Moon, Globe, Volume2 } from "lucide-react";

export default function PreferenciasModal({ onClose, onToggleDarkMode, isDarkMode }) {
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: isDarkMode || false,
    language: "es",
    soundEnabled: true,
  });

  useEffect(() => {
    setPreferences(prev => ({ ...prev, darkMode: isDarkMode }));
  }, [isDarkMode]);

  const handleDarkModeToggle = (checked) => {
    setPreferences({ ...preferences, darkMode: checked });
    onToggleDarkMode(checked);
  };

  const handleSave = () => {
    console.log("Preferencias guardadas:", preferences);
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
    alert("Preferencias guardadas exitosamente");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Sliders className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Preferencias</h3>
                <p className="text-purple-100 text-sm mt-1">
                  Personaliza tu experiencia y ajustes del usuario
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
        <div className="p-6 space-y-6">
          {/* Notificaciones */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-bold text-gray-800">Notificaciones</h4>
                  <p className="text-sm text-gray-600">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Modo Oscuro */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-bold text-gray-800">Modo Oscuro</h4>
                  <p className="text-sm text-gray-600">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Sonido */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-bold text-gray-800">Sonidos del Sistema</h4>
                  <p className="text-sm text-gray-600">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Idioma */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-purple-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 mb-2">Idioma</h4>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-bold hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Guardar Preferencias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
