import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
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

export const OrderVolumeChart = () => {
  const [filter] = useState<'all' | 'completed'>('all');

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1400,
      easing: 'easeOutQuart' as const,
      delay: (context: any) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 70 + context.datasetIndex * 140;
        }
        return delay;
      },
    },
    transitions: {
      active: {
        animation: {
          duration: 350,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          pointStyle: 'circle',
          font: {
            size: 11,
            weight: 600,
            family: 'system-ui',
          },
          color: '#4B5563',
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#581C87',
        bodyColor: '#1E1B4B',
        borderColor: '#DDD6FE',
        borderWidth: 1.5,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        cornerRadius: 12,
        titleFont: { weight: 700, size: 12 },
        bodyFont: { size: 12, weight: 600 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3E8FF55',
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: { size: 11, weight: 600 },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const datasets = [
    {
      label: 'Total Orders',
      data: [65, 59, 80, 81, 56, 40, 35],
      backgroundColor: '#7E22CE', // Admin Deep Purple
      hoverBackgroundColor: '#6B21A8',
      borderRadius: 6,
      barPercentage: 0.62,
      categoryPercentage: 0.78,
    },
    {
      label: 'Completed',
      data: [50, 48, 60, 75, 45, 30, 28],
      backgroundColor: '#D8B4FE', // Admin Soft Lavender
      hoverBackgroundColor: '#C084FC',
      borderRadius: 6,
      barPercentage: 0.62,
      categoryPercentage: 0.78,
    },
  ];

  const data = {
    labels,
    datasets: filter === 'completed' ? [datasets[1]] : datasets,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="h-full"
    >
      <Card className="border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col bg-white overflow-hidden relative group">
        {/* Top subtle purple accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 shadow-2xs">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Order Volume
                </CardTitle>
                <p className="text-xs text-gray-500 font-medium">Daily assigned vs fulfilled requests</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 text-[11px] font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <span>SLA 94.8%</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-[300px] pt-2">
          <Bar options={options} data={data} />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OrderVolumeChart;
