import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, SafeAreaView, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { Briefcase, Plus, ChevronRight, LogOut } from 'lucide-react-native';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Business'>;

export default function BusinessScreen({ navigation }: { navigation: NavigationProp }) {
  const { businesses, addBusiness, user, logout } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [bizName, setBizName] = useState('');

  const handleCreate = () => {
    if (!bizName.trim()) return;
    addBusiness(bizName);
    setBizName('');
    setModalVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-5 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Workspace</Text>
          <Text className="text-white text-2xl font-black">{user?.name}'s Ecosystem</Text>
        </View>
        <TouchableOpacity onPress={logout} className="p-2.5 bg-slate-900 border border-slate-800 rounded-full">
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="items-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 px-6 mt-4">
            <Briefcase size={40} color="#475569" />
            <Text className="text-slate-400 font-semibold mt-4 text-center">No active businesses found</Text>
            <Text className="text-slate-600 text-xs text-center mt-1">Tap the button below to instantiate your first firm tracker.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Passbook', { businessId: item.id, businessName: item.name })}
            className="flex-row justify-between items-center bg-slate-900 p-5 rounded-2xl mb-3 border border-slate-800/80"
          >
            <div className="flex-row items-center space-x-4">
              <View className="bg-emerald-500/10 p-3 rounded-xl">
                <Briefcase size={22} color="#10b981" />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">{item.name}</Text>
                <Text className="text-slate-500 text-xs mt-0.5">{item.passbooks.length} Active Passbooks</Text>
              </View>
            </div>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity onPress={() => setModalVisible(true)} className="absolute bottom-6 right-6 bg-emerald-500 p-4 rounded-full shadow-lg shadow-emerald-500/20">
        <Plus size={28} color="#020617" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-900 p-6 rounded-t-3xl border-t border-slate-800">
            <Text className="text-white text-xl font-bold mb-4">Register New Business</Text>
            <TextInput
              placeholder="Business Name"
              placeholderTextColor="#475569"
              value={bizName}
              onChangeText={setBizName}
              autoFocus
              className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800 mb-4 font-semibold"
            />
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-800 p-4 rounded-xl items-center">
                <Text className="text-slate-300 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} className="flex-1 bg-emerald-500 p-4 rounded-xl items-center">
                <Text className="text-slate-950 font-bold">Instantiate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
