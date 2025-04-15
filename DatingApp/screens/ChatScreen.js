// DatingApp/screens/ChatScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { auth, db } from '../services/firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, getDocs, serverTimestamp, doc } from 'firebase/firestore';
import { StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // 전송 버튼 아이콘용
import { Image } from 'react-native';
import EmojiSelector from 'react-native-emoji-selector';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// [추가] Expo Notifications import
import * as Notifications from 'expo-notifications';
import * as Animatable from 'react-native-animatable';

const ChatScreen = () => {
  // route.params로 넘어온 matchedUser(상대방 정보) 받기
  const route = useRoute();
  const { chatId, matchedUser } = route.params;  // MatchingListScreen에서 넘겨준 유저 정보
  
  // 현재 로그인한 사용자 정보
  const currentUser = auth.currentUser;
  
  // 메시지 목록 및 텍스트 입력 상태
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);

  // [추가] FlatList의 ref 생성 (자동 스크롤용)
  const flatListRef = useRef(null);
  // [추가] 이전 메시지 배열을 추적하기 위한 useRef
  const prevMessagesRef = useRef([]);

  // 1:1 채팅방을 구분하기 위한 conversationId (두 UID를 정렬하여 생성)
  const getConversationId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };
  const conversationId = getConversationId(currentUser.uid, matchedUser.uid);

  // [추가] 새로운 메시지 도착 시 로컬 알림 전송 함수
  const sendLocalNotificationForNewMessage = async (newMessage) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '새 메시지 도착!',
          body: newMessage.text,
        },
        trigger: null, // 즉시 실행
      });
    } catch (error) {
      console.error('알림 전송 중 오류 발생:', error);
    }
  };

  // (1) 채팅 메시지 실시간 구독, 읽음 처리, 및 새로운 메시지 감지 + 알림 전송
  useEffect(() => {
    // 읽음 처리 함수
    const markMessagesAsRead = async () => {
      if (!currentUser || !conversationId) return;

      try {
        const messagesRef = collection(db, 'chats', conversationId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (messageDoc) => {
          const data = messageDoc.data();

          if (data.senderId !== currentUser.uid) {
            const currentReadBy = data.readBy || [];
            if (!currentReadBy.includes(currentUser.uid)) {
              await updateDoc(doc(db, 'chats', conversationId, 'messages', messageDoc.id), {
                readBy: [...currentReadBy, currentUser.uid],
              });
            }
          }
        });
      } catch (error) {
        console.error('메시지 읽음 처리 중 오류:', error);
      }
    };

    markMessagesAsRead();

    // Firestore onSnapshot 구독: 메시지 실시간 업데이트 및 알림 전송
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // [추가] 새로운 메시지 감지 및 알림 전송
      if (prevMessagesRef.current.length > 0 && fetchedMessages.length > prevMessagesRef.current.length) {
        const newMessage = fetchedMessages[fetchedMessages.length - 1];
        if (newMessage.senderId !== currentUser.uid) {
          sendLocalNotificationForNewMessage(newMessage);
        }
      }
      prevMessagesRef.current = fetchedMessages;
      setMessages(fetchedMessages);
    });
    const [matchedUserProfileUrl, setMatchedUserProfileUrl] = useState(null);

    useEffect(() => {
      const fetchMatchedUserProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', matchedUser.uid));
          if (userDoc.exists()) {
            setMatchedUserProfileUrl(userDoc.data().profileImageUrl);  // ✅ 필드는 'profileImageUrl'이라고 가정
          }
        } catch (error) {
          console.error('상대방 프로필 이미지 불러오기 실패:', error);
        }
      };

      fetchMatchedUserProfile();
    }, [matchedUser.uid]);

    return () => {
      unsubscribe();
    };
  }, [conversationId, currentUser]);

  // [추가] messages 배열 업데이트 시 자동 스크롤
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // (2) 메시지 전송 함수
  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // 2. 채팅방 메타데이터 업데이트
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
    });

      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  const groupMessagesByDate = (msgs) => {
    const grouped = [];
    let lastDate = '';
  
    msgs.forEach((msg) => {
      const date = msg.createdAt?.seconds
        ? new Date(msg.createdAt.seconds * 1000).toDateString()
        : null;
  
      if (date && date !== lastDate) {
        grouped.push({ type: 'date', id: `date-${date}`, date });
        lastDate = date;
      }
  
      grouped.push({ ...msg, type: 'message' });
    });
  
    return grouped;
  };
  
  // (3) 메시지 렌더링 함수
  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>
            {new Date(item.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </Text>
        </View>
      );
    }
  
    const isMe = item.senderId === currentUser.uid;
    const isRead = item.readBy?.includes(matchedUser.uid);
  
    const messageTime = item.createdAt?.seconds
      ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  
    return (
      <View style={styles.messageContainer}>
        {!isMe && matchedUserProfileUrl && (
          <Image
            source={{ uri: matchedUserProfileUrl }}
            style={styles.profileImage}
          />
        )}
  
        <Animatable.View
          animation="fadeInUp"
          duration={400}
          easing="ease-out"
          style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.theirBubble,
          ]}
        >
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.timestamp}>{messageTime}</Text>
          {isMe && (
            <Text style={styles.metaText}>
              {isRead ? '읽음 ✅' : '전송됨 ✓'}
            </Text>
          )}
        </Animatable.View>
  
        {!isMe && (
          <Text style={styles.senderName}>{matchedUser?.name}</Text>
        )}
      </View>
    );
  };
       
  
  return (
    <View style={{ flex: 1, paddingTop: 50, paddingHorizontal: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        {matchedUser?.name}님과의 채팅
      </Text>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        extraScrollHeight={80}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        <FlatList
          ref={flatListRef}
          data={groupMessagesByDate(messages)}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={{ flexGrow: 0 }}
        />
      </KeyboardAwareScrollView>
      <View 
        style={styles.inputRow}>
          <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)} style={styles.emojiButton}>
            <Text style={{ fontSize: 24 }}>😊</Text>
          </TouchableOpacity>

        {showEmojiPicker && (
          <EmojiSelector
            onEmojiSelected={(emoji) => setText((prev) => prev + emoji)}
            showSearchBar={false}
            showSectionTitles={false}
            columns={8}
          />
        )}

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="메시지를 입력하세요..."
          multiline={true}
          onContentSizeChange={(e) =>
            setInputHeight(e.nativeEvent.contentSize.height)
          }
          style={[styles.textInput, { height: Math.max(40, inputHeight) }]}
        />

        <TouchableOpacity onPress={sendMessage} style={styles.iconButton}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageBubble: {
    padding: 10,
    marginVertical: 6,
    borderRadius: 16,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFD6E8',
    borderBottomRightRadius: 0,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    color: '#333',
    fontSize: 16,
  },
  metaText: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
  senderName: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'left',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f7f7f7',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
  },  
  iconButton: {
    backgroundColor: '#ff6699',
    borderRadius: 25,
    padding: 10,
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 6,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#eaeaea',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },  
  emojiButton: {
    marginRight: 8,
  }  
});

export default ChatScreen;
