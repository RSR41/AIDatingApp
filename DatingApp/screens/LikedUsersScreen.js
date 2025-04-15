// screens/LikedUsersScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useNavigation } from '@react-navigation/native';
import { Button } from 'react-native';


const LikedUsersScreen = () => {
  const navigation = useNavigation();
  const [likedUsers, setLikedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleMatch = async (user) => {
    const currentUserId = auth.currentUser?.uid;
    const matchedUserId = user.id;
  
    if (!currentUserId || !matchedUserId) return;
  
    const chatId =
      currentUserId < matchedUserId
        ? `${currentUserId}_${matchedUserId}`
        : `${matchedUserId}_${currentUserId}`;
  
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
  
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          members: [currentUserId, matchedUserId],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
        });

        // ✅ matches 컬렉션에도 매칭 기록 저장
        await setDoc(doc(db, 'matches', chatId), {
          user1: currentUserId,
          user2: matchedUserId,
          matchedAt: serverTimestamp(),
        });
      }
  
      navigation.navigate('Chat', {
        chatId,
        matchedUser: { uid: matchedUserId, name: user.name },
      });
    } catch (error) {
      console.error('채팅방 생성 오류:', error);
    }
  };  

  useEffect(() => {
    const fetchLikedUsers = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const likesQuery = query(
          collection(db, 'likes'),
          where('from', '==', currentUser.uid)
        );

        const querySnapshot = await getDocs(likesQuery);

        const users = await Promise.all(
          querySnapshot.docs.map(async (docSnap) => {
            const likedUserId = docSnap.data().to;
            const userDoc = await getDoc(doc(db, 'users', likedUserId));
            return { id: likedUserId, ...userDoc.data() };
          })
        );

        setLikedUsers(users);
      } catch (error) {
        console.error('좋아요한 유저 목록 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedUsers();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (likedUsers.length === 0) {
    return (
      <View style={styles.container}>
        <Text>좋아요를 보낸 유저가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내가 좋아요한 유저</Text>
      <FlatList
        data={likedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>나이: {item.age}</Text>
            <Text>성별: {item.gender}</Text>
            <Text>지역: {item.location}</Text>
            <Text>소개: {item.bio}</Text>
            <Button title="채팅 요청" onPress={() => handleMatch(item)} />
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
    backgroundColor: '#f9f9f9',
  },
  name: { fontSize: 18, fontWeight: 'bold' },
});

export default LikedUsersScreen;
