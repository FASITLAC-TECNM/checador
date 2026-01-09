using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using BiometricMiddleware.Adapters;

namespace BiometricMiddleware
{
    /// <summary>
    /// Orquestador principal del sistema biométrico.
    /// Gestiona el adaptador activo y almacenamiento de templates.
    /// </summary>
    public class FingerprintManager
    {
        // Eventos para notificar al WebSocket
        public event Func<string, string, Task> OnStatusChanged;
        public event Func<int, int, Task> OnEnrollProgress;
        public event Func<string, string, int?, string, Task> OnCaptureComplete; // ⭐ Agregar string al final

        // Adaptador activo
        private IFingerprintReader _reader;
        
        // Almacenamiento de templates
        private const string TEMPLATES_FOLDER = "FingerprintTemplates";
        private Dictionary<string, byte[]> _enrolledTemplates = new Dictionary<string, byte[]>();

        public async Task Initialize()
        {
            try
            {
                Console.WriteLine("🔧 Inicializando BiometricMiddleware...\n");

                // Crear carpeta de templates
                if (!Directory.Exists(TEMPLATES_FOLDER))
                {
                    Directory.CreateDirectory(TEMPLATES_FOLDER);
                    Console.WriteLine($"📁 Carpeta creada: {TEMPLATES_FOLDER}\n");
                }

                // Auto-detectar lector
                _reader = await ReaderFactory.AutoDetectReader();

                if (_reader == null)
                {
                    throw new Exception("No se detectó ningún lector biométrico conectado");
                }

                // Suscribirse a eventos del adaptador
                _reader.OnStatusChanged += NotifyStatus;
                _reader.OnEnrollProgress += NotifyEnrollProgress;
                _reader.OnCaptureComplete += HandleCaptureComplete;
                _reader.OnFingerDetected += HandleFingerDetected;
                _reader.OnFingerRemoved += HandleFingerRemoved;

                // Cargar templates existentes
                await LoadExistingTemplates();

                Console.WriteLine("✅ Sistema inicializado correctamente");
                Console.WriteLine($"   Lector: {_reader.ReaderBrand} {_reader.DeviceModel}");
                Console.WriteLine($"   Templates cargados: {_enrolledTemplates.Count}\n");

                await NotifyStatus("ready", $"Sistema listo - {_reader.ReaderBrand}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error en inicialización: {ex.Message}");
                await NotifyStatus("error", $"Error: {ex.Message}");
                throw;
            }
        }

        private async Task LoadExistingTemplates()
        {
            try
            {
                var files = Directory.GetFiles(TEMPLATES_FOLDER, "*.fpt");

                foreach (var file in files)
                {
                    try
                    {
                        var userId = Path.GetFileNameWithoutExtension(file);
                        var bytes = File.ReadAllBytes(file);

                        _enrolledTemplates[userId] = bytes;
                        Console.WriteLine($"   📄 Template cargado: {userId}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"   ⚠️ Error cargando {file}: {ex.Message}");
                    }
                }

                Console.WriteLine($"📚 Total templates: {_enrolledTemplates.Count}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Error cargando templates: {ex.Message}");
            }
        }

        public async Task StartEnrollment(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    throw new ArgumentException("UserId no puede estar vacío");
                }

                if (_reader == null || !_reader.IsConnected)
                {
                    throw new Exception("Lector no está conectado");
                }

                Console.WriteLine($"👤 Iniciando enrollment para: {userId}");
                await _reader.StartEnrollment(userId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error en StartEnrollment: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                throw;
            }
        }

        public void CancelEnrollment()
        {
            try
            {
                _reader?.CancelEnrollment();
                Console.WriteLine("ℹ️ Enrollment cancelado");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Error cancelando: {ex.Message}");
            }
        }

        public async Task StartVerification(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    throw new ArgumentException("UserId no puede estar vacío");
                }

                if (_reader == null || !_reader.IsConnected)
                {
                    throw new Exception("Lector no está conectado");
                }

                if (!_enrolledTemplates.ContainsKey(userId))
                {
                    throw new Exception($"Usuario {userId} no tiene huella registrada");
                }

