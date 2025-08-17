'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { loginSchema, type LoginFormData, AUTH_ERROR_MESSAGES } from '../../lib/validations/auth';
import { initializeCSRF, fetchWithCSRF } from '../../lib/utils/csrf';

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [csrfLoading, setCsrfLoading] = useState(true);
  
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setError: setFormError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  // Initialize CSRF token on component mount
  useEffect(() => {
    const initCSRF = async () => {
      try {
        const token = await initializeCSRF();
        if (token) {
          setCsrfToken(token);
        }
      } catch (error) {
        console.error('Failed to initialize CSRF token:', error);
      } finally {
        setCsrfLoading(false);
      }
    };

    initCSRF();
  }, []);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError('');

    try {
      // Ensure CSRF token is available
      if (!csrfToken) {
        throw new Error('Token de seguridad no disponible. Recarga la página e inténtalo de nuevo.');
      }

      const response = await fetchWithCSRF('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username.trim(),
          password: data.password,
          remember_me: data.rememberMe,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        const errorCode = result.code;
        let errorMessage: string = AUTH_ERROR_MESSAGES.UNKNOWN_ERROR;

        if (errorCode && errorCode in AUTH_ERROR_MESSAGES) {
          errorMessage = AUTH_ERROR_MESSAGES[errorCode as keyof typeof AUTH_ERROR_MESSAGES];
        } else if (result.error) {
          errorMessage = result.error;
        }

        throw new Error(errorMessage);
      }

      // Show success state briefly
      setShowSuccess(true);
      
      // Redirect to admin dashboard after success animation
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 750);

    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_ERROR_MESSAGES.NETWORK_ERROR);
      
      // Add shake animation to form
      const loginCard = document.querySelector('.login-card');
      if (loginCard) {
        loginCard.classList.add('shake-animation');
        setTimeout(() => {
          loginCard.classList.remove('shake-animation');
        }, 300);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (showSuccess) {
      return (
        <>
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          ¡Éxito!
        </>
      );
    }
    
    if (csrfLoading) {
      return 'Cargando...';
    }
    
    return isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión';
  };

  return (
    <div className="login-container">
      {/* Skip Link for accessibility */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      
      <div className="w-full max-w-md mx-auto" id="main-content">
        {/* Brand Section */}
        <div className="text-center mb-8">
          <h1 className="brand-title">Cancha Leconte</h1>
        </div>

        {/* Login Card */}
        <Card variant="elevated" className="login-card">
          <CardHeader>
            <CardTitle as="h2" id="login-heading" className="text-center">
              Iniciar Sesión
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* Error Message */}
            {error && (
              <div id="form-error" className="error-message" role="alert" aria-live="polite">
                <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="error-text">{error}</span>
              </div>
            )}

            <form 
              onSubmit={handleSubmit(onSubmit)} 
              role="form" 
              aria-labelledby="login-heading"
              aria-describedby={error ? "form-error" : undefined}
              noValidate
            >
              <div className="space-y-4">
                {/* Username Field */}
                <Input
                  id="username"
                  type="text"
                  label="Usuario"
                  placeholder=""
                  {...register('username')}
                  error={errors.username?.message}
                  disabled={isLoading || showSuccess}
                  helperText="Ingresa tu nombre de usuario"
                  autoComplete="username"
                  aria-required="true"
                />

                {/* Password Field */}
                <Input
                  id="password"
                  type="password"
                  label="Contraseña"
                  placeholder="Tu contraseña"
                  {...register('password')}
                  error={errors.password?.message}
                  disabled={isLoading || showSuccess}
                  showPasswordToggle
                  autoComplete="current-password"
                  aria-required="true"
                />

                {/* Remember Me Checkbox */}
                <div className="checkbox-field" role="group" aria-labelledby="remember-me-label">
                  <label className="checkbox-container" id="remember-me-label">
                    <input
                      type="checkbox"
                      className="checkbox"
                      {...register('rememberMe')}
                      disabled={isLoading || showSuccess}
                      aria-describedby="remember-me-description"
                    />
                    <span className="checkbox-label">Mantenerme conectado</span>
                    <span id="remember-me-description" className="sr-only">
                      Mantiene tu sesión activa por 24 horas en lugar de 2 horas
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  loading={isLoading}
                  disabled={isLoading || showSuccess || !isValid || csrfLoading}
                  className={`w-full ${showSuccess ? 'btn-success' : ''}`}
                  aria-describedby={isLoading ? "loading-message" : undefined}
                >
                  {getButtonContent()}
                  {isLoading && (
                    <span id="loading-message" className="sr-only">
                      Procesando inicio de sesión, por favor espera
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}