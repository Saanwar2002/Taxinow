
"use client";
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle, X, ListPlus } from "lucide-react"; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Added Popover imports

interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
}

interface Message {
  id: string;
  sender: 'user' | 'other';
  text: string;
  timestamp: string;
}

const allMockChatUsers: ChatUser[] = [
  { id: 'passenger1', name: 'Passenger Alice S.', avatar: 'https://placehold.co/40x40.png?text=AS', lastMessage: "I'm at the corner, wearing a red hat.", timestamp: "11:05 AM", unread: 2 },
  { id: 'passenger2', name: 'Passenger Bob J.', avatar: 'https://placehold.co/40x40.png?text=BJ', lastMessage: "Thanks for the ride!", timestamp: "Yesterday" },
  { id: 'operator', name: 'TaxiBase Dispatch', avatar: 'https://placehold.co/40x40.png?text=TB', lastMessage: "New high priority pickup available.", timestamp: "2 hrs ago" },
];

const allMockMessages: { [key: string]: Message[] } = {
  passenger1: [
    { id: 'm1', sender: 'other', text: "Hello, I'm your passenger. I'm waiting at 123 Oak St.", timestamp: "11:00 AM" },
    { id: 'm2', sender: 'user', text: "On my way! Should be there in 5 minutes.", timestamp: "11:01 AM" },
    { id: 'm3', sender: 'other', text: "I'm at the corner, wearing a red hat.", timestamp: "11:05 AM" },
  ],
  passenger2: [
     { id: 'm4', sender: 'other', text: "Okay, see you soon!", timestamp: "Yesterday" },
  ],
  operator: [
     { id: 'm5', sender: 'other', text: "New high priority pickup available in your zone. Accept?", timestamp: "2 hrs ago" },
     { id: 'm6', sender: 'user', text: "Accepted. On my way.", timestamp: "2 hrs ago" },
  ]
};

const activePassengerIdForContext = 'passenger1';
const dispatchIdForContext = 'operator';

const contextualInitialChatUsers: ChatUser[] = allMockChatUsers.filter(
  user => user.id === activePassengerIdForContext || user.id === dispatchIdForContext
);

const contextualInitialMessages: { [key: string]: Message[] } = {
  [activePassengerIdForContext]: allMockMessages[activePassengerIdForContext] || [],
  [dispatchIdForContext]: allMockMessages[dispatchIdForContext] || [],
};

const quickReplies = [
  { id: "qr1", text: "I'm on my way." },
  { id: "qr2", text: "I have arrived at the pickup location." },
  { id: "qr3", text: "I'm stuck in traffic, I might be a few minutes late." },
  { id: "qr4", text: "Okay, thank you." },
  { id: "qr5", text: "Can you please confirm your exact pickup spot?" },
  { id: "qr6", text: "Running slightly late, be there soon." },
];


export default function DriverChatPage() {
  const [chatUsersList, setChatUsersList] = useState<ChatUser[]>(contextualInitialChatUsers);
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(
    contextualInitialChatUsers.find(u => u.id === activePassengerIdForContext) || contextualInitialChatUsers[0] || null
  );
  const [messages, setMessages] = useState<Message[]>(selectedChat ? contextualInitialMessages[selectedChat.id] || [] : []);
  const [messagesData, setMessagesData] = useState<{ [key: string]: Message[] }>(contextualInitialMessages);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); 
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (selectedChat) {
      setMessages(messagesData[selectedChat.id] || []);
    } else {
      setMessages([]); 
    }
  }, [selectedChat, messagesData]);

  const handleSelectChat = (user: ChatUser) => {
    setSelectedChat(user);
    setChatUsersList(prevUsers => 
      prevUsers.map(u => u.id === user.id ? {...u, unread: 0} : u)
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !selectedChat) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: newMessage,
      timestamp: currentTime,
    };

    setMessages(prev => [...prev, userMsg]);
    
    const updatedMessagesForSelectedChat = [...(messagesData[selectedChat.id] || []), userMsg];
    setMessagesData(prevData => ({
      ...prevData,
      [selectedChat.id!]: updatedMessagesForSelectedChat, 
    }));
    
    setChatUsersList(prevUsers => 
      prevUsers.map(u => 
        u.id === selectedChat.id ? { ...u, lastMessage: newMessage, timestamp: currentTime, unread: 0 } : u
      )
    );
    setSelectedChat(prevSel => prevSel ? {...prevSel, lastMessage: newMessage, timestamp: currentTime, unread: 0} : null);

    const replyText = `Copy that: "${newMessage.substring(0, 20)}${newMessage.length > 20 ? '...' : ''}".`;
    setNewMessage("");

    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const replyMsg: Message = {
        id: `other-${Date.now()}`,
        sender: 'other',
        text: replyText,
        timestamp: replyTime,
      };
      if(selectedChat && messagesData[selectedChat.id]){
        setMessages(prev => [...prev, replyMsg]);
      
        const finalMessagesForChat = [...updatedMessagesForSelectedChat, replyMsg];
        setMessagesData(prevData => ({
          ...prevData,
          [selectedChat.id!]: finalMessagesForChat,
        }));
        
        setChatUsersList(prevUsers => 
          prevUsers.map(u => 
            u.id === selectedChat.id ? { ...u, lastMessage: replyText, timestamp: replyTime } : u
          )
        );
        setSelectedChat(prevSel => prevSel ? {...prevSel, lastMessage: replyText, timestamp: replyTime} : null);
      }
    }, 1200);
  };

  const handleQuickReplySelect = (replyText: string) => {
    setNewMessage(replyText);
    setIsQuickReplyOpen(false); // Close popover after selection
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-7rem)]">
      <Card className="w-1/3 border-r-0 rounded-r-none shadow-lg">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" /> Driver Chats
          </CardTitle>
        </CardHeader>
        <ScrollArea className="h-[calc(100%-4.5rem)]">
          <CardContent className="p-0">
            {chatUsersList.map(user => (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 ${selectedChat?.id === user.id ? 'bg-muted' : ''}`}
                onClick={() => handleSelectChat(user)}
              >
                <Avatar>
                  <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="avatar profile" />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.lastMessage}</p>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p>{user.timestamp}</p>
                  {user.unread && user.unread > 0 && (
                    <span className="mt-1 inline-block bg-accent text-accent-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {user.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </ScrollArea>
      </Card>

      <Card className="flex-1 flex flex-col rounded-l-none shadow-lg">
        {selectedChat ? (
          <>
            <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedChat.avatar} alt={selectedChat.name} data-ai-hint="avatar profile" />
                  <AvatarFallback>{selectedChat.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl font-headline">{selectedChat.name}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
                <span className="sr-only">Go Back</span>
              </Button>
            </CardHeader>
            <ScrollArea className="flex-1 p-4 space-y-4 bg-muted/20">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md p-3 rounded-lg shadow ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left'}`}>{msg.timestamp}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <CardContent className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Popover open={isQuickReplyOpen} onOpenChange={setIsQuickReplyOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="shrink-0">
                      <ListPlus className="w-5 h-5" />
                      <span className="sr-only">Quick Replies</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 max-h-60 overflow-y-auto">
                    <div className="space-y-1">
                      {quickReplies.map((reply) => (
                        <Button
                          key={reply.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-1.5 px-2"
                          onClick={() => handleQuickReplySelect(reply.text)}
                        >
                          {reply.text}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
            <MessageCircle className="w-16 h-16 mb-4" />
            <p className="text-lg">Select a chat to start messaging</p>
            <p className="text-sm">Communicate with passengers or dispatch here.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
