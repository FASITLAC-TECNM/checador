# Guía de Migración de Colores para Modo Oscuro

## Reemplazos de Clases Tailwind

### Fondos
- `bg-white` → `bg-bg-primary`
- `bg-gray-50`, `bg-gray-100` → `bg-bg-secondary`
- `bg-gray-200` → `bg-bg-tertiary`

### Textos
- `text-gray-800`, `text-gray-900`, `text-black` → `text-text-primary`
- `text-gray-600`, `text-gray-700` → `text-text-secondary`
- `text-gray-500` → `text-text-tertiary`
- `text-gray-400`, `text-gray-300` → `text-text-disabled`

### Bordes
- `border-gray-200`, `border-gray-300` → `border-border-subtle`
- `border-gray-400` → `border-border-medium`

### Acentos (mantener colores específicos o migrar)
- `bg-blue-600`, `bg-blue-500` → `bg-accent` (para botones principales)
- `hover:bg-blue-700` → `hover:bg-accent-hover`
- `bg-blue-50`, `bg-blue-100` → `bg-accent-light`

### Estados (mantener)
- `bg-green-*` → mantener para éxito
- `bg-red-*` → mantener para error
- `bg-yellow-*`, `bg-amber-*` → mantener para advertencia

## Ejemplos de Conversión

### Antes:
```jsx
<div className="bg-white rounded-lg shadow p-4">
  <h1 className="text-gray-800 font-bold">Título</h1>
  <p className="text-gray-600">Descripción</p>
</div>
```

### Después:
```jsx
<div className="bg-bg-primary rounded-lg shadow p-4">
  <h1 className="text-text-primary font-bold">Título</h1>
  <p className="text-text-secondary">Descripción</p>
</div>
```
