import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export const CategoryMixChart = () => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
    },
    cutout: '70%',
    borderWidth: 0,
  };

  const data = {
    labels: ['Cleaning', 'Plumbing', 'Electrical', 'HVAC', 'Pest Control', 'Other'],
    datasets: [
      {
        data: [35, 20, 15, 15, 10, 5],
        backgroundColor: [
          '#0D9488', // Teal
          '#10B981', // Emerald
          '#3B82F6', // Blue
          '#F59E0B', // Amber
          '#8B5CF6', // Purple
          '#9CA3AF', // Gray
        ],
        hoverOffset: 4,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  return (
    <Card className="border-none shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">Category Mix</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px] flex items-center justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-[120px]">
          <div className="text-center">
            <span className="block text-3xl font-bold text-gray-900">412</span>
            <span className="block text-xs text-gray-500">Total Requests</span>
          </div>
        </div>
        <Doughnut options={options} data={data} />
      </CardContent>
    </Card>
  );
};
