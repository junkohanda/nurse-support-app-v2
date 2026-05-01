import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNurseApp } from '../../context/NurseAppContext';

const TodoTab = () => {
  const {
    user, todos, setTodos,
    showCelebration, setShowCelebration,
    showError, todoToState,
  } = useNurseApp();

  const [newTodo, setNewTodo] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });

  const addTodo = async () => {
    if (!newTodo.title || !newTodo.dueDate) return;
    const { data, error } = await supabase.from('todos').insert({
      user_id: user.id, title: newTodo.title, description: newTodo.description,
      due_date: newTodo.dueDate, priority: newTodo.priority,
      completed: false, from_study_note: false,
    }).select().single();
    if (!error && data) {
      setTodos(prev => [...prev, todoToState(data)].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
      setNewTodo({ title: '', description: '', dueDate: '', priority: 'medium' });
    }
  };

  const toggleComplete = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo.completed) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    const { error } = await supabase.from('todos').update({ completed: !todo.completed }).eq('id', id);
    if (error) { showError('ToDoの更新に失敗しました'); return; }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = async (id) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) { showError('ToDoの削除に失敗しました'); return; }
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="space-y-4">
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 pointer-events-none">
          <div className="text-8xl animate-bounce">💮</div>
        </div>
      )}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">新しいToDo</h3>
        <input type="text" value={newTodo.title} onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
          placeholder="タイトル" className="w-full p-2 border rounded mb-2" />
        <textarea value={newTodo.description} onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
          placeholder="詳細（任意）" className="w-full p-2 border rounded h-20 mb-1" />
        <p className="text-xs text-red-400 mb-2">⚠️ 患者氏名・IDなどの個人情報は入力しないでください</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="date" value={newTodo.dueDate} onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })} className="p-2 border rounded" />
          <select value={newTodo.priority} onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })} className="p-2 border rounded">
            <option value="low">優先度: 低</option>
            <option value="medium">優先度: 中</option>
            <option value="high">優先度: 高</option>
          </select>
        </div>
        <button onClick={addTodo} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2">
          <Plus size={16} /> 追加
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">未完了のToDo ({activeTodos.length})</h3>
        <div className="space-y-2">
          {activeTodos.map(todo => (
            <div key={todo.id} className={`p-3 rounded border ${todo.priority === 'high' ? 'border-red-300 bg-red-50' : todo.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300 bg-blue-50'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo.id)} className="mt-1" />
                <div className="flex-1">
                  <div className="font-medium">{todo.title}</div>
                  {todo.description && <div className="text-sm text-gray-600 mt-1">{todo.description}</div>}
                  <div className="text-xs text-gray-500 mt-1">期限: {todo.dueDate}</div>
                </div>
                <button onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {activeTodos.length === 0 && <p className="text-gray-500 text-center py-4">未完了のToDoはありません</p>}
        </div>
      </div>
      {completedTodos.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">完了したToDo ({completedTodos.length})</h3>
          <div className="space-y-2">
            {completedTodos.map(todo => (
              <div key={todo.id} className="p-3 rounded border border-green-300 bg-green-50 opacity-60">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo.id)} className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium line-through">{todo.title}</div>
                  </div>
                  <button onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoTab;
