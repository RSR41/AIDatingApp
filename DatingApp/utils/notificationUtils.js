// DatingApp/utils/AdminNotifications.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 알림 핸들러 설정: 앱 내에서 알림 표시 방법 결정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// (새로운 코드 추가) 푸시 토큰 등록 함수 (실제 서버와 연동할 때 필요)
// 여기서는 로컬 알림만 사용하므로 참고용입니다.
export const registerForPushNotificationsAsync = async () => {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    alert('푸시 알림 권한을 얻지 못했습니다!');
    return;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("푸시 토큰:", token);
  return token;
};

// (새로운 코드 추가) 신고가 접수되었을 때 관리자에게 알림을 보내는 함수
export const scheduleReportNotification = async (report) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '신고 접수',
      body: `신고 대상: ${report.reportedUserId}\n사유: ${report.reportReason}`,
    },
    trigger: null, // 즉시 실행
  });
};
