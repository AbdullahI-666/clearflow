import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const DemandByZoneChart = () => {
  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.x !== null) {
              label += context.parsed.x;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          color: '#f3f4f6',
        },
        border: { display: false }
      },
      y: {
        stacked: true,
        grid: {
          display: false,
        },
        border: { display: false }
      },
    },
  };

  const labels = ['DHA', 'Gulberg', 'Johar Town', 'Bahria Town', 'Model Town', 'Cantt'];

  const data = {
    labels,
    datasets: [
      {
        label: 'Actual Demand',
        data: [120, 95, 80, 70, 65, 45],
        backgroundColor: '#0D9488',
        borderRadius: 4,
      },
      {
        label: 'ML Forecast (Next 7 days)',
        data: [30, 25, 40, 15, 20, 10],
        backgroundColor: '#D1FAE5', // Light emerald
        borderRadius: 4,
      },
    ],
  };

  return (
    <Card className="border-none shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">Demand by Zone & ML Forecast</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <Bar options={options} data={data} />
      </CardContent>
    </Card>
  );
};
