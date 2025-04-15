// AdminHomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigation } from '@react-navigation/native';

const AdminHomeScreen = () => {
  const navigation = useNavigation();

  const [users, setUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0); // 읽지 않은 알림 수 상태

  // 🔐 로그아웃 함수
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  useEffect(() => {
    // 사용자 불러오기
    const fetchAllUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const userList = [];
        querySnapshot.forEach((doc) => {
          userList.push({ id: doc.id, ...doc.data() });
        });
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    // 읽지 않은 알림 수 불러오기
    const fetchUnreadNotifications = async () => {
      try {
        const q = query(
          collection(db, 'admin_notifications'),
          where('read', '==', false)
        );
        const snapshot = await getDocs(q);
        setUnreadCount(snapshot.size);
      } catch (err) {
        console.error('읽지 않은 알림 수 불러오기 실패:', err);
      }
    };

    fetchAllUsers();
    fetchUnreadNotifications();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderColor: '#ccc' }}>
      <Text style={{ fontSize: 16 }}>
        {item.name || item.email} (ID: {item.id})
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, paddingTop: 50, paddingHorizontal: 10 }}>
      {/* 상단 알림 + 제목 */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
      }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
          관리자 페이지: 사용자 목록
        </Text>

        {/* 신고 알림 뱃지 */}
        <TouchableOpacity onPress={() => navigation.navigate('AdminNotifications')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 16 }}>신고 알림</Text>
            {unreadCount > 0 && (
              <View style={{
                backgroundColor: 'red',
                borderRadius: 12,
                marginLeft: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* ✅ 정지된 유저 관리 진입 버튼 */}
      <View style={{ marginBottom: 16 }}>
        <Button
          title="정지된 유저 관리"
          onPress={() => navigation.navigate('AdminSuspendedUsers')}
          color="#c0392b"
        />
      </View>

      {/* 사용자 리스트 */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

      {/* 로그아웃 버튼 */}
      <View style={{ marginTop: 24 }}>
        <Button title="로그아웃" onPress={handleLogout} color="red" />
      </View>
    </View>
  );
};

export default AdminHomeScreen;
