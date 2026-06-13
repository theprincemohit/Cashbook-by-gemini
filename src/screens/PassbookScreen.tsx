import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, SafeAreaView, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { BookOpen, Plus, ChevronRight, ArrowLeft } from 'lucide-react-native';

type PassbookScreenRouteProp = RouteProp<RootStackParamList, 'Passbook'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'Passbook'>;

export default function PassbookScreen({ route, navigation }: { route: PassbookScreenRouteProp; navigation: NavigationProp }) {
  const { businessId, businessName } = route.params;
  const { businesses, addPassbook } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [passbookName, setPassbookName] = useState('');

  const currentBusiness = businesses.find(b => b.id === businessId);

  const handleCreate = () => {
    if (!passbookName.trim()) return;
    addPassbook(businessId, passbookName);
    setPassbookName('');
    setModalVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-5 pt-4">
      <View className="flex-row items-center mb-6 space-x-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-slate-900 rounded-full border border-slate-800">
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{businessName}</Text>
          <Text className="text-white text-2xl font-black">Passbooks</Text>
        </View>
      </View>

      <FlatList
        data={currentBusiness?.passbooks || []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="items-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 px-6 mt-4">
            <BookOpen size={40} color="#475569" />
            <Text className="text-slate-400 font-semibold mt-4 text-center">No accounting ledgers verified</Text>
            <Text className="text-slate-600 text-xs text-center mt-1">Create separate tracking nodes for cash boxes or banks.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const balance = item.transactions.reduce((acc, t) => t.type === 'credit' ? acc + t.amount : acc - t.amount, 0);
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('Transaction', { businessId, passbookId: item.id, passbookName: item.name })}
              className="flex-row justify-between items-center bg-slate-900 p-5 rounded-2xl mb-3 border border-slate-800/80"
            >
              <div className="flex-row items-center space-x-4">
                <View className="bg-blue-500/10 p-3 rounded-xl">
                  <BookOpen size={22} color="#3b82f6" />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">{item.name}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">{item.transactions.length} Transactions</Text>
                </View>
              </div>
              <View className="flex-row items-center space-x-2">
                <Text className={`font-bold text-base ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{balance.toLocaleString('en-IN')}
                </Text>
                <ChevronRight size={16} color="#475569" />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity onPress={() => setModalVisible(true)} className="absolute bottom-6 right-6 bg-blue-500 p-4 rounded-full shadow-lg shadow-blue-500/20">
        <Plus size={28} color="#020617" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-900 p-6 rounded-t-3xl border-t border-slate-800">
            <Text className="text-white text-xl font-bold mb-4">Open New Passbook</Text>
            <TextInput
              placeholder="Passbook Name (e.g., Office Cash, Petty Bank)"
              placeholderTextColor="#475569"
              value={passbookName}
              onChangeText={setPassbookName}
              autoFocus
              className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800 mb-4 font-semibold"
            />
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-800 p-4 rounded-xl items-center">
                <Text className="text-slate-300 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} className="flex-1 bg-blue-500 p-4 rounded-xl items-center">
                <Text className="text-slate-950 font-bold">Deploy Ledger</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
