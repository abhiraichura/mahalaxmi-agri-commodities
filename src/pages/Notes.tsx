// src/pages/Notes.tsx
import { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, X, Trash2, Edit2, Save, Tag, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const sortedNotes = useMemo(() => {
    let result = notes;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = notes.filter(n => 
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [notes, search]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      id: editing || uuidv4(),
      title: form.title,
      content: form.content,
      tags,
      updatedAt: new Date().toISOString(),
      createdAt: editing ? notes.find(n => n.id === editing)?.createdAt : new Date().toISOString()
    };

    try {
      if (editing) {
        await updateNote(editing, payload);
        toast.success('Note updated successfully');
      } else {
        await addNote(payload);
        toast.success('New note created');
      }
      resetForm();
    } catch {
      toast.error('Failed to save note');
    }
  };

  const startEdit = (note: any) => {
    setEditing(note.id);
    setForm({
      title: note.title,
      content: note.content,
      tags: (note.tags || []).join(', ')
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    await deleteNote(id);
    toast.success('Note deleted');
    if (editing === id) {
      resetForm();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ title: '', content: '', tags: '' });
    setIsFormOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:px-8 bg-gray-50 min-h-screen">
      {/* Header & Search Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Business Notes</h1>
          <p className="text-sm font-medium text-gray-500 mt-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} recorded
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-rose-500 transition-colors duration-300" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 transition-all duration-300 outline-none shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {!isFormOpen && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex-shrink-0 flex items-center justify-center px-5 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-200 transition-all duration-300 gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Note</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Add/Edit Form */}
      <div 
        className={`transform transition-all duration-500 ease-in-out origin-top overflow-hidden ${
          isFormOpen ? 'opacity-100 max-h-[800px] mb-10' : 'opacity-0 max-h-0 mb-0'
        }`}
      >
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                {editing ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <h3 className="font-bold text-lg text-gray-900">
                {editing ? 'Edit Note' : 'Create New Note'}
              </h3>
            </div>
            <button 
              onClick={resetForm}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Note Title"
              className="w-full px-4 py-3 text-lg font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 transition-shadow outline-none placeholder:font-normal"
            />
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Write your thoughts here..."
              rows={5}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-rose-500 transition-shadow outline-none resize-none leading-relaxed"
            />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div className="relative flex-1 max-w-md">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  placeholder="Tags (comma separated)"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-8 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-200 transition-all duration-300"
                >
                  <Save className="w-4 h-4" /> 
                  {editing ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {sortedNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No notes found</h3>
          <p className="text-gray-500 max-w-sm">
            {search ? "We couldn't find any notes matching your search." : "You haven't created any notes yet. Click the + button to start."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedNotes.map(note => (
            <div 
              key={note.id} 
              className="group flex flex-col bg-white border border-gray-200 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-md hover:border-rose-200 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="pr-4">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1">
                    {note.title}
                  </h3>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    {format(new Date(note.createdAt || new Date()), 'MMM dd, yyyy • hh:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={() => startEdit(note)} 
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(note.id)} 
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-gray-600 text-sm leading-relaxed mb-6 flex-1 whitespace-pre-wrap mt-3">
                {note.content}
              </div>
              
              {(note.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-100">
                  {note.tags.map((tag: string) => (
                    <span 
                      key={tag} 
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
