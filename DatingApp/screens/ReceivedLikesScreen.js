// screens/ReceivedLikesScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Alert, Button } from 'react-native'; // 버튼과 Alert 추가
import { auth, db } from '../services/firebase';
import { deleteDoc } from 'firebase/firestore'; // Firestore 삭제 함수 추가
import * as Notifications from 'expo-notifications';


const ReceivedLikesScreen = () => {
  const [receivedLikes, setReceivedLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchReceivedLikes = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const likesQuery = query(
          collection(db, 'likes'),
          where('to', '==', currentUser.uid)
        );

        const querySnapshot = await getDocs(likesQuery);

        const users = await Promise.all(
          querySnapshot.docs.map(async (docSnap) => {
            const fromUserId = docSnap.data().from;
            const userDoc = await getDoc(doc(db, 'users', fromUserId));
            const userData = userDoc.data();
        
            // 🔍 matches 컬렉션에서 매칭 여부 확인
            const currentUserId = currentUser.uid;
            const chatId =
              currentUserId < fromUserId
                ? `${currentUserId}_${fromUserId}`
                : `${fromUserId}_${currentUserId}`;
            
            const matchDoc = await getDoc(doc(db, 'matches', chatId));
            const isMatched = matchDoc.exists();
        
            return {
              id: fromUserId,
              ...userData,
              isMatched,
            };
          })
        );

        setReceivedLikes(users);
      } catch (error) {
        console.error('받은 좋아요 목록 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceivedLikes();
  }, []);

  const handleMatch = async (targetUserId, targetUserName) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !targetUserId) return;
  
    try {
      // 🔹 Step 1: 내가 상대방에게 좋아요 보내기 (likes 문서 생성)
      await setDoc(doc(db, 'likes', `${currentUserId}_${targetUserId}`), {
        from: currentUserId,
        to: targetUserId,
        timestamp: serverTimestamp(), // 현재 시간
      });
  
      // 🔹 Step 2: 상대방도 나에게 보냈는지 확인
      const reverseDoc = await getDoc(doc(db, 'likes', `${targetUserId}_${currentUserId}`));
  
      if (reverseDoc.exists()) {
        // ✅ Step 3: 쌍방 좋아요 → 채팅방 생성
        const chatId = currentUserId < targetUserId
          ? `${currentUserId}_${targetUserId}`
          : `${targetUserId}_${currentUserId}`;
  
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
  
        if (!chatDoc.exists()) {
          await setDoc(chatRef, {
            members: [currentUserId, targetUserId],
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageAt: serverTimestamp(),
          });
        }

        // ✅ matches 컬렉션에도 매칭 기록 저장
          await setDoc(doc(db, 'matches', chatId), {
            user1: currentUserId,
            user2: targetUserId,
            matchedAt: serverTimestamp(),
          });
          // 🔔 매칭된 상대방에게 푸시 알림 전송
          const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
          const pushToken = targetUserDoc.data()?.pushToken;

          if (pushToken) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '💘 매칭 성공!',
                body: `${targetUserName || '상대방'}님과 매칭되었어요! 지금 대화를 시작해보세요.`,
              },
              trigger: null,
            });
          }


  
        Alert.alert('매칭 성공!', `${targetUserName}님과 매칭되었습니다.`);
      } else {
        // 🔹 아직 쌍방 아님
        Alert.alert('좋아요 전송 완료', `${targetUserName}님에게 좋아요 요청을 보냈습니다. 상대방도 좋아요하면 매칭됩니다.`);
      }
    } catch (error) {
      console.error('매칭 중 오류:', error);
      Alert.alert('오류', '매칭 처리 중 문제가 발생했습니다.');
    }
  };
  const handleCancel = async (targetUserId, targetUserName) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !targetUserId) return;
  
    Alert.alert(
      '좋아요 취소',
      `${targetUserName}님의 좋아요를 거절하시겠습니까?`,
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'likes', `${targetUserId}_${currentUserId}`));
              setReceivedLikes(prev => prev.filter(user => user.id !== targetUserId));
              Alert.alert('처리 완료', `${targetUserName}님의 좋아요를 거절했습니다.`);
            } catch (error) {
              console.error('좋아요 취소 오류:', error);
              Alert.alert('오류', '좋아요 취소 처리 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };
  

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (receivedLikes.length === 0) {
    return (
      <View style={styles.container}>
        <Text>아직 받은 좋아요가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>나에게 좋아요한 유저</Text>
      <FlatList
        data={receivedLikes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>나이: {item.age}</Text>
            <Text>성별: {item.gender}</Text>
            <Text>지역: {item.location}</Text>
            <Text>소개: {item.bio}</Text>

        {item.isMatched ? (
          <Text style={{ marginTop: 10, color: 'green', fontWeight: 'bold' }}>
            ✅ 이미 매칭된 유저입니다.
          </Text>
        ) : (
          <>
            <Button
              title="💌 매칭 요청 보내기"
              onPress={() => handleMatch(item.id, item.name)}
            />
            <Button
              title="💔 취소하기"
              onPress={() => handleCancel(item.id, item.name)}
              color="#e74c3c"
            />
          </>
        )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  name: { fontSize: 18, fontWeight: 'bold' },
});

export default ReceivedLikesScreen;
