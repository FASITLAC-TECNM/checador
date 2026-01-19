using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using BiometricMiddleware.Adapters;

namespace BiometricMiddleware
{
    class Program
    {
        private static HttpListener _httpListener;
        private static List<WebSocketConnection> _connections = new List<WebSocketConnection>();
        private static FingerprintManager _fingerprintManager;

        static async Task Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            
            PrintBanner();
            ReaderFactory.ShowAvailableAdapters();

            _fingerprintManager = new FingerprintManager();
            
            try
            {
                await _fingerprintManager.Initialize();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[ERROR FATAL] {ex.Message}");
                Console.WriteLine("\nPOSIBLES CAUSAS:");
                Console.WriteLine("   - No hay ningun lector conectado");
                Console.WriteLine("   - El SDK del lector no esta instalado");
                Console.WriteLine("   - El lector esta siendo usado por otra aplicacion");
                Console.WriteLine("   - Drivers del lector no instalados correctamente");
                Console.WriteLine("\nPresione cualquier tecla para salir...");
                Console.ReadKey();
                return;
            }

            await StartWebSocketServer();
        }

        static void PrintBanner()
        {
            Console.WriteLine("=".PadRight(70, '='));
            Console.WriteLine(" BIOMETRIC MIDDLEWARE SERVER v2.0");
            Console.WriteLine(" Multi-Brand Fingerprint Reader Support");
            Console.WriteLine(" PostgreSQL Integration (Base64 Templates)");
            Console.WriteLine("=".PadRight(70, '='));
            Console.WriteLine(" Soporta:");
            Console.WriteLine("   [OK] DigitalPersona (U.are.U)");
            Console.WriteLine("   [ ] SecuGen (Pendiente SDK)");
            Console.WriteLine("   [ ] ZKTeco (Pendiente)");
            Console.WriteLine("   [ ] Otros (Extensible)");
            Console.WriteLine("=".PadRight(70, '=') + "\n");
        }

