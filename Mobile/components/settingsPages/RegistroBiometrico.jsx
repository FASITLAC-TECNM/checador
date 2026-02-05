import React, { useState, useEffect } from 'react';
import { Camera, Fingerprint, Lock, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

const BiometricRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [empleadoId, setEmpleadoId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [credenciales, setCredenciales] = useState({
    tiene_dactilar: false,
    tiene_facial: false,
    tiene_pin: false
  });

  const API_BASE = 'https://9dm7dqf9-3002.usw3.devtunnels.ms';

  // Obtener datos del usuario autenticado
  useEffect(() => {
    const fetchUsuarioActual = async () => {
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setMessage({ type: 'error', text: 'No autenticado. Por favor inicia sesión.' });
          return;
        }

        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.success && data.data) {
          setUsuarioId(data.data.id);
          
          if (data.data.empleado_id) {
            setEmpleadoId(data.data.empleado_id);
            await loadCredenciales(data.data.empleado_id);
          } else {
            setMessage({ type: 'error', text: 'Solo los empleados pueden registrar credenciales biométricas' });
          }
        } else {
          setMessage({ type: 'error', text: 'Error al obtener datos del usuario' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error de conexión' });
      }
    };
    
    fetchUsuarioActual();
  }, []);

  // Cargar credenciales existentes
  const loadCredenciales = async (empId) => {
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/credenciales/empleado/${empId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.data) {
        setCredenciales(data.data);
      } else if (response.status === 404) {
        setCredenciales({
          tiene_dactilar: false,
          tiene_facial: false,
          tiene_pin: false
        });
      }
    } catch (error) {
    }
  };

  // Registrar huella dactilar
  const registrarHuella = async () => {
    if (!empleadoId) {
      setMessage({ type: 'error', text: 'No se encontró el empleado_id' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Simular conexión con lector biométrico
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular template de huella (en producción vendría del SDK del lector)
      const huellaTemplate = btoa(JSON.stringify({
        template: 'FINGERPRINT_MINUTIAE_' + Date.now(),
        quality: 95,
        timestamp: new Date().toISOString()
      }));
      

      // Enviar a la API
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/credenciales/dactilar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          dactilar: huellaTemplate
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '✅ Huella dactilar registrada correctamente' });
        await loadCredenciales(empleadoId);
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al guardar huella' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al registrar huella' });
    } finally {
      setLoading(false);
    }
  };

  // Registrar reconocimiento facial
  const registrarFacial = async () => {
    if (!empleadoId) {
      setMessage({ type: 'error', text: 'No se encontró el empleado_id' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Solicitar permiso de cámara
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      // Crear elemento de video
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Esperar a que el video esté listo
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          resolve();
        };
      });

      // Esperar 2 segundos para estabilizar la imagen
      await new Promise(resolve => setTimeout(resolve, 2000));

      
      // Capturar frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convertir a base64
      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      // Detener cámara
      stream.getTracks().forEach(track => {
        track.stop();
      });

      // Enviar a la API
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/credenciales/facial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          facial: fotoBase64
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '✅ Reconocimiento facial registrado correctamente' });
        await loadCredenciales(empleadoId);
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al guardar datos faciales' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.name === 'NotAllowedError' 
          ? 'Permiso de cámara denegado' 
          : 'Error al acceder a la cámara' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Registrar PIN
  const registrarPIN = async () => {
    if (!empleadoId) {
      setMessage({ type: 'error', text: 'No se encontró el empleado_id' });
      return;
    }


    const pin = prompt('Ingresa un PIN de 6 dígitos numéricos:');
    
    if (!pin) {
      return;
    }
    
    
    if (!/^\d{6}$/.test(pin)) {
      setMessage({ type: 'error', text: 'El PIN debe ser de 6 dígitos numéricos' });
      return;
    }


    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/credenciales/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          empleado_id: empleadoId,
          pin: pin
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '✅ PIN registrado correctamente' });
        await loadCredenciales(empleadoId);
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al guardar PIN' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al registrar PIN' });
    } finally {
      setLoading(false);
    }
  };

  // Eliminar credencial
  const eliminarCredencial = async (tipo) => {
    if (!window.confirm(`¿Estás seguro de eliminar ${tipo === 'dactilar' ? 'la huella dactilar' : tipo === 'facial' ? 'el reconocimiento facial' : 'el PIN'}?`)) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/credenciales/empleado/${empleadoId}?tipo=${tipo}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `✅ Credencial eliminada correctamente` });
        await loadCredenciales(empleadoId);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar credencial' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Credenciales Biométricas
          </h2>
          <p className="text-gray-600 mb-6">
            Registra tus métodos de autenticación para acceso rápido al sistema
          </p>

          {/* Mensajes */}
          {message.text && (
            <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border-2 border-green-200' : 'bg-red-50 text-red-800 border-2 border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Estado de credenciales */}
          {empleadoId && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
              <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Estado de tus credenciales
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-6 h-6 text-blue-600" />
                    <span className="font-medium">Huella dactilar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${credenciales.tiene_dactilar ? 'text-green-600' : 'text-gray-400'}`}>
                      {credenciales.tiene_dactilar ? '✓ Registrada' : '✗ No registrada'}
                    </span>
                    {credenciales.tiene_dactilar && (
                      <button
                        onClick={() => eliminarCredencial('dactilar')}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Camera className="w-6 h-6 text-purple-600" />
                    <span className="font-medium">Reconocimiento facial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${credenciales.tiene_facial ? 'text-green-600' : 'text-gray-400'}`}>
                      {credenciales.tiene_facial ? '✓ Registrado' : '✗ No registrado'}
                    </span>
                    {credenciales.tiene_facial && (
                      <button
                        onClick={() => eliminarCredencial('facial')}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="w-6 h-6 text-green-600" />
                    <span className="font-medium">PIN de seguridad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${credenciales.tiene_pin ? 'text-green-600' : 'text-gray-400'}`}>
                      {credenciales.tiene_pin ? '✓ Configurado' : '✗ No configurado'}
                    </span>
                    {credenciales.tiene_pin && (
                      <button
                        onClick={() => eliminarCredencial('pin')}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de registro */}
          <div className="space-y-3">
            <button
              onClick={registrarHuella}
              disabled={loading || !empleadoId}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Fingerprint className="w-6 h-6" />
                  {credenciales.tiene_dactilar ? 'Actualizar' : 'Registrar'} Huella Dactilar
                </>
              )}
            </button>

            <button
              onClick={registrarFacial}
              disabled={loading || !empleadoId}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  {credenciales.tiene_facial ? 'Actualizar' : 'Registrar'} Reconocimiento Facial
                </>
              )}
            </button>

            <button
              onClick={registrarPIN}
              disabled={loading || !empleadoId}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Lock className="w-6 h-6" />
                  {credenciales.tiene_pin ? 'Cambiar' : 'Configurar'} PIN
                </>
              )}
            </button>
          </div>

          {!empleadoId && !message.text && (
            <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded-xl border-2 border-yellow-200 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
              <span className="font-medium">Cargando información del empleado...</span>
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
          <p className="font-bold text-blue-800 mb-3 text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Información importante
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-1">•</span>
              <span>Registra al menos una credencial biométrica para acceso rápido al sistema</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold mt-1">•</span>
              <span>La huella dactilar requiere un lector biométrico compatible</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-1">•</span>
              <span>El reconocimiento facial usa la cámara de tu dispositivo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold mt-1">•</span>
              <span>El PIN es una alternativa rápida de 6 dígitos numéricos</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BiometricRegistration;