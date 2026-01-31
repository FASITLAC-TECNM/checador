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

            // Intentar inicializar el lector (no fatal si falla)
            var readerFound = await _fingerprintManager.Initialize();

            if (!readerFound)
            {
                Console.WriteLine("\n[WARN] No se detecto lector biometrico");
                Console.WriteLine("[INFO] El servidor iniciara de todos modos");
                Console.WriteLine("[INFO] Conecta un lector y sera detectado automaticamente\n");
            }

            // Siempre iniciar el servidor WebSocket
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
            _fingerprintManager.OnReaderConnectionChanged += SendReaderConnectionChanged;
        }

        private async Task SendReaderConnectionChanged(bool connected)
        {
            await SendMessage(new
            {
                type = "readerConnection",
                connected,
                message = connected ? "Lector conectado" : "Lector desconectado",
                timestamp = DateTime.Now
            });
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

                // Usar el endpoint público de credenciales
                Console.WriteLine($"[API] Cargando templates desde: {apiUrl}/credenciales/publico/lista");
                await SendStatusUpdate("loading", "Cargando huellas registradas...");

                var response = await _httpClient.GetAsync($"{apiUrl}/credenciales/publico/lista");

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[API] Error: {response.StatusCode}");
                    await SendError($"Error HTTP: {response.StatusCode}");
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<CredencialesResponse>(json);

                if (result?.Data == null || result.Data.Count == 0)
                {
                    Console.WriteLine("[API] No hay credenciales registradas");
                    await SendError("No hay huellas registradas en el sistema");
                    return;
                }

                // Filtrar solo los que tienen huella dactilar
                var usuariosConHuella = result.Data.FindAll(c => c.TieneDactilar);

                if (usuariosConHuella.Count == 0)
                {
                    Console.WriteLine("[API] No hay usuarios con huella dactilar");
                    await SendError("No hay huellas dactilares registradas en el sistema");
                    return;
                }

                Console.WriteLine($"[API] {usuariosConHuella.Count} usuarios con huella encontrados");

                var templates = new Dictionary<string, byte[]>();

                foreach (var credencial in usuariosConHuella)
                {
                    try
                    {
                        // Obtener el template del empleado (ruta pública)
                        var templateResponse = await _httpClient.GetAsync($"{apiUrl}/credenciales/publico/dactilar/{credencial.EmpleadoId}");

                        if (templateResponse.IsSuccessStatusCode)
                        {
                            var templateJson = await templateResponse.Content.ReadAsStringAsync();
                            var templateResult = JsonConvert.DeserializeObject<DactilarResponse>(templateJson);

                            if (templateResult?.Success == true && templateResult?.Data?.Dactilar != null)
                            {
                                var templateBytes = Convert.FromBase64String(templateResult.Data.Dactilar);
                                templates[$"emp_{credencial.EmpleadoId}"] = templateBytes;
                                Console.WriteLine($"   [OK] emp_{credencial.EmpleadoId}: {templateBytes.Length} bytes");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"   [ERROR] emp_{credencial.EmpleadoId}: {ex.Message}");
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

    // Respuesta del endpoint GET /api/credenciales
    public class CredencialesResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("data")]
        public List<Credencial> Data { get; set; }
    }

    public class Credencial
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("empleado_id")]
        public string EmpleadoId { get; set; }

        [JsonProperty("tiene_dactilar")]
        public bool TieneDactilar { get; set; }

        [JsonProperty("tiene_facial")]
        public bool TieneFacial { get; set; }

        [JsonProperty("tiene_pin")]
        public bool TienePin { get; set; }

        [JsonProperty("empleado_nombre")]
        public string EmpleadoNombre { get; set; }
    }

    // Respuesta del endpoint GET /api/credenciales/empleado/:id/dactilar
    public class DactilarResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("data")]
        public DactilarData Data { get; set; }
    }

    public class DactilarData
    {
        [JsonProperty("dactilar")]
        public string Dactilar { get; set; }
    }
}
