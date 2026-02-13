import { HardDrive, Camera, Building2, Lock, ChevronRight } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: HardDrive,
    title: "Configurar Nodo",
    desc: "Registre nombre, descripción y sistema operativo",
  },
  {
    number: 2,
    icon: Camera,
    title: "Agregar Dispositivos",
    desc: "Configure cámaras IP y lectores USB",
  },
  {
    number: 3,
    icon: Building2,
    title: "Afiliarse a Empresa",
    desc: "Ingrese el código de su empresa",
  },
  {
    number: 4,
    icon: Lock,
    title: "Esperando Aprobación",
    desc: "El administrador validará su solicitud",
  },
];

const requirements = [
  {
    title: "Código de la Empresa",
    desc: "Proporcionado por su administrador (formato EMA-XXXXX)",
  },
  {
    title: "Información del Nodo",
    desc: "Nombre, MAC, IP y descripción del sistema de control",
  },
  {
    title: "Dispositivos Conectados",
    desc: "Detalles de cámaras, sensores y lectores biométricos",
  },
  {
    title: "Permisos de Administrador",
    desc: "Para configurar el sistema y vincular dispositivos",
  },
];

export default function WelcomeScreen({ onClose }) {
  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Header elegante */}
      <div className="bg-bg-primary border-b border-border-subtle px-8 py-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-bg-secondary rounded-2xl flex items-center justify-center border border-border-subtle shadow-sm">
            <img src="images/logo.ico" alt="Logo" className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              Sistema de Asistencia
            </h2>
            <p className="text-text-secondary text-sm mt-0.5">
              Configuración inicial en 4 pasos
            </p>
          </div>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {/* Grid de 4 pasos */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="group bg-bg-secondary rounded-2xl p-5 border border-border-subtle hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-52 flex flex-col cursor-default"
                >
                  <div className="flex flex-col items-center text-center flex-1 justify-center">
                    {/* Número con glow sutil */}
                    <div className="w-11 h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl flex items-center justify-center font-bold text-lg mb-3 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                      {step.number}
                    </div>
                    {/* Icono */}
                    <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center mb-3 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors duration-300">
                      <Icon className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors duration-300" />
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1 text-sm">
                      {step.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sección de requisitos */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-subtle">
            <h3 className="text-base font-bold text-text-primary mb-4">
              Antes de comenzar, asegúrese de tener:
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {requirements.map((req, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-bg-tertiary transition-colors duration-200"
                >
                  <div className="w-5 h-5 rounded-md bg-gray-900 dark:bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-white dark:text-gray-900">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      {req.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      {req.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer elegante */}
      <div className="bg-bg-secondary border-t border-border-subtle px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex justify-center">
          <button
            onClick={onClose}
            className="group px-10 py-3.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 text-base"
          >
            Comenzar Configuración
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </div>
  );
}
