using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BiometricMiddleware.Adapters
{
    /// <summary>
    /// Factory para crear instancias de lectores biométricos.
    /// Auto-detecta qué lectores están conectados y retorna el adaptador apropiado.
    /// </summary>
    public static class ReaderFactory
    {
        /// <summary>
        /// Detecta automáticamente qué lector está conectado y retorna el adaptador apropiado
        /// </summary>
        /// <returns>Adaptador del lector detectado o null si no hay ninguno</returns>
        public static async Task<IFingerprintReader> AutoDetectReader()
        {
            Console.WriteLine("[INIT] AUTO-DETECCION DE LECTORES");
            Console.WriteLine("=".PadRight(70, '=') + "\n");

            // Lista de adaptadores a probar (en orden de prioridad)
            var adapters = new List<IFingerprintReader>
            {
                new DigitalPersonaAdapter(),
                new SecuGenAdapter(),
                // Agregar más adaptadores aquí cuando estén implementados:
                // new ZKTecoAdapter(),
                // new SupremaAdapter(),
                // new FutronicAdapter(),
                // etc.
            };

            // Probar cada adaptador
            foreach (var adapter in adapters)
            {
                try
                {
                    Console.WriteLine($"[TEST] Probando: {adapter.ReaderBrand}...");

                    bool initialized = await adapter.Initialize();

                    if (initialized && adapter.IsConnected)
                    {
                        Console.WriteLine($"[OK] LECTOR DETECTADO: {adapter.ReaderBrand}");
                        Console.WriteLine($"   Modelo: {adapter.DeviceModel}");
                        Console.WriteLine($"   S/N: {adapter.SerialNumber}");
                        Console.WriteLine("=".PadRight(70, '=') + "\n");
                        return adapter;
                    }
                    else
                    {
                        Console.WriteLine($"   [ ] {adapter.ReaderBrand} no detectado");
                        adapter.Dispose();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"   [ERROR] Error probando {adapter.ReaderBrand}: {ex.Message}");
                    adapter.Dispose();
                }
            }

            Console.WriteLine("[ERROR] NO SE DETECTO NINGUN LECTOR");
            Console.WriteLine("=".PadRight(70, '=') + "\n");
            return null;
        }

        /// <summary>
        /// Crea un adaptador específico por marca
        /// </summary>
        /// <param name="brand">Marca del lector (DigitalPersona, SecuGen, etc.)</param>
        /// <returns>Instancia del adaptador solicitado</returns>
        public static async Task<IFingerprintReader> CreateReader(string brand)
        {
            Console.WriteLine($"[INIT] Creando adaptador para: {brand}");

            IFingerprintReader reader = null;

            switch (brand.ToLower())
            {
                case "digitalpersona":
                case "dp":
                    reader = new DigitalPersonaAdapter();
                    break;

                case "secugen":
                case "sg":
                    reader = new SecuGenAdapter();
                    break;

                // Agregar más casos aquí:
                // case "zkteco":
                //     reader = new ZKTecoAdapter();
                //     break;

                default:
                    throw new ArgumentException($"Marca no soportada: {brand}");
            }

            bool initialized = await reader.Initialize();

            if (!initialized)
            {
                throw new Exception($"No se pudo inicializar el lector {brand}");
            }

            return reader;
        }

        /// <summary>
        /// Obtiene información de todos los lectores conectados (de todas las marcas)
        /// </summary>
        public static async Task<List<ReaderInfo>> GetAllConnectedReaders()
        {
            var allReaders = new List<ReaderInfo>();

            var adapters = new List<IFingerprintReader>
            {
                new DigitalPersonaAdapter(),
                new SecuGenAdapter(),
            };

            foreach (var adapter in adapters)
            {
                try
                {
                    await adapter.Initialize();
                    var readers = await adapter.GetReadersInfo();
                    allReaders.AddRange(readers);
                    adapter.Dispose();
                }
                catch
                {
                    // Ignorar errores de adaptadores no disponibles
                }
            }

            return allReaders;
        }

        /// <summary>
        /// Verifica si hay algún lector conectado (de cualquier marca)
        /// </summary>
        public static async Task<bool> IsAnyReaderConnected()
        {
            var adapters = new List<IFingerprintReader>
            {
                new DigitalPersonaAdapter(),
                new SecuGenAdapter(),
            };

            foreach (var adapter in adapters)
            {
                try
                {
                    int count = await adapter.GetConnectedReadersCount();
                    if (count > 0)
                    {
                        adapter.Dispose();
                        return true;
                    }
                }
                catch
                {
                    // Continuar con el siguiente
                }
            }

            return false;
        }

        /// <summary>
        /// Muestra un reporte de todos los adaptadores disponibles
        /// </summary>
        public static void ShowAvailableAdapters()
        {
            Console.WriteLine("\n[INFO] ADAPTADORES DISPONIBLES");
            Console.WriteLine("=".PadRight(70, '='));
            Console.WriteLine("[OK] DigitalPersona - IMPLEMENTADO");
            Console.WriteLine("[ ] SecuGen - PENDIENTE (SDK requerido)");
            Console.WriteLine("[ ] ZKTeco - PENDIENTE");
            Console.WriteLine("[ ] Suprema - PENDIENTE");
            Console.WriteLine("[ ] Futronic - PENDIENTE");
            Console.WriteLine("=".PadRight(70, '=') + "\n");
        }
    }
}