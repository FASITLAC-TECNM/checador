import React, { useState, useEffect } from "react";
import { X, Sliders, Save, Moon, Volume2, Camera, Fingerprint, User, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { obtenerOrdenCredenciales, guardarOrdenCredenciales } from "../../services/configuracionService";

// Mapeo de claves del backend a info visual del frontend
const METODOS_AUTH_INFO = {
  facial: { icon: Camera, label: "Reconocimiento Facial", color: "text-blue-600 dark:text-blue-400" },
  dactilar: { icon: Fingerprint, label: "Huella Digital", color: "text-green-600 dark:text-green-400" },
  pin: { icon: User, label: "Usuario/Correo", color: "text-purple-600 dark:text-purple-400" },
};

export default function PreferenciasModal({ onClose, onBack }) {
  const { isDarkMode, setDarkMode } = useTheme();
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [showMinMethodWarning, setShowMinMethodWarning] = useState(false);

  // Estado para datos del backend
  const [configuracionId, setConfiguracionId] = useState(null);
  const [ordenCredenciales, setOrdenCredenciales] = useState(null);
  const [loadingCredenciales, setLoadingCredenciales] = useState(true);
  const [errorCredenciales, setErrorCredenciales] = useState(null);
  const [savingCredenciales, setSavingCredenciales] = useState(false);

  // Preferencias locales (darkMode, sound)
  const defaultPreferences = {
    darkMode: false,
    soundEnabled: true,
  };

  const [preferences, setPreferences] = useState(() => {
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        return {
          darkMode: isDarkMode,
          soundEnabled: parsed.soundEnabled ?? defaultPreferences.soundEnabled,
        };
      } catch (error) {
        // Error al cargar, se usa el retorno por defecto
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

  // Cargar orden de credenciales desde el backend
  useEffect(() => {
    const cargarCredenciales = async () => {
      try {
        setLoadingCredenciales(true);
        setErrorCredenciales(null);
        const { configuracionId: cfgId, ordenCredenciales: orden } = await obtenerOrdenCredenciales();
        setConfiguracionId(cfgId);
        setOrdenCredenciales(orden);
      } catch (err) {
        console.error("Error al cargar orden de credenciales:", err);
        setErrorCredenciales(err.message);
      } finally {
        setLoadingCredenciales(false);
      }
    };

    cargarCredenciales();
  }, []);

  const handleDarkModeToggle = (checked) => {
    setPreferences({ ...preferences, darkMode: checked });
    setDarkMode(checked);
  };

  // --- Métodos de autenticación (backend) ---

  const getMetodosOrdenados = () => {
    if (!ordenCredenciales) return [];
    return Object.entries(ordenCredenciales)
      .map(([id, config]) => ({ id, ...config }))
      .sort((a, b) => a.prioridad - b.prioridad);
  };

  const handleCheckMethodToggle = (metodoId) => {
    // Verificar que quede al menos un método activo
    const activosCount = Object.values(ordenCredenciales).filter(m => m.activo).length;
    const estaActivo = ordenCredenciales[metodoId].activo;

    if (estaActivo && activosCount <= 1) {
      setShowMinMethodWarning(true);
      setTimeout(() => setShowMinMethodWarning(false), 2500);
      return;
    }

    setOrdenCredenciales(prev => ({
      ...prev,
      [metodoId]: {
        ...prev[metodoId],
        activo: !prev[metodoId].activo,
      },
    }));
  };

  const handleMoveMethod = (metodoId, direction) => {
    const ordenados = getMetodosOrdenados();
    const index = ordenados.findIndex(m => m.id === metodoId);

    if (direction === -1 && index > 0) {
      const anterior = ordenados[index - 1];
      setOrdenCredenciales(prev => ({
        ...prev,
        [metodoId]: { ...prev[metodoId], prioridad: anterior.prioridad },
        [anterior.id]: { ...prev[anterior.id], prioridad: prev[metodoId].prioridad },
      }));
    } else if (direction === 1 && index < ordenados.length - 1) {
      const siguiente = ordenados[index + 1];
      setOrdenCredenciales(prev => ({
        ...prev,
        [metodoId]: { ...prev[metodoId], prioridad: siguiente.prioridad },
        [siguiente.id]: { ...prev[siguiente.id], prioridad: prev[metodoId].prioridad },
      }));
    }
  };

  const handleSave = async () => {
    // Guardar preferencias locales
    localStorage.setItem("userPreferences", JSON.stringify(preferences));

    // Guardar orden de credenciales en el backend
    if (configuracionId && ordenCredenciales) {
      try {
        setSavingCredenciales(true);
        await guardarOrdenCredenciales(configuracionId, ordenCredenciales);
      } catch (err) {
        console.error("Error al guardar orden de credenciales:", err);
        // Aún así mostrar mensaje de éxito parcial (las locales se guardaron)
      } finally {
        setSavingCredenciales(false);
      }
    }

    setShowSaveMessage(true);
    setTimeout(() => {
      setShowSaveMessage(false);
      onClose();
    }, 1500);
  };

  const metodosOrdenados = getMetodosOrdenados();
  const totalMetodos = metodosOrdenados.length;

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

            {loadingCredenciales ? (
              <div className="flex items-center justify-center py-6 gap-2 text-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando métodos...</span>
              </div>
            ) : errorCredenciales ? (
              <div className="text-center py-4 text-red-500 text-sm">
                <p>Error al cargar los métodos de autenticación</p>
                <p className="text-xs mt-1 text-text-secondary">{errorCredenciales}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {metodosOrdenados.map((metodo, index) => {
                  const metodoInfo = METODOS_AUTH_INFO[metodo.id] || {
                    icon: User,
                    label: metodo.id,
                    color: "text-gray-600 dark:text-gray-400",
                  };
                  const Icon = metodoInfo.icon;

                  return (
                    <div
                      key={metodo.id}
                      className="flex items-center gap-2 bg-bg-primary rounded-lg p-2 border border-border-subtle"
                    >
                      <Icon className={`w-4 h-4 ${metodoInfo.color}`} />
                      <span className={`flex-1 text-xs font-medium ${metodo.activo ? 'text-text-primary' : 'text-text-secondary line-through'}`}>
                        {metodoInfo.label}
                      </span>

                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMoveMethod(metodo.id, -1)}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-3 h-3 text-text-secondary" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMethod(metodo.id, 1)}
                          disabled={index === totalMetodos - 1}
                          className="p-0.5 hover:bg-bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-3 h-3 text-text-secondary" />
                        </button>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={metodo.activo}
                          onChange={() => handleCheckMethodToggle(metodo.id)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-primary after:border-border-subtle after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
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
              disabled={savingCredenciales}
              className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-800 text-white rounded-2xl font-semibold hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingCredenciales ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {savingCredenciales ? "Guardando..." : "Guardar Preferencias"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
