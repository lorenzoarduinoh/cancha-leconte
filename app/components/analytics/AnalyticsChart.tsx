'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export interface AnalyticsChartProps {
  title: string;
  data: any[];
  type?: 'line' | 'bar' | 'pie';
  className?: string;
}

export function AnalyticsChart({ 
  title, 
  data, 
  type = 'bar', 
  className = '' 
}: AnalyticsChartProps) {
  // This is a placeholder component for charts
  // In a real implementation, you would integrate with a charting library like Chart.js, Recharts, etc.
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center bg-neutral-50 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2" aria-hidden="true">📊</div>
            <p className="text-neutral-600">
              Gráfico {type} próximamente
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {data.length} elementos de datos
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}