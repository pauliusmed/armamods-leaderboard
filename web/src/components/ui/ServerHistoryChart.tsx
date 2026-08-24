/**
 * Server history chart — isolated for React.lazy code splitting.
 * Recharts loads only when this component mounts (shared chunk with ModHistoryChart).
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { uptimeTooltipLabel, type ServerHistoryPoint } from '../../lib/serverUptimeChart';
import type { SyncGap } from './chartTypes';

export interface OfflineBand {
  x1: string;
  x2: string;
}

export interface ServerHistoryChartProps {
  chartHistory: ServerHistoryPoint[];
  syncGaps: SyncGap[];
  offlineBands: OfflineBand[];
  selectedDays: number;
  isMobileChart: boolean;
}

export default function ServerHistoryChart({
  chartHistory,
  syncGaps,
  offlineBands,
  selectedDays,
  isMobileChart,
}: ServerHistoryChartProps) {
  return (
    <div className="flex-1 min-h-0 min-w-0 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartHistory}
          margin={{
            top: 8,
            right: isMobileChart ? 4 : 8,
            left: isMobileChart ? 4 : 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          {syncGaps.map((gap) => (
            <ReferenceArea
              key={`sync-gap-${gap.x1}-${gap.x2}`}
              x1={gap.x1}
              x2={gap.x2}
              yAxisId="rank"
              fill="#f59e0b"
              fillOpacity={0.12}
              stroke="#f59e0b"
              strokeOpacity={0.35}
              ifOverflow="visible"
            />
          ))}
          {offlineBands.map((band, i) => (
            <ReferenceArea
              key={`offline-${i}`}
              x1={band.x1}
              x2={band.x2}
              yAxisId="rank"
              fill="rgb(244 63 94 / 0.15)"
              stroke="rgb(244 63 94 / 0.3)"
              strokeOpacity={0.4}
              ifOverflow="extendDomain"
            />
          ))}
          <XAxis
            dataKey="time"
            stroke="#666"
            tickFormatter={(tick) => {
              if (!tick) return '';
              if (tick.length === 10 && tick.includes('-')) {
                const parts = tick.split('-');
                return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
              }
              const d = new Date(tick);
              if (selectedDays === 1) {
                return `${d.getHours().toString().padStart(2, '0')}:00`;
              }
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
            tick={{ fontSize: isMobileChart ? 9 : 10, fill: '#666', fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
            minTickGap={isMobileChart ? 24 : 16}
          />
          <YAxis
            yAxisId="rank"
            stroke="#f97316"
            tick={{ fontSize: isMobileChart ? 9 : 10, fill: '#f97316', fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
            width={isMobileChart ? 32 : 50}
            reversed={true}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(val) => `#${val}`}
          />
          <YAxis
            yAxisId="players"
            orientation="right"
            hide={isMobileChart}
            stroke="#22c55e"
            tick={{ fontSize: 10, fill: '#22c55e', fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
            width={isMobileChart ? 0 : 50}
            tickFormatter={(val) =>
              isMobileChart && Number(val) >= 1000
                ? `${Math.round(Number(val) / 1000)}k`
                : Number(val).toLocaleString()
            }
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '4px' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as ServerHistoryPoint | undefined;
              const uptime = point ? uptimeTooltipLabel(point, selectedDays === 1) : null;
              return (
                <div className="rounded border border-[#333] bg-[#18181b] px-3 py-2 text-xs">
                  <p className="text-[10px] font-bold text-[#666] uppercase mb-2">
                    {label ? new Date(String(label)).toLocaleString() : ''}
                  </p>
                  {payload.map((entry) => (
                    <p key={String(entry.dataKey)} style={{ color: entry.color, fontWeight: 'bold' }}>
                      {entry.name === 'Server Rank'
                        ? `Server Rank: #${entry.value}`
                        : `${entry.name}: ${Number(entry.value ?? 0).toLocaleString()}`}
                    </p>
                  ))}
                  {uptime && (
                    <p className="text-rose-400/90 mt-2 text-[10px] font-bold uppercase">{uptime}</p>
                  )}
                </div>
              );
            }}
          />
          <Line
            yAxisId="rank"
            type="monotone"
            dataKey="rank"
            name="Server Rank"
            stroke="#f97316"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#f97316', stroke: '#18181b', strokeWidth: 2 }}
          />
          <Line
            yAxisId="players"
            type="monotone"
            dataKey="players"
            name="Players"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: '#22c55e', stroke: '#18181b', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
