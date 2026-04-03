/**
 * Comprime y redimensiona una imagen usando Canvas.
 * @param {File} file - Archivo de imagen del input
 * @param {Object} options
 * @param {number} options.maxWidth - Ancho máximo (default: 400)
 * @param {number} options.maxHeight - Alto máximo (default: 400)
 * @param {number} options.quality - Calidad JPEG 0-1 (default: 0.7)
 * @returns {Promise<string>} Base64 data URL comprimido
 */
export function compressImage(file, options = {}) {
    const { maxWidth = 400, maxHeight = 400, quality = 0.7 } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Calcular nuevas dimensiones manteniendo proporción
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convertir a JPEG comprimido
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Error al procesar la imagen'));
        };

        img.src = url;
    });
}
