# Sistema de Asistencia

Sistema gestor de control de asistencia desarrollado con React, Vite y Tailwind CSS.

## 📁 Estructura del Proyecto

```
sistema-asistencia/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── affiliation/    # Componentes de afiliación
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── StepIndicator.jsx
│   │   │   ├── NodeConfigStep.jsx
│   │   │   ├── DevicesStep.jsx
│   │   │   ├── AffiliationStep.jsx
│   │   │   └── ApprovalStep.jsx
│   │   ├── kiosk/          # Componentes del kiosko
│   │   │   ├── NoticeCard.jsx
│   │   │   ├── CameraModal.jsx
│   │   │   ├── PinModal.jsx
│   │   │   ├── LoginModal.jsx
│   │   │   ├── BitacoraModal.jsx
│   │   │   └── NoticeDetailModal.jsx
│   │   ├── session/        # Componentes de sesión
│   │   └── shared/         # Componentes compartidos
│   ├── pages/              # Páginas principales
│   │   ├── AffiliationRequest.jsx
│   │   ├── KioskScreen.jsx
│   │   └── SessionScreen.jsx
│   ├── utils/              # Utilidades y helpers
│   │   └── dateHelpers.js
│   ├── constants/          # Constantes y datos estáticos
│   │   └── notices.js
│   ├── hooks/              # Hooks personalizados
│   ├── App.jsx             # Componente principal
│   ├── main.jsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa de producción
npm run preview
```

## 📄 Páginas

### 1. AffiliationRequest (`/pages/AffiliationRequest.jsx`)
Proceso de afiliación en 4 pasos:
- **Paso 1**: Configuración del nodo
- **Paso 2**: Agregar dispositivos
- **Paso 3**: Afiliación a empresa
- **Paso 4**: Aprobación

### 2. KioskScreen (`/pages/KioskScreen.jsx`)
Pantalla de kiosko para registro de asistencia:
- Reconocimiento facial
- PIN
- Huella digital
- Avisos y notificaciones
- Bitácora del sistema

### 3. SessionScreen (`/pages/SessionScreen.jsx`)
Panel de administración:
- Ver horario
- Historial de asistencia
- Solicitar ausencias
- Configuración del nodo

## 🎨 Estilos

El proyecto utiliza Tailwind CSS para todos los estilos. Los estilos se mantienen exactamente como en el diseño original sin modificaciones.

## 📦 Dependencias Principales

- **React 18.2.0**: Librería UI
- **Vite 4.4.5**: Build tool y dev server
- **Tailwind CSS 3.3.3**: Framework CSS
- **Lucide React 0.263.1**: Iconos

## 🔧 Utilidades

### dateHelpers.js
Funciones para manejo de fechas:
- `formatTime(date)`: Formato de hora
- `formatDate(date)`: Formato de fecha
- `formatDay(date)`: Día de la semana
- `getDaysInMonth(date)`: Días en el mes
- `calcularDiasTotales(inicio, fin)`: Calcular días entre fechas

## 📋 Constantes

### notices.js
Contiene:
- `notices`: Array de avisos/notificaciones
- `eventLog`: Registro de eventos del sistema
- `registrosPorDia`: Registros de asistencia por día

## 🎯 Características

- ✅ Arquitectura modular y escalable
- ✅ Componentes reutilizables
- ✅ Separación de lógica y presentación
- ✅ Utilidades centralizadas
- ✅ Estilos consistentes con Tailwind CSS
- ✅ Código organizado y mantenible

## 📝 Notas de Desarrollo

### Cambiar Página Inicial
En `App.jsx`, modifica el estado inicial de `currentPage`:
```javascript
const [currentPage, setCurrentPage] = useState("kiosk");
// Opciones: "affiliation", "kiosk", "session"
```

### Agregar Nuevos Componentes
1. Crear el componente en la carpeta correspondiente
2. Importarlo donde se necesite
3. Mantener la estructura modular

### Estilos
Todos los estilos utilizan clases de Tailwind CSS. No modificar los estilos existentes para mantener la coherencia visual.

## 🤝 Contribución

Este proyecto sigue una estructura modular. Al agregar nuevas características:
1. Mantén la organización de carpetas
2. Crea componentes reutilizables
3. Documenta funciones complejas
4. Respeta los estilos existentes

## 📧 Soporte

Para preguntas o soporte, contacta al equipo de desarrollo.
