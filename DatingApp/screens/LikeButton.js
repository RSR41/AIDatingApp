// screens/LikeButton.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

const LikeButton = ({ likedUserId, likedUserName }) => {
  const currentUserId = auth.currentUser?.uid;

  const handleLike = async () => {
    if (!currentUserId || !likedUserId) return;

    try {
      // ✅ 1. 현재 사용자가 상대방에게 좋아요 보냄
      await setDoc(doc(db, 'likes', `${currentUserId}_${likedUserId}`), {
        from: currentUserId,  // ✅ 현재 유저의 UID
        to: likedUserId,
        timestamp: serverTimestamp(),
      });      

      // ✅ 2. 상대방이 나에게도 좋아요를 눌렀는지 확인
      const reverseLikeDoc = await getDoc(doc(db, 'likes', `${likedUserId}_${currentUserId}`));

      if (reverseLikeDoc.exists()) {
        // ✅ 3. 쌍방 좋아요 → 매칭 성사 → 채팅방 생성
        const chatId = currentUserId < likedUserId
          ? `${currentUserId}_${likedUserId}`
          : `${likedUserId}_${currentUserId}`;

        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          await setDoc(chatRef, {
            members: [currentUserId, likedUserId],
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageAt: serverTimestamp()
          });
        }

        // ✅ matches 컬렉션에도 매칭 기록 저장
          await setDoc(doc(db, 'matches', chatId), {
            user1: currentUserId,
            user2: likedUserId,
            matchedAt: serverTimestamp(),
          });

          // 🔔 매칭된 상대방의 pushToken 불러오기
        const targetUserDoc = await getDoc(doc(db, 'users', likedUserId));
        const pushToken = targetUserDoc.data()?.pushToken;

        if (pushToken) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '💘 매칭 성공!',
              body: `${likedUserName || '상대방'}님과 매칭되었어요! 지금 대화를 시작해보세요.`,
            },
            trigger: null, // 즉시 발송
          });
        }

        Alert.alert('매칭 성공!', `${likedUserName || '상대방'}님과 매칭되었습니다!`);
      } else {
        // ✅ 4. 일방 좋아요만 완료
        Alert.alert('좋아요 완료', `${likedUserName || '상대방'}님에게 좋아요를 보냈습니다.`);
      }

    } catch (error) {
      console.error('❤️ 좋아요 처리 오류:', error);
      Alert.alert('오류', '좋아요 처리 중 문제가 발생했습니다.');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleLike}>
      <Text style={styles.text}>❤️ 좋아요</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff6699',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default LikeButton;