        static async Task StartWebSocketServer()
        {
            string url = "http://localhost:8787/";
            _httpListener = new HttpListener();
            _httpListener.Prefixes.Add(url);

            try
            {
                _httpListener.Start();
                Console.WriteLine($"\n[OK] WebSocket Server corriendo en: {url}");
                Console.WriteLine("Esperando conexiones de clientes...\n");

                while (true)
                {
                    var context = await _httpListener.GetContextAsync();

                    if (context.Request.IsWebSocketRequest)
                    {
                        var wsContext = await context.AcceptWebSocketAsync(null);
                        var connection = new WebSocketConnection(wsContext.WebSocket, _fingerprintManager);

                        lock (_connections)
                        {
                            _connections.Add(connection);
                        }

                        Console.WriteLine($"[+] Nueva conexion WebSocket (Total: {_connections.Count})");

                        _ = Task.Run(async () => await HandleWebSocketConnection(connection));
                    }
                    else
                    {
                        context.Response.StatusCode = 400;
                        context.Response.Close();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error en servidor: {ex.Message}");
            }
        }

        static async Task HandleWebSocketConnection(WebSocketConnection connection)
        {
            try
            {
                await connection.HandleMessages();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error en conexion: {ex.Message}");
            }
            finally
            {
                lock (_connections)
                {
                    _connections.Remove(connection);
                }
                Console.WriteLine($"[-] Conexion cerrada (Total: {_connections.Count})");
            }
        }
    }

    public class WebSocketConnection
    {
        private readonly WebSocket _webSocket;
        private readonly FingerprintManager _fingerprintManager;
        private static readonly HttpClient _httpClient = new HttpClient();

        public WebSocketConnection(WebSocket webSocket, FingerprintManager fingerprintManager)
        {
            _webSocket = webSocket;
            _fingerprintManager = fingerprintManager;

            _fingerprintManager.OnStatusChanged += SendStatusUpdate;
            _fingerprintManager.OnEnrollProgress += SendEnrollProgress;
            _fingerprintManager.OnCaptureComplete += SendCaptureComplete;
        }

        public async Task HandleMessages()
        {
            var buffer = new byte[4096];

            while (_webSocket.State == WebSocketState.Open)
            {
                var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
                    break;
                }

                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await ProcessMessage(message);
            }
        }

        private async Task ProcessMessage(string message)
        {
            try
            {
                var request = JsonConvert.DeserializeObject<WebSocketRequest>(message);

                Console.WriteLine($"[CMD] Comando recibido: {request.Command}");

                switch (request.Command)
                {
                    case "startEnrollment":
                        await _fingerprintManager.StartEnrollment(request.UserId);
                        break;

                    case "cancelEnrollment":
                        _fingerprintManager.CancelEnrollment();
                        break;

                    case "startVerification":
                        await _fingerprintManager.StartVerification(request.UserId);
                        break;

                    case "startIdentification":
                        // Cargar templates desde la BD via API y luego iniciar identificación
                        await StartIdentificationWithDbTemplates(request.ApiUrl);
                        break;

                    case "stopCapture":
                        _fingerprintManager.StopCapture();
                        break;

                    case "getStatus":
                        await SendStatus();
                        break;

                    case "listUsers":
                        await SendUserList();
                        break;

                    case "getReaderInfo":
                        await SendReaderInfo();
                        break;

                    default:
                        await SendError($"Comando desconocido: {request.Command}");
                        break;
                }
            }
            catch (Exception ex)
            {
                await SendError($"Error procesando mensaje: {ex.Message}");
            }
        }

        private async Task SendMessage(object data)
        {
            if (_webSocket.State == WebSocketState.Open)
            {
                var json = JsonConvert.SerializeObject(data);
                var bytes = Encoding.UTF8.GetBytes(json);
                await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }

        private async Task SendStatusUpdate(string status, string message)
        {
            await SendMessage(new
            {
                type = "status",
                status = status,
                message = message,
                timestamp = DateTime.Now
            });
        }

        private async Task SendEnrollProgress(int samplesCollected, int samplesRequired)
        {
            await SendMessage(new
            {
                type = "enrollProgress",
                samplesCollected = samplesCollected,
                samplesRequired = samplesRequired,
                percentage = (samplesCollected * 100) / samplesRequired
            });
        }

        // ⭐ MÉTODO MODIFICADO: Ahora recibe templateBase64
        private async Task SendCaptureComplete(string result, string userId, int? matchScore, string templateBase64)
        {
            var response = new
            {
                type = "captureComplete",
                result = result,
                userId = userId,
                matchScore = matchScore,
                templateBase64 = templateBase64, // ⭐ AGREGADO
                timestamp = DateTime.Now
            };

            // Log para debug
            if (!string.IsNullOrEmpty(templateBase64))
            {
                Console.WriteLine($"[SEND] Enviando template Base64 ({templateBase64.Length} chars) al cliente React");
            }

            await SendMessage(response);
        }

        private async Task SendStatus()
        {
            await SendMessage(new
            {
                type = "systemStatus",
                readerConnected = _fingerprintManager.IsReaderConnected(),
                currentOperation = _fingerprintManager.GetCurrentOperation(),
                readerInfo = _fingerprintManager.GetReaderInfo(),
                version = "2.0.0"
            });
        }

        private async Task SendUserList()
        {
            var users = _fingerprintManager.GetEnrolledUsers();
            await SendMessage(new
            {
                type = "userList",
                users = users,
                count = users.Count
            });
        }

        private async Task SendReaderInfo()
        {
            await SendMessage(new
            {
                type = "readerInfo",
                info = _fingerprintManager.GetReaderInfo(),
                connected = _fingerprintManager.IsReaderConnected()
            });
        }

        private async Task SendError(string error)
        {
            await SendMessage(new
            {
                type = "error",
                message = error,
                timestamp = DateTime.Now
            });
        }

        /// <summary>
        /// Carga templates desde la BD via API y luego inicia identificación biométrica
        /// </summary>
        private async Task StartIdentificationWithDbTemplates(string apiUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(apiUrl))
                {
                    await SendError("API URL no proporcionada");
                    return;
                }

                Console.WriteLine($"\n[API] Cargando templates desde: {apiUrl}/biometric/users");
                await SendStatusUpdate("loading", "Cargando huellas registradas...");

                // Obtener lista de usuarios con huella
                var response = await _httpClient.GetAsync($"{apiUrl}/biometric/users");
                Console.WriteLine($"[API] Response Status: {response.StatusCode}");

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[API] Error Response: {errorContent}");
                    await SendError($"Error HTTP: {response.StatusCode}");
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[API] Response: {json.Substring(0, Math.Min(200, json.Length))}...");

                var result = JsonConvert.DeserializeObject<BiometricUsersResponse>(json);

                if (result == null || result.Users == null || result.Users.Count == 0)
                {
                    Console.WriteLine("[API] No hay usuarios con huella registrada");
                    await SendError("No hay huellas registradas en el sistema");
                    return;
                }

                Console.WriteLine($"[API] Encontrados {result.Users.Count} usuarios con huella");

                // Cargar cada template
                var templates = new Dictionary<string, byte[]>();

                foreach (var user in result.Users)
                {
                    try
                    {
                        Console.WriteLine($"   Cargando template de empleado {user.IdEmpleado} ({user.Nombre})...");

                        var templateResponse = await _httpClient.GetAsync($"{apiUrl}/biometric/template/{user.IdEmpleado}");

                        if (templateResponse.IsSuccessStatusCode)
                        {
                            var templateJson = await templateResponse.Content.ReadAsStringAsync();
                            var templateResult = JsonConvert.DeserializeObject<BiometricTemplateResponse>(templateJson);

                            if (templateResult?.Data?.TemplateBase64 != null)
                            {
                                var templateBytes = Convert.FromBase64String(templateResult.Data.TemplateBase64);
                                // Usar formato "emp_ID" para identificar al empleado
                                templates[$"emp_{user.IdEmpleado}"] = templateBytes;
                                Console.WriteLine($"   [OK] Template cargado: {templateBytes.Length} bytes");
                            }
                        }
                        else
                        {
                            Console.WriteLine($"   [WARN] No se pudo cargar template de {user.IdEmpleado}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"   [ERROR] Error cargando template de {user.IdEmpleado}: {ex.Message}");
                    }
                }

                if (templates.Count == 0)
                {
                    await SendError("No se pudieron cargar los templates");
                    return;
                }

                Console.WriteLine($"\n[OK] {templates.Count} templates cargados. Iniciando identificación biométrica...\n");
                await SendStatusUpdate("identifying", $"Coloca tu dedo en el lector ({templates.Count} usuarios)");

                // Iniciar identificación con los templates cargados usando el SDK de DigitalPersona
                await _fingerprintManager.StartIdentificationWithTemplates(templates);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Error en identificación: {ex.Message}");
                await SendError($"Error cargando huellas: {ex.Message}");
            }
        }
    }

    public class WebSocketRequest
    {
        public string Command { get; set; }
        public string UserId { get; set; }

        [JsonProperty("apiUrl")]
        public string ApiUrl { get; set; }

        public Dictionary<string, object> Parameters { get; set; }
    }

    // Clases para deserializar respuestas de la API
    public class BiometricUsersResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("count")]
        public int Count { get; set; }

        [JsonProperty("users")]
        public List<BiometricUser> Users { get; set; }
    }

    public class BiometricUser
    {
        [JsonProperty("id_empleado")]
        public int IdEmpleado { get; set; }

        [JsonProperty("id_usuario")]
        public int IdUsuario { get; set; }

        [JsonProperty("nombre")]
        public string Nombre { get; set; }

        [JsonProperty("correo")]
        public string Correo { get; set; }

        [JsonProperty("template_size")]
        public int TemplateSize { get; set; }
    }

    public class BiometricTemplateResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("data")]
        public BiometricTemplateData Data { get; set; }
    }

    public class BiometricTemplateData
    {
        [JsonProperty("id_empleado")]
        public int IdEmpleado { get; set; }

        [JsonProperty("template_base64")]
        public string TemplateBase64 { get; set; }

        [JsonProperty("size_bytes")]
        public int SizeBytes { get; set; }
    }
}