import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNurseApp, studyCategories, diseaseMiddleCategories, getSmallCategories } from '../../context/NurseAppContext';

const StudyTab = () => {
  const {
    user, studyNotes, setStudyNotes,
    todos, setTodos,
    showError, noteToState, todoToState,
  } = useNurseApp();

  const [newNote, setNewNote] = useState({ title: '', category: '', middleCategory: '', smallCategory: '', content: '', reviewDate: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState(null);
  const [noteError, setNoteError] = useState('');

  const addNote = async () => {
    if (!newNote.category || !newNote.content) {
      setNoteError('カテゴリと内容は必須です。');
      return;
    }
    setNoteError('');
    const { data, error } = await supabase.from('study_notes').insert({
      user_id: user.id, title: newNote.title, category: newNote.category,
      middle_category: newNote.middleCategory, small_category: newNote.smallCategory,
      content: newNote.content, review_date: newNote.reviewDate || null,
    }).select().single();
    if (!error && data) {
      setStudyNotes(prev => [noteToState(data), ...prev]);
      if (newNote.reviewDate) {
        const { data: todoData } = await supabase.from('todos').insert({
          user_id: user.id,
          title: `${newNote.title}の復習`,
          description: `カテゴリ: ${newNote.category}${newNote.middleCategory ? ` > ${newNote.middleCategory}` : ''}`,
          due_date: newNote.reviewDate, priority: 'medium',
          completed: false, from_study_note: true,
        }).select().single();
        if (todoData) setTodos(prev => [...prev, todoToState(todoData)].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
      }
      setNewNote({ title: '', category: '', middleCategory: '', smallCategory: '', content: '', reviewDate: '' });
    }
  };

  const saveEdit = async () => {
    if (!editNote?.title || !editNote?.category || !editNote?.content) return;
    const { error } = await supabase.from('study_notes').update({
      title: editNote.title, category: editNote.category,
      middle_category: editNote.middleCategory, small_category: editNote.smallCategory,
      content: editNote.content, review_date: editNote.reviewDate || null,
    }).eq('id', editingId);
    if (error) { showError('勉強ノートの更新に失敗しました'); return; }
    setStudyNotes(prev => prev.map(n => n.id === editingId ? { ...editNote } : n));
    setEditingId(null); setEditNote(null);
  };

  const deleteNote = async (id) => {
    const { error } = await supabase.from('study_notes').delete().eq('id', id);
    if (error) { showError('勉強ノートの削除に失敗しました'); return; }
    setStudyNotes(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotes = studyNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || note.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">新しい勉強ノート</h3>
        <input type="text" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
          placeholder="タイトル（任意）" className="w-full p-2 border rounded mb-2" />
        <select value={newNote.category} onChange={(e) => setNewNote({ ...newNote, category: e.target.value, middleCategory: '', smallCategory: '' })}
          className="w-full p-2 border rounded mb-2">
          <option value="">大カテゴリを選択</option>
          {studyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        {newNote.category === '疾患' && (
          <>
            <select value={newNote.middleCategory} onChange={(e) => setNewNote({ ...newNote, middleCategory: e.target.value, smallCategory: '' })}
              className="w-full p-2 border rounded mb-2">
              <option value="">中カテゴリ（診療科）を選択</option>
              {diseaseMiddleCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            {newNote.middleCategory && (
              <select value={newNote.smallCategory} onChange={(e) => setNewNote({ ...newNote, smallCategory: e.target.value })}
                className="w-full p-2 border rounded mb-2">
                <option value="">小カテゴリを選択</option>
                {getSmallCategories(newNote.middleCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            )}
          </>
        )}
        <textarea value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
          placeholder="学んだ内容を記録..." className="w-full p-2 border rounded h-32 mb-1" />
        <p className="text-xs text-red-400 mb-2">⚠️ 患者氏名・IDなどの個人情報は入力しないでください</p>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">復習リマインダー（任意）</label>
          <input type="date" value={newNote.reviewDate} onChange={(e) => setNewNote({ ...newNote, reviewDate: e.target.value })}
            className="w-full p-2 border rounded" />
          <p className="text-xs text-gray-500 mt-1">設定するとToDoに自動追加されます</p>
        </div>
        {noteError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded mb-2">{noteError}</p>}
        <button onClick={addNote} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2">
          <Plus size={16} /> 保存
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ノートを検索..." className="w-full pl-10 p-2 border rounded" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full p-2 border rounded">
            <option value="">すべてのカテゴリ</option>
            {studyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {filteredNotes.map(note => (
            <div key={note.id} className="border rounded-lg p-4 hover:bg-gray-50">
              {editingId === note.id ? (
                <div>
                  <input type="text" value={editNote.title} onChange={(e) => setEditNote({ ...editNote, title: e.target.value })} className="w-full p-2 border rounded mb-2" />
                  <select value={editNote.category} onChange={(e) => setEditNote({ ...editNote, category: e.target.value, middleCategory: '', smallCategory: '' })} className="w-full p-2 border rounded mb-2">
                    <option value="">大カテゴリを選択</option>
                    {studyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <textarea value={editNote.content} onChange={(e) => setEditNote({ ...editNote, content: e.target.value })} className="w-full p-2 border rounded h-32 mb-2" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 flex items-center gap-1"><Save size={14} /> 保存</button>
                    <button onClick={() => { setEditingId(null); setEditNote(null); }} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 flex items-center gap-1"><X size={14} /> キャンセル</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-blue-600">{note.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{note.category}</span>
                        {note.middleCategory && <span className="text-xs bg-blue-100 px-2 py-1 rounded">{note.middleCategory}</span>}
                        {note.smallCategory && <span className="text-xs bg-green-100 px-2 py-1 rounded">{note.smallCategory}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingId(note.id); setEditNote({ ...note }); }} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                      <button onClick={() => deleteNote(note.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  {note.reviewDate && <div className="text-xs text-gray-500 mt-2">復習予定: {note.reviewDate}</div>}
                  <div className="text-xs text-gray-400 mt-1">作成日: {new Date(note.createdAt).toLocaleDateString()}</div>
                </>
              )}
            </div>
          ))}
          {filteredNotes.length === 0 && <p className="text-gray-500 text-center py-4">ノートがありません</p>}
        </div>
      </div>
    </div>
  );
};

export default StudyTab;
