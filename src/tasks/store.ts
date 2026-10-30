// src/tasks/store.ts
// All tasks, live from Firestore ("daily_todos"). Changes show on screen at once and are saved in the background.
import { create } from 'zustand';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../utils/firebase';
import { addDays, nextDay, normalizeTask, taskFields, type Task } from './model';

const COL = 'daily_todos';

interface State { tasks: Task[]; loaded: boolean }
export const useTaskStore = create<State>(() => ({ tasks: [], loaded: false }));

let users = 0;
let stop: (() => void) | null = null;

/** Starts listening while any screen needs the tasks. Call from an effect; call the result on cleanup. */
export function startTasks(): () => void {
  users++;
  if (!stop) {
    stop = onSnapshot(collection(db, COL), snap => {
      const tasks: Task[] = [];
      snap.forEach(d => tasks.push(normalizeTask(d.id, d.data() as Record<string, unknown>)));
      tasks.sort((a, b) => (a.createdMs || 0) - (b.createdMs || 0));
      useTaskStore.setState({ tasks, loaded: true });
    }, err => { console.error('Tasks: could not load', err); useTaskStore.setState({ loaded: true }); });
  }
  return () => { users--; if (users <= 0 && stop) { stop(); stop = null; users = 0; } };
}

const put = (fn: (t: Task[]) => Task[]) => useTaskStore.setState(s => ({ tasks: fn(s.tasks) }));
const fail = (e: unknown) => { console.error(e); toast.error('Could not save to the cloud. Check your connection.'); };
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t${Date.now()}${Math.random().toString(36).slice(2, 8)}`);

export async function addTask(t: Partial<Task> & { text: string }): Promise<string> {
  const id = newId();
  const task: Task = { completed: false, priority: 'medium', day: '', ...t, id, text: t.text.trim(), createdMs: Date.now() };
  put(ts => [...ts, task]);
  try { await setDoc(doc(db, COL, id), { ...taskFields(task), createdAt: serverTimestamp() }); } catch (e) { fail(e); }
  return id;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  put(ts => ts.map(t => (t.id === id ? { ...t, ...patch } : t)));
  try { await updateDoc(doc(db, COL, id), taskFields(patch)); } catch (e) { fail(e); }
}

export async function removeTask(id: string): Promise<void> {
  put(ts => ts.filter(t => t.id !== id));
  try { await deleteDoc(doc(db, COL, id)); } catch (e) { fail(e); }
}

/** Ticks a task, or takes the tick off. A repeating task that is finished gets its next date straight away. */
export async function toggleTask(task: Task, today: string): Promise<{ next?: string }> {
  if (task.completed) { await updateTask(task.id, { completed: false, doneAt: '' }); return {}; }
  await updateTask(task.id, { completed: true, doneAt: new Date().toISOString(), ...(task.repeat && !task.series ? { series: task.id } : {}) });
  if (!task.repeat) return {};
  const series = task.series || task.id;
  const keep = task.day ? Number(task.day.slice(8)) : undefined;
  const next = nextDay(task.day || today, task.repeat, addDays(today, 1), keep);
  // pressing done, undo, done again must not stack copies
  if (useTaskStore.getState().tasks.some(t => !t.completed && t.series === series && t.day === next)) return { next };
  await addTask({
    text: task.text, priority: task.priority, day: next, repeat: task.repeat, series, link: task.link ?? null,
    ...(task.time ? { time: task.time } : {}), ...(task.details ? { details: task.details } : {}),
    ...(task.checklist ? { checklist: task.checklist.map(c => ({ ...c, done: false })) } : {}),
  });
  return { next };
}

/** how many open tasks are due today or earlier (for the badge on "Today") */
export function useDueCount(today: string): number {
  return useTaskStore(s => s.tasks.reduce((n, t) => n + (!t.completed && t.day && t.day <= today ? 1 : 0), 0));
}
