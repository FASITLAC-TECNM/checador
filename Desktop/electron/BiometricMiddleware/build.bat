@echo off
REM Script para compilar BiometricMiddleware desde código fuente

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║   Compilando BiometricMiddleware desde código fuente   ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Verificar que .NET SDK esté instalado
where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: .NET SDK no está instalado
    echo.
    echo 💡 Descarga e instala .NET SDK desde:
    echo    https://dotnet.microsoft.com/download
    echo.
    pause
    exit /b 1
)

echo ✅ .NET SDK encontrado
dotnet --version

REM Verificar que las DLLs de DigitalPersona estén disponibles
set DPFP_DLL="C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPShrNET.dll"
if not exist %DPFP_DLL% (
    echo.
    echo ⚠️  ADVERTENCIA: SDK de DigitalPersona no encontrado
    echo    Ruta esperada: %DPFP_DLL%
    echo.
    echo 💡 Si usas lector DigitalPersona, instala el SDK desde:
    echo    https://www.digitalpersona.com/developers/
    echo.
    echo    Continuando de todos modos...
    echo.
)

echo.
echo 🔧 Compilando proyecto...
echo.

REM Compilar el proyecto
dotnet build BiometricMiddleware.csproj -c Release -p:Platform=x86

if %errorlevel% neq 0 (
    echo.
    echo ❌ Error al compilar
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Compilación exitosa
echo.

REM Crear carpeta de salida si no existe
if not exist "bin" mkdir bin

REM Copiar ejecutable
copy "bin\Release\net48\BiometricMiddleware.exe" "bin\BiometricMiddleware.exe" >nul

REM Copiar DLLs necesarias
copy "bin\Release\net48\*.dll" "bin\" >nul

echo 📦 Archivos copiados a: electron\BiometricMiddleware\bin\
echo.
echo ✅ Proceso completado
echo.
echo 💡 Para ejecutar el middleware:
echo    1. Asegúrate de que el lector esté conectado
echo    2. Ejecuta: bin\BiometricMiddleware.exe
echo.

pause