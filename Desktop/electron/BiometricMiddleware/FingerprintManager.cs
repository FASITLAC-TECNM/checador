using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BiometricMiddleware.Adapters;

namespace BiometricMiddleware
{
    public class FingerprintManager
    {
        public event Func<string, string, Task> OnStatusChanged;
        public event Func<int, int, Task> OnEnrollProgress;
        public event Func<string, string, int?, string, Task> OnCaptureComplete;

        private IFingerprintReader _reader;
        private Dictionary<string, byte[]> _enrolledTemplates = new Dictionary<string, byte[]>();

        public async Task Initialize()
        {
            try
            {
                Console.WriteLine("[INIT] Inicializando BiometricMiddleware...\n");

                _reader = await ReaderFactory.AutoDetectReader();

                if (_reader == null)
                {
                    throw new Exception("No se detecto ningun lector biometrico conectado");
                }

                _reader.OnStatusChanged += NotifyStatus;
                _reader.OnEnrollProgress += NotifyEnrollProgress;
                _reader.OnCaptureComplete += HandleCaptureComplete;
                _reader.OnFingerDetected += HandleFingerDetected;

                Console.WriteLine("[OK] Sistema inicializado");
                Console.WriteLine($"    Lector: {_reader.ReaderBrand} {_reader.DeviceModel}\n");

                await NotifyStatus("ready", $"Sistema listo - {_reader.ReaderBrand}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Inicializacion: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                throw;
            }
        }

        public async Task StartEnrollment(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                    throw new ArgumentException("UserId no puede estar vacio");

                if (_reader == null || !_reader.IsConnected)
                    throw new Exception("Lector no esta conectado");

                Console.WriteLine($"[ENROLL] Iniciando para: {userId}");
                await _reader.StartEnrollment(userId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] StartEnrollment: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                throw;
            }
        }

        public void CancelEnrollment()
        {
            try
            {
                _reader?.CancelEnrollment();
                Console.WriteLine("[INFO] Enrollment cancelado");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] Error cancelando: {ex.Message}");
            }
        }

        public async Task StartVerification(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                    throw new ArgumentException("UserId no puede estar vacio");

                if (_reader == null || !_reader.IsConnected)
                    throw new Exception("Lector no esta conectado");

                if (!_enrolledTemplates.ContainsKey(userId))
                    throw new Exception($"Usuario {userId} no tiene huella registrada");

                var template = _enrolledTemplates[userId];
                Console.WriteLine($"[VERIFY] Iniciando para: {userId}");
                await _reader.StartVerification(userId, template);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] StartVerification: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                throw;
            }
        }

        public async Task StartIdentificationWithTemplates(Dictionary<string, byte[]> templates)
        {
            try
            {
                if (_reader == null || !_reader.IsConnected)
                    throw new Exception("Lector no esta conectado");

                if (templates == null || templates.Count == 0)
                    throw new Exception("No hay templates para identificar");

                Console.WriteLine($"[IDENTIFY] Iniciando con {templates.Count} templates de BD");
                await _reader.StartIdentification(templates);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] StartIdentification: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                throw;
            }
        }

        public void StopCapture()
        {
            try
            {
                _reader?.StopCapture();
                Console.WriteLine("[INFO] Captura detenida");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] Error deteniendo: {ex.Message}");
            }
        }

        private async Task HandleCaptureComplete(CaptureResult result)
        {
            try
            {
                Console.WriteLine($"[RESULT] {result.ResultType} - {result.Message}");

                if (result.ResultType == CaptureResultType.EnrollmentSuccess && result.Template != null)
                {
                    _enrolledTemplates[result.UserId] = result.Template;
                    Console.WriteLine($"[OK] Template guardado en memoria: {result.Template.Length} bytes");
                }

                string resultType = MapResultType(result.ResultType);

                await NotifyCaptureComplete(resultType, result.UserId, result.MatchScore, result.TemplateBase64);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] HandleCaptureComplete: {ex.Message}");
            }
        }

        private string MapResultType(CaptureResultType type)
        {
            switch (type)
            {
                case CaptureResultType.EnrollmentSuccess:
                    return "enrollmentSuccess";
                case CaptureResultType.EnrollmentFailed:
                    return "enrollmentFailed";
                case CaptureResultType.VerificationSuccess:
                    return "verificationSuccess";
                case CaptureResultType.VerificationFailed:
                    return "verificationFailed";
                case CaptureResultType.IdentificationSuccess:
                    return "identificationSuccess";
                case CaptureResultType.IdentificationFailed:
                    return "identificationFailed";
                default:
                    return type.ToString().ToLower();
            }
        }

        private async Task HandleFingerDetected(string message)
        {
            Console.WriteLine($"[FINGER] {message}");
            await NotifyStatus("fingerTouch", message);
        }

        public bool IsReaderConnected() => _reader != null && _reader.IsConnected;

        public string GetCurrentOperation() => _reader?.IsCapturing == true ? "Capturing" : "None";

        public List<string> GetEnrolledUsers() => _enrolledTemplates.Keys.ToList();

        public string GetReaderInfo()
        {
            if (_reader == null) return "No reader";
            return $"{_reader.ReaderBrand} {_reader.DeviceModel}";
        }

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
                await OnCaptureComplete(result, userId, score, templateBase64);
        }

        public void Dispose()
        {
            _reader?.Dispose();
        }
    }
}
