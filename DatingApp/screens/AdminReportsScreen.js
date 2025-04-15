// screens/AdminReportsScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert, TouchableOpacity } from 'react-native';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigation } from '@react-navigation/native';

const REPORT_THRESHOLD = 3; // 자동 정지 임계값 (예: 3건 이상 승인된 신고가 누적되면 자동 정지)

const AdminReportsScreen = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    // reports 컬렉션 실시간 구독
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const reportList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReports(reportList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 승인 처리: 해당 신고를 승인 처리하고, 자동 정지 여부를 확인함
  const handleApproveReport = async (report) => {
    try {
      // 신고 문서 업데이트: status를 approved로 설정
      await updateDoc(doc(db, 'reports', report.id), {
        status: 'approved',
      });
      Alert.alert('처리 완료', '신고가 승인되었습니다.');

      // 승인된 신고 누적 건수 검사 후 자동 정지 호출
      await checkAutoBan(report.reportedUserId);
    } catch (error) {
      console.error('승인 처리 오류:', error);
      Alert.alert('오류', '신고 승인 처리 중 문제가 발생했습니다.');
    }
  };

  // 반려 처리: 해당 신고를 반려 처리 (무효로)
  const handleRejectReport = async (report) => {
    try {
      // 신고 문서 업데이트: status를 rejected로 설정
      await updateDoc(doc(db, 'reports', report.id), {
        status: 'rejected',
      });
      Alert.alert('처리 완료', '신고가 반려되었습니다.');
    } catch (error) {
      console.error('반려 처리 오류:', error);
      Alert.alert('오류', '신고 반려 처리 중 문제가 발생했습니다.');
    }
  };

  // 자동 정지 함수: 특정 사용자에 대해 승인된 신고가 임계값 이상이면 자동 정지 처리
  const checkAutoBan = async (reportedUserId) => {
    try {
      // approved 상태의 신고들만 조회 (예: 이미 auto-banned 신고는 포함하지 않음)
      const q = query(
        collection(db, 'reports'),
        where('reportedUserId', '==', reportedUserId),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      const approvedCount = snapshot.size;
      
      if (approvedCount >= REPORT_THRESHOLD) {
        // 해당 사용자 정지 처리
        await updateDoc(doc(db, 'users', reportedUserId), {
          isSuspended: true,
          banReason: '자동 정지: 누적 신고 승인',
          banDate: serverTimestamp(),
        });
        // 관련 신고들 상태 업데이트 (선택: auto-banned로 표시)
        snapshot.docs.forEach(async (docSnap) => {
          await updateDoc(doc(db, 'reports', docSnap.id), {
            status: 'auto-banned',
          });
        });
        Alert.alert('자동 정지', `사용자 ${reportedUserId}가 자동 정지 처리되었습니다.`);
      }
    } catch (error) {
      console.error('자동 정지 처리 오류:', error);
    }
  };

  // 이미 있던 영구 탈퇴 함수 (관리자가 바로 정지시키는 기능)
  const handleBanUser = (report) => {
    Alert.alert(
      '사용자 영구 탈퇴',
      `신고 대상 사용자 (${report.reportedUserId})를 영구 탈퇴시키겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          onPress: async () => {
            try {
              // 사용자 문서 업데이트: isSuspended, banReason, banDate
              await updateDoc(doc(db, 'users', report.reportedUserId), {
                isSuspended: true,
                banReason: report.reportReason, // 신고 사유 기록
                banDate: serverTimestamp(),
              });
              // 신고 문서 업데이트: status를 'banned'로 변경
              await updateDoc(doc(db, 'reports', report.id), {
                status: 'banned',
              });
              Alert.alert('처리 완료', `사용자 ${report.reportedUserId}가 영구 탈퇴 처리되었습니다.`);
            } catch (error) {
              console.error('영구 탈퇴 처리 오류:', error);
              Alert.alert('오류', '사용자 탈퇴 처리 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  // 신고 내역 항목 렌더링 함수 (승인, 반려, 영구 탈퇴 버튼 추가)
  const renderReportItem = ({ item }) => (
    <View style={styles.reportCard}>
      <TouchableOpacity onPress={() => navigation.navigate('AdminReportDetail', {
        reporterId: item.reporterId,
        reportedUserId: item.reportedUserId,
        reason: item.reportReason,
        notifiedAt: item.reportedAt,
      })}>
        <Text style={styles.reportTitle}>신고 ID: {item.id}</Text>
      </TouchableOpacity>

      <Text>신고 대상: {item.reportedUserId}</Text>
      <Text>신고 사유: {item.reportReason}</Text>
      <Text>
        신고 시각: {item.reportedAt ? new Date(item.reportedAt.seconds * 1000).toLocaleString() : 'N/A'}
      </Text>
      <Text>처리 상태: {item.status}</Text>

      <View style={styles.buttonContainer}>
        <Button title="승인" onPress={() => handleApproveReport(item)} color="green" />
        <View style={{ width: 10 }} />
        <Button title="반려" onPress={() => handleRejectReport(item)} color="orange" />
        <View style={{ width: 10 }} />
        <Button title="영구 탈퇴" onPress={() => handleBanUser(item)} color="red" />
      </View>
    </View>
  );

  if (loading) {
    return <Text>로딩 중...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>신고 내역 목록</Text>
      {reports.length === 0 ? (
        <Text>신고 내역이 없습니다.</Text>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReportItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  reportCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  reportTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8 
  },
});

export default AdminReportsScreen;