// 🔐 로그인 화면: LoginScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Firebase 로그인 함수
import { auth } from '../services/firebase'; // Firebase 인증 인스턴스
import { useNavigation } from '@react-navigation/native'; // 화면 이동

const LoginScreen = () => {
  const [email, setEmail] = useState('');     // 이메일 상태
  const [password, setPassword] = useState(''); // 비밀번호 상태
  const navigation = useNavigation();         // 네비게이션 훅

  // 🔒 비밀번호 유효성 검사 함수 (회원가입과 동일한 조건)
  const isValidPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    return regex.test(password);
  };

  // 🔓 로그인 처리 함수
  const handleLogin = () => {
    if (email === '' || password === '') {
      Alert.alert('오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert('비밀번호 오류', '비밀번호는 8~20자이며 대소문자, 숫자, 특수문자를 포함해야 합니다.');
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        Alert.alert('로그인 성공', '환영합니다!');
        // 로그인 후 다음 화면 이동 가능 (예: HomeScreen)
        // navigation.navigate('Home');
      })
      .catch((error) => {
        console.error('로그인 실패:', error);
        Alert.alert('로그인 실패', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>

      {/* 이메일 입력 */}
      <TextInput
        style={styles.input}
        placeholder="이메일 입력"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* 비밀번호 입력 */}
      <TextInput
        style={styles.input}
        placeholder="비밀번호 입력"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* 로그인 버튼 */}
      <Button title="로그인" onPress={handleLogin} />

      {/* 회원가입 화면으로 이동 */}
      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.signupText}>아직 계정이 없으신가요?</Text>
      </TouchableOpacity>
    </View>
  );
};

// 💄 스타일 정의
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  signupText: {
    marginTop: 16,
    textAlign: 'center',
    color: 'blue',
  },
});

export default LoginScreen;
