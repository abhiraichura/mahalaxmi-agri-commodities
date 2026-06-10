// src/pages/Notes.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
// Added Download icon for the CSV export action row
import { Search, Plus, X, Trash2, Tag, FileText, ChevronLeft, Calendar, LayoutGrid, CloudLightning, Cloud, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const safelyFormatDate = (dateStr: any) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return format(d, 'd MMM yyyy • h:mm a');
};

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore();
  const [search, setSearch] = useState('');
  
  // UI Panels and Mobile View States
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isMobileViewList, setIsMobileViewList] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Local input/editor values
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  // Keep a reference to track the currently loaded note ID to prevent overwrite loops during typing
  const loadedNoteIdRef = useRef<string | null>(null);

  const sortedNotes = useMemo(() => {
    let result = [...notes];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(n => 
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [notes, search]);

  // Automatically select the first note on initialization if none is selected (for desktop)
  useEffect(() => {
    if (!activeNoteId && sortedNotes.length > 0) {
      setActiveNoteId(sortedNotes[0].id);
    }
  }, [sortedNotes, activeNoteId]);

  // Load selected note details into local input form states whenever activeNoteId changes
  useEffect(() => {
    if (activeNoteId && activeNoteId !== loadedNoteIdRef.current) {
      loadedNoteIdRef.current = activeNoteId;
      const target = notes.find(n => n.id === activeNoteId);
      if (target) {
        setForm({
          title: target.title || '',
          content: target.content || '',
          tags: (target.tags || []).join(', ')
        });
      }
    }
  }, [activeNoteId, notes]);

  // Real-time Auto-saving implementation with a 500ms debounce loop
  useEffect(() => {
    if (!activeNoteId) return;
    const currentStoredNote = notes.find(n => n.id === activeNoteId);
    if (!currentStoredNote) return;

    const parsedTags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    // Evaluate whether user made real changes from what is currently in storage
    const hasPendingChanges =
      form.title !== (currentStoredNote.title || '') ||
      form.content !== (currentStoredNote.content || '') ||
      JSON.stringify(parsedTags) !== JSON.stringify(currentStoredNote.tags || []);

    if (!hasPendingChanges) return;

    setIsSaving(true);

    const debounceTimer = setTimeout(async () => {
      try {
        await updateNote(activeNoteId, {
          ...currentStoredNote,
          title: form.title,
          content: form.content,
          tags: parsedTags,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Auto-save failed', err);
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [form.title, form.content, form.tags, activeNoteId, notes, updateNote]);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    setIsMobileViewList(false);
  };

  // Modern workflow: Instant Apple Notes style row creation
  const startCreate = async () => {
    const freshId = uuidv4();
    const blankNote = {
      id: freshId,
      title: 'New Note',
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    loadedNoteIdRef.current = freshId;
    setForm({ title: 'New Note', content: '', tags: '' });
    setActiveNoteId(freshId);
    setIsMobileViewList(false);

    try {
      await addNote(blankNote);
    } catch {
      toast.error('Failed to instantiate note');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteNote(id);
      toast.success('Note deleted');
      if (activeNoteId === id) {
        loadedNoteIdRef.current = null;
        setActiveNoteId(null);
        setIsMobileViewList(true);
      }
    } catch {
      toast.error('Failed to remove note');
    }
  };

  // Handler to export notes array to clean format CSV
  const handleExportCSV = () => {
    if (!notes || notes.length === 0) {
      toast.error('No notes found to export');
      return;
    }

    // CSV Headers
    const headers = ['ID', 'Title', 'Content', 'Tags', 'Created At', 'Updated At'];

    // Safe escaping rules for CSV formatting wrapper
    const escapeCSVCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      let cleanString = String(val);
      // Double quote escaping for inner content safety
      if (cleanString.includes('"') || cleanString.includes(',') || cleanString.includes('\n') || cleanString.includes('\r')) {
        cleanString = '"' + cleanString.replace(/"/g, '""') + '"';
      } else if (!cleanString) {
        return '""';
      }
      return cleanString;
    };

    // Generate matching rows
    const csvRows = notes.map(note => [
      escapeCSVCell(note.id),
      escapeCSVCell(note.title || 'Untitled Note'),
      escapeCSVCell(note.content || ''),
      escapeCSVCell((note.tags || []).join(', ')),
      escapeCSVCell(note.createdAt || ''),
      escapeCSVCell(note.updatedAt || '')
    ]);

    // Prepend header strings sequence
    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    // Trigger browser file download instantiation payload
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `mahalaxmi_notes_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Notes exported to CSV successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV file');
    }
  };

  const activeNoteObject = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  return (
    <div className="h-[calc(100vh-64px)] p-4 md:p-6 bg-gray-50 flex font-sans">
      <div className="flex w-full bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Left Sidebar Pane - List View */}
        <div className={`w-full md:w-80 lg:w-[380px] flex flex-col border-r border-gray-100 bg-white select-none ${!isMobileViewList ? 'hidden md:flex' : 'flex'}`}>
          
          {/* List Header Frame */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-rose-600" />
                Notes
              </h1>
              {/* CSV Export Button added right here to easily click it */}
              {notes.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  title="Export all data records to Excel/CSV"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-100 focus:bg-white transition-all outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={startCreate}
                className="flex-shrink-0 w-10 h-10 bg-stone-800 text-white rounded-xl flex items-center justify-center hover:bg-stone-900 transition-all shadow-sm"
                title="Create Note"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Scrolling Note Rows */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {sortedNotes.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No business notes recorded</p>
              </div>
            ) : (
              sortedNotes.map(note => {
                const isSelected = activeNoteId === note.id;

                return (
                  <div 
                    key={note.id}
                    onClick={() => handleSelectNote(note.id)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-150 border text-left ${
                      isSelected 
                        ? 'bg-rose-50/40 border-rose-200/80 shadow-sm' 
                        : 'bg-white border-transparent hover:bg-gray-50/70'
                    }`}
                  >
                    <h3 className="font-semibold text-[15px] text-gray-800 line-clamp-1 mb-0.5">
                      {note.title || 'Untitled Note'}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-1 mb-2.5">
                      {note.content || 'No description text...'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
                      <span>
                        {safelyFormatDate(note.createdAt).split('•')[0].trim()}
                      </span>
                      {(note.tags && note.tags.length > 0) && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 text-[10px]">
                          {note.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Workspace Pane - Workspace/Inline Editor view */}
        <div className={`flex-1 flex flex-col bg-[#fffdfc] ${isMobileViewList ? 'hidden' : 'flex md:flex'}`}>
          {!activeNoteId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center select-none">
              <FileText className="w-14 h-14 mb-3 text-gray-200" />
              <h2 className="text-lg font-medium text-gray-600 mb-1">No note active</h2>
              <p className="text-xs max-w-xs">Select any recorded note on the list sidebar panel, or tap create to start editing instantaneously.</p>
            </div>
          ) : (
            <>
              {/* Dynamic Header Status Bar */}
              <div className="h-[76px] px-6 lg:px-10 flex items-center justify-between border-b border-gray-100 shrink-0 select-none">
                <button 
                  onClick={() => setIsMobileViewList(true)}
                  className="md:hidden flex items-center gap-1 text-gray-500 hover:text-gray-900 font-medium text-sm"
                >
                  <ChevronLeft size={18} /> Notes
                </button>
                
                {/* Cloud Live Auto-save sync indicators */}
                <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  {isSaving ? (
                    <>
                      <CloudLightning className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span className="text-amber-600 font-semibold">Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-green-500" />
                      <span>Saved locally to cloud</span>
                    </>
                  )}
                </div>

                <button 
                  onClick={() => handleDelete(activeNoteId)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete this note"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Seamless Live Text Editors */}
              <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-5">
                  
                  {/* Note Title Input Row */}
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Note Title"
                    className="w-full bg-transparent text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight outline-none border-none placeholder:text-gray-200 font-sans"
                  />

                  {/* Context Info Strip */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400 border-b border-gray-100 pb-5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {activeNoteObject ? safelyFormatDate(activeNoteObject.createdAt) : ''}
                    </span>
                    <div className="relative flex-1 max-w-sm flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <input
                        value={form.tags}
                        onChange={e => setForm({ ...form, tags: e.target.value })}
                        placeholder="Add tags separated by comma..."
                        className="w-full bg-transparent text-gray-500 outline-none border-none placeholder:text-gray-300 py-0.5"
                      />
                    </div>
                  </div>

                  {/* Main Workspace Body Textarea Input (Matches website body typography) */}
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Type content notes here..."
                    className="w-full min-h-[460px] bg-transparent text-[16px] text-gray-700 leading-relaxed outline-none border-none resize-none placeholder:text-gray-300 font-sans"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
