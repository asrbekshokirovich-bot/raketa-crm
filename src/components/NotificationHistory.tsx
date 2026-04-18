import { X, ClipboardList, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import type { NotificationOrder } from '../context/NotificationContext';

const NotificationHistory: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isHistoryOpen, setIsHistoryOpen } = useNotifications();

  if (!isHistoryOpen) return null;

  const formatDateFull = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupNotificationsByDate = () => {
    const groups: { [key: string]: NotificationOrder[] } = {};
    notifications.forEach(n => {
      const date = new Date(n.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(n);
    });
    return groups;
  };

  const grouped = groupNotificationsByDate();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-mustard flex items-center justify-center text-white shadow-lg shadow-mustard/20">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-tight">Bildirishnomalar Tarixi</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{unreadCount} ta o'qilmagan</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[11px] font-black text-slate-500 hover:text-mustard transition-all uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm"
              >
                Hammasini o'qish
              </button>
            )}
            <button 
              onClick={() => setIsHistoryOpen(false)}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
              title="Yopish"
              aria-label="Yopish"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
          {Object.keys(grouped).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(grouped).map(([date, items]) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-slate-300" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{date}</h3>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {items.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between ${
                          !notif.is_read 
                          ? 'bg-mustard/5 border-mustard/20 hover:border-mustard/40' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            !notif.is_read ? 'bg-mustard text-white' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <Clock size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-black text-slate-800">{notif.order_number}</span>
                              {!notif.is_read && (
                                <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Yangi</span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">yangi buyurtma</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{formatDateFull(notif.created_at)}</p>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-2">
                          {!notif.is_read ? (
                            <CheckCircle2 size={18} className="text-mustard opacity-0 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <CheckCircle2 size={18} className="text-slate-200" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
              <ClipboardList size={64} className="text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Hozircha tarix mavjud emas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistory;
