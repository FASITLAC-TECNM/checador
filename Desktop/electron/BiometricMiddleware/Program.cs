using System;
using System.Collections.Generic;
using System.Net;
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
                Console.WriteLine($"\n❌ ERROR FATAL: {ex.Message}");
                Console.WriteLine("\n⚠️ POSIBLES CAUSAS:");
                Console.WriteLine("   • No hay ningún lector conectado");
                Console.WriteLine("   • El SDK del lector no está instalado");
                Console.WriteLine("   • El lector está siendo usado por otra aplicación");
                Console.WriteLine("   • Drivers del lector no instalados correctamente");
                Console.WriteLine("\nPresione cualquier tecla para salir...");
                Console.ReadKey();
                return;
            }

            await StartWebSocketServer();
        }

        static void PrintBanner()
        {
            Console.WriteLine("╔════════════════════════════════════════════════════════╗");
            Console.WriteLine("║                                                        ║");
            Console.WriteLine("║   🔐 BIOMETRIC MIDDLEWARE SERVER v2.0                ║");
            Console.WriteLine("║   Multi-Brand Fingerprint Reader Support             ║");
            Console.WriteLine("║   + PostgreSQL Integration (Base64 Templates)        ║");
            Console.WriteLine("║                                                        ║");
            Console.WriteLine("║   Soporta:                                            ║");
            Console.WriteLine("║   ✅ DigitalPersona (U.are.U)                         ║");
            Console.WriteLine("║   ⚠️  SecuGen (Pendiente SDK)                         ║");
            Console.WriteLine("║   ⚠️  ZKTeco (Pendiente)                              ║");
            Console.WriteLine("║   ⚠️  Otros (Extensible)                              ║");
            Console.WriteLine("║                                                        ║");
            Console.WriteLine("╚════════════════════════════════════════════════════════╝\n");
        }

        static async Task StartWebSocketServer()
        {
            string url = "http://localhost:8787/";
            _httpListener = new HttpListener();
            _httpListener.Prefixes.Add(url);

            try
            {
                _httpListener.Start();
                Console.WriteLine($"\n✅ WebSocket Server corriendo en: {url}");
                Console.WriteLine("⏳ Esperando conexiones de clientes...\n");

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

                        Console.WriteLine($"🔌 Nueva conexión WebSocket (Total: {_connections.Count})");

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
                Console.WriteLine($"❌ Error en servidor: {ex.Message}");
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
                Console.WriteLine($"❌ Error en conexión: {ex.Message}");
            }
            finally
            {
                lock (_connections)
                {
                    _connections.Remove(connection);
                }
                Console.WriteLine($"🔌❌ Conexión cerrada (Total: {_connections.Count})");
            }
        }
    }

    public class WebSocketConnection
    {
        private readonly WebSocket _webSocket;
        private readonly FingerprintManager _fingerprintManager;

        public WebSocketConnection(WebSocket webSocket, FingerprintManager fingerprintManager)
        {
            _webSocket = webSocket;
            _fingerprintManager = fingerprintManager;

            _fingerprintManager.OnStatusChanged += SendStatusUpdate;
            _fingerprintManager.OnEnrollProgress += SendEnrollProgress;
            _fingerprintManager.OnCaptureComplete += SendCaptureComplete; // ⭐ Este ahora recibe 4 parámetros
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

                Console.WriteLine($"📨 Comando recibido: {request.Command}");

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
                        await _fingerprintManager.StartIdentification();
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
                Console.WriteLine($"📤 Enviando template Base64 ({templateBase64.Length} chars) al cliente React");
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
    }

    public class WebSocketRequest
    {
        public string Command { get; set; }
        public string UserId { get; set; }
        public Dictionary<string, object> Parameters { get; set; }
    }
}