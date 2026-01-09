using System;
using System.Threading.Tasks;

namespace BiometricMiddleware.Adapters
{
    /// <summary>
    /// Interfaz base para todos los adaptadores de lectores de huellas.
    /// Define el contrato que todos los lectores deben cumplir.
    /// </summary>
    public interface IFingerprintReader
    {
        /// <summary>
        /// Nombre del fabricante del lector (ej: "DigitalPersona", "SecuGen", "ZKTeco")
        /// </summary>
        string ReaderBrand { get; }

        /// <summary>
        /// Modelo del dispositivo
        /// </summary>
        string DeviceModel { get; }

        /// <summary>
        /// Número de serie del dispositivo
        /// </summary>
        string SerialNumber { get; }

        /// <summary>
        /// Indica si el lector está conectado y listo para usar
        /// </summary>
        bool IsConnected { get; }

        /// <summary>
        /// Indica si hay una operación de captura en curso
        /// </summary>
        bool IsCapturing { get; }

        /// <summary>
        /// Eventos para notificar cambios de estado
        /// </summary>
        event Func<string, string, Task> OnStatusChanged;
        event Func<int, int, Task> OnEnrollProgress;
        event Func<CaptureResult, Task> OnCaptureComplete;
        event Func<string, Task> OnFingerDetected;
        event Func<Task> OnFingerRemoved;

        /// <summary>
        /// Inicializa el lector y verifica conectividad
        /// </summary>
        Task<bool> Initialize();

        /// <summary>
        /// Libera recursos del lector
        /// </summary>
        void Dispose();

        /// <summary>
        /// Inicia el proceso de registro (enrollment) de una nueva huella
        /// </summary>
        /// <param name="userId">ID del usuario a registrar</param>
        Task StartEnrollment(string userId);

        /// <summary>
        /// Cancela el enrollment en curso
        /// </summary>
        void CancelEnrollment();

        /// <summary>
        /// Inicia verificación 1:1 contra un template específico
        /// </summary>
        /// <param name="userId">ID del usuario a verificar</param>
        /// <param name="template">Template del usuario en formato byte[]</param>
        Task StartVerification(string userId, byte[] template);

        /// <summary>
        /// Inicia identificación 1:N contra múltiples templates
        /// </summary>
        /// <param name="templates">Diccionario de userId -> template</param>
        Task StartIdentification(System.Collections.Generic.Dictionary<string, byte[]> templates);

        /// <summary>
        /// Detiene cualquier operación de captura en curso
        /// </summary>
        void StopCapture();

        /// <summary>
        /// Verifica si hay lectores de esta marca conectados
        /// </summary>
        Task<int> GetConnectedReadersCount();

        /// <summary>
        /// Obtiene información detallada de los lectores conectados
        /// </summary>
        Task<System.Collections.Generic.List<ReaderInfo>> GetReadersInfo();
    }

    /// <summary>
    /// Información de un lector conectado
    /// </summary>
    public class ReaderInfo
    {
        public string Brand { get; set; }
        public string Model { get; set; }
        public string SerialNumber { get; set; }
        public string Version { get; set; }
        public bool IsAvailable { get; set; }
    }

    /// <summary>
    /// Resultado de una operación de captura
    /// </summary>
    public class CaptureResult
    {
        public CaptureResultType ResultType { get; set; }
        public string UserId { get; set; }
        public int? MatchScore { get; set; }
        public byte[] Template { get; set; }
        public DateTime Timestamp { get; set; }
        public string Message { get; set; }
        

        public CaptureResult()
        {
            Timestamp = DateTime.Now;
        }

        public string TemplateBase64 
    { 
        get 
        {
            return Template != null ? Convert.ToBase64String(Template) : null;
        }
    }
     
    }

    /// <summary>
    /// Tipos de resultado de captura
    /// </summary>
    public enum CaptureResultType
    {
        EnrollmentSuccess,
        EnrollmentFailed,
        VerificationSuccess,
        VerificationFailed,
        IdentificationSuccess,
        IdentificationFailed,
        QualityTooLow,
        Error
    }

    /// <summary>
    /// Tipo de operación en curso
    /// </summary>
    public enum OperationType
    {
        None,
        Enrollment,
        Verification,
        Identification
    }
}