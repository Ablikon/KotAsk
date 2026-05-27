import { useState, useEffect, useRef } from 'react';
import { Heart, Volume2, VolumeX } from 'lucide-react';

const ALL_PHOTOS = [
  'photo1.JPG', 'photo2.JPG', 'photo3.JPG', 'photo4.JPG', 'photo5.JPG', 'photo6.JPG',
  'photo7.png', 'photo8.png', 'photo9.png', 'photo10.png', 'photo11.png', 'photo12.JPG',
  'photo13.png', 'photo14.png', 'photo15.png', 'photo16.png', 'photo17.png', 'photo18.png',
  'photo19.png', 'photo20.png', 'photo21.png', 'photo22.png', 'photo23.png', 'photo24.png',
  'photo25.JPG', 'photo26.png', 'photo27.png'
];

export default function HerView() {
  const [content, setContent] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [photoMemory, setPhotoMemory] = useState(null);
  const [entries, setEntries] = useState([]);
  
  // Audio & Gateway state
  const [isPlaying, setIsPlaying] = useState(false);
  const [entered, setEntered] = useState(false);
  const [typingDone, setTypingDone] = useState(false);
  const [typingStage, setTypingStage] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!entered || typingDone) return;
    
    const t1 = setTimeout(() => setTypingStage(1), 1000);
    const t2 = setTimeout(() => setTypingStage(2), 3500);
    const t3 = setTimeout(() => setTypingStage(3), 6000);
    const t4 = setTimeout(() => setTypingStage(4), 9500); // fade out
    const t5 = setTimeout(() => setTypingDone(true), 11000); // go to main
    
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
    };
  }, [entered, typingDone]);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/91_elven_glade.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!entered) return;
    
    // Auto-photo popup every 3 minutes (180000ms)
    const photoInterval = setInterval(() => {
      const randomPhoto = ALL_PHOTOS[Math.floor(Math.random() * ALL_PHOTOS.length)];
      setPhotoMemory(`/gallery/${randomPhoto}`);
      setTimeout(() => setPhotoMemory(null), 30000); // Fades away after 30 sec
    }, 180000); 

    fetchEntries();
    
    // Notify admin silently that she opened the page
    fetch('/api/notify-visit', { method: 'POST' }).catch(() => {});
    
    const sse = new EventSource('/api/events');
    sse.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'HEART') {
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 5000);
      } else if (data.type === 'SEEN') {
        setEntries(prev => prev.map(e => e.id === data.id ? { ...e, seen_status: true } : e));
      } else if (data.type === 'UPDATE_ENTRY' || data.type === 'DELETE_ENTRY') {
        fetchEntries();
      }
    };
    
    return () => {
      sse.close();
      clearInterval(photoInterval);
    };
  }, [entered]);

  const handleEnter = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 10; // Пропускаем первые 10 секунд
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setEntered(true);
  };

  const toggleAudio = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/entries');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        setContent('');
        setIsSent(true);
        fetchEntries();
        setTimeout(() => setIsSent(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!entered) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-6 relative">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
          <div className="w-32 h-32 rounded-full border border-gray-200 animate-breathe"></div>
        </div>
        <button 
          onClick={handleEnter}
          className="text-[#888] hover:text-[#333] transition-colors font-light tracking-wide text-[16px] z-10 px-8 py-4 animate-pulse"
        >
          нажми, чтобы стало спокойнее
        </button>
      </div>
    );
  }

  if (entered && !typingDone) {
    return (
      <div className={`min-h-screen bg-[#fcfbf9] flex items-center justify-center p-6 transition-opacity duration-1000 ${typingStage >= 4 ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col items-center space-y-8 text-[#555] font-light text-[17px] tracking-wide text-center">
          <p className={`transition-all duration-1000 transform ${typingStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Привет, котя...
          </p>
          <p className={`transition-all duration-1000 transform ${typingStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Просто хотел сказать...
          </p>
          <p className={`transition-all duration-1000 transform ${typingStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Что очень тебя люблю! ❤️
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#333] flex flex-col items-center p-6 relative animate-fade-in">
      <div className="max-w-md w-full mt-12 mb-8 space-y-4 text-[#555] font-light text-sm text-center tracking-wide">
        <p>Я понимаю, что ты хочешь побыть одна.</p>
        <p>Но я все равно беспокоюсь и хочу узнать как ты себя чувствуешь.</p>
        <p>Если захочешь — пиши сюда. Я не буду на тебя давить, но я все увижу</p>
        <p>Я всё равно буду рядом.</p>
        <p>💘Я тебя очень сильно люблю моя котя💘</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col mb-10">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="..."
          className="w-full p-4 rounded-xl border border-[#eaeaea] bg-white outline-none focus:border-[#ccc] focus:ring-1 focus:ring-[#ccc] transition-all resize-none min-h-[120px]"
        />
        <div className="flex justify-end mt-4 h-10">
          {isSent ? (
            <span className="text-gray-400 text-sm flex items-center">Отправлено.</span>
          ) : (
            <button 
              disabled={!content.trim()} 
              type="submit" 
              className="text-[#666] hover:text-black transition-colors px-4 py-2 text-sm disabled:opacity-30 disabled:hover:text-[#666]"
            >
              Отправить
            </button>
          )}
        </div>
      </form>

      <div className="w-full max-w-md space-y-6">
        {entries.map(entry => (
          <div key={entry.id} className={`text-[#444] text-[15px] leading-relaxed relative text-left whitespace-pre-wrap pl-4 border-l-2 z-10 p-2 transition-all duration-1000 ${entry.warmth_status ? 'bg-orange-50/50 shadow-[0_0_20px_rgba(255,237,213,0.8)] border-orange-300 rounded-r-xl' : 'border-[#eee]'}`}>
            {entry.content}
            
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-[#aaa]">
                {new Date(entry.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute:'2-digit', day:'numeric', month:'short' })}
              </span>
              {entry.seen_status && (
                <span className="text-[11px] text-[#a4c9b3] flex items-center gap-1 italic">
                  он видел это
                </span>
              )}
            </div>
            
            {entry.admin_comment && (
                <div className="mt-3 text-sm text-[#8a8a8a] italic bg-white/50 p-3 rounded-lg border border-[#f0f0f0]">
                   {entry.admin_comment}
                </div>
            )}
            
          </div>
        ))}
      </div>

      {/* Floating Grounding / Ambient elements */}
      <button 
        onClick={toggleAudio}
        className="fixed top-6 left-6 text-[#ccc] hover:text-[#999] transition-colors p-2 z-20"
        title="Включить / Выключить фоновый звук"
      >
        {isPlaying ? <Volume2 size={20} strokeWidth={1.5} /> : <VolumeX size={20} strokeWidth={1.5} />}
      </button>

      {/* Breathing Grounding Circle Background */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <div className="w-32 h-32 rounded-full border border-gray-200 animate-breathe"></div>
      </div>

      {showHeart && (
        <div className="fixed top-8 right-8 animate-pulse text-[#d6b4b4] z-20">
          <Heart size={20} fill="#d6b4b4" strokeWidth={0} />
        </div>
      )}

      {photoMemory && (
        <div className="fixed bottom-8 left-8 p-3 bg-white shadow-xl rotate-[-3deg] rounded-sm transform origin-bottom-left transition-opacity duration-1000 ease-in-out z-50 max-w-[200px] border border-gray-100 animate-fade-in-out">
          <img src={photoMemory} alt="Воспоминание" className="w-full h-auto object-cover rounded-sm" />
          <div className="text-center text-[#888] font-cursive mt-2 text-sm italic">
            Я помню это...
          </div>
        </div>
      )}
    </div>
  );
}