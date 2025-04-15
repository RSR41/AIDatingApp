// HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { signOut } from 'firebase/auth'; // 로그아웃 함수
import { auth, db } from '../services/firebase'; // 인증 + DB 객체
import { useNavigation } from '@react-navigation/native'; // 네비게이션
import { doc, getDoc } from 'firebase/firestore'; // Firestore에서 유저 정보 조회

const HomeScreen = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null); // 사용자 정보 상태
  const [loading, setLoading] = useState(true);   // 로딩 상태

  // 🔍 Firestore에서 사용자 데이터 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          console.warn('사용자 정보가 존재하지 않습니다.');
        }
      } catch (error) {
        console.error('사용자 정보 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // 🚪 로그아웃 처리 함수
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigation.replace('Login'); // 로그아웃 후 로그인 화면으로 이동
      })
      .catch((error) => {
        console.error('로그아웃 실패:', error);
        Alert.alert('오류', '로그아웃에 실패했습니다.');
      });
  };

  // 로딩 중일 때
  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 홈 화면입니다!</Text>
  
      {userData ? (
        <>
          <Text>이름: {userData.name}</Text>
          <Text>나이: {userData.age}</Text>
          <Text>성별: {userData.gender}</Text>
          <Text>지역: {userData.location}</Text>
        </>
      ) : (
        <Text>사용자 정보를 불러올 수 없습니다.</Text>
      )}
  
      {/* 기존 버튼 */}
      <Button
        title="선호 조건 입력하기"
        onPress={() => navigation.navigate('MatchingPreference')}
      />
      <Button
        title="매칭 리스트 보기"
        onPress={() => navigation.navigate('MatchingList')}
      />
  
      {/* 👍 추가된 버튼들: 좋아요 관련 */}
      <View style={{ marginTop: 20 }}>
        <Button
          title="❤️ 내가 좋아요한 유저 보기"
          onPress={() => navigation.navigate('LikedUsers')}
        />
        <View style={{ marginTop: 10 }} />
        <Button
          title="💌 나에게 온 좋아요 보기"
          onPress={() => navigation.navigate('ReceivedLikes')}
        />
      </View>
  
      {/* 로그아웃 */}
      <Button title="로그아웃" onPress={handleLogout} />
    </View>
  );  
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
