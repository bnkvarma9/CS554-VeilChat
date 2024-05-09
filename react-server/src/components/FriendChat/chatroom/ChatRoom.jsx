import React, {useEffect, useRef, useState} from 'react'
import {arrayUnion, doc, getDoc, onSnapshot, updateDoc} from "firebase/firestore";
import {db} from '../../../firebase/FirebaseFunctions';
import {useChatStore} from '../../../context/chatStore';
import {useUserStore} from '../../../context/userStore';
import upload from '../../../context/upload';
import moment from 'moment';
import axios from "axios";


const ChatRoom = () =>{
  const timeAgo = (createdAt) => {
    return moment(createdAt).fromNow();
  }
  const timeFormat = (createdAt) => {
    return new Date(createdAt.seconds * 1000);
  }
  const [notification, setNotification] = useState({ visible: false, message: '' });
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const [chat, setChat] = useState();
  const endRef = useRef(null)
  const { chatId, user } = useChatStore();
  const {currentUser} = useUserStore();
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);
  const handleIconClick = () => {
    fileInputRef.current.click();
  };
  const [file, setfile] = useState({
    file: null,
    url: "",
    name: null
  });

  useEffect(()=>{
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(()=>{
    if (!chatId) return;
    const unSub = onSnapshot(doc(db, "chats", chatId), (res)=>{
      setChat(res.data())
    })

    return ()=>{
      unSub();
    }
  }, [chatId])

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNotification({
      visible: false,
      message: 'File size should not exceed 100 MB.'
    });
    if (file) {
      const url = URL.createObjectURL(file);
      setfile({
        file,
        url,
        name: file.name
      });
    }
  };

  const handleSend = async () => {
  
    if (!text.trim() && !file.file) {
      console.log("No content to send.");
      return;
    }
    let fileName = null;
    let fileUrl = null;
    let fileType = null;
    try {
      if (file.file) {
        console.log("Uploading file...");
        fileUrl = await upload(file.file);
        fileType = file.file.type;
        fileName = file.name,
        console.log("File uploaded:", fileUrl);
      }
  
      const messageData = {
        senderId: currentUser.id,
        text:text.trim(),
        createdAt: Date.now(),
        ...(fileUrl && { fileUrl, fileType, fileName }),

      };
  
      
      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion(messageData),
      });
  
      
      const userIDs = [currentUser.id, user.id];
      for (const id of userIDs) {
        const userChatsRef = doc(db, "userchats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);
  
        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
  
          const chatIndex = userChatsData.chats.findIndex(c => c.chatId === chatId);
          if (chatIndex !== -1) {
            userChatsData.chats[chatIndex].lastMessage = text;
            userChatsData.chats[chatIndex].updatedAt = Date.now();
            userChatsData.chats[chatIndex].isSeen = id === currentUser.id;
  
            await updateDoc(userChatsRef, {
              chats: userChatsData.chats,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setfile({ file: null, url: "", name: null });
      setText("");
    }
  };

  const FileMessage = ({ message }) => {
    const { fileType, fileUrl, fileName } = message;
  
  
    const handleClick = () => {
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileUrl.split('/').pop(); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  
    if (fileType?.startsWith('image')) {
      return <img src={fileUrl} alt="Sent Image" className="w-full mb-2 rounded-lg" />;
    } else if (fileType?.startsWith('video')) {
      return <video src={fileUrl} controls className="w-full mb-2 rounded-lg"></video>;
    } else if (fileType?.startsWith('audio')) {
      return <audio controls src={fileUrl} className="w-full mb-2"></audio>;
    } else {
      // Display a generic file icon for other file types
      return (
        <div onClick={handleClick} className="cursor-pointer flex items-center space-x-2">
          <img src="/imgs/file.png" alt="File" className="w-6 h-6" />
          <span>Download: {fileName|| 'Unknown File'}</span>
        </div>
      );
    }
  };
  

  if (!chatId) {
    return (
      <div className="chat">
        <div className="placeholder">
          <p>Please select a chat to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat bg-base-100 shadow-xl rounded-xl p-6 flex flex-col h-screen">
      {notification.visible && (
        <div className="alert alert-info shadow-lg absolute top-4 right-4">
          <div>
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      <div className="top bg-primary text-white rounded-xl p-4 mb-6">
        <div className="user flex items-center">
          <div className="avatar mr-4">
            <div className="w-12 rounded-full">
              <img src={user?.profilePictureLocation || '/imgs/avatar.png'} alt="" />
            </div>
          </div>
          <div className="texts">
            <span className="font-bold">{user?.firstName} {user?.lastName}</span>
          </div>
        </div>
      </div>
      <div className="center flex-grow overflow-y-auto">
        <div className="messages flex flex-col space-y-4">
          {chat?.messages?.map((message) => (
            <div
              className={`chat ${
                message.senderId === currentUser?.id ? 'chat-end' : 'chat-start'
              }`}
              key={message?.createdAt}
            >
              <div
                className={`chat-bubble ${
                  message.senderId === currentUser?.id
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-white'
                }`}
              >
                {message.fileUrl && <FileMessage message={message} />}
                {message.text && <p>{message.text}</p>}
                <span className="chat-time opacity-50">{timeAgo(message.createdAt)}</span>
              </div>
            </div>
          ))}
          {file.url && (
            <div className="chat chat-end">
              <div className="chat-bubble bg-primary text-white">
                <img src={file.url} alt="" className="w-full mb-2 rounded-lg" />
              </div>
            </div>
          )}
          <div ref={endRef}></div>
        </div>
      </div>
      <div className="bottom mt-6">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input input-bordered flex-grow"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSend();
              }
            }}
          />
          <label htmlFor="file" className="btn btn-circle btn-primary">
            <span className="material-symbols-outlined">attach_file</span>
          </label>
          <input
            type="file"
            id="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button className="btn btn-primary" onClick={handleSend}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        {file.url && (
          <div className="alert alert-success shadow-lg flex items-center mt-4">
            <div>
              <p className="mr-2">{file.name}</p>
              <button
                onClick={() => setfile({ file: null, url: '', name: '' })}
                className="btn btn-sm btn-error"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatRoom
