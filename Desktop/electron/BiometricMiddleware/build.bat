@echo off
chcp 65001 >nul 2>&1
REM Script para compilar BiometricMiddleware desde codigo fuente

echo.
echo ============================================================
echo    Compilando BiometricMiddleware desde codigo fuente
echo ============================================================
echo.

REM Verificar que .NET SDK este instalado
where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] .NET SDK no esta instalado
    echo.
    echo Descarga e instala .NET SDK desde:
    echo    https://dotnet.microsoft.com/download
    echo.
    pause
    exit /b 1
)

echo [OK] .NET SDK encontrado
dotnet --version

REM Verificar que las DLLs de DigitalPersona esten disponibles
set DPFP_DLL="C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPShrNET.dll"
if not exist %DPFP_DLL% (
    echo.
    echo [WARN] SDK de DigitalPersona no encontrado
    echo    Ruta esperada: %DPFP_DLL%
    echo.
    echo Si usas lector DigitalPersona, instala el SDK desde:
    echo    https://www.digitalpersona.com/developers/
    echo.
    echo    Continuando de todos modos...
    echo.
)

echo.
echo [BUILD] Compilando proyecto...
echo.

REM Compilar el proyecto
dotnet build BiometricMiddleware.csproj -c Release -p:Platform=x86

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Error al compilar
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Compilacion exitosa
echo.

REM Crear carpeta de salida si no existe
if not exist "bin" mkdir bin

REM Copiar ejecutable (x86 porque se compila con Platform=x86)
copy "bin\x86\Release\net48\BiometricMiddleware.exe" "bin\BiometricMiddleware.exe" >nul

REM Copiar DLLs necesarias
copy "bin\x86\Release\net48\*.dll" "bin\" >nul

echo [OK] Archivos copiados a: electron\BiometricMiddleware\bin\
echo.
echo [OK] Proceso completado
echo.
echo Para ejecutar el middleware:
echo    1. Asegurate de que el lector este conectado
echo    2. Ejecuta: bin\BiometricMiddleware.exe
echo.