import React, { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNurseApp, SHIFT_COLORS, professions, departments } from '../../context/NurseAppContext';

const SettingsTab = () => {
  const { user, userSettings, setUserSettings, showError } = useNurseApp();

  const [tempSettings, setTempSettings] = useState(userSettings);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newShift, setNewShift] = useState({ label: '', start: '08:00', end: '17:00', color: 'red' });

  const handlePasswordChange = async () => {
    setPasswordMessage(''); setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('パスワードは6文字以上で入力してください。'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('パスワードが一致しません。'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPasswordError('パスワードの変更に失敗しました。'); }
    else { setPasswordMessage('パスワードを変更しました。'); setNewPassword(''); setConfirmPassword(''); }
  };

  const handleSave = async () => {
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      profession: tempSettings.profession,
      department: tempSettings.department,
      shift_system: tempSettings.shiftSystem,
      shift_times: tempSettings.shiftTimes,
      custom_shifts: tempSettings.customShifts || [],
    }, { onConflict: 'user_id' });
    if (error) { showError('設定の保存に失敗しました'); return; }
    setUserSettings(tempSettings);
    alert('設定を保存しました！');
  };

  const getAvailableShiftTypes = () => {
    if (tempSettings.shiftSystem === 'day') return ['day', 'am', 'pm', 'late', 'early'];
    if (tempSettings.shiftSystem === '3') return ['day', 'evening', 'lateNight', 'am', 'pm', 'late', 'early'];
    return ['day', 'night', 'am', 'pm', 'late', 'early'];
  };
  const DEFAULT_LABELS = { day:'日勤', night:'夜勤', evening:'準夜勤', lateNight:'深夜勤', am:'AM', pm:'PM', late:'遅出', early:'早出' };

  const updateShiftTime = (shiftId, field, value) => {
    const cur = tempSettings.shiftTimes[shiftId] || { start: '00:00', end: '00:00' };
    setTempSettings({ ...tempSettings, shiftTimes: { ...tempSettings.shiftTimes, [shiftId]: { ...cur, [field]: value } } });
  };

  const addCustomShift = () => {
    if (!newShift.label.trim()) return;
    const id = `custom_${Date.now()}`;
    setTempSettings(prev => ({ ...prev, customShifts: [...(prev.customShifts || []), { id, ...newShift }] }));
    setNewShift({ label: '', start: '08:00', end: '17:00', color: 'rose' });
  };

  const updateCustomShift = (idx, field, value) => {
    setTempSettings(prev => {
      const updated = [...(prev.customShifts || [])];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, customShifts: updated };
    });
  };

  const deleteCustomShift = (idx) => {
    setTempSettings(prev => ({ ...prev, customShifts: (prev.customShifts || []).filter((_, i) => i !== idx) }));
  };

  const ColorPicker = ({ selected, onChange }) => (
    <div className="flex gap-2 flex-wrap mt-2">
      {SHIFT_COLORS.map(c => (
        <button key={c.key} onClick={() => onChange(c.key)}
          style={{ backgroundColor: c.bg }}
          className={`w-7 h-7 rounded-full border-2 transition-transform ${selected === c.key ? 'border-gray-700 scale-125' : 'border-transparent'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4 text-lg">ユーザー属性</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">職種</label>
          <select value={tempSettings.profession} onChange={(e) => setTempSettings({ ...tempSettings, profession: e.target.value })} className="w-full p-2 border rounded">
            <option value="">選択してください</option>
            {professions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">所属病棟</label>
          <select value={tempSettings.department} onChange={(e) => setTempSettings({ ...tempSettings, department: e.target.value })} className="w-full p-2 border rounded">
            <option value="">選択してください</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">勤務体制</label>
          <select value={tempSettings.shiftSystem} onChange={(e) => setTempSettings({ ...tempSettings, shiftSystem: e.target.value })} className="w-full p-2 border rounded">
            <option value="day">日勤のみ</option>
            <option value="2">2交代制（日勤・夜勤）</option>
            <option value="3">3交代制（日勤・準夜勤・深夜勤）</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-1 text-lg">シフト種別の設定</h3>
        <p className="text-xs text-gray-400 mb-4">勤務名・開始・終了時刻を変更できます</p>
        {getAvailableShiftTypes().map(shiftId => {
          const shiftTime = tempSettings.shiftTimes[shiftId] || { start: '00:00', end: '00:00' };
          return (
            <div key={shiftId} className="mb-4 p-3 bg-gray-50 rounded-lg">
              <input type="text"
                value={shiftTime.label ?? DEFAULT_LABELS[shiftId]}
                onChange={(e) => updateShiftTime(shiftId, 'label', e.target.value)}
                className="w-full p-2 border rounded mb-2 font-medium text-sm"
                placeholder={DEFAULT_LABELS[shiftId]} />
              <div className="grid grid-cols-2 gap-2">
                <input type="time" value={shiftTime.start} onChange={(e) => updateShiftTime(shiftId, 'start', e.target.value)} className="p-2 border rounded text-sm" />
                <input type="time" value={shiftTime.end} onChange={(e) => updateShiftTime(shiftId, 'end', e.target.value)} className="p-2 border rounded text-sm" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-1 text-lg">カスタムシフト種別</h3>
        <p className="text-xs text-gray-400 mb-4">自由に追加・削除できます</p>
        {(tempSettings.customShifts || []).map((cs, idx) => (
          <div key={cs.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex gap-2 mb-2">
              <input type="text" value={cs.label}
                onChange={(e) => updateCustomShift(idx, 'label', e.target.value)}
                placeholder="勤務名" className="flex-1 p-2 border rounded text-sm font-medium" />
              <button onClick={() => deleteCustomShift(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-1">
              <input type="time" value={cs.start} onChange={(e) => updateCustomShift(idx, 'start', e.target.value)} className="p-2 border rounded text-sm" />
              <input type="time" value={cs.end} onChange={(e) => updateCustomShift(idx, 'end', e.target.value)} className="p-2 border rounded text-sm" />
            </div>
            <ColorPicker selected={cs.color} onChange={(c) => updateCustomShift(idx, 'color', c)} />
          </div>
        ))}
        <div className="p-3 border-2 border-dashed border-indigo-200 rounded-lg">
          <p className="text-sm font-semibold text-indigo-700 mb-2">＋ 新しいシフト種別を追加</p>
          <input type="text" value={newShift.label} onChange={(e) => setNewShift({ ...newShift, label: e.target.value })}
            placeholder="勤務名（例：日長、夜勤A）" className="w-full p-2 border rounded mb-2 text-sm" />
          <div className="grid grid-cols-2 gap-2 mb-1">
            <input type="time" value={newShift.start} onChange={(e) => setNewShift({ ...newShift, start: e.target.value })} className="p-2 border rounded text-sm" />
            <input type="time" value={newShift.end} onChange={(e) => setNewShift({ ...newShift, end: e.target.value })} className="p-2 border rounded text-sm" />
          </div>
          <ColorPicker selected={newShift.color} onChange={(c) => setNewShift({ ...newShift, color: c })} />
          <button onClick={addCustomShift}
            className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 flex items-center justify-center gap-1">
            <Plus size={16} /> 追加する
          </button>
        </div>
      </div>

      <button onClick={handleSave} className="w-full bg-blue-500 text-white px-4 py-3 rounded hover:bg-blue-600 flex items-center justify-center gap-2 font-semibold">
        <Save size={20} /> 設定を保存
      </button>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4 text-lg">パスワード変更</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">新しいパスワード（6文字以上）</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full p-2 border rounded" />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">新しいパスワード（確認）</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full p-2 border rounded" />
        </div>
        {passwordError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded mb-2">{passwordError}</p>}
        {passwordMessage && <p className="text-green-600 text-sm bg-green-50 p-2 rounded mb-2">{passwordMessage}</p>}
        <button onClick={handlePasswordChange} className="w-full bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 font-semibold">
          パスワードを変更する
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;
