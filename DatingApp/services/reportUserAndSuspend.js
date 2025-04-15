import { Alert } from 'react-native';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { scheduleReportNotification } from '../utils/notificationUtils';


/**
 * 특정 사용자를 신고하고, 정지 처리하며,
 * 그 내역을 reports 컬렉션과 admin_notifications 컬렉션에 기록하는 함수
 * 
 * @param {string} userId 신고/정지할 대상 사용자 UID
 * @param {string} reportReason 신고 사유
 */
export async function reportUserAndSuspend(userId, reportReason = '불건전한 대화') {
  Alert.alert(
    '사용자 신고',
    `사유: ${reportReason}\n해당 사용자를 정지하시겠습니까?`,
    [
      { text: '취소', style: 'cancel' },
      {
        text: '정지',
        onPress: async () => {
          try {
            const reporterId = auth.currentUser ? auth.currentUser.uid : 'admin';

            // 1. reports 컬렉션에 신고 기록 생성
            await addDoc(collection(db, 'reports'), {
              reporterId,
              reportedUserId: userId,
              reportReason,
              reportedAt: serverTimestamp(),
              status: 'pending',
            });

            await scheduleReportNotification({
              reportedUserId: userId,
              reason: reportReason,
            });

            // 🔥 2. admin_notifications 컬렉션에 관리자용 알림 생성
            await addDoc(collection(db, 'admin_notifications'), {
              type: 'report',
              reporterId,
              reportedUserId: userId,
              reason: reportReason,
              notifiedAt: serverTimestamp(),
              read: false,
            });

            // 3. 해당 사용자를 정지 처리 (users/{userId} 문서의 isSuspended = true)
            await updateDoc(doc(db, 'users', userId), {
              isSuspended: true,
            });

            Alert.alert('처리 완료', '사용자가 정지되었고 신고 및 관리자 알림이 저장되었습니다.');
          } catch (error) {
            console.error('신고/정지 처리 중 오류 발생:', error);
            Alert.alert('오류', '사용자 정지 처리 중 오류가 발생했습니다.');
          }
        },
      },
    ],
  );
}
