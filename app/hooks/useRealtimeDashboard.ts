'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardData } from '../../lib/types/api';

interface UseRealtimeDashboardOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function useRealtimeDashboard({
  refreshInterval = 30000, // 30 seconds
  autoRefresh = true
}: UseRealtimeDashboardOptions = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (isRequestInProgress || !autoRefresh) return; // Prevent concurrent requests and only run when autoRefresh is enabled
    
    setIsRequestInProgress(true);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/dashboard', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        setLastUpdated(new Date());
        setError(null); // Clear any previous errors
      } else {
        // Check if it's an authentication error
        if (response.status === 401) {
          setError('Sesión expirada. Redirigiendo...');
          // Don't continue polling if not authenticated
          return;
        } else {
          setError('Error al cargar datos del dashboard');
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setIsRequestInProgress(false);
    }
  }, [isRequestInProgress, autoRefresh]);

  // Initial data load - only when autoRefresh becomes true
  useEffect(() => {
    if (autoRefresh) {
      fetchDashboardData();
    }
  }, [autoRefresh]); // Remove fetchDashboardData from deps to prevent loops

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval]); // Remove fetchDashboardData from deps

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Simulate real-time updates for demo purposes
  // In a real implementation, this would use WebSocket connection
  useEffect(() => {
    if (!data || !autoRefresh) return;

    const simulateRealtimeUpdate = () => {
      // Simulate small changes in data for demo
      setData(currentData => {
        if (!currentData) return currentData;
        
        const updatedData = { ...currentData };
        
        // Simulate new registrations occasionally
        if (Math.random() < 0.1) { // 10% chance every 30 seconds
          updatedData.recent_registrations_count += 1;
          updatedData.quick_stats = {
            ...updatedData.quick_stats,
            new_players_this_week: updatedData.quick_stats.new_players_this_week + 1
          };
        }
        
        // Simulate payment completion occasionally
        if (Math.random() < 0.05 && updatedData.pending_payments_count > 0) { // 5% chance
          updatedData.pending_payments_count -= 1;
          updatedData.quick_stats = {
            ...updatedData.quick_stats,
            payment_completion_rate: Math.min(100, updatedData.quick_stats.payment_completion_rate + 2)
          };
        }
        
        return updatedData;
      });
    };

    const realtimeInterval = setInterval(simulateRealtimeUpdate, 15000); // Every 15 seconds
    return () => clearInterval(realtimeInterval);
  }, [data, autoRefresh]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh
  };
}