import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, Loader2, ArrowLeft, Clock, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/entities/user/hooks/useAuth';
import { apiClient } from '@/infrastructure/api/client';
import { ENDPOINTS } from '@/infrastructure/api/endpoints';
import { socketClient } from '@/infrastructure/socket/client';
import type { WorkOrder } from '@/entities/workOrder/types';
import { toast } from 'sonner';

interface Message {
  _id?: string;
  id?: string;
  senderId: string | { _id: string; name: string };
  senderRole?: string;
  message: string;
  sentAt?: string;
  createdAt?: string;
}

export const ChatWindow = () => {
  const { workOrderId } = useParams<{ workOrderId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string>(workOrderId || '');
  const [currentOrder, setCurrentOrder] = useState<WorkOrder | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all work orders to select from
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiClient.get(ENDPOINTS.WORK_ORDERS.BASE);
        if (res.data?.success && res.data?.data) {
          const list: WorkOrder[] = Array.isArray(res.data.data) ? res.data.data : res.data.data.data || [];
          setWorkOrders(list);
          if (!activeOrderId && list.length > 0) {
            setActiveOrderId(list[0]._id || list[0].id || '');
          }
        }
      } catch (err) {
        console.error('Failed to load chat work orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Update active order and messages whenever activeOrderId changes
  useEffect(() => {
    if (!activeOrderId) return;

    const loadChat = async () => {
      try {
        const [woRes, msgRes] = await Promise.allSettled([
          apiClient.get(ENDPOINTS.WORK_ORDERS.BY_ID(activeOrderId)),
          apiClient.get(ENDPOINTS.CHAT.MESSAGES(activeOrderId)),
        ]);

        if (woRes.status === 'fulfilled' && woRes.value.data?.data) {
          setCurrentOrder(woRes.value.data.data);
        }

        if (msgRes.status === 'fulfilled' && msgRes.value.data?.data) {
          setMessages(msgRes.value.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    loadChat();

    // Socket.IO real-time connection
    socketClient.connect();
    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit('chat:join', activeOrderId);

      const handleIncomingMessage = (newMsg: Message) => {
        if (!newMsg) return;
        setMessages((prev) => {
          if (prev.some(m => m._id === newMsg._id || (m.sentAt === newMsg.sentAt && m.message === newMsg.message))) {
            return prev;
          }
          return [...prev, newMsg];
        });
      };

      socket.on('chat:message', handleIncomingMessage);

      return () => {
        socket.off('chat:message', handleIncomingMessage);
      };
    }
  }, [activeOrderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeOrderId || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await apiClient.post(ENDPOINTS.CHAT.MESSAGES(activeOrderId), {
        message: text,
      });

      if (res.data?.success && res.data?.data) {
        const newMsg = res.data.data;
        setMessages((prev) => {
          if (prev.some(m => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        
        // Also emit socket message if connected
        const socket = socketClient.getSocket();
        if (socket && socket.connected) {
          socket.emit('chat:message', {
            workOrderId: activeOrderId,
            message: text,
            senderId: currentUserId,
            senderRole: user?.role || 'Client'
          });
        }
      }
    } catch (err: any) {
      toast.error('Failed to send message: ' + (err.response?.data?.message || err.message));
      setInputText(text); // restore
    } finally {
      setIsSending(false);
    }
  };

  const currentUserId = user?._id || user?.id;


  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/work-orders')} 
            className="text-gray-600 hover:text-teal-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Work Orders
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Work Orders Conversations */}
        <Card className="border-none shadow-sm bg-white overflow-hidden flex flex-col h-[620px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/70">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-600" /> Active Order Chats
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {workOrders.map((wo, idx) => {
              const oId = wo._id || wo.id;
              const isSelected = oId === activeOrderId;
              const catName = typeof wo.categoryId === 'object' && wo.categoryId ? (wo.categoryId as any).name : 'Service';

              return (
                <div
                  key={oId || idx}
                  onClick={() => { if (oId) setActiveOrderId(oId); }}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-50/80 border-l-4 border-teal-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-gray-900">{wo.workOrderCode || oId}</span>
                    <span className="text-[10px] text-teal-700 bg-teal-100/60 px-1.5 py-0.5 rounded font-medium">{wo.status}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">{wo.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{catName}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Side: Chat Window */}
        <Card className="md:col-span-2 border-none shadow-md h-[620px] flex flex-col overflow-hidden bg-white">
          {/* Header */}
          <div className="bg-teal-700 p-4 text-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-bold text-base leading-tight">
                {currentOrder?.workOrderCode || 'Facility Request Chat'}
              </h2>
              <p className="text-teal-100 text-xs mt-0.5">
                {typeof currentOrder?.teamId === 'object' && currentOrder?.teamId ? (currentOrder.teamId as any).name : 'Field Team'} &bull; {currentOrder?.locationAddress || 'Direct Dispatch'}
              </p>
            </div>
            {currentOrder && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/work-orders/${activeOrderId}`)}
                className="bg-teal-800 border-teal-600 text-white hover:bg-teal-900 text-xs h-7"
              >
                Order Details &rarr;
              </Button>
            )}
          </div>

          {/* Message List */}
          <CardContent className="flex-1 overflow-y-auto p-4 bg-gray-50/60 flex flex-col gap-3">
            {isLoading ? (
              <div className="m-auto text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
                <p className="text-xs">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center text-gray-400 p-6">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-gray-600 text-sm">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">Coordinate directly with field personnel or client.</p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const senderIdStr = typeof m.senderId === 'object' && m.senderId ? (m.senderId as any)._id : m.senderId;
                const isMe = senderIdStr === currentUserId || m.senderRole === user?.role;
                const senderName = typeof m.senderId === 'object' && m.senderId ? (m.senderId as any).name : (isMe ? 'You' : m.senderRole || 'Personnel');
                const timeStr = m.sentAt || m.createdAt ? new Date(m.sentAt || m.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

                return (
                  <div 
                    key={m._id || m.id || idx} 
                    className={`flex flex-col max-w-[80%] ${isMe ? 'items-end self-end' : 'items-start self-start'}`}
                  >
                    <span className="text-[10px] text-gray-400 mb-1 px-1">{senderName} &bull; {timeStr}</span>
                    <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      isMe 
                        ? 'bg-teal-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..." 
                className="flex-1 rounded-full bg-gray-50 border-gray-200 focus-visible:ring-teal-500 text-sm"
                disabled={!activeOrderId || isSending}
              />
              <Button 
                size="icon" 
                className="bg-teal-600 hover:bg-teal-700 rounded-full shrink-0 shadow-sm cursor-pointer" 
                onClick={handleSend}
                disabled={!inputText.trim() || isSending}
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

