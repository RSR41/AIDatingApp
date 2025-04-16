// services/firebase.js

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyC3i6Xi9arhiV05aYAE9u8ZxZcnwfNoqlo",
  authDomain: "datingapp-b5bd0.firebaseapp.com",
  projectId: "datingapp-b5bd0",
  storageBucket: "datingapp-b5bd0.appspot.com",
  messagingSenderId: "901982259380",
  appId: "1:901982259380:web:bef1ec5863ff2319f8afe1",
  measurementId: "G-5Q29HK1SGX"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// React Native 환경에서 인증 persistence 설정 (AsyncStorage 사용)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Firestore & Storage 초기화
const db = getFirestore(app);
const storage = getStorage(app);

// 모듈 외부로 내보내기
export { auth, db, storage };
