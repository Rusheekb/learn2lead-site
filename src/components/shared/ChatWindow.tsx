
import React, { useRef, useEffect, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from './ChatMessage';
import { supabase } from '@/integrations/supabase/client';
import { createClassMessage } from '@/services/classMessagesService';
import { StudentMessage } from '@/types/classTypes';
import { toast } from 'sonner';

interface ChatWindowProps {
  classId: string;
  tutorName: string;
  studentName: string;
  messages: StudentMessage[];
  onMarkAsRead: (messageId: string) => Promise<void>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  classId,
  tutorName,
  studentName,
  messages,
  onMarkAsRead,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark incoming student messages as read
  useEffect(() => {
    const unreadMessages = messages.filter(
      (msg) => msg.sender === 'student' && !(msg.isRead || msg.read)
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach((msg) => {
        onMarkAsRead(msg.id);
      });
    }
  }, [messages, onMarkAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setIsSubmitting(true);
      // Use the existing service function to send a message
      await createClassMessage(classId, tutorName, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-80 border rounded-md">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg.message || msg.content || msg.text || ''}
              sender={
                msg.sender === 'tutor' ? tutorName : msg.studentName || studentName
              }
              timestamp={msg.timestamp}
              isTutor={msg.sender === 'tutor'}
              isRead={msg.isRead || msg.read}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="border-t p-2 flex gap-2 bg-gray-50"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={!newMessage.trim() || isSubmitting}>
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;
