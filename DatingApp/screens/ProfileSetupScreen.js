// screens/ProfileSetupScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { doc, setDoc } from 'firebase/firestore'; // Firestore 관련 함수
import { auth, db } from '../services/firebase';  // Firebase 인증 + DB 인스턴스
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
    // Expo Push Token 발급
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    let pushToken = null;
    if (finalStatus === 'granted') {
      pushToken = (await Notifications.getExpoPushTokenAsync()).data;
    }

    if (!currentUser) {
      Alert.alert('오류', '로그인된 사용자가 없습니다.');
      return;
    }
  
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        name,
        age: parseInt(age),
        gender,
        location,
        pushToken,
        preferredGender: '',
        preferredAgeMax: null,
        preferredLocation: '',
        interests: [],
        createdAt: new Date(),
        profileSet: true,
      });
  
      Alert.alert('완료', '프로필이 저장되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.replace('MatchingPreference'),
        },
      ]);
  
    } catch (error) {
      console.error('프로필 저장 오류:', error);
      Alert.alert('오류', '프로필 저장에 실패했습니다.');
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