                var template = _enrolledTemplates[userId];
                Console.WriteLine($"🔍 Iniciando verificación para: {userId}");
                await _reader.StartVerification(userId, template);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error en StartVerification: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                throw;
            }
        }

        public async Task StartIdentification()
        {
            try
            {
                if (_reader == null || !_reader.IsConnected)
                {
                    throw new Exception("Lector no está conectado");
                }

                if (_enrolledTemplates.Count == 0)
                {
                    throw new Exception("No hay usuarios registrados");
                }

                Console.WriteLine($"🔎 Iniciando identificación ({_enrolledTemplates.Count} usuarios)");
                await _reader.StartIdentification(_enrolledTemplates);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error en StartIdentification: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                throw;
            }
        }

        public void StopCapture()
        {
            try
            {
                _reader?.StopCapture();
                Console.WriteLine("ℹ️ Captura detenida");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Error deteniendo: {ex.Message}");
            }
        }

        private async Task HandleCaptureComplete(CaptureResult result)
{
    try
    {
        Console.WriteLine($"📊 Resultado: {result.ResultType} - {result.Message}");

        // Si es enrollment exitoso, guardar template
        if (result.ResultType == CaptureResultType.EnrollmentSuccess && result.Template != null)
        {
            SaveTemplate(result.UserId, result.Template);
            _enrolledTemplates[result.UserId] = result.Template;
        }

        // Mapear a formato del WebSocket
        string resultType = result.ResultType.ToString().ToLower();
        
        if (resultType.Contains("enrollment"))
            resultType = result.ResultType == CaptureResultType.EnrollmentSuccess 
                ? "enrollmentSuccess" 
                : "enrollmentFailed";
        else if (resultType.Contains("verification"))
            resultType = result.ResultType == CaptureResultType.VerificationSuccess 
                ? "verificationSuccess" 
                : "verificationFailed";
        else if (resultType.Contains("identification"))
            resultType = result.ResultType == CaptureResultType.IdentificationSuccess 
                ? "identificationSuccess" 
                : "identificationFailed";

        // ⭐ PASAR EL TEMPLATE BASE64 AL WEBSOCKET
        await NotifyCaptureComplete(
            resultType, 
            result.UserId, 
            result.MatchScore,
            result.TemplateBase64  // ⭐ NUEVO PARÁMETRO
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error manejando resultado: {ex.Message}");
    }
}

        private async Task HandleFingerDetected(string message)
        {
            Console.WriteLine($"👆 {message}");
            await NotifyStatus("fingerTouch", message);
        }

        private async Task HandleFingerRemoved()
        {
            Console.WriteLine("👋 Dedo removido");
        }

        private void SaveTemplate(string userId, byte[] template)
        {
            try
            {
                var filePath = Path.Combine(TEMPLATES_FOLDER, $"{userId}.fpt");
                File.WriteAllBytes(filePath, template);
                Console.WriteLine($"💾 Template guardado: {filePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error guardando template: {ex.Message}");
            }
        }

        public bool IsReaderConnected()
        {
            return _reader != null && _reader.IsConnected;
        }

        public string GetCurrentOperation()
        {
            if (_reader == null)
                return "None";

            return _reader.IsCapturing ? "Capturing" : "None";
        }

        public List<string> GetEnrolledUsers()
        {
            return _enrolledTemplates.Keys.ToList();
        }

        public string GetReaderInfo()
        {
            if (_reader == null)
                return "No reader";

            return $"{_reader.ReaderBrand} {_reader.DeviceModel} (S/N: {_reader.SerialNumber})";
        }

        // Helpers de notificación
        private async Task NotifyStatus(string status, string message)
        {
            if (OnStatusChanged != null)
                await OnStatusChanged(status, message);
        }

        private async Task NotifyEnrollProgress(int collected, int required)
        {
            if (OnEnrollProgress != null)
                await OnEnrollProgress(collected, required);
        }

        private async Task NotifyCaptureComplete(string result, string userId, int? score, string templateBase64)
{
    if (OnCaptureComplete != null)
        await OnCaptureComplete(result, userId, score, templateBase64); // ⭐ Pasar templateBase64
}

        public void Dispose()
        {
            _reader?.Dispose();
        }
    }
}