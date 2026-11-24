import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { PieChart, Layers } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export const CategoryMixChart = () => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1600,
      easing: 'easeOutCirc' as const,
    },
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 18,
          font: {
            size: 11,
            weight: 600,
            family: 'system-ui',
          },
          color: '#4B5563',
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
            const label = context.label || '';
            const value = context.parsed || 0;
            return ` ${label}: ${value}% share`;
          },
        },
      },
    },
    cutout: '72%',
    borderWidth: 2,
  };

  const data = {
    labels: ['Cleaning', 'Plumbing', 'Electrical', 'HVAC', 'Pest Control', 'Other'],
    datasets: [
      {
        data: [35, 20, 15, 15, 10, 5],
        backgroundColor: [
          '#6B21A8', // Deep Royal Purple
          '#7E22CE', // Vibrant Purple
          '#9333EA', // Electric Violet
          '#6366F1', // Indigo Accent
          '#A855F7', // Lilac Purple
          '#E9D5FF', // Soft Lavender
        ],
        hoverBackgroundColor: [
          '#581C87',
          '#6B21A8',
          '#7E22CE',
          '#4F46E5',
          '#9333EA',
          '#D8B4FE',
        ],
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="h-full"
    >
      <Card className="border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col bg-white overflow-hidden relative group">
        {/* Top subtle purple accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-700" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 shadow-2xs">
                <PieChart className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Category Mix
                </CardTitle>
                <p className="text-xs text-gray-500 font-medium">Service domain distribution</p>
              </div>
            </div>

            <span className="flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/80 shadow-2xs">
              <Layers className="w-3 h-3 text-purple-600" />
              6 Disciplines
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-[300px] flex items-center justify-center relative pt-2">
          {/* Animated Center Metric Badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-[120px]">
            <motion.div
              animate={{
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-center bg-purple-50/60 rounded-full p-4 border border-purple-100/80 shadow-2xs"
            >
              <span className="block text-3xl font-extrabold text-purple-950 tracking-tight">412</span>
              <span className="block text-[11px] font-bold text-purple-700 uppercase tracking-wider">Total Requests</span>
            </motion.div>
          </div>

          <Doughnut options={options} data={data} />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CategoryMixChart;
