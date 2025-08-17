'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchWithCSRF } from '../../lib/utils/csrf';

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetchWithCSRF('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      router.push('/admin/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Validando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-primary">Cancha Leconte</h1>
            <p className="text-sm text-neutral-600">Panel de Administración</p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <Card variant="elevated" className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>¡Bienvenido al Panel de Administración!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 mb-4">
                Has iniciado sesión exitosamente en el sistema de gestión de Cancha Leconte.
                Desde aquí podrás gestionar partidos, jugadores y pagos.
              </p>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-primary-800 text-sm">
                  <strong>Nota:</strong> Esta es una implementación del sistema de autenticación.
                  Las demás funcionalidades del panel se implementarán en fases posteriores.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partidos Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-sm text-neutral-600">Sin partidos programados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jugadores Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary-600">0</div>
              <p className="text-sm text-neutral-600">Base de datos vacía</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-sm font-medium text-success">Operativo</span>
              </div>
              <p className="text-sm text-neutral-600 mt-2">Todos los sistemas funcionando</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}