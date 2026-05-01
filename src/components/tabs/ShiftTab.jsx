import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit2, Share2, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { useNurseApp, toLocalDateStr } from '../../context/NurseAppContext';

const ShiftTab = () => {
  const {
    user, shifts, setShifts,
    currentMonth, setCurrentMonth,
    seqDate, setSeqDate,
    selectedDate, setSelectedDate,
    calendarSelectedDate, setCalendarSelectedDate,
    calendarEvents,
    todos,
    showCopyConfirm, setShowCopyConfirm,
    shiftSubTab, setShiftSubTab,
    editingEvent, setEditingEvent,
    showEventModal, setShowEventModal,
    shiftTypes, shiftSeqDate,
  } = useNurseApp();

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    return days;
  };

  const formatDateKey = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const handleDayClick = (day) => {
    if (!day) return;
    const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSeqDate(dateKey);
    setSelectedDate(null);
  };

  const handleCalendarDayClick = (day) => {
    if (!day) return;
    const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setCalendarSelectedDate(prev => prev === dateKey ? null : dateKey);
  };

  const applyShiftAndAdvance = async (shiftId) => {
    if (shiftId === 'clear') {
      await clearShift(seqDate);
    } else {
      await selectShift(seqDate, shiftId);
    }
    setSeqDate(shiftSeqDate(seqDate, 1));
  };

  const selectShift = async (dateKey, shiftId) => {
    await supabase.from('shifts').upsert(
      { user_id: user.id, date: dateKey, shift_type: shiftId },
      { onConflict: 'user_id,date' }
    );
    setShifts(prev => ({ ...prev, [dateKey]: shiftId }));
  };

  const clearShift = async (dateKey) => {
    await supabase.from('shifts').delete().eq('user_id', user.id).eq('date', dateKey);
    setShifts(prev => { const n = { ...prev }; delete n[dateKey]; return n; });
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    setCurrentMonth(newMonth);
    setSeqDate(`${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, '0')}-01`);
    setSelectedDate(null);
  };

  const getTodosForDate = (dateKey) => todos.filter(t => t.dueDate === dateKey && !t.completed);

  const getOverdueTodos = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return todos.filter(t => !t.completed && new Date(t.dueDate) < today);
  };

  const overdueTodos = getOverdueTodos();
  const days = getDaysInMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const getNightShiftMessage = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = toLocalDateStr(yesterday);
    const yShift = shifts[yKey];
    if (yShift === 'night' || yShift === 'lateNight' || yShift === 'evening') {
      return '昨日は夜勤でしたね。ゆっくり休めていますか？無理しすぎないでください。';
    }
    const todayKey = toLocalDateStr(new Date());
    const todayShift = shifts[todayKey];
    if (todayShift === 'night' || todayShift === 'evening') {
      return '今日は夜勤ですね。無理せず、良い勤務になりますように。';
    }
    return null;
  };
  const nightShiftMessage = getNightShiftMessage();

  const copyShiftsFromPrevMonth = async () => {
    const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevY = prevMonthDate.getFullYear();
    const prevM = prevMonthDate.getMonth();
    const prevStart = `${prevY}-${String(prevM + 1).padStart(2, '0')}-01`;
    const currentStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const { data: prevShifts } = await supabase
      .from('shifts').select('*')
      .eq('user_id', user.id)
      .gte('date', prevStart).lt('date', currentStart);

    const maxDay = new Date(year, month + 1, 0).getDate();
    const toUpsert = (prevShifts || [])
      .map(s => ({
        user_id: user.id,
        date: `${year}-${String(month + 1).padStart(2, '0')}-${s.date.split('-')[2]}`,
        shift_type: s.shift_type,
      }))
      .filter(s => parseInt(s.date.split('-')[2]) <= maxDay);

    if (toUpsert.length > 0) {
      await supabase.from('shifts').upsert(toUpsert, { onConflict: 'user_id,date' });
      setShifts(prev => {
        const next = { ...prev };
        toUpsert.forEach(s => { next[s.date] = s.shift_type; });
        return next;
      });
    }
    setShowCopyConfirm(false);
  };

  const shareCalendarImage = async () => {
    const el = document.getElementById('shift-calendar-capture');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const fileName = `シフト_${year}年${month + 1}月.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: fileName, files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const CalendarView = () => (
    <div className="space-y-4">
      {nightShiftMessage && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-indigo-800 text-sm flex items-start gap-2">
          <span className="text-xl">🌙</span>
          <p>{nightShiftMessage}</p>
        </div>
      )}
      <div className="bg-white p-4 rounded-lg shadow">
        <div id="shift-calendar-capture" className="bg-white">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
            <h3 className="font-bold text-lg">{year}年 {month + 1}月</h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['日','月','火','水','木','金','土'].map(d => (
              <div key={d} className="text-center font-semibold text-sm py-2 text-gray-600">{d}</div>
            ))}
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
              const dateKey = formatDateKey(year, month, day);
              const shiftType = shifts[dateKey];
              const shiftInfo = shiftTypes.find(s => s.id === shiftType);
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const isSelected = calendarSelectedDate === dateKey;
              const hasTodos = getTodosForDate(dateKey).length > 0;
              const dayEvents = calendarEvents[dateKey] || [];
              const ringClass = isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : isToday ? 'ring-2 ring-blue-400' : '';
              return (
                <button key={day} onClick={() => handleCalendarDayClick(day)}
                  className={`aspect-square border rounded p-1 hover:bg-gray-50 transition relative ${ringClass} ${shiftInfo ? shiftInfo.color : 'bg-white'}`}>
                  <div className="text-sm font-semibold leading-none">{day}</div>
                  {shiftInfo && <div className="text-xs mt-0.5 leading-none">{shiftInfo.label.slice(0, 2)}</div>}
                  {dayEvents.length > 0 && (
                    <div className="absolute top-0 right-0 text-xs leading-none">{dayEvents[0].stamp || '📌'}</div>
                  )}
                  {hasTodos && (
                    <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={shareCalendarImage}
          className="w-full mt-3 py-2.5 rounded-xl border-2 border-indigo-200 text-indigo-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-50 active:scale-95 transition">
          <Share2 size={16} /> この月を共有・保存
        </button>
        <button onClick={() => setShowCopyConfirm(true)}
          className="w-full mt-2 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition">
          <Copy size={16} /> 先月からシフトをコピー
        </button>

        {calendarSelectedDate ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">
                {new Date(calendarSelectedDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
              </span>
              <button onClick={() => { setEditingEvent(null); setShowEventModal(true); }}
                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition">
                <Plus size={14} /> 追加
              </button>
            </div>
            {(calendarEvents[calendarSelectedDate] || []).length > 0 ? (
              <div className="space-y-1">
                {(calendarEvents[calendarSelectedDate] || []).map(evt => (
                  <button key={evt.id}
                    onClick={() => { setEditingEvent(evt); setShowEventModal(true); }}
                    className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition">
                    <span className="text-xl">{evt.stamp || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      {evt.title && <div className="text-sm font-medium text-gray-800 truncate">{evt.title}</div>}
                      {evt.memo && <div className="text-xs text-gray-500 truncate">{evt.memo}</div>}
                      {!evt.title && !evt.memo && <div className="text-xs text-gray-400">メモなし</div>}
                    </div>
                    <Edit2 size={14} className="text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">この日のイベントはありません</p>
            )}
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-400 text-center">日付をタップしてイベントを追加できます</div>
        )}

        {overdueTodos.length > 0 && (
          <div className={`mt-4 border rounded p-3 ${overdueTodos.some(t => t.priority === 'high') ? 'bg-red-100 border-red-500' : 'bg-red-50 border-red-300'}`}>
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <span className="font-semibold">
                {overdueTodos.some(t => t.priority === 'high') ? '🚨 緊急！ ' : '⚠️ '}
                未完了のToDoがあります（{overdueTodos.length}件）
              </span>
            </div>
            <div className="space-y-1">
              {overdueTodos.slice(0, 3).map(todo => (
                <div key={todo.id} className={`text-xs ${todo.priority === 'high' ? 'text-red-800 font-semibold' : 'text-red-600'}`}>
                  {todo.priority === 'high' && '🔴 '}• {todo.title}（期限: {todo.dueDate}）
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const InputView = () => (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
          <h3 className="font-bold text-base">{year}年 {month + 1}月</h3>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-3">
          {['日','月','火','水','木','金','土'].map(d => (
            <div key={d} className="text-center font-semibold text-xs py-1 text-gray-500">{d}</div>
          ))}
          {days.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
            const dateKey = formatDateKey(year, month, day);
            const shiftType = shifts[dateKey];
            const shiftInfo = shiftTypes.find(s => s.id === shiftType);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const isSeqCursor = dateKey === seqDate;
            return (
              <button key={day} onClick={() => handleDayClick(day)}
                className={`aspect-square border rounded p-0.5 transition relative ${isSeqCursor ? 'ring-2 ring-indigo-500' : isToday ? 'ring-2 ring-blue-400' : ''} ${shiftInfo ? shiftInfo.color : 'bg-white'}`}>
                <div className="text-xs font-semibold leading-none">{day}</div>
                {shiftInfo && <div className="text-xs leading-none mt-0.5">{shiftInfo.label.slice(0, 2)}</div>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="text-center mb-4 py-3 bg-indigo-50 rounded-lg">
          <div className="font-bold text-xl text-indigo-900">
            {new Date(seqDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
          {shifts[seqDate] ? (
            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${shiftTypes.find(s => s.id === shifts[seqDate])?.color}`}>
              {shiftTypes.find(s => s.id === shifts[seqDate])?.label} 入力済み
            </span>
          ) : (
            <span className="text-xs text-gray-400">未入力</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {shiftTypes.map(shift => (
            <button key={shift.id} onClick={() => applyShiftAndAdvance(shift.id)}
              className={`py-4 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${shift.color} hover:opacity-80 shadow-sm`}>
              {shift.label}
            </button>
          ))}
        </div>
        <button onClick={() => setSeqDate(shiftSeqDate(seqDate, 1))}
          className="w-full py-3 rounded-xl border-2 border-gray-200 text-sm text-gray-400 font-medium hover:bg-gray-50 active:scale-95">
          スキップ（次の日へ）→
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {showCopyConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-lg mb-3">シフトをコピー</h3>
            <p className="text-sm text-gray-700 mb-2">
              {new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                .toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}のシフトを
              <span className="font-semibold"> {year}年{month + 1}月</span>にコピーします。
            </p>
            <p className="text-xs text-red-500 mb-5">
              ※ {year}年{month + 1}月に入力済みのシフトは上書きされます
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowCopyConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
                キャンセル
              </button>
              <button onClick={copyShiftsFromPrevMonth}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition">
                コピーする
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setShiftSubTab('calendar')}
          className={`py-2 rounded-lg font-semibold text-sm transition ${shiftSubTab === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          カレンダー
        </button>
        <button onClick={() => setShiftSubTab('input')}
          className={`py-2 rounded-lg font-semibold text-sm transition ${shiftSubTab === 'input' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          シフト入力
        </button>
      </div>
      {shiftSubTab === 'calendar' ? <CalendarView /> : <InputView />}
    </div>
  );
};

export default ShiftTab;
