'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';

interface ActivityEvent {
  id: string;
  type: 'game_created' | 'game_updated' | 'player_registered' | 'player_unregistered' | 
        'team_assigned' | 'payment_received' | 'payment_failed' | 'game_cancelled' | 
        'notification_sent' | 'manual_note';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  created_by?: string;
  admin_name?: string;
}


export interface GameActivityProps {
  gameId: string;
  onRefresh?: () => void;
}

interface ActivityState {
  events: ActivityEvent[];
  loading: boolean;
  error: string | null;
  showAddNote: boolean;
  newNote: string;
  noteLoading: boolean;
}

export function GameActivity({ gameId, onRefresh }: GameActivityProps) {
  const [state, setState] = useState<ActivityState>({
    events: [],
    loading: true,
    error: null,
    showAddNote: false,
    newNote: '',
    noteLoading: false,
  });

  // Fetch activity events
  const fetchActivity = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/activity`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al cargar la actividad');
      }

      const result = await response.json();
      setState(prev => ({
        ...prev,
        events: result.data || [],
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [gameId]);

  // Initial load
  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Add manual note
  const handleAddNote = async () => {
    if (!state.newNote.trim()) return;

    setState(prev => ({ ...prev, noteLoading: true }));

    try {
      const response = await fetch(`/api/admin/games/${gameId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ note: state.newNote.trim() }),
      });

      if (!response.ok) {
        throw new Error('Error al agregar la nota');
      }

      setState(prev => ({
        ...prev,
        showAddNote: false,
        newNote: '',
        noteLoading: false,
      }));

      await fetchActivity(); // Refresh activity
    } catch (error) {
      alert('Error al agregar nota: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      setState(prev => ({ ...prev, noteLoading: false }));
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`;
    
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'game_created': return '🆕';
      case 'game_updated': return '✏️';
      case 'player_registered': return '➕';
      case 'player_unregistered': return '➖';
      case 'team_assigned': return '⚽';
      case 'payment_received': return '💰';
      case 'payment_failed': return '❌';
      case 'game_cancelled': return '🚫';
      case 'notification_sent': return '📱';
      case 'manual_note': return '📝';
      default: return '📋';
    }
  };

  const getEventColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'game_created': return 'bg-success/10 text-success';
      case 'game_updated': return 'bg-info/10 text-info';
      case 'player_registered': return 'bg-primary/10 text-primary';
      case 'player_unregistered': return 'bg-warning/10 text-warning';
      case 'team_assigned': return 'bg-secondary/10 text-secondary';
      case 'payment_received': return 'bg-success/10 text-success';
      case 'payment_failed': return 'bg-error/10 text-error';
      case 'game_cancelled': return 'bg-error/10 text-error';
      case 'notification_sent': return 'bg-info/10 text-info';
      case 'manual_note': return 'bg-neutral/10 text-neutral';
      default: return 'bg-neutral/10 text-neutral';
    }
  };

  if (state.loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                  <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            
            <Button
              variant="secondary"
              onClick={() => setState(prev => ({ ...prev, showAddNote: true }))}
              className="flex-1 sm:flex-none"
            >
              📝 Agregar Nota
            </Button>
            
            <Button
              variant="ghost"
              onClick={fetchActivity}
              disabled={state.loading}
              className="flex-1 sm:flex-none"
            >
              🔄 Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" role="alert">
              <div className="flex items-center">
                <span className="text-red-500 mr-2" aria-hidden="true">⚠</span>
                <p className="text-red-700">{state.error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchActivity}
                  className="ml-auto"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {state.events.length === 0 && !state.loading && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4" aria-hidden="true">📋</div>
              <h3 className="text-xl font-semibold mb-2">Sin actividad</h3>
              <p className="text-neutral-600">
                La actividad del partido aparecerá aquí
              </p>
            </div>
          )}

          <div className="space-y-6">
            {state.events.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {index < state.events.length - 1 && (
                  <div className="absolute left-5 top-12 w-0.5 h-6 bg-neutral-200" />
                )}
                
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-neutral-900">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {event.admin_name && (
                          <Badge variant="neutral" size="sm">
                            {event.admin_name}
                          </Badge>
                        )}
                        <span className="text-sm text-neutral-500">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    {event.description && (
                      <p className="text-neutral-600 mb-2">
                        {event.description}
                      </p>
                    )}
                    
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="bg-neutral-50 rounded-lg p-3 mt-2">
                        <pre className="text-sm text-neutral-700 whitespace-pre-wrap">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Note Modal */}
      {state.showAddNote && (
        <Modal
          isOpen={state.showAddNote}
          onClose={() => setState(prev => ({ ...prev, showAddNote: false, newNote: '' }))}
          title="Agregar Nota"
          size="md"
        >
          <div className="space-y-4">
            <Textarea
              label="Nota"
              value={state.newNote}
              onChange={(e) => setState(prev => ({ ...prev, newNote: e.target.value }))}
              placeholder="Escribe una nota sobre el partido..."
              rows={4}
              maxLength={500}
              showCharCount
            />
            
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setState(prev => ({ ...prev, showAddNote: false, newNote: '' }))}
                disabled={state.noteLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAddNote}
                loading={state.noteLoading}
                disabled={!state.newNote.trim()}
              >
                Agregar Nota
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}