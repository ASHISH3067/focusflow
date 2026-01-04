
import React, { useState } from 'react';
import { Task, Subtask, UrgencyLevel } from '../types';
import { formatFull, msToHours } from '../constants';

interface TaskCardProps {
  task: Task;
  onToggleTask: (taskId: string) => void;
  onRestartTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddSubtask: (taskId: string, name: string, hours: number) => void;
  onToggleSubtask: (taskId: string, subId: string) => void;
  onDeleteSubtask: (taskId: string, subId: string) => void;
}

const UrgencyBadge: React.FC<{ level: UrgencyLevel }> = ({ level }) => {
  const colors = {
    low: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400',
    medium: 'bg-amber-950/40 border-amber-800/50 text-amber-400',
    high: 'bg-rose-950/40 border-rose-800/50 text-rose-400',
  };
  return (
    <span className={`text-[9px] uppercase font-bold tracking-[0.15em] px-2 py-0.5 rounded-full border ${colors[level]}`}>
      {level}
    </span>
  );
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleTask,
  onRestartTask,
  onDeleteTask,
  onUpdateTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask
}) => {
  const [subName, setSubName] = useState('');
  const [subHours, setSubHours] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleAddSub = (presetHours?: number) => {
    const h = presetHours || parseFloat(subHours);
    const name = presetHours ? `${presetHours}m Focus` : subName;
    if ((name || presetHours) && h > 0) {
      onAddSubtask(task.id, name, presetHours ? h / 60 : h);
      setSubName('');
      setSubHours('');
    }
  };

  const isActive = task.running || task.subtasks.some(s => s.running);

  return (
    <article className={`group p-5 rounded-2xl border transition-all duration-500 flex flex-col h-full relative ${
      isActive ? 'border-sky-500 bg-slate-900 shadow-2xl shadow-sky-950/20 z-10 scale-[1.02]' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
    }`}>
      {/* Pin Toggle */}
      <button 
        onClick={() => onUpdateTask(task.id, { pinned: !task.pinned })}
        className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${task.pinned ? 'text-sky-400 bg-sky-950/50' : 'text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={task.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </button>

      <div className="flex justify-between items-start mb-4 pr-8">
        <div className="space-y-2">
          {isEditing ? (
            <input 
              autoFocus
              className="bg-slate-950 border border-sky-500 rounded px-2 py-1 text-sm text-white w-full"
              value={task.name}
              onBlur={() => setIsEditing(false)}
              onChange={(e) => onUpdateTask(task.id, { name: e.target.value })}
            />
          ) : (
            <h3 
              onDoubleClick={() => setIsEditing(true)}
              className="text-lg font-bold text-white leading-tight cursor-text group-hover:text-sky-300 transition-colors"
            >
              {task.name}
            </h3>
          )}
          <div className="flex flex-wrap gap-2">
            <UrgencyBadge level={task.urgency} />
            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800/30 px-2 py-0.5 rounded border border-slate-700/50">
              Target: {task.hoursGoal}h
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-950/80 backdrop-blur-sm border border-slate-800 rounded-xl py-5 mb-5 text-center shadow-inner">
        <span className={`text-4xl font-mono tracking-widest ${isActive ? 'text-sky-400' : 'text-slate-300'}`}>
          {formatFull(task.remainingMs)}
        </span>
      </div>

      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => onToggleTask(task.id)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            task.running ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-sky-600 text-white shadow-lg shadow-sky-900/20 hover:bg-sky-500'
          }`}
        >
          {task.running ? 'Pause Session' : 'Start Focus'}
        </button>
        <button 
          onClick={() => onRestartTask(task.id)}
          className="px-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 transition-colors"
          title="Reset timer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
          <label className="text-[9px] uppercase font-black text-slate-500 mb-2 block tracking-widest">Session Notes</label>
          <textarea 
            placeholder="What are you working on right now?"
            value={task.notes}
            onChange={(e) => onUpdateTask(task.id, { notes: e.target.value })}
            className="w-full bg-transparent text-xs text-slate-300 border-none outline-none resize-none h-12 scrollbar-none placeholder:text-slate-700"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Subtasks / Pomodoro</span>
            <div className="flex gap-1">
              {[25, 50].map(m => (
                <button 
                  key={m}
                  onClick={() => handleAddSub(m)}
                  className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 hover:text-sky-400 hover:border-sky-500 transition-all"
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Quick goal..."
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-700 outline-none focus:border-sky-900"
            />
            <button 
              onClick={() => handleAddSub()}
              className="px-3 bg-slate-800 text-slate-400 rounded-lg hover:text-sky-500 transition-colors"
            >
              +
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="bg-slate-950/50 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center group/sub">
                <div className="flex flex-col gap-0.5 max-w-[60%]">
                  <span className="text-xs font-medium text-slate-300 truncate">{sub.name}</span>
                  <span className="text-[10px] font-mono text-sky-500/80">{formatFull(sub.remainingMs)}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onToggleSubtask(task.id, sub.id)}
                    className={`p-1 px-2 rounded-lg text-[10px] font-bold border ${sub.running ? 'bg-amber-950/40 border-amber-800 text-amber-500' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                  >
                    {sub.running ? 'Pause' : 'Start'}
                  </button>
                  <button 
                    onClick={() => onDeleteSubtask(task.id, sub.id)}
                    className="p-1 px-2 rounded-lg bg-slate-900 border border-rose-950/30 text-rose-500 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/50 flex justify-between items-center">
        <button 
          onClick={() => onDeleteTask(task.id)}
          className="text-[10px] uppercase font-bold text-slate-600 hover:text-rose-500 transition-colors"
        >
          Remove Task
        </button>
        <div className="text-[10px] text-slate-500 font-mono">
          Progress: {((1 - task.remainingMs / (task.hoursGoal * 3600000)) * 100).toFixed(0)}%
        </div>
      </div>
    </article>
  );
};
