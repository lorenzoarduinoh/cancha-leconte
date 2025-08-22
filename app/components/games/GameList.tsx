'use client';

import { useState, useEffect, useMemo } from 'react';
import { GameCard } from './GameCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectOption } from '../ui/Select';
import { 
  GameWithDetails, 
  GameFilters, 
  GameSortOptions,
  GAME_STATUS_LABELS 
} from '../../../lib/types/game';

export interface GameListProps {
  games: GameWithDetails[];
  loading?: boolean;
  error?: string;
  onGameEdit?: (game: GameWithDetails) => void;
  onGameView?: (game: GameWithDetails) => void;
  onGameCancel?: (game: GameWithDetails) => void;
  onManageTeams?: (game: GameWithDetails) => void;
  onViewPayments?: (game: GameWithDetails) => void;
  onRefresh?: () => void;
  showFilters?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function GameList({
  games,
  loading = false,
  error,
  onGameEdit,
  onGameView,
  onGameCancel,
  onManageTeams,
  onViewPayments,
  onRefresh,
  showFilters = true,
  emptyMessage = 'No hay partidos para mostrar',
  className = ''
}: GameListProps) {
  const [filters, setFilters] = useState<GameFilters>({});
  const [sortOptions, setSortOptions] = useState<GameSortOptions>({
    field: 'game_date',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort games
  const filteredAndSortedGames = useMemo(() => {
    let filtered = [...games];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(game =>
        game.title.toLowerCase().includes(search) ||
        game.description?.toLowerCase().includes(search) ||
        game.registrations?.some(reg => 
          reg.player_name.toLowerCase().includes(search)
        )
      );
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(game => filters.status!.includes(game.status));
    }

    // Apply date range filter
    if (filters.date_from) {
      filtered = filtered.filter(game => 
        new Date(game.game_date) >= new Date(filters.date_from!)
      );
    }

    if (filters.date_to) {
      const endDate = new Date(filters.date_to);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(game => 
        new Date(game.game_date) <= endDate
      );
    }

    // Apply player count filters
    if (filters.min_players !== undefined) {
      filtered = filtered.filter(game => game.current_players >= filters.min_players!);
    }

    if (filters.max_players !== undefined) {
      filtered = filtered.filter(game => game.current_players <= filters.max_players!);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortOptions.field) {
        case 'game_date':
          valueA = new Date(a.game_date);
          valueB = new Date(b.game_date);
          break;
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'current_players':
          valueA = a.current_players;
          valueB = b.current_players;
          break;
        case 'created_at':
          valueA = new Date(a.created_at);
          valueB = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return sortOptions.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortOptions.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [games, filters, sortOptions, searchTerm]);

  const handleFilterChange = (key: keyof GameFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSortChange = (field: GameSortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const statusOptions: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    ...Object.entries(GAME_STATUS_LABELS).map(([value, label]) => ({
      value,
      label
    }))
  ];

  const sortFieldOptions: SelectOption[] = [
    { value: 'game_date', label: 'Fecha del partido' },
    { value: 'title', label: 'Título' },
    { value: 'status', label: 'Estado' },
    { value: 'current_players', label: 'Jugadores' },
    { value: 'created_at', label: 'Fecha de creación' },
  ];

  const hasActiveFilters = searchTerm.trim() || 
    filters.status?.length || 
    filters.date_from || 
    filters.date_to ||
    filters.min_players !== undefined ||
    filters.max_players !== undefined;

  if (error) {
    return (
      <div className={`game-list-error ${className}`} role="alert">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Error al cargar partidos</h3>
          <p className="text-red-700 mb-4">{error}</p>
          {onRefresh && (
            <Button variant="primary" onClick={onRefresh}>
              Reintentar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`game-list ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="game-list-filters mb-6 p-4 bg-neutral-50 rounded-lg" role="region" aria-label="Filtros de partidos">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar partidos, jugadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                aria-label="Buscar partidos"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <Select
                options={statusOptions}
                value={filters.status?.join(',') || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange('status', value ? [value] : undefined);
                }}
                aria-label="Filtrar por estado"
              />
            </div>

            {/* Sort */}
            <div className="w-full lg:w-48">
              <Select
                options={sortFieldOptions}
                value={sortOptions.field}
                onChange={(e) => handleSortChange(e.target.value as GameSortOptions['field'])}
                aria-label="Ordenar por"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              type="date"
              label="Desde"
              value={filters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
            />

            <Input
              type="date"
              label="Hasta"
              value={filters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
            />

            <Input
              type="number"
              label="Mín. jugadores"
              value={filters.min_players || ''}
              onChange={(e) => handleFilterChange('min_players', e.target.value ? parseInt(e.target.value) : undefined)}
              min={0}
            />

            <Input
              type="number"
              label="Máx. jugadores"
              value={filters.max_players || ''}
              onChange={(e) => handleFilterChange('max_players', e.target.value ? parseInt(e.target.value) : undefined)}
              min={0}
            />
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-neutral-600">
              {filteredAndSortedGames.length} de {games.length} partidos
              {hasActiveFilters && (
                <span className="ml-2 text-primary font-medium">
                  (filtrado)
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                aria-label="Limpiar filtros"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sort Direction Indicator */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-neutral-600">
            Ordenado por: {sortFieldOptions.find(opt => opt.value === sortOptions.field)?.label}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSortChange(sortOptions.field)}
            aria-label={`Cambiar orden a ${sortOptions.direction === 'asc' ? 'descendente' : 'ascendente'}`}
          >
            {sortOptions.direction === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4" role="status" aria-label="Cargando partidos">
          {[1, 2, 3].map((i) => (
            <div key={i} className="game-card skeleton h-48 rounded-lg" />
          ))}
        </div>
      )}

      {/* Games Grid */}
      {!loading && filteredAndSortedGames.length > 0 && (
        <div 
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          role="feed"
          aria-label="Lista de partidos"
        >
          {filteredAndSortedGames.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              onEdit={onGameEdit}
              onView={onGameView}
              onCancel={onGameCancel}
              onManageTeams={onManageTeams}
              onViewPayments={onViewPayments}
              aria-posinset={index + 1}
              aria-setsize={filteredAndSortedGames.length}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAndSortedGames.length === 0 && (
        <div className="text-center py-12" role="status">
          <div className="text-neutral-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-600 mb-2">
            {hasActiveFilters ? 'No se encontraron partidos' : emptyMessage}
          </h3>
          <p className="text-neutral-500 mb-4">
            {hasActiveFilters 
              ? 'Intenta ajustar los filtros para ver más resultados'
              : 'Cuando crees partidos, aparecerán aquí'
            }
          </p>
          {hasActiveFilters && (
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && !loading && (
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={onRefresh} aria-label="Actualizar lista de partidos">
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}