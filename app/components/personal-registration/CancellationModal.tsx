'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading: boolean;
  playerName: string;
  gameTitle: string;
}


export function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  playerName,
  gameTitle,
}: CancellationModalProps) {
  const handleConfirm = async () => {
    await onConfirm(undefined); // No reason required
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancelar Registro">
      <div className="space-y-4">
        {/* Confirmation Step */}
        <div className="text-center space-y-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-neutral-900">
            ¿Estás seguro que quieres cancelar?
          </h3>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-left">
            <p className="text-sm text-neutral-600 mb-2">
              <strong>Jugador:</strong> {playerName}
            </p>
            <p className="text-sm text-neutral-600">
              <strong>Partido:</strong> {gameTitle}
            </p>
          </div>
          <p className="text-neutral-600 text-sm">
            Si cancelas tu registro, tu lugar quedará disponible para otros jugadores.
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleClose}
            variant="secondary"
            className="flex-1"
            disabled={isLoading}
          >
            No, mantener registro
          </Button>
          <Button
            onClick={handleConfirm}
            variant="destructive"
            className="flex-1"
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Cancelando...' : 'Sí, cancelar registro'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}