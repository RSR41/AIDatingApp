// AdminDashboardScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, Alert, StyleSheet } from 'react-native';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { scheduleReportNotification } from '../utils/AdminNotifications';

const AdminDashboardScreen = () => {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const previousReportCount = useRef(0);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), snapshot => {
      const userList = [];
      snapshot.forEach(docSnap => {
        userList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(userList);
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    const unsubscribeReports = onSnapshot(collection(db, 'reports'), snapshot => {
      const reportList = [];
      snapshot.forEach(docSnap => {
        reportList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setReports(reportList);
    });
    return () => unsubscribeReports();
  }, []);

  useEffect(() => {
    if (reports.length > previousReportCount.current) {
      const newReport = reports[reports.length - 1];
      scheduleReportNotification(newReport);
    }
    previousReportCount.current = reports.length;
  }, [reports]);

  useEffect(() => {
    const unsubscribeChats = onSnapshot(collection(db, 'chats'), snapshot => {
      const chatList = [];
      snapshot.forEach(docSnap => {
        chatList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setChats(chatList);
    });
    return () => unsubscribeChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      const unsubscribeMessages = onSnapshot(
        collection(db, 'chats', selectedChat.id, 'messages'),
        snapshot => {
          const msgs = [];
          snapshot.forEach(docSnap => {
            msgs.push({ id: docSnap.id, ...docSnap.data() });
          });
          setMessages(msgs);
        }
      );
      return () => unsubscribeMessages();
    }
  }, [selectedChat]);

  const reportUserAndSuspend = async (userId, reportReason = '불건전한 대화') => {
    Alert.alert(
      '사용자 신고',
      `사유: ${reportReason}\n해당 사용자를 정지하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '정지',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'reports'), {
                reporterId: auth.currentUser ? auth.currentUser.uid : 'admin',
                reportedUserId: userId,
                reportReason,
                reportedAt: serverTimestamp(),
                status: 'pending',
              });
              await updateDoc(doc(db, 'users', userId), {
                isSuspended: true,
              });
              Alert.alert('처리 완료', '사용자가 정지되었고 신고 내역이 기록되었습니다.');
            } catch (error) {
              console.error('신고/정지 처리 중 오류 발생:', error);
              Alert.alert('오류', '사용자 정지 처리 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }) => (
    <View style={styles.itemCard}>
      <Text>{item.name || item.email}</Text>
      <Text>온라인 상태: {item.isOnline ? '온라인' : '오프라인'}</Text>
      <Text>
        마지막 활동:{' '}
        {item.lastActiveAt
          ? new Date(item.lastActiveAt.seconds * 1000).toLocaleString()
          : '정보 없음'}
      </Text>
      {item.isSuspended && <Text style={{ color: 'red' }}>정지됨</Text>}
      <Button title="신고/정지" onPress={() => reportUserAndSuspend(item.id)} />
    </View>
  );

  const renderChat = ({ item }) => (
  <TouchableOpacity style={styles.itemCard} onPress={() => setSelectedChat(item)}>
    <Text>채팅방 ID: {item.id}</Text>
    <Text>마지막 메시지: {item.lastMessage || '없음'}</Text>
  </TouchableOpacity>
  );

  const renderReport = ({ item }) => (
    <View style={styles.itemCard}>
      <Text>신고 대상 사용자: {item.reportedUserId}</Text>
      <Text>신고 사유: {item.reportReason}</Text>
      <Text>
        신고 시각:{' '}
        {item.reportedAt
          ? new Date(item.reportedAt.seconds * 1000).toLocaleString()
          : 'N/A'}
      </Text>
      <Text>처리 상태: {item.status}</Text>
    </View>
  );

  const totalUsers = users.length;
  const suspendedUsers = users.filter(u => u.isSuspended).length;
  const totalReports = reports.length;
  const approvedReports = reports.filter(r => r.status === 'approved').length;
  const autoBannedReports = reports.filter(r => r.status === 'auto-banned').length;

  return (
    <View style={{ flex: 1, paddingTop: 50, paddingHorizontal: 10 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
        관리자 대시보드
      </Text>

      {/* 통계 카드 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginVertical: 12 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>총 사용자</Text>
          <Text style={styles.cardNumber}>{totalUsers}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>정지된 유저</Text>
          <Text style={styles.cardNumber}>{suspendedUsers}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>총 신고</Text>
          <Text style={styles.cardNumber}>{totalReports}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>승인된 신고</Text>
          <Text style={styles.cardNumber}>{approvedReports}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>자동 정지</Text>
          <Text style={styles.cardNumber}>{autoBannedReports}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 20, marginBottom: 5 }}>사용자 목록</Text>
      <FlatList data={users} keyExtractor={item => item.id} renderItem={renderUser} />

      <Text style={{ fontSize: 20, marginVertical: 10 }}>채팅 목록</Text>
      <FlatList data={chats} keyExtractor={item => item.id} renderItem={renderChat} />

      {selectedChat && (
      <View style={{ marginTop: 20, borderWidth: 1, borderColor: '#ccc', padding: 10 }}>
        <Text style={{ fontSize: 20, marginBottom: 10 }}>
          채팅방 상세 보기 ({selectedChat.id})
        </Text>
        {messages.map(msg => (
          <Text key={msg.id} style={styles.chatDetailMessage}>
            {msg.senderId}: {msg.text}
          </Text>
        ))}
        <Button title="닫기" onPress={() => setSelectedChat(null)} />
      </View>
    )}


      <Text style={{ fontSize: 20, marginVertical: 10 }}>신고 내역</Text>
      <FlatList data={reports} keyExtractor={item => item.id} renderItem={renderReport} />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 12,
  },
  itemCard: {
    backgroundColor: '#fefefe',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chatDetailMessage: {
    marginBottom: 4,
    color: '#333',
  },

  card: {
    backgroundColor: '#f1f1f1',
    padding: 14,
    borderRadius: 10,
    width: '48%',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
});

export default AdminDashboardScreen;
