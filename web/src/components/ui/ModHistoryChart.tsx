/**
 * Mod history chart — isolated for React.lazy code splitting.
 * Recharts (~350 KiB) loads only when this component mounts, keeping the
 * main bundle light for leaderboard/list pages (PageSpeed "Reduce unused JS").
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { ModHistoryPoint, SyncGap } from './chartTypes';

export interface ModHistoryChartProps {
  chartHistory: ModHistoryPoint[];
  syncGaps: SyncGap[];
  selectedDays: number;
  isMobileChart: boolean;
  patchInsight: {
    patches: Array<{ date: string; label: string }>;
    maxDate: string;
    broken: boolean;
  } | null;
}

export default function ModHistoryChart({
  chartHistory,
  syncGaps,
  selectedDays,
  isMobileChart,
  patchInsight,
}: ModHistoryChartProps) {
  // Fallback handled by parent CardContent fixed height; ResponsiveContainer
  // needs explicit parent dimensions and minWidth/minHeight to avoid -1 error.
  return (
    <div className="w-full h-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
              yAxisId="players"
              fill="#f59e0b"
              fillOpacity={0.12}
              stroke="#f59e0b"
              strokeOpacity={0.35}
              ifOverflow="visible"
            />
          ))}
          <XAxis
            dataKey="date"
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
            yAxisId="players"
            stroke="#f97316"
            tick={{ fontSize: isMobileChart ? 9 : 10, fill: '#f97316', fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
            width={isMobileChart ? 36 : 48}
            tickFormatter={(val) =>
              isMobileChart && Number(val) >= 1000
                ? `${Math.round(Number(val) / 1000)}k`
                : String(val)
            }
          />
          <YAxis
            yAxisId="servers"
            hide
            domain={[(min: number) => Math.max(0, min - 1), (max: number) => max + 1]}
          />
          <YAxis
            yAxisId="rank"
            orientation="right"
            reversed
            hide={isMobileChart}
            domain={[
              (dataMin: number) => Math.max(1, dataMin - 5),
              (dataMax: number) => dataMax + 5,
            ]}
            stroke="#3b82f6"
            tickFormatter={(val) => `#${val}`}
            tick={{ fontSize: 10, fill: '#3b82f6', fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
            width={isMobileChart ? 0 : 40}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333', borderRadius: '4px' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}
            formatter={(value, name) => {
              if (name === 'Overall Rank') return [`#${value}`, name];
              return [value, name];
            }}
          />
          {patchInsight && patchInsight.patches.length > 0 && (
            <>
              {patchInsight.broken && (
                <ReferenceArea
                  x1={patchInsight.patches[patchInsight.patches.length - 1].date}
                  x2={patchInsight.maxDate}
                  yAxisId="players"
                  fill="#ef4444"
                  fillOpacity={0.06}
                  strokeOpacity={0}
                />
              )}
              {patchInsight.patches.map((patch) => (
                <ReferenceLine
                  key={patch.date}
                  x={patch.date}
                  yAxisId="players"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={
                    isMobileChart
                      ? undefined
                      : {
                          value: patch.label,
                          position: 'insideTopLeft',
                          fill: '#fbbf24',
                          fontSize: 10,
                          fontWeight: 700,
                        }
                  }
                />
              ))}
            </>
          )}
          <Line
            yAxisId="players"
            type="monotone"
            dataKey="totalPlayers"
            name="Deployed Personnel"
            stroke="#f97316"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#f97316', stroke: '#18181b', strokeWidth: 2 }}
          />
          <Line
            yAxisId="servers"
            type="monotone"
            dataKey="serverCount"
            name="Active Servers"
            stroke="#db2777"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#db2777', stroke: '#18181b', strokeWidth: 2 }}
          />
          <Line
            yAxisId="rank"
            type="monotone"
            dataKey="overallRank"
            name="Overall Rank"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', stroke: '#18181b', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
