'use client';

import { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { GameForm } from './GameForm';
import { 
  GameWithDetails, 
  GameFormData,
  GameWithStats 
} from '../../../lib/types/game';

export interface GameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (game: GameWithDetails) => void;
  initialData?: Partial<GameWithDetails>;
  title: string;
  isEditing?: boolean;
}

export function GameFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  title,
  isEditing = false
}: GameFormModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (formData: GameFormData) => {
    setLoading(true);

    try {
      const url = isEditing && initialData?.id 
        ? `/api/admin/games/${initialData.id}`
        : '/api/admin/games';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el partido');
      }

      const result = await response.json();
      
      console.log('=== FRONTEND POST RESPONSE DEBUG ===');
      console.log('Full result from API:', result);
      console.log('result.data:', result.data);
      console.log('result.data.data:', result.data.data);
      console.log('result.data.data?.id:', result.data.data?.id);
      
      // The actual game data is in result.data.data, not result.data
      const gameData = result.data.data;
      
      // Transform the API response to match GameWithDetails
      const gameWithDetails: GameWithDetails = {
        ...gameData,
        current_players: gameData.current_players || 0,
        registrations: gameData.registrations || [],
        result: gameData.result || undefined,
        notifications: gameData.notifications || [],
        teams_balanced: false,
        revenue_total: gameData.total_revenue || 0,
        payment_completion_rate: gameData.current_players > 0 
          ? Math.round((gameData.registrations?.filter((r: any) => r.payment_status === 'paid').length || 0) / gameData.current_players * 100)
          : 0,
      };

      console.log('Transformed gameWithDetails:', gameWithDetails);
      console.log('Created game ID:', gameWithDetails.id);
      onSuccess(gameWithDetails);
    } catch (error) {
      // Error handling is done in the GameForm component
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isEditing, initialData?.id, onSuccess]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="p-6">
        <GameForm
          initialData={initialData}
          isEditing={isEditing}
          onSubmit={handleSubmit}
          onCancel={onClose}
          loading={loading}
        />
      </div>
    </Modal>
  );
}