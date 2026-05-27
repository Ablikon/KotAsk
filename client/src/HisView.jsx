import { useState, useEffect } from 'react';
import { Heart, Trash2, Sun, MessageSquare, CheckCircle, Edit3 } from 'lucide-react';

export default function HisView() {
  const [entries, setEntries] = useState([]);
  const [commentInput, setCommentInput] = useState({});
  const [editingComment, setEditingComment] = useState({});
  
  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {}
  };

  const markSeen = async (id) => {
    try {
      await fetch('http://localhost:3000/api/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchEntries();
    } catch (err) {}
  };

  const toggleWarmth = async (id, currentStatus) => {
    try {
      await fetch('http://localhost:3000/api/warmth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, warmth_status: !currentStatus })
      });
      fetchEntries();
    } catch (err) {}
  };

  const saveComment = async (id) => {
    try {
      await fetch('http://localhost:3000/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, admin_comment: commentInput[id] || '' })
      });
      setEditingComment(prev => ({ ...prev, [id]: false }));
      fetchEntries();
    } catch (err) {}
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Точно удалить?")) return;
    try {
      await fetch(`http://localhost:3000/api/entries/${id}`, {
        method: 'DELETE'
      });
      fetchEntries();
    } catch (err) {}
  };

  const sendHeart = async () => {
    try {
      await fetch('http://localhost:3000/api/heart', { method: 'POST' });
    } catch (err) {}
  };

  const sendPhoto = async () => {
    try {
      await fetch('http://localhost:3000/api/photo', { method: 'POST' });
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-light tracking-wide text-gray-700">Твоя панель</h1>
          <div className="flex gap-4">
            <button 
              onClick={sendPhoto}
              className="flex items-center gap-2 bg-blue-100/80 text-blue-700 px-5 py-2.5 rounded-full hover:bg-blue-200 transition-colors shadow-sm"
            >
              Отправить воспоминание (Фото)
            </button>
            <button 
              onClick={sendHeart}
              className="flex items-center gap-2 bg-pink-100/80 text-pink-700 px-5 py-2.5 rounded-full hover:bg-pink-200 transition-colors shadow-sm"
            >
              <Heart size={18} fill="currentColor" />
              Отправить знак любимой
            </button>
          </div>
        </header>

        <main className="space-y-6">
          {entries.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-10">Пока нет записей...</p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative transition-all hover:shadow-md">
                
                <div className="flex justify-between gap-4">
                  <p className="text-gray-700 whitespace-pre-wrap text-lg leading-relaxed flex-1">
                    {entry.content}
                  </p>
                  
                  {/* Actions Column */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <button 
                      onClick={() => toggleWarmth(entry.id, entry.warmth_status)}
                      className={`p-2 rounded-full transition-colors ${entry.warmth_status ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                      title={entry.warmth_status ? "Убрать тепло" : "Добавить тепло (Glow)"}
                    >
                      <Sun size={20} />
                    </button>
                    {!entry.seen_status && (
                      <button 
                        onClick={() => markSeen(entry.id)}
                        className="p-2 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                        title="Пометить прочитанным"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteEntry(entry.id)}
                      className="p-2 rounded-full bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors mt-auto"
                      title="Удалить запись"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Comment Section */}
                <div className="mt-6 border-t border-gray-50 pt-4">
                  {(editingComment[entry.id] || (!entry.admin_comment && editingComment[entry.id] !== false)) ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <MessageSquare size={16} />
                        <span>Твой комментарий:</span>
                      </div>
                      <textarea
                        value={commentInput[entry.id] !== undefined ? commentInput[entry.id] : (entry.admin_comment || '')}
                        onChange={(e) => setCommentInput({...commentInput, [entry.id]: e.target.value})}
                        className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-none min-h-[80px] text-sm"
                        placeholder="Напиши что-нибудь теплое..."
                      />
                      <div className="flex justify-end gap-2 mt-1">
                        {entry.admin_comment && (
                            <button 
                              onClick={() => setEditingComment({...editingComment, [entry.id]: false})}
                              className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Отмена
                            </button>
                        )}
                        <button 
                          onClick={() => saveComment(entry.id)}
                          className="px-4 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {entry.admin_comment ? (
                        <div className="group relative bg-gray-50 p-4 rounded-xl text-gray-600 text-sm italic pr-12">
                           {entry.admin_comment}
                           <button 
                             onClick={() => {
                               setEditingComment({...editingComment, [entry.id]: true});
                               setCommentInput({...commentInput, [entry.id]: entry.admin_comment});
                             }}
                             className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-white"
                             title="Редактировать комментарий"
                           >
                             <Edit3 size={16} />
                           </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setEditingComment({...editingComment, [entry.id]: true})}
                          className="text-sm text-gray-400 hover:text-blue-500 flex items-center gap-2 transition-colors"
                        >
                          <MessageSquare size={16} />
                          Добавить комментарий
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-between items-center text-xs text-gray-400 font-medium tracking-wide border-t border-gray-50 pt-4">
                  <span>
                    {new Date(entry.created_at).toLocaleString('ru-RU')}
                  </span>
                  {entry.seen_status && (
                    <span className="text-green-500 flex items-center gap-1">
                      <CheckCircle size={14} />
                      Ты это уже видел
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}