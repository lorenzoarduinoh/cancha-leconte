'use client';

import React from 'react';
import { Card, CardContent } from '@/app/components/ui/Card';

// Payment Status Icons
const MoneyIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const CheckIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const ClockIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

interface PaymentStatusCardProps {
  paidAmount: number;
  pendingAmount: number;
  paidPlayersCount: number;
  pendingPlayersCount: number;
  totalPlayersCount: number;
  className?: string;
  style?: React.CSSProperties;
}

export const PaymentStatusCard: React.FC<PaymentStatusCardProps> = ({
  paidAmount,
  pendingAmount,
  paidPlayersCount,
  pendingPlayersCount,
  totalPlayersCount,
  className = '',
  style,
}) => {
  // Calculate percentage paid
  const totalAmount = paidAmount + pendingAmount;
  const percentagePaid = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  // Format currency in es-AR locale
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Create a more subtle circular progress ring (closer to screenshot)
  const progressDegrees = percentagePaid * 3.6;
  
  return (
    <Card 
      className={`shadow-sm border-neutral-200 rounded-xl bg-white ${className}`} 
      style={{ height: '400px', ...style }}
    >
      <CardContent className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
            <MoneyIcon size={18} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Estado de Pagos</h3>
        </div>

        <div className="flex-1 flex flex-col" style={{ paddingTop: '8px' }}>
        {/* Central Progress Ring */}
        <div className="flex justify-center flex-1 items-center" style={{ marginTop: '-16px' }}>
          <div className="relative">
            {/* Background circle */}
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
              {/* Progress ring overlay */}
              <svg 
                className="absolute inset-0 w-24 h-24 -rotate-90" 
                viewBox="0 0 96 96"
                style={{ transform: 'rotate(-90deg)' }}
              >
                {/* Background ring */}
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="7"
                />
                {/* Progress ring */}
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${226.19 * (percentagePaid / 100)} 226.19`}
                  className="circularProgressAnimate"
                  style={{
                    '--target-dash': `${226.19 * (percentagePaid / 100)} 226.19`,
                    '--delay': '600ms'
                  } as React.CSSProperties}
                />
              </svg>
              
              {/* Center content */}
              <div className="relative z-10 flex flex-col items-center justify-center scaleInBounce" style={{ '--delay': '800ms' } as React.CSSProperties}>
                <span className="text-2xl font-bold text-gray-900 leading-none">{percentagePaid}%</span>
                <span className="text-xs text-gray-500 font-medium mt-0.5">Pagado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards - positioned at bottom */}
        <div className="space-y-4 mt-auto" style={{ marginTop: '8px' }}>
          {/* Recaudado (Collected) */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3 flex items-center justify-between" style={{ height: '68px', marginTop: '-8px', '--delay': '1000ms' } as React.CSSProperties}>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center border border-green-200 flex-shrink-0">
                <svg className="w-[16px] h-[16px] text-green-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <span className="text-base font-medium text-green-700">Recaudado</span>
            </div>
            <div className="text-right ml-4">
              <div className="text-xl font-bold text-green-700 leading-tight">
                {formatCurrency(paidAmount)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {paidPlayersCount} de {totalPlayersCount} jugadores
              </div>
            </div>
          </div>

          {/* Pendiente (Pending) */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-3 flex items-center justify-between" style={{ height: '68px', '--delay': '1200ms' } as React.CSSProperties}>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center border border-amber-200 flex-shrink-0">
                <svg className="w-[16px] h-[16px] text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 6v6l4 2"/>
                  <path d="M20 12v5"/>
                  <path d="M20 21h.01"/>
                  <path d="M21.25 8.2A10 10 0 1 0 16 21.16"/>
                </svg>
              </div>
              <span className="text-base font-medium text-amber-700">Pendiente</span>
            </div>
            <div className="text-right ml-4">
              <div className="text-xl font-bold text-amber-700 leading-tight">
                {formatCurrency(pendingAmount)}
              </div>
              <div className="text-xs text-amber-600 mt-1">
                {pendingPlayersCount} jugadores
              </div>
            </div>
          </div>
        </div>

        {/* Accessibility - Screen reader announcements */}
        <div className="sr-only" aria-live="polite">
          Estado de pagos: {percentagePaid}% completado. 
          Recaudado: {formatCurrency(paidAmount)} de {paidPlayersCount} jugadores. 
          Pendiente: {formatCurrency(pendingAmount)} de {pendingPlayersCount} jugadores.
        </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentStatusCard;