// screens/MatchingListScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, Alert } from 'react-native';
import { collection, getDocs, doc, getDoc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { calculateRecommendationScore } from '../services/RecommendationEngine';
import { useNavigation } from '@react-navigation/native';
import LikeButton from '../screens/LikeButton';


// [추가] 신고 기능 함수: 일반 사용자가 신고 버튼을 누르면 Firestore의 'reports' 컬렉션에 신고 내역 기록
const reportUser = async (userId, reportReason = '불건전한 대화') => {
  Alert.alert(
    '사용자 신고',
    `해당 사용자를 신고하시겠습니까?\n사유: ${reportReason}`,
    [
      { text: '취소', style: 'cancel' },
      {
        text: '신고',
        onPress: async () => {
          try {
            await addDoc(collection(db, 'reports'), {
              reporterId: auth.currentUser ? auth.currentUser.uid : 'unknown',
              reportedUserId: userId,
              reportReason,
              reportedAt: serverTimestamp(),
              status: 'pending',
            });
            Alert.alert('신고 완료', '신고 내역이 기록되었습니다.');
          } catch (error) {
            console.error('신고 처리 중 오류 발생:', error);
            Alert.alert('오류', '신고 처리 중 문제가 발생했습니다.');
          }
        },
      },
    ]
  );
};

const MatchingListScreen = () => {
  const navigation = useNavigation();

  const [matches, setMatches] = useState([]);   // 매칭된 유저와 그 외 유저를 합친 배열
  const [matchedCount, setMatchedCount] = useState(0); // 매칭된 유저 수 (스타일 적용용)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
  
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
  
          // ✅ 로그로만 확인하거나 아래처럼 변수로 저장
          console.log("🔥 유저 선호 조건:", data);
  
          // const preferredGender = data.preferredGender;
          // const preferredAgeMin = data.preferredAgeMin;
          // const preferredAgeMax = data.preferredAgeMax;
          // → 이런 변수로 매칭 필터링에 사용하면 됨
        }
      } catch (error) {
        console.error('선호 조건 불러오기 실패:', error);
      }
    };
  
    fetchPreferences();
  }, []);  
  
  useEffect(() => {
    const fetchMatches = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
  
      try {
        // 🔸 현재 로그인된 사용자의 정보 가져오기
        const currentUserDoc = await getDoc(doc(db, 'users', uid));
        if (!currentUserDoc.exists()) return;
  
        const currentUser = currentUserDoc.data();
  
        // 🔸 전체 사용자 리스트 가져오기
        const querySnapshot = await getDocs(collection(db, 'users'));
  
        const matched = [];
        const nonMatched = [];
  
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const id = docSnap.id;
  
          // ✅ 본인 계정은 제외
          if (id === uid) return;
  
          // ✅ 선호 조건 필터링
          const genderMatch =
            currentUser.preferredGender === '상관없음' ||
            data.gender === currentUser.preferredGender;
  
          const ageMatch =
            data.age >= currentUser.preferredAgeMin &&
            data.age <= currentUser.preferredAgeMax;
  
          const locationMatch =
            !currentUser.preferredLocation || // 선택 안 했을 경우 통과
            data.location === currentUser.preferredLocation;
  
          const isMatch = genderMatch && ageMatch && locationMatch;
  
          // ✅ 조건에 부합하면 matched 배열에 추가, 아니면 nonMatched로 분리
          if (isMatch) {
            matched.push({ id, ...data });
          } else {
            nonMatched.push({ id, ...data });
          }
        });
  
        setMatchedCount(matched.length);
  
        // ✅ AI 추천 점수 기반 정렬 (선호 조건 필터링된 matched 유저들만 점수 계산)
        const scoredMatched = await Promise.all(
          matched.map(async (user) => {
            const score = await calculateRecommendationScore(currentUser, user);
            return { ...user, recommendationScore: score };
          })
        );
  
        // ✅ 추천 점수 높은 순으로 정렬
        scoredMatched.sort((a, b) => b.recommendationScore - a.recommendationScore);
  
        // 🔚 최종 매칭 결과: 추천 유저 + 일반 유저 합쳐서 setMatches
        setMatches([...scoredMatched, ...nonMatched]);
      } catch (error) {
        console.error('매칭 유저 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchMatches();
  }, []);  

  const handleMatch = async (user) => {
    const currentUserId = auth.currentUser?.uid;
    const matchedUserId = user.id;

    if (!currentUserId || !matchedUserId) return;

    // 🔑 채팅방 ID 구성 방식: uid1_uid2 (정렬된 순서)
    const chatId = currentUserId < matchedUserId
      ? `${currentUserId}_${matchedUserId}`
      : `${matchedUserId}_${currentUserId}`;

    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      // 📌 채팅방이 없으면 새로 생성
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          members: [currentUserId, matchedUserId],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp()
        });
      }

    // ✅ 채팅방으로 이동
    navigation.navigate('Chat', { chatId, matchedUser: user });

  } catch (error) {
    console.error('채팅방 생성 또는 이동 중 오류:', error);
    Alert.alert('오류', '채팅방 이동 중 문제가 발생했습니다.');
  }
};

  
  
  // 유저 아이템 렌더링 함수
  const renderUser = ({ item, index }) => {
    const isMatched = index < matchedCount;
    return (
      <View style={[styles.card, isMatched && styles.matchedCard]}>
        <Text style={styles.name}>{item.name}</Text>
        <Text>나이: {item.age}</Text>
        <Text>성별: {item.gender}</Text>
        <Text>지역: {item.location}</Text>
        <Text>소개: {item.bio}</Text>
        {/* ✅ 매칭 버튼과 신고 버튼을 한 줄에 배치 */}
        <View style={styles.buttonRow}>
          <LikeButton likedUserId={item.id} />
          <Button title="신고" onPress={() => reportUser(item.id)} />
        </View>
      </View>
    );
  };
  

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>매칭된 유저 목록</Text>
      {matches.length === 0 ? (
        <Text>조건에 맞는 유저가 없습니다.</Text>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
        />
      )}
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
  matchedCard: {
    borderColor: 'green',
    backgroundColor: '#eaffea',
  },
  name: { fontSize: 18, fontWeight: 'bold' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,},
});

export default MatchingListScreen;
