
export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface SessionNote {
  date: string;
  text: string;
}

export interface Subtask {
  id: string;
  name: string;
  hoursGoal: number;
  running: boolean;
  remainingMs: number;
  lastUpdated: number;
}

export interface Task {
  id: string;
  name: string;
  hoursGoal: number; // Project Total
  dailyGoal: number; // Intent per day
  goalDate: string | null;
  urgency: UrgencyLevel;
  running: boolean;
  remainingMs: number;
  lastUpdated: number;
  subtasks: Subtask[];
  pinned: boolean;
  notes: string;
}

export interface TimeLog {
  id: string;
  taskId: string;
  subtaskId: string | null;
  startTs: number;
  endTs: number | null;
}

export interface AppState {
  tasks: Task[];
  logs: TimeLog[];
}
