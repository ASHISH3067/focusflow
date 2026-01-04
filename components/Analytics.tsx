
import React, { useMemo } from 'react';
import { Task, TimeLog } from '../types';
import { formatHHMM, msToHours, getLast7Days } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area 
} from 'recharts';

interface AnalyticsProps {
  tasks: Task[];
  logs: TimeLog[];
  selectedDate: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ tasks, logs, selectedDate }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const startWeek = (() => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - 7);
      return d.getTime();
    })();
    
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayMs = 0, weekMs = 0, monthMs = 0;
    logs.forEach(log => {
      if (!log.endTs) return;
      if (log.startTs >= startToday) todayMs += (log.endTs - log.startTs);
      if (log.startTs >= startWeek) weekMs += (log.endTs - log.startTs);
      if (log.startTs >= startMonth) monthMs += (log.endTs - log.startTs);
    });

    return { todayMs, weekMs, monthMs };
  }, [logs]);

  const trendData = useMemo(() => {
    const last7 = getLast7Days();
    return last7.map(day => {
      const dayStart = new Date(day + "T00:00:00").getTime();
      const dayEnd = new Date(day + "T23:59:59.999").getTime();
      const totalDayMs = logs.reduce((acc, log) => {
        if (!log.endTs) return acc;
        const start = Math.max(log.startTs, dayStart);
        const end = Math.min(log.endTs, dayEnd);
        return acc + (end > start ? end - start : 0);
      }, 0);
      return { day: day.slice(8, 10), fullDate: day, hours: msToHours(totalDayMs) };
    });
  }, [logs]);

  const taskBreakdown = useMemo(() => {
    const dayStart = new Date(selectedDate + "T00:00:00").getTime();
    const dayEnd = new Date(selectedDate + "T23:59:59.999").getTime();

    return tasks.map(t => {
      const actualMs = logs.filter(l => l.taskId === t.id && l.endTs).reduce((acc, l) => {
        const start = Math.max(l.startTs, dayStart);
        const end = Math.min(l.endTs!, dayEnd);
        return acc + (end > start ? end - start : 0);
      }, 0);

      const targetDate = t.goalDate ? new Date(t.goalDate + "T00:00:00") : null;
      const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
      const diffDays = targetDate ? Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      const projectDoneMs = logs.filter(l => l.taskId === t.id && l.endTs).reduce((acc, l) => acc + (l.endTs! - l.startTs), 0);
      const projectRemMs = Math.max(0, (t.hoursGoal * 3600000) - projectDoneMs);
      const neededTodayH = diffDays > 0 ? msToHours(projectRemMs / diffDays) : (t.goalDate ? msToHours(projectRemMs) : 0);

      return {
        id: t.id,
        name: t.name,
        actual: msToHours(actualMs),
        dailyGoal: t.dailyGoal,
        neededToday: neededTodayH,
        status: msToHours(actualMs) >= (t.dailyGoal || neededTodayH) ? 'On Track' : 'Behind'
      };
    });
  }, [tasks, logs, selectedDate]);

  return (
    <div className="space-y-6">
      {/* 7-Day Trend Chart */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-6">7-Day Momentum</h4>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px', color: '#38bdf8' }}
              />
              <Area type="monotone" dataKey="hours" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorHours)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Today', value: stats.todayMs, color: 'text-sky-400' },
          { label: 'Week', value: stats.weekMs, color: 'text-indigo-400' },
          { label: 'Month', value: stats.monthMs, color: 'text-emerald-400' }
        ].map(item => (
          <div key={item.label} className="bg-slate-900 border border-slate-800/60 p-4 rounded-2xl text-center">
            <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">{item.label}</div>
            <div className={`text-lg font-mono font-bold ${item.color}`}>{formatHHMM(item.value)}</div>
          </div>
        ))}
      </div>

      {/* Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-4">Daily Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="pb-3 font-black uppercase tracking-widest">Task</th>
                <th className="pb-3 font-black uppercase tracking-widest text-center">Actual</th>
                <th className="pb-3 font-black uppercase tracking-widest text-center">Needed</th>
                <th className="pb-3 font-black uppercase tracking-widest text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {taskBreakdown.map(item => (
                <tr key={item.id} className="group hover:bg-slate-950/30">
                  <td className="py-3 text-white font-medium truncate max-w-[100px]">{item.name}</td>
                  <td className="py-3 text-center font-mono text-slate-300">{item.actual}h</td>
                  <td className="py-3 text-center font-mono text-slate-500">{item.neededToday || item.dailyGoal || '—'}h</td>
                  <td className={`py-3 text-right font-bold ${item.actual >= (item.neededToday || item.dailyGoal) ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {item.actual >= (item.neededToday || item.dailyGoal) ? '✓' : '—'}
                  </td>
                </tr>
              ))}
              {taskBreakdown.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-slate-700 italic">No activity logs for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
