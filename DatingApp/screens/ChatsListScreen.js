// ChatsListScreen.js 내부
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const ChatsListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    // 채팅방 목록을 구독합니다.
    // 각 채팅방 문서에는 'members' 배열이 있어, 해당 배열에 현재 사용자의 uid가 포함된 채팅방만 가져옵니다.
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUser.uid),
      orderBy('lastMessageAt', 'desc') // 최신 대화 순서로 정렬
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const updatedChats = await Promise.all(
        snapshot.docs.map(async (chatDoc) => {
          const chatData = chatDoc.data();
          const chatId = chatDoc.id;
          const partnerId = chatData.members.find(uid => uid !== currentUser.uid);
    
          // 🔍 partner 정보 불러오기
          let partnerName = '알 수 없음';
          try {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if (partnerDoc.exists()) {
              partnerName = partnerDoc.data().name;
            }
          } catch (err) {
            console.error('상대방 정보 조회 실패:', err);
          }
          // 🔍 마지막 메시지 가져오기
          let lastMessage = '';
          let lastMessageAt = null;
          try {
            const latestMsgQuery = query(
              collection(db, 'chats', chatId, 'messages'),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            const latestMsgSnap = await getDocs(latestMsgQuery);
            if (!latestMsgSnap.empty) {
              const lastMsgDoc = latestMsgSnap.docs[0].data();
              lastMessage = lastMsgDoc.text || '';
              lastMessageAt = lastMsgDoc.createdAt;
            }
          } catch (e) {
            console.error('🔁 마지막 메시지 불러오기 실패:', e);
          }

          // 🔔 안 읽은 메시지 수 계산
          const messagesSnapshot = await getDocs(
            query(
              collection(db, 'chats', chatId, 'messages'),
              where('senderId', '!=', currentUser.uid),
              where('readBy', 'not-in', [[currentUser.uid]])
            )
          );
    
          return {
            id: chatId,
            ...chatData,
            partnerId,
            partnerName,
            lastMessage,
            lastMessageAt,
            unreadCount: messagesSnapshot.size,
          };
        })
      );
    
      setChats(updatedChats);
      setLoading(false);
    });
        

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  // [예시] 각 채팅방 항목 렌더링
  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() =>
        navigation.navigate('Chat', {
          chatId: item.id,
          matchedUser: { uid: item.partnerId, name: item.partnerName },
        })
      }
    >
      <Text style={styles.chatTitle}>
        {item.partnerName}님과의 채팅
      </Text>
      <Text style={styles.lastMessage}>
        마지막 메시지: {item.lastMessage || '없음'}
      </Text>
  
      {item.unreadCount > 0 && (
        <Text style={{ color: 'red', fontWeight: 'bold' }}>
          🔴 {item.unreadCount}개 읽지 않음
        </Text>
      )}
  
      <Text style={styles.lastMessageAt}>
        {item.lastMessageAt
          ? new Date(item.lastMessageAt.seconds * 1000).toLocaleString()
          : ''}
      </Text>
    </TouchableOpacity>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 채팅방 목록</Text>
      {chats.length === 0 ? (
        <Text>참여한 채팅방이 없습니다.</Text>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  chatCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  chatTitle: { fontSize: 18, fontWeight: 'bold' },
  lastMessage: { fontSize: 14, color: '#333', marginTop: 4 },
  lastMessageAt: { fontSize: 12, color: '#888', marginTop: 2 },
});

export default ChatsListScreen;
