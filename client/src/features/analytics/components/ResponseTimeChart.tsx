import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { Clock, TrendingDown } from 'lucide-react';
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
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const,
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
        display: false,
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
            return ` Avg Response: ${context.parsed.y} mins`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 20,
        grid: {
          color: '#F3E8FF55',
        },
        border: { display: false },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
          callback: function (value: any) {
            return value + 'm';
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        border: { display: false },
        ticks: {
          color: '#6B7280',
          font: { size: 11, weight: 600 },
        },
      },
    },
    elements: {
      line: {
        tension: 0.42, // Smooth, organic curve
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'Response Time (mins)',
        data: [45, 42, 38, 41, 35, 30, 32],
        borderColor: '#9333EA', // Admin Purple 600
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(147, 51, 234, 0.28)');
          gradient.addColorStop(0.7, 'rgba(147, 51, 234, 0.08)');
          gradient.addColorStop(1, 'rgba(147, 51, 234, 0.0)');
          return gradient;
        },
        pointBackgroundColor: '#7E22CE',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#FFFFFF',
        pointHoverBorderColor: '#7E22CE',
        pointHoverBorderWidth: 3,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
      },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="h-full"
    >
      <Card className="border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col bg-white overflow-hidden relative group">
        {/* Top subtle purple accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400" />

        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 shadow-2xs">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Avg Response Time
                </CardTitle>
                <p className="text-xs text-gray-500 font-medium">Incident response velocity</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/80 shadow-2xs">
              <TrendingDown className="w-3.5 h-3.5 text-purple-600" />
              <span>-12% vs last week</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-[300px] pt-2">
          <Line options={options} data={data} />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ResponseTimeChart;
