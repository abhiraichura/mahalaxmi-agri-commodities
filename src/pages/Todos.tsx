import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  Flame, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  CheckSquare,
  Edit3,
  Check
} from 'lucide-react';
import { db } from '../utils/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  day: string; 
}

export default function Todos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoText, setNewTodoText] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [baseDate, setBaseDate] = useState(new Date());
  
  // State for handling inline adjustments
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - 3 + i);
      return d;
    });
  }, [baseDate]);

  const formatDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [selectedDay, setSelectedDay] = useState<string>(formatDateString(new Date()));

  useEffect(() => {
    const q = query(collection(db, 'daily_todos'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TodoItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          text: data.text,
          completed: data.completed,
          priority: data.priority,
          day: data.day
        });
      });
      setTodos(items);
      setLoading(false);
    }, (error) => {
      console.error("Error loading tasks: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const dailyTodos = useMemo(() => {
    return todos.filter((todo) => todo.day === selectedDay);
  }, [todos, selectedDay]);

  const stats = useMemo(() => {
    if (dailyTodos.length === 0) return { percent: 0, completed: 0, total: 0 };
    const completed = dailyTodos.filter(t => t.completed).length;
    return {
      completed,
      total: dailyTodos.length,
      percent: Math.round((completed / dailyTodos.length) * 100)
    };
  }, [dailyTodos]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    try {
      await addDoc(collection(db, 'daily_todos'), {
        text: newTodoText.trim(),
        completed: false,
        priority,
        day: selectedDay,
        createdAt: serverTimestamp()
      });
      setNewTodoText('');
    } catch (error) {
      console.error("Error adding task: ", error);
    }
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      const docRef = doc(db, 'daily_todos', id);
      await updateDoc(docRef, { completed: !currentStatus });
    } catch (error) {
      console.error("Error shifting task state: ", error);
    }
  };

  const startEditing = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
  };

  const saveUpdate = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      const docRef = doc(db, 'daily_todos', id);
      await updateDoc(docRef, { text: editingText.trim() });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating task text: ", error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'daily_todos', id));
    } catch (error) {
      console.error("Error purging task item: ", error);
    }
  };

  const shiftWeek = (direction: 'prev' | 'next') => {
    setBaseDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return nextDate;
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Task Planner <CheckSquare className="w-6 h-6 text-rose-700" />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize and monitor your operational updates day-by-day.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-600">
            {stats.completed}/{stats.total} Targets Completed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> New Agenda Item
            </h3>
            
            <form onSubmit={handleAddTodo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Task Objective</label>
                <textarea
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder="Type task details here..."
                  rows={3}
                  className="w-full p-3 bg-gray-50 text-sm font-medium text-gray-800 placeholder-gray-400 rounded-xl border border-transparent focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Execution Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`text-xs py-2 font-bold rounded-xl capitalize transition-all border ${
                        priority === p 
                          ? p === 'high' ? 'bg-rose-600 text-white border-rose-600' :
                            p === 'medium' ? 'bg-amber-500 text-white border-amber-500' :
                            'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newTodoText.trim()}
                className="w-full py-2.5 bg-rose-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl hover:bg-rose-800 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add to Day
              </button>
            </form>
          </div>

          {dailyTodos.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl text-white shadow-md">
              <div className="flex justify-between items-center text-xs opacity-80 mb-2 font-medium">
                <span>Day Progress Bar</span>
                <span>{stats.percent}%</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full transition-all duration-500 ease-out" 
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-1">
            <button 
              onClick={() => shiftWeek('prev')}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {weekDays.map((date) => {
                const dateStr = formatDateString(date);
                const isActive = selectedDay === dateStr;
                const isToday = formatDateString(new Date()) === dateStr;
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(dateStr)}
                    className={`flex flex-col items-center min-w-[56px] py-2 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-rose-700 text-white shadow-md shadow-rose-100 font-bold scale-[1.02]' 
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-transparent hover:border-gray-100'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-rose-200' : 'text-gray-400'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-black mt-0.5">
                      {date.getDate()}
                    </span>
                    {isToday && !isActive && (
                      <span className="w-1 h-1 bg-rose-700 rounded-full mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => shiftWeek('next')}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dailyTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm px-4">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 mb-3 border border-gray-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-800">Clear Slate for This Date</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">No scheduled tasks found.</p>
              </div>
            ) : (
              dailyTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-200 border ${
                    todo.completed 
                      ? 'bg-gray-50/80 border-gray-100 opacity-70' 
                      : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button 
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      className="text-gray-400 hover:text-rose-700 transition-colors flex-shrink-0"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 group-hover:text-rose-700" />
                      )}
                    </button>
                    
                    {editingId === todo.id ? (
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => saveUpdate(todo.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveUpdate(todo.id)}
                        autoFocus
                        className="w-full text-xs sm:text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-300 rounded-md px-2 py-0.5 outline-none focus:border-rose-500"
                      />
                    ) : (
                      <span className={`text-xs sm:text-sm font-semibold truncate flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {todo.text}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                      todo.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      todo.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {todo.priority}
                    </span>

                    {editingId === todo.id ? (
                      <button
                        onClick={() => saveUpdate(todo.id)}
                        className="text-emerald-600 p-1.5 hover:bg-gray-50 rounded-lg"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => startEditing(todo)}
                        className="sm:opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all p-1.5 rounded-lg hover:bg-gray-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="sm:opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-gray-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
