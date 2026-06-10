// src/pages/Notes.tsx
import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, X, Trash2, Edit2, Save, Tag, FileText, ChevronLeft, Calendar, LayoutGrid } from 'lucide-react';
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
  
  // UI State
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileViewList, setIsMobileViewList] = useState(true);

  // Form State
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  // Get active note based on selection
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

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

  // Set first note as active automatically if on desktop and none selected
  useEffect(() => {
    if (!activeNoteId && !isEditing && sortedNotes.length > 0) {
      setActiveNoteId(sortedNotes[0].id);
    }
  }, [sortedNotes, activeNoteId, isEditing]);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    setIsEditing(false);
    setIsMobileViewList(false);
  };

  const startCreate = () => {
    setActiveNoteId(null);
    setForm({ title: '', content: '', tags: '' });
    setIsEditing(true);
    setIsMobileViewList(false);
  };

  const startEdit = () => {
    if (!activeNote) return;
    setForm({
      title: activeNote.title || '',
      content: activeNote.content || '',
      tags: (activeNote.tags || []).join(', ')
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      id: activeNoteId || uuidv4(),
      title: form.title,
      content: form.content,
      tags,
      updatedAt: new Date().toISOString(),
      createdAt: activeNoteId ? activeNote?.createdAt : new Date().toISOString()
    };

    try {
      if (activeNoteId) {
        await updateNote(activeNoteId, payload);
        toast.success('Note updated');
      } else {
        await addNote(payload);
        setActiveNoteId(payload.id);
        toast.success('Note created');
      }
      setIsEditing(false);
    } catch {
      toast.error('Failed to save note');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    await deleteNote(id);
    toast.success('Note deleted');
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setIsEditing(false);
      setIsMobileViewList(true);
    }
  };

  const handleCancel = () => {
    if (!activeNoteId) {
      // Canceling a new note
      setIsMobileViewList(true);
      if (sortedNotes.length > 0) {
        setActiveNoteId(sortedNotes[0].id);
      }
    }
    setIsEditing(false);
  };

  return (
    <div className="h-[calc(100vh-64px)] p-4 md:p-6 bg-gray-50 flex">
      <div className="flex w-full bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Left Pane - List */}
        <div className={`w-full md:w-80 lg:w-[400px] flex flex-col border-r border-gray-100 bg-white ${!isMobileViewList ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header & Search */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-rose-600" />
              All Notes
            </h1>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={startCreate}
                className="flex-shrink-0 w-11 h-11 bg-stone-700 text-white rounded-2xl flex items-center justify-center hover:bg-stone-800 hover:shadow-md transition-all"
                title="New Note"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Note List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {sortedNotes.length === 0 ? (
              <div className="text-center py-10 px-4">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notes found.</p>
              </div>
            ) : (
              sortedNotes.map(note => {
                const isActive = activeNoteId === note.id && !isEditing;
                const isCreating = isEditing && !activeNoteId;
                const visuallyActive = isActive && !isCreating;

                return (
                  <div 
                    key={note.id}
                    onClick={() => handleSelectNote(note.id)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      visuallyActive 
                        ? 'bg-rose-50/40 border-rose-200 shadow-sm' 
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className={`font-semibold text-base line-clamp-1 pr-2 ${visuallyActive ? 'text-gray-900' : 'text-gray-800'}`}>
                        {note.title || 'Untitled Note'}
                      </h3>
                    </div>
                    <p className="text-gray-500 text-sm line-clamp-1 mb-4">
                      {note.content || 'No additional content...'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                        {safelyFormatDate(note.createdAt).split('•')[0].trim()}
                      </span>
                      {(note.tags && note.tags.length > 0) && (
                        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                          <Tag className="w-3 h-3" />
                          {note.tags[0]}
                          {note.tags.length > 1 && ` +${note.tags.length - 1}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Detail / Editor */}
        <div className={`flex-1 flex-col bg-[#fffdfc] ${isMobileViewList ? 'hidden' : 'flex md:flex'}`}>
          {(!activeNoteId && !isEditing) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <FileText className="w-16 h-16 mb-4 text-gray-200" />
              <h2 className="text-xl font-medium text-gray-600 mb-2">No note selected</h2>
              <p className="text-sm">Select a note from the list or create a new one to get started.</p>
              <button
                onClick={startCreate}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-stone-700 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                <Plus size={16} /> Create Note
              </button>
            </div>
          ) : (
            <>
              {/* Right Pane Toolbar */}
              <div className="h-[88px] px-6 lg:px-10 flex items-center justify-between border-b border-gray-100 shrink-0">
                <button 
                  onClick={() => setIsMobileViewList(true)}
                  className="md:hidden flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <div className="hidden md:block">
                  {/* Space for future breadcrumbs/info */}
                </div>

                <div className="flex items-center gap-3">
                  {!isEditing ? (
                    <>
                      <button 
                        onClick={() => handleDelete(activeNoteId!)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-700 font-medium rounded-xl hover:bg-rose-100 transition-colors"
                      >
                        <Edit2 size={16} /> Edit Note
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-5 py-2.5 bg-stone-700 text-white font-medium rounded-xl hover:bg-stone-800 transition-colors shadow-sm"
                      >
                        <Save size={16} /> Save
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor / Viewer Content */}
              <div className="flex-1 overflow-y-auto px-6 lg:px-16 py-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                  {!isEditing && activeNote ? (
                    // Read Mode
                    <div className="animate-in fade-in duration-300">
                      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
                        {activeNote.title}
                      </h1>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-10 pb-6 border-b border-gray-100 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {safelyFormatDate(activeNote.createdAt)}
                        </span>
                        {(activeNote.tags || []).length > 0 && (
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <div className="flex flex-wrap gap-2">
                              {activeNote.tags.map(tag => (
                                <span key={tag} className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-md">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="prose prose-gray prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                        {activeNote.content}
                      </div>
                    </div>
                  ) : (
                    // Edit Mode
                    <div className="animate-in fade-in duration-300 space-y-6">
                      <input
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="Note Title"
                        className="w-full bg-transparent text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight outline-none placeholder:text-gray-300"
                        autoFocus
                      />

                      <div className="flex items-center border-b border-gray-200 pb-6 mb-6">
                        <div className="relative flex-1">
                          <Tag className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            value={form.tags}
                            onChange={e => setForm({ ...form, tags: e.target.value })}
                            placeholder="Tags (comma separated, e.g. Ideas, Tasks)"
                            className="w-full pl-7 pr-4 py-2 bg-transparent text-sm font-medium text-gray-600 outline-none placeholder:text-gray-400"
                          />
                        </div>
                      </div>

                      <textarea
                        value={form.content}
                        onChange={e => setForm({ ...form, content: e.target.value })}
                        placeholder="Start typing..."
                        className="w-full min-h-[500px] bg-transparent text-lg text-gray-700 leading-relaxed outline-none resize-none font-serif placeholder:text-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
