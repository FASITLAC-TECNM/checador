using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using DPFP;
using DPFP.Capture;

namespace BiometricMiddleware.Adapters
{
    public class DigitalPersonaAdapter : IFingerprintReader, DPFP.Capture.EventHandler
    {
        public string ReaderBrand => "DigitalPersona";
        public string DeviceModel { get; private set; }
        public string SerialNumber { get; private set; }
        public bool IsConnected { get; private set; }
        public bool IsCapturing => _currentOperation != OperationType.None;

        public event Func<string, string, Task> OnStatusChanged;
        public event Func<int, int, Task> OnEnrollProgress;
        public event Func<CaptureResult, Task> OnCaptureComplete;
        public event Func<string, Task> OnFingerDetected;
        public event Func<Task> OnFingerRemoved;

        private DPFP.Capture.Capture _capture;
        private DPFP.Processing.Enrollment _enrollment;
        private DPFP.Verification.Verification _verification;

        private OperationType _currentOperation = OperationType.None;
        private string _currentUserId;
        private const int REQUIRED_SAMPLES = 4;

        private byte[] _verificationTemplate;
        private Dictionary<string, byte[]> _identificationTemplates;

        public DigitalPersonaAdapter()
        {
            DeviceModel = "Unknown";
            SerialNumber = "Unknown";
        }

        public async Task<bool> Initialize()
        {
            try
            {
                Console.WriteLine("[DP] Inicializando...");

                var readers = new DPFP.Capture.ReadersCollection();
                Console.WriteLine($"[DP] Lectores encontrados: {readers.Count}");

                if (readers.Count == 0)
                {
                    IsConnected = false;
                    return false;
                }

                var reader = readers[0];
                DeviceModel = reader.ProductName;
                SerialNumber = reader.SerialNumber;

                Console.WriteLine($"[DP] Modelo: {DeviceModel}");
                Console.WriteLine($"[DP] S/N: {SerialNumber}");

                _capture = new DPFP.Capture.Capture(DPFP.Capture.Priority.High);
                _capture.EventHandler = this;

                _enrollment = new DPFP.Processing.Enrollment();
                _verification = new DPFP.Verification.Verification();

                IsConnected = true;
                await NotifyStatus("ready", "Lector DigitalPersona listo");

                Console.WriteLine("[DP] Inicializacion exitosa\n");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DP] Error: {ex.Message}");
                IsConnected = false;
                return false;
            }
        }

        public void Dispose()
        {
            try
            {
                StopCapture();
                _capture?.Dispose();
                _enrollment?.Clear();
                IsConnected = false;
            }
            catch { }
        }

        public async Task StartEnrollment(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("UserId requerido");

            if (_currentOperation != OperationType.None)
                throw new InvalidOperationException("Operacion en curso");

            _currentUserId = userId;
            _currentOperation = OperationType.Enrollment;
            _enrollment.Clear();

            await NotifyStatus("enrolling", $"Registro para: {userId}");
            Console.WriteLine($"[DP] Enrollment: {userId}");

            _capture.StartCapture();
            await NotifyEnrollProgress(0, REQUIRED_SAMPLES);
        }

        public void CancelEnrollment()
        {
            StopCapture();
            _enrollment.Clear();
            _currentUserId = null;
            Console.WriteLine("[DP] Enrollment cancelado");
        }

        public async Task StartVerification(string userId, byte[] template)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("UserId requerido");

            if (template == null || template.Length == 0)
                throw new ArgumentException("Template invalido");

            if (_currentOperation != OperationType.None)
                throw new InvalidOperationException("Operacion en curso");

            _currentUserId = userId;
            _currentOperation = OperationType.Verification;
            _verificationTemplate = template;

            await NotifyStatus("verifying", $"Verificando: {userId}");
            Console.WriteLine($"[DP] Verificacion: {userId}");

