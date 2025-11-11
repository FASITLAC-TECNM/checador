# GUÍA DE USO - Sistema de Asistencia Modularizado

## ✅ PROYECTO COMPLETADO

He reorganizado completamente tu proyecto en una estructura modular, manteniendo TODOS los estilos exactamente como estaban.

## 📁 ESTRUCTURA DEL PROYECTO

```
sistema-asistencia/
├── 📄 Archivos de configuración
│   ├── package.json          # Dependencias del proyecto
│   ├── vite.config.js        # Configuración de Vite
│   ├── tailwind.config.js    # Configuración de Tailwind
│   ├── postcss.config.js     # Configuración de PostCSS
│   ├── index.html            # HTML principal
│   ├── .gitignore            # Archivos ignorados por Git
│   └── README.md             # Documentación completa
│
└── src/
    ├── 📱 PÁGINAS PRINCIPALES
    │   ├── AffiliationRequest.jsx    # Página de afiliación (4 pasos)
    │   ├── KioskScreen.jsx          # Pantalla de kiosko
    │   └── SessionScreen.jsx        # Pantalla de sesión
    │
    ├── 🧩 COMPONENTES MODULARES
    │   ├── affiliation/             # Componentes de afiliación
    │   │   ├── WelcomeScreen.jsx
    │   │   ├── StepIndicator.jsx
    │   │   ├── NodeConfigStep.jsx
    │   │   ├── DevicesStep.jsx
    │   │   ├── AffiliationStep.jsx
    │   │   └── ApprovalStep.jsx
    │   │
    │   ├── kiosk/                   # Componentes del kiosko
    │   │   ├── NoticeCard.jsx
    │   │   ├── CameraModal.jsx
    │   │   ├── PinModal.jsx
    │   │   ├── LoginModal.jsx
    │   │   ├── BitacoraModal.jsx
    │   │   └── NoticeDetailModal.jsx
    │   │
    │   ├── session/                 # Componentes de sesión
    │   └── shared/                  # Componentes compartidos
    │
    ├── 🔧 UTILIDADES
    │   └── dateHelpers.js          # Funciones de fecha/hora
    │
    ├── 📊 CONSTANTES
    │   └── notices.js              # Datos de avisos y eventos
    │
    ├── 🪝 HOOKS
    │   └── (hooks personalizados)
    │
    ├── App.jsx                     # Componente raíz
    ├── main.jsx                    # Punto de entrada
    └── index.css                   # Estilos globales con Tailwind
```

## 🚀 INSTALACIÓN Y USO

### 1. Instalar Dependencias
```bash
cd sistema-asistencia
npm install
```

### 2. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

### 3. Construir para Producción
```bash
npm run build
```

## 🎯 CARACTERÍSTICAS DE LA MODULARIZACIÓN

### ✅ Lo que se hizo:

1. **Separación por Funcionalidad**
   - Cada pantalla tiene su propia carpeta de componentes
   - Componentes reutilizables extraídos

2. **Utilidades Centralizadas**
   - `dateHelpers.js`: Todas las funciones de fecha/hora
   - `notices.js`: Datos centralizados

3. **Componentes Independientes**
   - Cada modal es un componente separado
   - Fácil de mantener y probar

4. **Páginas Limpias**
   - Las páginas principales solo orquestan componentes
   - Lógica de negocio separada de presentación

### ✅ Estilos Preservados

**IMPORTANTE**: TODOS los estilos de Tailwind CSS se mantuvieron EXACTAMENTE igual:
- Colores
- Espaciados
- Animaciones
- Diseño responsive
- Efectos hover
- Gradientes
- Sombras

## 📝 COMPONENTES PRINCIPALES

### Página de Afiliación
- `WelcomeScreen`: Pantalla de bienvenida
- `NodeConfigStep`: Paso 1 - Configuración del nodo
- `DevicesStep`: Paso 2 - Agregar dispositivos
- `AffiliationStep`: Paso 3 - Afiliación a empresa
- `ApprovalStep`: Paso 4 - Aprobación
- `StepIndicator`: Indicador de progreso (reutilizable)

### Página de Kiosko
- `NoticeCard`: Tarjeta de aviso
- `CameraModal`: Modal de reconocimiento facial
- `PinModal`: Modal de ingreso con PIN
- `LoginModal`: Modal de inicio de sesión
- `BitacoraModal`: Modal de bitácora del sistema
- `NoticeDetailModal`: Modal de detalle de aviso

### Página de Sesión
- Panel de usuario con acciones rápidas
- Visualización de avisos
- Modales de gestión (horario, historial, ausencias, configuración)

## 🔄 NAVEGACIÓN ENTRE PÁGINAS

En `App.jsx`, cambia el valor de `currentPage` para navegar:

```javascript
const [currentPage, setCurrentPage] = useState("kiosk");

// Opciones disponibles:
// "affiliation" - Página de afiliación
// "kiosk"       - Pantalla de kiosko (por defecto)
// "session"     - Pantalla de sesión
```

## 📦 DEPENDENCIAS

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "lucide-react": "^0.263.1",
  "vite": "^4.4.5",
  "tailwindcss": "^3.3.3"
}
```

## 🎨 PERSONALIZACIÓN

### Agregar Nuevo Componente

1. Crear archivo en la carpeta apropiada:
   ```
   src/components/[categoria]/NuevoComponente.jsx
   ```

2. Importar donde se necesite:
   ```javascript
   import NuevoComponente from '../components/[categoria]/NuevoComponente';
   ```

### Agregar Nueva Utilidad

1. Crear en `src/utils/`:
   ```javascript
   // src/utils/nuevaUtilidad.js
   export const miFuncion = () => { ... }
   ```

2. Importar donde se necesite:
   ```javascript
   import { miFuncion } from '../utils/nuevaUtilidad';
   ```

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module"
- Verifica que las rutas de importación sean correctas
- Asegúrate de haber ejecutado `npm install`

### Los estilos no se aplican
- Verifica que `index.css` esté importado en `main.jsx`
- Revisa que Tailwind esté configurado correctamente

### La cámara no funciona
- Verifica permisos del navegador
- Usa HTTPS en producción (la API de cámara lo requiere)

## 📚 RECURSOS

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

## ✨ MEJORAS FUTURAS SUGERIDAS

1. **Estado Global**: Implementar Context API o Redux para estado compartido
2. **Rutas**: Agregar React Router para navegación
3. **API**: Conectar con backend real
4. **Testing**: Agregar tests con Jest y React Testing Library
5. **TypeScript**: Migrar a TypeScript para mejor type safety
6. **Persistencia**: Agregar localStorage/sessionStorage
7. **PWA**: Convertir en Progressive Web App
8. **Notificaciones**: Sistema de notificaciones push

## 📧 SOPORTE

Si tienes preguntas o necesitas ayuda con el proyecto, no dudes en preguntar.

---

**¡Proyecto listo para usar! 🎉**

Recuerda: El código está completamente modularizado, pero los estilos se mantuvieron exactamente iguales.
