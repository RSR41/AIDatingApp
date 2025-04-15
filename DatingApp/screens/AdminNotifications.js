// screens/AdminNotifications.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigation } from '@react-navigation/native';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, 'admin_notifications'),
          orderBy('notifiedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const notiList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(notiList);
      } catch (err) {
        console.error('알림 불러오기 실패:', err);
      }
    };

    fetchNotifications();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={async () => {
        try {
          // 1. 읽음 처리 업데이트
          const notiRef = doc(db, 'admin_notifications', item.id);
          await updateDoc(notiRef, { read: true });

          // 2. 상세 화면으로 이동
          navigation.navigate('AdminReportDetail', {
            reporterId: item.reporterId,
            reportedUserId: item.reportedUserId,
            reason: item.reason,
            notifiedAt: item.notifiedAt,
          });
        } catch (err) {
          console.error('읽음 처리 실패:', err);
        }
      }}
    >
      <View style={[styles.card, item.read && styles.readCard]}>
        <Text style={styles.title}>🚨 신고 알림</Text>
        <Text>신고자 ID: {item.reporterId}</Text>
        <Text>피신고자 ID: {item.reportedUserId}</Text>
        <Text>사유: {item.reason}</Text>
        <Text style={styles.time}>
          시간: {item.notifiedAt?.toDate().toLocaleString() || 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={notifications}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 16,
    borderRadius: 10,
    elevation: 3,
  },
  readCard: {
    backgroundColor: '#f0f0f0', // 읽은 알림: 회색 배경
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#d9534f',
  },
  time: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
});

export default AdminNotifications;
