// screens/ProfileSetupScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { doc, setDoc } from 'firebase/firestore'; // Firestore 관련 함수
import { auth, db } from '../services/firebase';
import { useNavigation } from '@react-navigation/native'; // 네비게이션
import * as Notifications from 'expo-notifications'; // ← 이 줄을 추가

const ProfileSetupScreen = () => {
  const navigation = useNavigation();

  // 🔧 프로필 입력 상태값들
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');

  // 💾 저장 버튼 클릭 시 실행
  const handleSaveProfile = async () => {
    if (!name || !age || !gender || !location) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }
  
    const currentUser = auth.currentUser;
    console.log("👤 currentUser:", currentUser);
    console.log("📁 Firestore 인스턴스:", db);
    console.log("📂 사용자 문서 경로:", `users/${currentUser.uid}`);
    console.log("🧪 setDoc 실행 전...");

  
      let pushToken = null;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          pushToken = tokenData?.data || null;
          console.log("📱 푸시 토큰:", pushToken);
        } else {
          console.log("🚫 알림 권한 거부됨");
        }
      } catch (err) {
        console.log("⚠️ 알림 토큰 요청 중 에러 발생:", err.message);
      }

  
    if (!currentUser) {
      Alert.alert('오류', '로그인된 사용자가 없습니다.');
      return;
    }
  
    try {
      console.log('🔥 Firestore 저장 직전:', {
        uid: currentUser.uid,
        name, age, gender, location, pushToken
      });
  
      await setDoc(doc(db, 'users', currentUser.uid), {
        name,
        age: parseInt(age),
        gender,
        location,
        ...(pushToken ? { pushToken } : {}), // ✅ null일 땐 저장하지 않음
        preferredGender: '',
        preferredAgeMax: null,
        preferredLocation: '',
        interests: [],
        createdAt: new Date(),
        profileSet: true,
      });
  
      console.log('✅ Firestore 저장 완료!');
  
      Alert.alert('완료', '프로필이 저장되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            console.log('✅ Alert 후 네비게이션 시도');
            navigation.replace('MatchingPreference');
          },
        },
      ]);
      
    } catch (error) {
      console.error('❌ Firestore 저장 중 오류 발생:', error);
      Alert.alert('오류', `프로필 저장에 실패했습니다.\n${error.message}`);
    }    
  };  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>프로필 설정</Text>

      <TextInput
        placeholder="이름"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="나이"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="성별 (예: 남자 또는 여자)"
        value={gender}
        onChangeText={setGender}
        style={styles.input}
      />
      <TextInput
        placeholder="지역 (예: 서울)"
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />

      <Button title="저장하기" onPress={handleSaveProfile} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 8,
  },
});

export default ProfileSetupScreen;
