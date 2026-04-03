import { useEffect } from 'react';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Hook para gestionar tours interactivos por módulo.
 * @param {string} moduleId - Identificador único del módulo (ej: 'horarios')
 * @param {Array} steps - Pasos del tour siguiendo el formato de driver.js
 * @param {boolean} trigger - Condición adicional para disparar el tour
 */
export const useTour = (moduleId, steps, trigger = true) => {
    useEffect(() => {
        if (!trigger || !steps || steps.length === 0) return;

        const tourKey = `tour_completed_${moduleId}`;
        const hasCompletedTour = localStorage.getItem(tourKey);

        if (!hasCompletedTour) {
            const driverObj = driver({
                showProgress: true,
                animate: true,
                nextBtnText: 'Siguiente',
                prevBtnText: 'Anterior',
                doneBtnText: 'Finalizar',
                onDeselected: () => {
                    localStorage.setItem(tourKey, 'true');
                },
                onDestroyed: () => {
                    localStorage.setItem(tourKey, 'true');
                },
                steps: steps
            });

            // Pequeño delay para asegurar que el DOM esté listo
            const timer = setTimeout(() => {
                driverObj.drive();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [moduleId, steps, trigger]);
};
