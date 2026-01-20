using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DPFP;
using DPFP.Capture;

namespace BiometricMiddleware.Adapters
{
    /// <summary>
    /// Adaptador para lectores DigitalPersona (U.are.U series)
    /// Implementa la interfaz IFingerprintReader usando el SDK de DigitalPersona
    /// </summary>
    public class DigitalPersonaAdapter : IFingerprintReader, DPFP.Capture.EventHandler
    {
        // Propiedades de IFingerprintReader
        public string ReaderBrand => "DigitalPersona";
        public string DeviceModel { get; private set; }
        public string SerialNumber { get; private set; }
        public bool IsConnected { get; private set; }
        public bool IsCapturing => _currentOperation != OperationType.None;

        // Eventos
        public event Func<string, string, Task> OnStatusChanged;
        public event Func<int, int, Task> OnEnrollProgress;
        public event Func<CaptureResult, Task> OnCaptureComplete;
        public event Func<string, Task> OnFingerDetected;
        public event Func<Task> OnFingerRemoved;

        // Componentes de DigitalPersona
        private DPFP.Capture.Capture _capture;
        private DPFP.Processing.Enrollment _enrollment;
        private DPFP.Verification.Verification _verification;

        // Estado interno
        private OperationType _currentOperation = OperationType.None;
        private string _currentUserId;
        private const int REQUIRED_SAMPLES = 4;

        // Para verificación e identificación
        private byte[] _verificationTemplate;
        private Dictionary<string, byte[]> _identificationTemplates;

        public DigitalPersonaAdapter()
        {
            DeviceModel = "Unknown";
            SerialNumber = "Unknown";
        }

        /// <summary>
        /// Inicializa el adaptador y verifica conectividad
        /// </summary>
        public async Task<bool> Initialize()
        {
            try
            {
                Console.WriteLine("[INIT] [DigitalPersona] Inicializando...");

                // Detectar lectores
                var readers = new DPFP.Capture.ReadersCollection();
                Console.WriteLine($"[INFO] [DigitalPersona] Lectores encontrados: {readers.Count}");

                if (readers.Count == 0)
                {
                    Console.WriteLine("[WARN] [DigitalPersona] No se encontraron lectores");
                    IsConnected = false;
                    return false;
                }

                // Obtener info del primer lector
                var reader = readers[0];
                DeviceModel = reader.ProductName;
                SerialNumber = reader.SerialNumber;

                Console.WriteLine($"   [OK] Modelo: {DeviceModel}");
                Console.WriteLine($"   [OK] S/N: {SerialNumber}");

                // Inicializar componentes
                _capture = new DPFP.Capture.Capture(DPFP.Capture.Priority.High);
                _capture.EventHandler = this;

                _enrollment = new DPFP.Processing.Enrollment();
                _verification = new DPFP.Verification.Verification();

                IsConnected = true;
                await NotifyStatus("ready", "Lector DigitalPersona listo");

                Console.WriteLine("[OK] [DigitalPersona] Inicialización exitosa\n");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] [DigitalPersona] Error inicializando: {ex.Message}");
                IsConnected = false;
                return false;
            }
        }

