"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

interface AnimatedAreaChartProps {
  data: Array<{ name: string; total: number }>;
  height?: number;
  delay?: number;
}

export function AnimatedAreaChart({ data, height = 200, delay = 0 }: AnimatedAreaChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, "Revenue"]}
          />
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke="#0ea5e9" 
            strokeWidth={2}
            fill="url(#colorRevenue)"
            animationDuration={1000}
            animationBegin={delay * 1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

interface AnimatedBarChartProps {
  data: Array<{ stage: string; count: number }>;
  height?: number;
  delay?: number;
}

export function AnimatedBarChart({ data, height = 200, delay = 0 }: AnimatedBarChartProps) {
  const colors = ['#0ea5e9', '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e'];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
          <XAxis 
            dataKey="stage" 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
          />
          <Bar 
            dataKey="count" 
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
            animationBegin={delay * 1000}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.stage === 'WON' ? '#22c55e' : colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

interface FunnelStageProps {
  stage: string;
  count: number;
  value: number;
  index: number;
  total: number;
  maxValue: number;
}

function FunnelStage({ stage, count, value, index, total, maxValue }: FunnelStageProps) {
  const width = Math.max((value / maxValue) * 100, 70);
  const isLast = index === total - 1;
  
  const colors = [
    { bg: 'from-blue-500 to-blue-600', text: 'text-white' },
    { bg: 'from-blue-400 to-blue-500', text: 'text-white' },
    { bg: 'from-cyan-400 to-cyan-500', text: 'text-white' },
    { bg: 'from-teal-400 to-teal-500', text: 'text-white' },
    { bg: 'from-green-500 to-green-600', text: 'text-white' },
  ];
  
  const color = colors[index] || colors[0];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className="flex flex-col items-center gap-1"
    >
      <motion.div 
        className="w-full flex justify-center"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div 
          className={cn(
            `bg-gradient-to-r ${color.bg} shadow-md relative`,
            isLast 
              ? 'clip-path-trapezoid-end'
              : 'clip-path-trapezoid'
          )}
          style={{ 
            width: `${width}%`,
            clipPath: isLast 
              ? 'polygon(8% 0%, 92% 0%, 85% 100%, 15% 100%)'
              : 'polygon(3% 0%, 97% 0%, 92% 100%, 8% 100%)'
          }}
        >
          <div className={cn("flex items-center justify-center gap-2 px-6 py-3.5", color.text)}>
            <span className="text-sm font-medium">{stage}</span>
            <span className="text-sm font-bold">({count})</span>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.2 }}
        className="text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        ₹{(value / 100000).toFixed(1)}L
      </motion.div>
    </motion.div>
  );
}

interface AnimatedFunnelChartProps {
  data: Array<{ stage: string; count: number; value: number }>;
  delay?: number;
}

export function AnimatedFunnelChart({ data, delay = 0 }: AnimatedFunnelChartProps) {
  const maxValue = data[0]?.value || 1;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="space-y-3 py-2"
    >
      {data.map((stage, idx) => (
        <FunnelStage
          key={stage.stage}
          stage={stage.stage}
          count={stage.count}
          value={stage.value}
          index={idx}
          total={data.length}
          maxValue={maxValue}
        />
      ))}
    </motion.div>
  );
}

interface AnimatedLineChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  delay?: number;
}

export function AnimatedLineChart({ data, height = 200, delay = 0 }: AnimatedLineChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6, fill: '#a855f7' }}
            animationDuration={1000}
            animationBegin={delay * 1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// Animated Progress Ring for circular metrics
interface AnimatedProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  delay?: number;
  label?: string;
}

export function AnimatedProgressRing({ 
  percentage, 
  size = 120, 
  strokeWidth = 8,
  delay = 0,
  label = "" 
}: AnimatedProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
      className="relative inline-flex items-center justify-center"
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            delay: delay + 0.2,
            duration: 1,
            ease: "easeOut",
          }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {percentage}%
        </span>
        {label && (
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {label}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
