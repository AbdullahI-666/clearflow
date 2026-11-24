import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { MapPin, Sparkles } from 'lucide-react';
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
    animation: {
      duration: 1400,
      easing: 'easeOutQuart' as const,
      delay: (context: any) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 75 + context.datasetIndex * 150;
        }
        return delay;
      },
    },
    transitions: {
      active: {
        animation: {
          duration: 300,
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
        cornerRadius: 12,
        titleFont: { weight: 700, size: 12 },
        bodyFont: { size: 12, weight: 600 },
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.x !== null) {
              label += `${context.parsed.x} work orders`;
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          color: '#F3E8FF55',
        },
        border: { display: false },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
        },
      },
      y: {
        stacked: true,
        grid: {
          display: false,
        },
        border: { display: false },
        ticks: {
          color: '#4B5563',
          font: { size: 11, weight: 600 },
        },
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
        backgroundColor: '#7E22CE', // Admin Deep Purple
        hoverBackgroundColor: '#6B21A8',
        borderRadius: 5,
        barPercentage: 0.68,
        categoryPercentage: 0.78,
      },
      {
        label: 'ML Forecast (Next 7 days)',
        data: [30, 25, 40, 15, 20, 10],
        backgroundColor: '#D8B4FE', // Admin Lavender
        hoverBackgroundColor: '#C084FC',
        borderRadius: 5,
        barPercentage: 0.68,
        categoryPercentage: 0.78,
      },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="h-full"
    >
      <Card className="border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col bg-white overflow-hidden relative group">
        {/* Top subtle purple accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-600 to-fuchsia-500" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 shadow-2xs">
                <MapPin className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Demand by Zone & ML Forecast
                </CardTitle>
                <p className="text-xs text-gray-500 font-medium">Zone volume with forward 7-day projection</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 text-[11px] font-bold shadow-2xs">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>AI Forecast Active</span>
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

export default DemandByZoneChart;
