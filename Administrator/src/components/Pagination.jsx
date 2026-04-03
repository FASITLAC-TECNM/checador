/**
 * Componente de paginación reutilizable.
 * Muestra máximo 5 botones de página con ellipsis (...) cuando hay muchas páginas.
 */
function Pagination({ pagina, totalPaginas, total, porPagina, onChange }) {
    if (totalPaginas <= 1) return null;

    const inicio = (pagina - 1) * porPagina + 1;
    const fin = Math.min(pagina * porPagina, total);

    // Calcular qué páginas mostrar (máx 5 con ellipsis)
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPaginas <= maxVisible) {
            for (let i = 1; i <= totalPaginas; i++) pages.push(i);
        } else {
            pages.push(1);

            let start = Math.max(2, pagina - 1);
            let end = Math.min(totalPaginas - 1, pagina + 1);

            if (pagina <= 3) {
                end = 4;
            } else if (pagina >= totalPaginas - 2) {
                start = totalPaginas - 3;
            }

            if (start > 2) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPaginas - 1) pages.push('...');

            pages.push(totalPaginas);
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {inicio}-{fin} de {total}
            </p>
            <div className="flex gap-1">
                <button
                    onClick={() => onChange(Math.max(1, pagina - 1))}
                    disabled={pagina === 1}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Anterior
                </button>

                {getPageNumbers().map((num, i) =>
                    num === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                    ) : (
                        <button
                            key={num}
                            onClick={() => onChange(num)}
                            className={`px-3 py-1 text-sm rounded-lg border transition-colors ${pagina === num
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {num}
                        </button>
                    )
                )}

                <button
                    onClick={() => onChange(Math.min(totalPaginas, pagina + 1))}
                    disabled={pagina === totalPaginas}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Siguiente
                </button>
            </div>
        </div >
    );
}

export default Pagination;
