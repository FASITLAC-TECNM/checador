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
            Console.WriteLine("======================================================================");
            Console.WriteLine(" BIOMETRIC MIDDLEWARE SERVER v2.0");
            Console.WriteLine(" DigitalPersona U.are.U Support");
            Console.WriteLine("======================================================================\n");
        }

        static async Task StartWebSocketServer()
        {
            string url = "http://localhost:8787/";
            _httpListener = new HttpListener();
            _httpListener.Prefixes.Add(url);

            try
            {
                _httpListener.Start();
                Console.WriteLine($"[OK] WebSocket Server: {url}");
                Console.WriteLine("Esperando conexiones...\n");

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

                        Console.WriteLine($"[+] Nueva conexion (Total: {_connections.Count})");
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
                Console.WriteLine($"[CMD] {request.Command}");

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
                await SendError($"Error: {ex.Message}");
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
                status,
                message,
                timestamp = DateTime.Now
            });
        }

        private async Task SendEnrollProgress(int samplesCollected, int samplesRequired)
        {
            await SendMessage(new
            {
                type = "enrollProgress",
                samplesCollected,
                samplesRequired,
                percentage = (samplesCollected * 100) / samplesRequired
            });
        }

        private async Task SendCaptureComplete(string result, string userId, int? matchScore, string templateBase64)
        {
            await SendMessage(new
            {
                type = "captureComplete",
                result,
                userId,
                matchScore,
                templateBase64,
                timestamp = DateTime.Now
            });
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
                users,
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

        private async Task StartIdentificationWithDbTemplates(string apiUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(apiUrl))
                {
                    await SendError("API URL no proporcionada");
                    return;
                }

                Console.WriteLine($"[API] Cargando templates desde: {apiUrl}/biometric/users");
                await SendStatusUpdate("loading", "Cargando huellas registradas...");

                var response = await _httpClient.GetAsync($"{apiUrl}/biometric/users");

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[API] Error: {response.StatusCode}");
                    await SendError($"Error HTTP: {response.StatusCode}");
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<BiometricUsersResponse>(json);

                if (result?.Users == null || result.Users.Count == 0)
                {
                    Console.WriteLine("[API] No hay usuarios con huella");
                    await SendError("No hay huellas registradas en el sistema");
                    return;
                }

                Console.WriteLine($"[API] {result.Users.Count} usuarios encontrados");

                var templates = new Dictionary<string, byte[]>();

                foreach (var user in result.Users)
                {
                    try
                    {
                        var templateResponse = await _httpClient.GetAsync($"{apiUrl}/biometric/template/{user.IdEmpleado}");

                        if (templateResponse.IsSuccessStatusCode)
                        {
                            var templateJson = await templateResponse.Content.ReadAsStringAsync();
                            var templateResult = JsonConvert.DeserializeObject<BiometricTemplateResponse>(templateJson);

                            if (templateResult?.Data?.TemplateBase64 != null)
                            {
                                var templateBytes = Convert.FromBase64String(templateResult.Data.TemplateBase64);
                                templates[$"emp_{user.IdEmpleado}"] = templateBytes;
                                Console.WriteLine($"   [OK] emp_{user.IdEmpleado}: {templateBytes.Length} bytes");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"   [ERROR] emp_{user.IdEmpleado}: {ex.Message}");
                    }
                }

                if (templates.Count == 0)
                {
                    await SendError("No se pudieron cargar los templates");
                    return;
                }

                Console.WriteLine($"[OK] {templates.Count} templates cargados\n");
                await SendStatusUpdate("identifying", $"Coloca tu dedo en el lector ({templates.Count} usuarios)");

                await _fingerprintManager.StartIdentificationWithTemplates(templates);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                await SendError($"Error cargando huellas: {ex.Message}");
            }
        }
    }

    // DTO Classes
    public class WebSocketRequest
    {
        public string Command { get; set; }
        public string UserId { get; set; }

        [JsonProperty("apiUrl")]
        public string ApiUrl { get; set; }
    }

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

        [JsonProperty("nombre")]
        public string Nombre { get; set; }
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
        [JsonProperty("template_base64")]
        public string TemplateBase64 { get; set; }
    }
}