        /// <summary>
        /// Libera recursos
        /// </summary>
        public void Dispose()
        {
            try
            {
                StopCapture();
                _capture?.Dispose();
                _enrollment?.Clear();
                IsConnected = false;
                Console.WriteLine("[INFO] [DigitalPersona] Recursos liberados");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] [DigitalPersona] Error en Dispose: {ex.Message}");
            }
        }

        /// <summary>
        /// Inicia enrollment
        /// </summary>
        public async Task StartEnrollment(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                    throw new ArgumentException("UserId no puede estar vacío");

                if (_currentOperation != OperationType.None)
                    throw new InvalidOperationException("Ya hay una operación en curso");

                _currentUserId = userId;
                _currentOperation = OperationType.Enrollment;
                _enrollment.Clear();

                await NotifyStatus("enrolling", $"Iniciando registro para: {userId}");
                Console.WriteLine($"[USER] [DigitalPersona] Enrollment iniciado: {userId}");

                _capture.StartCapture();
                await NotifyEnrollProgress(0, REQUIRED_SAMPLES);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] [DigitalPersona] Error en StartEnrollment: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                _currentOperation = OperationType.None;
                throw;
            }
        }

        /// <summary>
        /// Cancela enrollment
        /// </summary>
        public void CancelEnrollment()
        {
            StopCapture();
            _enrollment.Clear();
            _currentUserId = null;
            Console.WriteLine("[INFO] [DigitalPersona] Enrollment cancelado");
        }

        /// <summary>
        /// Inicia verificación 1:1
        /// </summary>
        public async Task StartVerification(string userId, byte[] template)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                    throw new ArgumentException("UserId no puede estar vacío");

                if (template == null || template.Length == 0)
                    throw new ArgumentException("Template inválido");

                if (_currentOperation != OperationType.None)
                    throw new InvalidOperationException("Ya hay una operación en curso");

                _currentUserId = userId;
                _currentOperation = OperationType.Verification;

                // Deserializar template
                var dpTemplate = new DPFP.Template();
                dpTemplate.DeSerialize(template);
                _verificationTemplate = template;

                await NotifyStatus("verifying", $"Verificando identidad de: {userId}");
                Console.WriteLine($"[SCAN] [DigitalPersona] Verificación iniciada: {userId}");

                _capture.StartCapture();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] [DigitalPersona] Error en StartVerification: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                _currentOperation = OperationType.None;
                throw;
            }
        }

        /// <summary>
        /// Inicia identificación 1:N
        /// </summary>
        public async Task StartIdentification(Dictionary<string, byte[]> templates)
        {
            try
            {
                if (templates == null || templates.Count == 0)
                    throw new ArgumentException("No hay templates para identificar");

                if (_currentOperation != OperationType.None)
                    throw new InvalidOperationException("Ya hay una operación en curso");

                _currentOperation = OperationType.Identification;
                _identificationTemplates = templates;
                _currentUserId = null;

                await NotifyStatus("identifying", $"Identificando entre {templates.Count} usuarios...");
                Console.WriteLine($"[SCAN] [DigitalPersona] Identificación iniciada ({templates.Count} templates)");

                _capture.StartCapture();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] [DigitalPersona] Error en StartIdentification: {ex.Message}");
                await NotifyStatus("error", ex.Message);
                _currentOperation = OperationType.None;
                throw;
            }
        }

        /// <summary>
        /// Detiene captura
        /// </summary>
        public void StopCapture()
        {
            try
            {
                _capture?.StopCapture();
                _currentOperation = OperationType.None;
                _currentUserId = null;
                _verificationTemplate = null;
                _identificationTemplates = null;
                Console.WriteLine("[INFO] [DigitalPersona] Captura detenida");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] [DigitalPersona] Error en StopCapture: {ex.Message}");
            }
        }

        /// <summary>
        /// Obtiene cantidad de lectores conectados
        /// </summary>
        public async Task<int> GetConnectedReadersCount()
        {
            try
            {
                var readers = new DPFP.Capture.ReadersCollection();
                return readers.Count;
            }
            catch
            {
                return 0;
            }
        }

        /// <summary>
        /// Obtiene información de lectores
        /// </summary>
        public async Task<List<ReaderInfo>> GetReadersInfo()
        {
            var list = new List<ReaderInfo>();

            try
            {
                var readers = new DPFP.Capture.ReadersCollection();

                for (int i = 0; i < readers.Count; i++)
                {
                    list.Add(new ReaderInfo
                    {
                        Brand = "DigitalPersona",
                        Model = readers[i].ProductName,
                        SerialNumber = readers[i].SerialNumber,
                        Version = readers[i].HardwareVersion.ToString(),
                        IsAvailable = true
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] [DigitalPersona] Error obteniendo info: {ex.Message}");
            }

            return list;
        }

        // ===== EVENTOS DE DPFP.Capture.EventHandler =====

        public void OnComplete(object Capture, string ReaderSerialNumber, Sample Sample)
        {
            Task.Run(async () =>
            {
                try
                {
                    Console.WriteLine($"[OK] [DigitalPersona] Muestra capturada ({Sample.Bytes.Length} bytes)");

                    var purpose = _currentOperation == OperationType.Enrollment
                        ? DPFP.Processing.DataPurpose.Enrollment
                        : DPFP.Processing.DataPurpose.Verification;

                    var features = ExtractFeatures(Sample, purpose);

                    if (features == null)
                    {
                        await NotifyStatus("warning", "Calidad insuficiente, reintente");
                        return;
                    }

                    switch (_currentOperation)
                    {
                        case OperationType.Enrollment:
                            await ProcessEnrollment(features);
                            break;

                        case OperationType.Verification:
                            await ProcessVerification(features);
                            break;

                        case OperationType.Identification:
                            await ProcessIdentification(features);
                            break;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ERROR] [DigitalPersona] Error procesando: {ex.Message}");
                    await NotifyStatus("error", $"Error: {ex.Message}");
                    _currentOperation = OperationType.None;
                }
            });
        }

        public void OnFingerTouch(object Capture, string ReaderSerialNumber)
        {
            Console.WriteLine("[FINGER] [DigitalPersona] Dedo detectado");
            OnFingerDetected?.Invoke("Dedo detectado");
        }

        public void OnFingerGone(object Capture, string ReaderSerialNumber)
        {
            Console.WriteLine("[INFO] [DigitalPersona] Dedo removido");
            OnFingerRemoved?.Invoke();
        }

        public void OnReaderConnect(object Capture, string ReaderSerialNumber)
        {
            Console.WriteLine($"[CONN] [DigitalPersona] Lector conectado: {ReaderSerialNumber}");
            IsConnected = true;
        }

        public void OnReaderDisconnect(object Capture, string ReaderSerialNumber)
        {
            Console.WriteLine($"[CONN][ERROR] [DigitalPersona] Lector desconectado: {ReaderSerialNumber}");
            IsConnected = false;
        }

        public void OnSampleQuality(object Capture, string ReaderSerialNumber, CaptureFeedback CaptureFeedback)
        {
            Console.WriteLine($"[INFO] [DigitalPersona] Calidad: {CaptureFeedback}");
        }

        // ===== MÉTODOS PRIVADOS =====

        private async Task ProcessEnrollment(DPFP.FeatureSet features)
        {
            try
            {
                _enrollment.AddFeatures(features);

                int collected = REQUIRED_SAMPLES - (int)_enrollment.FeaturesNeeded;
                await NotifyEnrollProgress(collected, REQUIRED_SAMPLES);

                Console.WriteLine($"   [INFO] [DigitalPersona] Progreso: {collected}/{REQUIRED_SAMPLES}");

                if (_enrollment.TemplateStatus == DPFP.Processing.Enrollment.Status.Ready)
                {
                    var template = _enrollment.Template;
                    var bytes = template.Bytes;

                    // MOSTRAR BYTEA
                    DisplayByteaFormat(bytes);

                    var result = new CaptureResult
                    {
                        ResultType = CaptureResultType.EnrollmentSuccess,
                        UserId = _currentUserId,
                        Template = bytes,
                        Message = "Enrollment completado exitosamente"
                    };

                    Console.WriteLine($"[OK] [DigitalPersona] Enrollment completado: {_currentUserId}");
                    await NotifyCaptureComplete(result);

                    StopCapture();
                    _enrollment.Clear();
                }
                else if (_enrollment.TemplateStatus == DPFP.Processing.Enrollment.Status.Failed)
                {
                    var result = new CaptureResult
                    {
                        ResultType = CaptureResultType.EnrollmentFailed,
                        UserId = _currentUserId,
                        Message = "Enrollment falló, reintente"
                    };

                    await NotifyCaptureComplete(result);
                    _enrollment.Clear();
                    StopCapture();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] [DigitalPersona] Error en ProcessEnrollment: {ex.Message}");
                throw;
            }
        }

        private async Task ProcessVerification(DPFP.FeatureSet features)
        {
            try
            {
                var dpTemplate = new DPFP.Template();
                dpTemplate.DeSerialize(_verificationTemplate);

                var result = new DPFP.Verification.Verification.Result();
                _verification.Verify(features, dpTemplate, ref result);

                int score = (int)(result.FARAchieved * 100);
                Console.WriteLine($"   [INFO] [DigitalPersona] Verificación - FAR: {result.FARAchieved}, Verificado: {result.Verified}");

                var captureResult = new CaptureResult
                {
                    ResultType = result.Verified ? CaptureResultType.VerificationSuccess : CaptureResultType.VerificationFailed,
                    UserId = _currentUserId,
                    MatchScore = score,
                    Message = result.Verified ? "Verificación exitosa" : "Verificación fallida"
                };

                await NotifyCaptureComplete(captureResult);
                StopCapture();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] [DigitalPersona] Error en ProcessVerification: {ex.Message}");
                throw;
            }
        }

        private async Task ProcessIdentification(DPFP.FeatureSet features)
        {
            try
            {
                string identifiedUser = null;
                int bestScore = 0;

                Console.WriteLine($"[SCAN] [DigitalPersona] Buscando en {_identificationTemplates.Count} usuarios...");

                foreach (var kvp in _identificationTemplates)
                {
                    try
                    {
                        Console.WriteLine($"\n   Comparando con {kvp.Key} (template: {kvp.Value.Length} bytes)...");

                        var dpTemplate = new DPFP.Template();
                        dpTemplate.DeSerialize(kvp.Value);
                        Console.WriteLine($"   [OK] Template deserializado correctamente");

                        var result = new DPFP.Verification.Verification.Result();
                        _verification.Verify(features, dpTemplate, ref result);

                        // Mostrar resultado SIEMPRE (no solo cuando hay match)
                        int score = result.Verified ? (int)((1.0 - result.FARAchieved) * 100) : 0;
                        Console.WriteLine($"   Resultado: Verified={result.Verified}, FARAchieved={result.FARAchieved}, Score={score}%");

                        if (result.Verified)
                        {
                            Console.WriteLine($"   [OK] *** MATCH ENCONTRADO con {kvp.Key}: {score}% ***");

                            if (score > bestScore || identifiedUser == null)
                            {
                                bestScore = score;
                                identifiedUser = kvp.Key;
                            }
                        }
                        else
                        {
                            Console.WriteLine($"   [--] No match con {kvp.Key}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"   [ERROR] Error verificando {kvp.Key}: {ex.Message}");
                        Console.WriteLine($"   [ERROR] Stack: {ex.StackTrace}");
                    }
                }

                var captureResult = new CaptureResult
                {
                    ResultType = identifiedUser != null ? CaptureResultType.IdentificationSuccess : CaptureResultType.IdentificationFailed,
                    UserId = identifiedUser,
                    MatchScore = identifiedUser != null ? bestScore : 0,
                    Message = identifiedUser != null ? $"Usuario identificado: {identifiedUser}" : "Usuario no identificado"
                };

                await NotifyCaptureComplete(captureResult);
                StopCapture();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] [DigitalPersona] Error en ProcessIdentification: {ex.Message}");
                throw;
            }
        }

        private DPFP.FeatureSet ExtractFeatures(Sample sample, DPFP.Processing.DataPurpose purpose)
        {
            try
            {
                var extractor = new DPFP.Processing.FeatureExtraction();
                var feedback = DPFP.Capture.CaptureFeedback.None;
                var features = new DPFP.FeatureSet();

                extractor.CreateFeatureSet(sample, purpose, ref feedback, ref features);

                if (feedback == DPFP.Capture.CaptureFeedback.Good)
                {
                    Console.WriteLine($"   [OK] Features extraídos correctamente");
                    return features;
                }
                else
                {
                    Console.WriteLine($"   [WARN] Calidad: {feedback}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error extrayendo features: {ex.Message}");
                return null;
            }
        }

        private void DisplayByteaFormat(byte[] bytes)
        {
            try
            {
                Console.WriteLine("\n╔═══════════════════════════════════════════════════════════╗");
                Console.WriteLine("║           FINGERPRINT TEMPLATE - FORMATO BYTEA           ║");
                Console.WriteLine("╚═══════════════════════════════════════════════════════════╝\n");

                var byteaString = BytesToByteaString(bytes);

                Console.WriteLine($"📏 Tamaño: {bytes.Length} bytes");
                Console.WriteLine($"🔢 Formato: PostgreSQL BYTEA (hexadecimal)\n");

                Console.WriteLine("📋 BYTEA String (listo para PostgreSQL):");
                Console.WriteLine("─────────────────────────────────────────────────────────────");
                Console.WriteLine(FormatByteaForDisplay(byteaString, 80));
                Console.WriteLine("─────────────────────────────────────────────────────────────\n");

                Console.WriteLine("[SAVE] Ejemplo INSERT:");
                Console.WriteLine($"INSERT INTO fingerprints (user_id, template_data)");
                Console.WriteLine($"VALUES ('{_currentUserId}', '{byteaString.Substring(0, Math.Min(100, byteaString.Length))}...');\n");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error mostrando BYTEA: {ex.Message}");
            }
        }

        private string BytesToByteaString(byte[] bytes)
        {
            var sb = new StringBuilder(bytes.Length * 2 + 2);
            sb.Append("\\x");
            foreach (byte b in bytes)
            {
                sb.AppendFormat("{0:x2}", b);
            }
            return sb.ToString();
        }

        private string FormatByteaForDisplay(string bytea, int lineLength = 80)
        {
            var sb = new StringBuilder();
            int pos = 0;

            while (pos < bytea.Length)
            {
                int length = Math.Min(lineLength, bytea.Length - pos);
                sb.AppendLine(bytea.Substring(pos, length));
                pos += length;
            }

            return sb.ToString();
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

        private async Task NotifyCaptureComplete(CaptureResult result)
        {
            if (OnCaptureComplete != null)
                await OnCaptureComplete(result);
        }
    }
}