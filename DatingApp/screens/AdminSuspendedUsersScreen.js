// screens/AdminSuspendedUsersScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

const AdminSuspendedUsersScreen = () => {
  const [suspendedUsers, setSuspendedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Firestore에서 정지된 유저 불러오기
  const fetchSuspendedUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('isSuspended', '==', true));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSuspendedUsers(userList);
    } catch (error) {
      console.error('정지된 유저 불러오기 실패:', error);
    }
  };

  useEffect(() => {
    fetchSuspendedUsers();
  }, []);

  // 정지 해제 처리
  const handleUnsuspendUser = (userId) => {
    Alert.alert(
      '정지 해제',
      `사용자 (${userId})의 정지를 해제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), {
                isSuspended: false,
                banReason: '',
                banDate: null,
              });
              Alert.alert('처리 완료', '정지가 해제되었습니다.');
              fetchSuspendedUsers(); // 리스트 갱신
            } catch (error) {
              console.error('정지 해제 실패:', error);
              Alert.alert('오류', '정지 해제 처리 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>이름: {item.name || '-'}</Text>
      <Text>이메일: {item.email || '-'}</Text>
      <Text>정지 사유: {item.banReason || '기록 없음'}</Text>
      <Text>
        정지 일시:{" "}
        {item.banDate?.seconds
          ? new Date(item.banDate.seconds * 1000).toLocaleString()
          : '기록 없음'}
      </Text>
      <View style={styles.buttonContainer}>
        <Button title="정지 해제" onPress={() => handleUnsuspendUser(item.id)} color="green" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>정지된 유저 목록</Text>
      <FlatList
        data={suspendedUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={fetchSuspendedUsers}
        ListEmptyComponent={<Text>정지된 유저가 없습니다.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#fefefe',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  buttonContainer: { marginTop: 12 },
});

export default AdminSuspendedUsersScreen;
