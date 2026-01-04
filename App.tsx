
import React, { useState, useEffect } from 'react';
import { Task, Subtask, TimeLog, AppState, UrgencyLevel } from './types';
import { STORAGE_KEY } from './constants';
import { TaskCard } from './components/TaskCard';
import { Analytics } from './components/Analytics';
import { getFocusCoachAdvice } from './services/geminiService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [chartDate, setChartDate] = useState(new Date().toISOString().slice(0, 10));
  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'urgency' | 'none'>('urgency');
  
  // Creation Inputs
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskGoal, setNewTaskGoal] = useState('');
  const [newTaskDaily, setNewTaskDaily] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newTaskUrgency, setNewTaskUrgency] = useState<UrgencyLevel>('medium');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: AppState = JSON.parse(raw);
        setTasks(parsed.tasks || []);
        setLogs(parsed.logs || []);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, logs }));
  }, [tasks, logs]);

  useEffect(() => {
    const fetchCoach = async () => {
      const advice = await getFocusCoachAdvice(tasks, logs);
      setCoachAdvice(advice);
    };
    if (tasks.length > 0) {
      const timer = setTimeout(fetchCoach, 5000);
      return () => clearTimeout(timer);
    }
  }, [tasks.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTasks(prevTasks => {
        let changed = false;
        const nextTasks = prevTasks.map(task => {
          const t = { ...task };
          if (t.running && t.remainingMs > 0) {
            const elapsed = now - t.lastUpdated;
            if (elapsed > 0) {
              t.remainingMs = Math.max(0, t.remainingMs - elapsed);
              t.lastUpdated = now;
              if (t.remainingMs === 0) t.running = false;
              changed = true;
            }
          }
          t.subtasks = t.subtasks.map(sub => {
            const s = { ...sub };
            if (s.running && s.remainingMs > 0) {
              const elapsed = now - s.lastUpdated;
              if (elapsed > 0) {
                s.remainingMs = Math.max(0, s.remainingMs - elapsed);
                s.lastUpdated = now;
                if (s.remainingMs === 0) s.running = false;
                changed = true;
              }
            }
            return s;
          });
          return t;
        });
        return changed ? nextTasks : prevTasks;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addTask = () => {
    const h = parseFloat(newTaskGoal);
    const d = parseFloat(newTaskDaily) || 0;
    if (!h || h <= 0) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      name: newTaskName || 'New Objective',
      hoursGoal: h,
      dailyGoal: d,
      goalDate: newTargetDate || null,
      urgency: newTaskUrgency,
      running: false,
      remainingMs: h * 3600000,
      lastUpdated: Date.now(),
      subtasks: [],
      pinned: false,
      notes: ''
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskName('');
    setNewTaskGoal('');
    setNewTaskDaily('');
    setNewTargetDate('');
  };

  const startLog = (taskId: string, subtaskId: string | null = null) => {
    setLogs(prev => [...prev, { id: crypto.randomUUID(), taskId, subtaskId, startTs: Date.now(), endTs: null }]);
  };

  const stopLog = (taskId: string, subtaskId: string | null = null) => {
    setLogs(prev => prev.map(l => (l.taskId === taskId && l.subtaskId === subtaskId && l.endTs === null) ? { ...l, endTs: Date.now() } : l));
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleTask = (taskId: string) => {
    const now = Date.now();
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (t.running) {
        stopLog(taskId, null);
        t.subtasks.forEach(s => s.running && stopLog(taskId, s.id));
        return { ...t, running: false, lastUpdated: now, subtasks: t.subtasks.map(s => ({ ...s, running: false, lastUpdated: now })) };
      } else {
        startLog(taskId, null);
        return { ...t, running: true, lastUpdated: now };
      }
    }));
  };

  const toggleSubtask = (taskId: string, subId: string) => {
    const now = Date.now();
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      const nextSubs = task.subtasks.map(s => {
        if (s.id !== subId) return s;
        if (s.running) {
          stopLog(taskId, subId);
          return { ...s, running: false, lastUpdated: now };
        } else {
          startLog(taskId, subId);
          return { ...s, running: true, lastUpdated: now };
        }
      });
      const someRunning = nextSubs.some(s => s.running);
      let nextTaskRunning = task.running;
      if (someRunning && !task.running) {
        nextTaskRunning = true;
        startLog(taskId, null);
      } else if (!someRunning && task.running) {
        nextTaskRunning = false;
        stopLog(taskId, null);
      }
      return { ...task, subtasks: nextSubs, running: nextTaskRunning, lastUpdated: now };
    }));
  };

  // Fix: Added missing addSubtask function
  const addSubtask = (taskId: string, name: string, hours: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newSub: Subtask = {
        id: crypto.randomUUID(),
        name,
        hoursGoal: hours,
        running: false,
        remainingMs: hours * 3600000,
        lastUpdated: Date.now()
      };
      return { ...t, subtasks: [...t.subtasks, newSub] };
    }));
  };

  // Fix: Added missing restartTask function
  const restartTask = (taskId: string) => {
    const now = Date.now();
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      if (t.running) stopLog(taskId, null);
      return {
        ...t,
        running: false,
        remainingMs: t.hoursGoal * 3600000,
        lastUpdated: now,
        subtasks: t.subtasks.map(s => {
          if (s.running) stopLog(taskId, s.id);
          return { ...s, running: false, remainingMs: s.hoursGoal * 3600000, lastUpdated: now };
        })
      };
    }));
  };

  // Fix: Added missing deleteTask function
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Fix: Added missing deleteSubtask function
  const deleteSubtask = (taskId: string, subId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const sub = t.subtasks.find(s => s.id === subId);
      if (sub?.running) stopLog(taskId, subId);
      return { ...t, subtasks: t.subtasks.filter(s => s.id !== subId) };
    }));
  };

  const exportData = () => {
    const data = JSON.stringify({ tasks, logs });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FocusFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.tasks && parsed.logs) {
          setTasks(parsed.tasks);
          setLogs(parsed.logs);
        }
      } catch (err) { alert("Invalid Backup File"); }
    };
    reader.readAsText(file);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sortBy === 'urgency') {
      const weight = { high: 0, medium: 1, low: 2 };
      return weight[a.urgency] - weight[b.urgency];
    }
    return 0;
  });

  return (
    <div className="max-w-[1300px] mx-auto p-4 md:p-10 space-y-10 selection:bg-sky-500/30">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-800/50 pb-10">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">FocusFlow<span className="text-sky-500">.</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Momentum Dashboard</p>
        </div>
        <div className="flex gap-4">
          <button onClick={exportData} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-colors">Export JSON</button>
          <label className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-colors cursor-pointer">
            Import JSON <input type="file" className="hidden" onChange={importData} />
          </label>
        </div>
      </header>

      {coachAdvice && (
        <div className="bg-slate-900/40 backdrop-blur-md border border-sky-500/10 p-5 rounded-3xl flex items-center gap-5">
          <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-xl">✨</div>
          <div className="flex-1">
             <div className="text-[10px] uppercase font-black text-sky-500 tracking-widest mb-1">Coach Insight</div>
             <p className="text-sm text-slate-300 font-medium italic">"{coachAdvice}"</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Objective</label>
                <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="e.g. Master React" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none transition-all placeholder:text-slate-800" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Total Hours</label>
                <input type="number" value={newTaskGoal} onChange={e => setNewTaskGoal(e.target.value)} placeholder="40" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none transition-all placeholder:text-slate-800" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Daily Target (H)</label>
                <input type="number" value={newTaskDaily} onChange={e => setNewTaskDaily(e.target.value)} placeholder="2" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none transition-all placeholder:text-slate-800" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Urgency</label>
                <select value={newTaskUrgency} onChange={e => setNewTaskUrgency(e.target.value as UrgencyLevel)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500 outline-none transition-all cursor-pointer">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <button onClick={addTask} className="w-full bg-sky-600 hover:bg-sky-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-sky-900/30">Initialize Focus Segment</button>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedTasks.map(t => (
              <TaskCard 
                key={t.id} 
                task={t} 
                onToggleTask={toggleTask} 
                onRestartTask={restartTask} 
                onDeleteTask={deleteTask} 
                onUpdateTask={updateTask} 
                onAddSubtask={addSubtask} 
                onToggleSubtask={toggleSubtask} 
                onDeleteSubtask={deleteSubtask} 
              />
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
           <div className="flex justify-between items-center mb-2">
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Intelligence Centre</h2>
             <input type="date" value={chartDate} onChange={(e) => setChartDate(e.target.value)} className="bg-slate-900 border border-slate-800 text-[10px] rounded-lg px-2 py-1 text-slate-300 outline-none font-bold" />
           </div>
           <Analytics tasks={tasks} logs={logs} selectedDate={chartDate} />
        </aside>
      </div>
    </div>
  );
};

export default App;
