import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export const ResponseTimeChart = () => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 20,
        grid: {
          color: '#f3f4f6',
          drawBorder: false,
        },
        border: { display: false },
        ticks: {
          callback: function(value: any) {
            return value + 'm';
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        border: { display: false }
      }
    },
    elements: {
      line: {
        tension: 0.4, // Smooth curve
      }
    }
  };

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'Response Time (mins)',
        data: [45, 42, 38, 41, 35, 30, 32],
        borderColor: '#0D9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        pointBackgroundColor: '#0D9488',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#0D9488',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  return (
    <Card className="border-none shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-900">Avg Response Time</CardTitle>
          <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">-12% vs last week</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <Line options={options} data={data} />
      </CardContent>
    </Card>
  );
};
