'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { GameCard } from '../../components/games/GameCard';
import { GameFormModal } from '../../components/games/GameFormModal';
import { Badge } from '../../components/ui/Badge';
import { 
  GameWithDetails, 
  GameFilters, 
  GameSortOptions, 
  GAME_STATUS_LABELS,
  GameStatus 
} from '../../../lib/types/game';

interface GamesPageState {
  games: GameWithDetails[];
  loading: boolean;
  error: string | null;
  filters: GameFilters;
  sort: GameSortOptions;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  showCreateModal: boolean;
  selectedGame: GameWithDetails | null;
  showEditModal: boolean;
}

export default function GamesPage() {
  const router = useRouter();
  const [state, setState] = useState<GamesPageState>({
    games: [],
    loading: true,
    error: null,
    filters: {},
    sort: { field: 'game_date', direction: 'desc' },
    pagination: { page: 1, limit: 12, total: 0, hasMore: false },
    showCreateModal: false,
    selectedGame: null,
    showEditModal: false,
  });

  // Fetch games data
  const fetchGames = useCallback(async (resetPage = false) => {
    const page = resetPage ? 1 : state.pagination.page;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: state.pagination.limit.toString(),
        sort_by: state.sort.field,
        sort_order: state.sort.direction,
        ...Object.fromEntries(
          Object.entries(state.filters)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value.toString()])
        )
      });

      const response = await fetch(`/api/admin/games?${queryParams}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al cargar los partidos');
      }

      const result = await response.json();
      
      console.log('=== FRONTEND GET GAMES DEBUG ===');
      console.log('Frontend received result:', result);
      console.log('Frontend received result.data:', result.data);
      console.log('Frontend received result.data.data:', result.data.data);
      
      // The actual games array is in result.data.data, not result.data
      const actualGamesData = result.data.data;
      
      if (actualGamesData && actualGamesData.length > 0) {
        console.log('Frontend first game:', actualGamesData[0]);
        console.log('Frontend first game ID:', actualGamesData[0]?.id);
      }
      
      // Ensure actualGamesData is an array
      const gamesData = Array.isArray(actualGamesData) ? actualGamesData : [];
      
      console.log('Frontend games data after processing:', gamesData);
      console.log('Frontend games IDs:', gamesData.map(g => g?.id));
      
      setState(prev => ({
        ...prev,
        games: resetPage ? gamesData : [...prev.games, ...gamesData],
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore,
        },
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    }
  }, [state.filters, state.sort, state.pagination.page, state.pagination.limit]);

  // Initial load
  useEffect(() => {
    fetchGames(true);
  }, [state.filters, state.sort]);

  // Handle filter changes
  const handleFilterChange = (key: keyof GameFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      pagination: { ...prev.pagination, page: 1 },
    }));
  };

  // Handle sort changes
  const handleSortChange = (field: GameSortOptions['field']) => {
    setState(prev => ({
      ...prev,
      sort: {
        field,
        direction: prev.sort.field === field && prev.sort.direction === 'asc' ? 'desc' : 'asc'
      },
    }));
  };

  // Handle game creation
  const handleGameCreated = (game: GameWithDetails) => {
    console.log('Game created:', game?.id);
    setState(prev => ({
      ...prev,
      games: [game, ...prev.games],
      showCreateModal: false,
    }));
  };

  // Handle game update
  const handleGameUpdated = (game: GameWithDetails) => {
    setState(prev => ({
      ...prev,
      games: prev.games.map(g => g.id === game.id ? game : g),
      showEditModal: false,
      selectedGame: null,
    }));
  };

  // Handle game deletion (removes from UI)
  const handleGameDeleted = (gameId: string) => {
    setState(prev => ({
      ...prev,
      games: prev.games.filter(g => g.id !== gameId),
      pagination: {
        ...prev.pagination,
        total: Math.max(0, prev.pagination.total - 1),
      }
    }));
  };

  // Handle game edit
  const handleEditGame = (game: GameWithDetails) => {
    setState(prev => ({
      ...prev,
      selectedGame: game,
      showEditModal: true,
    }));
  };

  // Handle game view
  const handleViewGame = (game: GameWithDetails) => {
    router.push(`/admin/games/${game.id}`);
  };

  // Load more games
  const handleLoadMore = () => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: prev.pagination.page + 1 },
    }));
    fetchGames();
  };

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    ...Object.entries(GAME_STATUS_LABELS).map(([value, label]) => ({ value, label }))
  ];

  const sortOptions = [
    { value: 'game_date', label: 'Fecha del partido' },
    { value: 'title', label: 'Título' },
    { value: 'status', label: 'Estado' },
    { value: 'current_players', label: 'Jugadores registrados' },
    { value: 'created_at', label: 'Fecha de creación' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/admin/dashboard')}
                variant="ghost"
                size="sm"
                className="text-neutral-600 hover:text-neutral-900"
              >
                ← Dashboard
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
                  Gestión de Partidos
                </h1>
                <p className="text-neutral-600 mt-1">
                  Administra todos los partidos, registraciones y pagos
                </p>
              </div>
            </div>
            <Button
              onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
              variant="primary"
              className="w-full md:w-auto"
            >
              + Crear Partido
            </Button>
          </div>
        </div>
      </header>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros y Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <Input
                label="Buscar partidos"
                type="text"
                placeholder="Título o descripción..."
                value={state.filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />

              {/* Status Filter */}
              <Select
                label="Estado"
                value={state.filters.status?.[0] || ''}
                onChange={(e) => 
                  handleFilterChange('status', e.target.value ? [e.target.value as GameStatus] : undefined)
                }
                options={statusOptions}
              />

              {/* Date From */}
              <Input
                label="Desde fecha"
                type="date"
                value={state.filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />

              {/* Date To */}
              <Input
                label="Hasta fecha"
                type="date"
                value={state.filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>

            {/* Sort and Clear */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 pt-4 border-t">
              <Select
                label="Ordenar por"
                value={state.sort.field}
                onChange={(e) => handleSortChange(e.target.value as GameSortOptions['field'])}
                options={sortOptions}
                className="w-full sm:w-48"
              />

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, filters: {} }))}
                  className="flex-1 sm:flex-none"
                >
                  Limpiar filtros
                </Button>
                <Badge variant="secondary" className="self-center">
                  {state.pagination.total} partidos
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <div className="flex items-center">
              <span className="text-red-500 mr-2" aria-hidden="true">⚠</span>
              <p className="text-red-700">{state.error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchGames(true)}
                className="ml-auto"
              >
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.isArray(state.games) && state.games.map((game, index) => (
            <GameCard
              key={game.id || `game-${index}`}
              game={game}
              onView={() => handleViewGame(game)}
              onEdit={() => handleEditGame(game)}
              showActions
            />
          ))}
        </div>

        {/* Loading State */}
        {state.loading && (!Array.isArray(state.games) || state.games.length === 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white border border-neutral-200 rounded-lg p-6">
                  <div className="h-4 bg-neutral-200 rounded mb-4"></div>
                  <div className="h-3 bg-neutral-100 rounded mb-2"></div>
                  <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!state.loading && state.games.length === 0 && !state.error && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4" aria-hidden="true">⚽</div>
              <h3 className="text-xl font-semibold mb-2">No hay partidos</h3>
              <p className="text-neutral-600 mb-6">
                {Object.keys(state.filters).length > 0
                  ? 'No se encontraron partidos que coincidan con los filtros aplicados.'
                  : 'Comienza creando tu primer partido para organizar un encuentro con tus amigos.'
                }
              </p>
              {Object.keys(state.filters).length === 0 && (
                <Button
                  onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
                  variant="primary"
                >
                  Crear Primer Partido
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Load More */}
        {state.pagination.hasMore && !state.loading && (
          <div className="text-center mt-8">
            <Button
              onClick={handleLoadMore}
              variant="secondary"
              loading={state.loading}
              disabled={state.loading}
            >
              Cargar más partidos
            </Button>
          </div>
        )}

        {/* Loading more indicator */}
        {state.loading && state.games.length > 0 && (
          <div className="text-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      {state.showCreateModal && (
        <GameFormModal
          isOpen={state.showCreateModal}
          onClose={() => setState(prev => ({ ...prev, showCreateModal: false }))}
          onSuccess={handleGameCreated}
          title="Crear Nuevo Partido"
        />
      )}

      {/* Edit Game Modal */}
      {state.showEditModal && state.selectedGame && (
        <GameFormModal
          isOpen={state.showEditModal}
          onClose={() => setState(prev => ({ ...prev, showEditModal: false, selectedGame: null }))}
          onSuccess={handleGameUpdated}
          initialData={state.selectedGame}
          title="Editar Partido"
          isEditing
        />
      )}
    </div>
  );
}