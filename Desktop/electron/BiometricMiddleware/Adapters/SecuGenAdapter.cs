using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BiometricMiddleware.Adapters
{
    /// <summary>
    /// Adaptador para lectores SecuGen
    /// PLACEHOLDER - Implementar cuando se tenga el SDK de SecuGen
    /// </summary>
    public class SecuGenAdapter : IFingerprintReader
    {
        public string ReaderBrand => "SecuGen";
        public string DeviceModel { get; private set; } = "Not Implemented";
        public string SerialNumber { get; private set; } = "N/A";
        public bool IsConnected { get; private set; } = false;
        public bool IsCapturing => false;

        // Eventos
        public event Func<string, string, Task> OnStatusChanged;
        public event Func<int, int, Task> OnEnrollProgress;
        public event Func<CaptureResult, Task> OnCaptureComplete;
        public event Func<string, Task> OnFingerDetected;
        public event Func<Task> OnFingerRemoved;

        public async Task<bool> Initialize()
        {
            Console.WriteLine("⚠️ [SecuGen] Adaptador no implementado aún");
            Console.WriteLine("   Para implementar:");
            Console.WriteLine("   1. Instalar SecuGen SDK");
            Console.WriteLine("   2. Agregar referencias DLL");
            Console.WriteLine("   3. Implementar métodos usando API de SecuGen");
            
            IsConnected = false;
            return false;
        }

        public void Dispose()
        {
            // TODO: Implementar cuando se tenga SDK
        }

        public Task StartEnrollment(string userId)
        {
            throw new NotImplementedException("SecuGen adapter no está implementado. Instale el SDK primero.");
        }

        public void CancelEnrollment()
        {
            throw new NotImplementedException("SecuGen adapter no está implementado.");
        }

        public Task StartVerification(string userId, byte[] template)
        {
            throw new NotImplementedException("SecuGen adapter no está implementado.");
        }

        public Task StartIdentification(Dictionary<string, byte[]> templates)
        {
            throw new NotImplementedException("SecuGen adapter no está implementado.");
        }

        public void StopCapture()
        {
            // No-op
        }

        public async Task<int> GetConnectedReadersCount()
        {
            // TODO: Implementar detección de lectores SecuGen
            return 0;
        }

        public async Task<List<ReaderInfo>> GetReadersInfo()
        {
            return new List<ReaderInfo>();
        }

        /* 
         * GUÍA DE IMPLEMENTACIÓN PARA SECUGEN:
         * 
         * 1. Instalar SecuGen SDK desde: https://www.secugen.com/support/downloads/
         * 
         * 2. Agregar referencias en .csproj:
         *    <Reference Include="SecuGen.FDxSDKPro.Windows">
         *      <HintPath>C:\Program Files\SecuGen\FDx SDK Pro\bin\SecuGen.FDxSDKPro.Windows.dll</HintPath>
         *    </Reference>
         * 
         * 3. Implementar métodos usando API SecuGen:
         *    - SGFPMDeviceName: Detectar dispositivos
         *    - GetImage: Capturar imagen
         *    - CreateTemplate: Crear template
         *    - MatchTemplate: Verificar/Identificar
         * 
         * 4. Mapear eventos del SDK a los eventos de IFingerprintReader
         * 
         * 5. Convertir formatos de template entre SecuGen y el formato estándar
         */
    }
}