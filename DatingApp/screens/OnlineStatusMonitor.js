// DatingApp/OnlineStatusMonitor.js
import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { doc, updateDoc, serverTimestamp } from '../services/firebase';
import { auth, db } from '../services/firebase';

const OnlineStatusMonitor = () => {
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
      updateUserStatus(nextAppState);
    });

    // 앱 시작 시에도 상태 업데이트
    updateUserStatus(AppState.currentState);

    return () => {
      subscription.remove();
    };
  }, []);

  const updateUserStatus = async (state) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      if (state === 'active') {
        // 앱이 활성화되면 온라인 상태 true
        await updateDoc(userRef, {
          isOnline: true,
          lastActiveAt: serverTimestamp(),
        });
      } else {
        // 백그라운드/비활성 상태면 온라인 상태 false
        await updateDoc(userRef, {
          isOnline: false,
          lastActiveAt: serverTimestamp(),
        });
      }
    }
  };

  return null; // 화면에 표시할 UI 없음
};

export default OnlineStatusMonitor;