            _capture.StartCapture();
        }

        public async Task StartIdentification(Dictionary<string, byte[]> templates)
        {
            if (templates == null || templates.Count == 0)
                throw new ArgumentException("No hay templates");

            if (_currentOperation != OperationType.None)
                throw new InvalidOperationException("Operacion en curso");

            _currentOperation = OperationType.Identification;
            _identificationTemplates = templates;
            _currentUserId = null;

            await NotifyStatus("identifying", $"Identificando entre {templates.Count} usuarios...");
            Console.WriteLine($"[DP] Identificacion: {templates.Count} templates");

            _capture.StartCapture();
        }

        public void StopCapture()
        {
            try
            {
                _capture?.StopCapture();
                _currentOperation = OperationType.None;
                _currentUserId = null;
                _verificationTemplate = null;
                _identificationTemplates = null;
            }
            catch { }
        }

        public async Task<int> GetConnectedReadersCount()
        {
            try
            {
                return new DPFP.Capture.ReadersCollection().Count;
            }
            catch
            {
                return 0;
            }
        }

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
                        IsAvailable = true
                    });
                }
            }
            catch { }
            return list;
        }

        // DPFP Event Handlers
        public void OnComplete(object Capture, string ReaderSerialNumber, Sample Sample)
        {
            Task.Run(async () =>
            {
                try
                {
                    Console.WriteLine($"[DP] Muestra capturada: {Sample.Bytes.Length} bytes");

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
                    Console.WriteLine($"[DP] Error: {ex.Message}");
                    await NotifyStatus("error", ex.Message);
                    _currentOperation = OperationType.None;
                }
            });
        }

        public void OnFingerTouch(object Capture, string ReaderSerialNumber)
        {
            Console.WriteLine("[DP] Dedo detectado");
            OnFingerDetected?.Invoke("Dedo detectado");
        }

        public void OnFingerGone(object Capture, string ReaderSerialNumber)
        {
            OnFingerRemoved?.Invoke();
        }

        public void OnReaderConnect(object Capture, string ReaderSerialNumber)
        {
            Console.WriteLine($"[DP] Lector conectado: {ReaderSerialNumber}");
            IsConnected = true;
        }

        public void OnReaderDisconnect(object Capture, string ReaderSerialNumber)
        {
            Console.WriteLine($"[DP] Lector desconectado");
            IsConnected = false;
        }

        public void OnSampleQuality(object Capture, string ReaderSerialNumber, CaptureFeedback CaptureFeedback)
        {
            if (CaptureFeedback != CaptureFeedback.Good)
                Console.WriteLine($"[DP] Calidad: {CaptureFeedback}");
        }

        // Private Methods
        private async Task ProcessEnrollment(DPFP.FeatureSet features)
        {
            _enrollment.AddFeatures(features);

            int collected = REQUIRED_SAMPLES - (int)_enrollment.FeaturesNeeded;
            await NotifyEnrollProgress(collected, REQUIRED_SAMPLES);
            Console.WriteLine($"[DP] Progreso: {collected}/{REQUIRED_SAMPLES}");

            if (_enrollment.TemplateStatus == DPFP.Processing.Enrollment.Status.Ready)
            {
                var template = _enrollment.Template;
                var bytes = template.Bytes;

                Console.WriteLine($"[DP] Enrollment completado: {bytes.Length} bytes");

                var result = new CaptureResult
                {
                    ResultType = CaptureResultType.EnrollmentSuccess,
                    UserId = _currentUserId,
                    Template = bytes,
                    Message = "Registro completado"
                };

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
                    Message = "Registro fallido"
                };

                await NotifyCaptureComplete(result);
                _enrollment.Clear();
                StopCapture();
            }
        }

        private async Task ProcessVerification(DPFP.FeatureSet features)
        {
            var dpTemplate = new DPFP.Template();
            dpTemplate.DeSerialize(_verificationTemplate);

            var result = new DPFP.Verification.Verification.Result();
            _verification.Verify(features, dpTemplate, ref result);

            int score = result.Verified ? (int)((1.0 - result.FARAchieved) * 100) : 0;

            var captureResult = new CaptureResult
            {
                ResultType = result.Verified ? CaptureResultType.VerificationSuccess : CaptureResultType.VerificationFailed,
                UserId = _currentUserId,
                MatchScore = score,
                Message = result.Verified ? "Verificacion exitosa" : "Verificacion fallida"
            };

            await NotifyCaptureComplete(captureResult);
            StopCapture();
        }

        private async Task ProcessIdentification(DPFP.FeatureSet features)
        {
            string identifiedUser = null;
            int bestScore = 0;

            Console.WriteLine($"[DP] Comparando con {_identificationTemplates.Count} templates...");

            foreach (var kvp in _identificationTemplates)
            {
                try
                {
                    var dpTemplate = new DPFP.Template();
                    dpTemplate.DeSerialize(kvp.Value);

                    var result = new DPFP.Verification.Verification.Result();
                    _verification.Verify(features, dpTemplate, ref result);

                    if (result.Verified)
                    {
                        int score = (int)((1.0 - result.FARAchieved) * 100);
                        Console.WriteLine($"[DP] MATCH: {kvp.Key} ({score}%)");

                        if (score > bestScore || identifiedUser == null)
                        {
                            bestScore = score;
                            identifiedUser = kvp.Key;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DP] Error con {kvp.Key}: {ex.Message}");
                }
            }

            var captureResult = new CaptureResult
            {
                ResultType = identifiedUser != null ? CaptureResultType.IdentificationSuccess : CaptureResultType.IdentificationFailed,
                UserId = identifiedUser,
                MatchScore = bestScore,
                Message = identifiedUser != null ? $"Identificado: {identifiedUser}" : "No identificado"
            };

            Console.WriteLine($"[DP] Resultado: {captureResult.Message}");
            await NotifyCaptureComplete(captureResult);
            StopCapture();
        }

        private DPFP.FeatureSet ExtractFeatures(Sample sample, DPFP.Processing.DataPurpose purpose)
        {
            try
            {
                var extractor = new DPFP.Processing.FeatureExtraction();
                var feedback = DPFP.Capture.CaptureFeedback.None;
                var features = new DPFP.FeatureSet();

                extractor.CreateFeatureSet(sample, purpose, ref feedback, ref features);

                return feedback == DPFP.Capture.CaptureFeedback.Good ? features : null;
            }
            catch
            {
                return null;
            }
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

        private async Task NotifyCaptureComplete(CaptureResult result)
        {
            if (OnCaptureComplete != null)
                await OnCaptureComplete(result);
        }
    }
}
