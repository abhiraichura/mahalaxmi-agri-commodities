import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, Trash2, Edit2, Save, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.tags?.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editing) {
      await updateNote(editing.id, { title: form.title, content: form.content, tags });
      toast.success('Note updated');
    } else {
      await addNote({
        id: uuidv4(),
        title: form.title,
        content: form.content,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('Note added');
    }
    setEditing(null);
    setForm({ title: '', content: '', tags: '' });
  };

  const handleEdit = (note: any) => {
    setEditing(note);
    setForm({
      title: note.title,
      content: note.content || '',
      tags: (note.tags || []).join(', ')
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await deleteNote(id);
    toast.success('Note deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Quick business notes, searchable anytime</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ title: '', content: '', tags: '' }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes by title, content, or tags..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
        />
      </div>

      {/* Note Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          {editing ? <Edit2 className="w-4 h-4 text-rose-600" /> : <Plus className="w-4 h-4 text-rose-600" />}
          <h3 className="font-semibold text-gray-900">{editing ? 'Edit Note' : 'Add Note'}</h3>
        </div>
        <div className="space-y-3">
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Note title..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
          <textarea
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="Note content..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
          />
          <input
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="Tags (comma separated) e.g. urgent, payment, followup"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button
                onClick={() => { setEditing(null); setForm({ title: '', content: '', tags: '' }); }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">{search ? 'No notes match your search' : 'No notes yet. Add your first note above.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(note => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{note.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(note)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {note.content && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{note.content}</p>}
              {note.tags && note.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <Tag className="w-3 h-3 text-gray-400" />
                  {note.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 font-medium">{tag}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                {new Date(note.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
