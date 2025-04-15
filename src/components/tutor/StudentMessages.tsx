
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudentMessage } from "@/types/sharedTypes";

interface StudentMessagesProps {
  messages: StudentMessage[];
  onSendMessage: (message: string) => void;
}

const StudentMessages: React.FC<StudentMessagesProps> = ({ messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState<string>("");
  
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="border rounded-md p-4 h-64 overflow-y-auto space-y-3">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'tutor' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.sender === 'tutor' 
                    ? 'bg-tutoring-blue text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p>{msg.text || msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No message history with this student</p>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Textarea 
          placeholder="Type your message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </div>
    </div>
  );
};

export default StudentMessages;
