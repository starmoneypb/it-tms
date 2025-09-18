"use client";

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  '#667eea', // Purple-blue
  '#f093fb', // Pink
  '#4facfe', // Light blue
  '#43e97b', // Green
  '#f5576c', // Red
  '#feca57', // Yellow
  '#ff9ff3', // Light pink
  '#54a0ff', // Blue
  '#5f27cd', // Dark purple
  '#00d2d3'  // Teal
];

type ChartData = {
  name: string;
  value: number;
};

type ChartJsPieChartProps = {
  data: ChartData[];
  title: string;
};

// Function to convert labels to readable format with smart abbreviations
function toPascalCase(str: string): string {
  // Handle specific cases for better readability and space efficiency
  const abbreviations: Record<string, string> = {
    'service_request_general': 'Service General',
    'service_request_data_correction': 'Data Correction',
    'service_request_data_extraction': 'Data Extraction', 
    'service_request_advisory': 'Service Advisory',
    'change_request_normal': 'Change Request',
    'issue_report': 'Issue Report',
    'in_progress': 'In Progress'
  };
  
  // Check if we have a specific abbreviation
  if (abbreviations[str.toLowerCase()]) {
    return abbreviations[str.toLowerCase()];
  }
  
  // Default Pascal Case with spacing
  return str
    .toLowerCase()
    .replace(/[_\s]+(.)?/g, (_, char) => char ? ` ${char.toUpperCase()}` : '')
    .replace(/^(.)/, (_, char) => char.toUpperCase());
}

export default function ChartJsPieChart({ data, title }: ChartJsPieChartProps) {
  // Ensure data is valid and numeric, and format labels to Pascal Case
  const validData = data
    .filter(item => item.value > 0)
    .map(item => ({
      name: item.name,
      displayName: toPascalCase(item.name), // Add formatted display name
      value: Number(item.value) || 0
    }));

  const total = validData.reduce((sum, item) => sum + item.value, 0);

  if (validData.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="text-lg mb-2 text-gray-400 font-semibold flex items-center justify-center gap-2">
            <BarChart3 size={20} />
            No Data
          </div>
          <p className="text-white/50">No data available</p>
          <p className="text-white/30 text-sm mt-1">Charts will appear when tickets are created</p>
        </div>
      </div>
    );
  }

  // Prepare data for Chart.js
  const chartData = {
    labels: validData.map(item => item.displayName), // Use formatted display names
    datasets: [
      {
        data: validData.map(item => item.value),
        backgroundColor: COLORS.slice(0, validData.length),
        borderColor: COLORS.slice(0, validData.length).map(color => color + '80'), // Add transparency
        borderWidth: 1,
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff'
      }
    ]
  };

  // Chart options
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // We'll create custom legend below
      },
      tooltip: {
        backgroundColor: 'rgba(15, 22, 41, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} tickets (${percentage}%)`;
          }
        }
      }
    },
    cutout: '30%', // Makes it a doughnut chart (more modern look)
    animation: {
      animateRotate: true,
      animateScale: false
    }
  };

  return (
    <div className="w-full h-80 flex flex-col">
      {/* Chart Container */}
      <div className="flex-1 relative" style={{ minHeight: '240px' }}>
        <Doughnut data={chartData} options={options} />
      </div>
      
      {/* Custom Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {validData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2 min-w-0">
            <div 
              className="w-3 h-3 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-white/80 truncate">
              {entry.displayName}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
