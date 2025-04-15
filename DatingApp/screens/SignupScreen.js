import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Firebase 인증 모듈
import { auth } from '../services/firebase'; // Firebase 인증 인스턴스
import { useNavigation } from '@react-navigation/native'; // 화면 전환용 훅

const SignupScreen = () => {
  const [email, setEmail] = useState(''); // 이메일 상태 저장
  const [password, setPassword] = useState(''); // 비밀번호 상태 저장
  const navigation = useNavigation(); // 네비게이션 객체 호출

  // 🔒 비밀번호 유효성 검사 함수
  const isValidPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    return regex.test(password);
  };

  // 📩 회원가입 처리 함수
  const handleSignup = () => {
    // 이메일 또는 비밀번호가 비어있을 경우
    if (email === '' || password === '') {
      Alert.alert('오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    // 비밀번호 조건이 맞지 않을 경우
    if (!isValidPassword(password)) {
      Alert.alert(
        '비밀번호 조건 오류',
        '비밀번호는 8~20자이며, 대소문자/숫자/특수문자를 각각 1개 이상 포함해야 합니다.'
      );
      return;
    }

    // Firebase를 통한 회원가입
    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log('✅ 회원가입 성공:', userCredential); // ✅ 이 부분 추가!
      Alert.alert('회원가입 성공', '이제 로그인해주세요!');
      navigation.navigate('Login'); // 회원가입 후 로그인 화면으로 이동
    })
    .catch((error) => {
      console.error('❌ 회원가입 실패:', error); // ✅ 이 부분도 함께!
      Alert.alert('회원가입 실패', error.message || '알 수 없는 오류가 발생했습니다.');
    });
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      {/* 이메일 입력란 */}
      <TextInput
        style={styles.input}
        placeholder="이메일 입력"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* 비밀번호 입력란 */}
      <TextInput
        style={styles.input}
        placeholder="비밀번호 입력 (8~20자, 대소문자+특수문자)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* 회원가입 버튼 */}
      <Button title="가입하기" onPress={handleSignup} />

      {/* 로그인 화면으로 이동 */}
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>이미 계정이 있으신가요?</Text>
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
  loginText: {
    marginTop: 16,
    textAlign: 'center',
    color: 'blue',
  },
});

export default SignupScreen;