// screens/AdminReportDetailScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // 추가


const AdminReportDetailScreen = ({ route }) => {
  const { reporterId, reportedUserId, reason, notifiedAt } = route.params;
  const [reportedUserInfo, setReportedUserInfo] = useState(null);
  const navigation = useNavigation();


  useEffect(() => {
    const fetchReportedUserInfo = async () => {
      try {
        const userDocRef = doc(db, 'users', reportedUserId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setReportedUserInfo(userDoc.data());
        }
      } catch (error) {
        console.error('피신고자 정보 불러오기 실패:', error);
      }
    };

    fetchReportedUserInfo();
  }, [reportedUserId]);

    const handleUnsuspendUser = () => {
      Alert.alert(
        '정지 해제',
        `피신고자 (${reportedUserId})의 정지를 해제하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '해제',
            onPress: async () => {
              try {
                await updateDoc(doc(db, 'users', reportedUserId), {
                  isSuspended: false,
                  banReason: '',
                  banDate: null,
                });
                Alert.alert('완료', '정지 해제되었습니다.');
                navigation.goBack(); // 이전 화면으로 돌아가기
              } catch (error) {
                console.error('정지 해제 실패:', error);
                Alert.alert('오류', '정지 해제 처리 중 문제가 발생했습니다.');
              }
            },
          },
        ]
      );
    };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 신고 상세 정보</Text>
      <Text style={styles.item}>신고자 ID: {reporterId}</Text>
      <Text style={styles.item}>피신고자 ID: {reportedUserId}</Text>
      <Text style={styles.item}>사유: {reason}</Text>
      <Text style={styles.item}>
        신고 시각: {notifiedAt ? new Date(notifiedAt.seconds * 1000).toLocaleString() : 'N/A'}
      </Text>

      {reportedUserInfo && (
        <>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>👤 피신고자 프로필</Text>
          <Text style={styles.item}>이름: {reportedUserInfo.name || '-'}</Text>
          <Text style={styles.item}>이메일: {reportedUserInfo.email || '-'}</Text>
          <Text style={styles.item}>정지 여부: {reportedUserInfo.isSuspended ? '정지됨' : '정상'}</Text>
          
          {reportedUserInfo.isSuspended && (
          <View style={styles.buttonWrapper}>
            <Button title="정지 해제" onPress={handleUnsuspendUser} color="#27ae60" />
          </View>
        )}

        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#c0392b',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  item: {
    fontSize: 16,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 20,
  },
  buttonWrapper: {
    marginTop: 24,
  }  
});

export default AdminReportDetailScreen;
