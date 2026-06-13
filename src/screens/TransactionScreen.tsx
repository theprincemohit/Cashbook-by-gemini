import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, SafeAreaView, Modal, Image, Alert, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Transaction } from '../types';
import { ArrowLeft, SlidersHorizontal, Plus, Camera, User, FileText, Check } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';

type TransactionScreenRouteProp = RouteProp<RootStackParamList, 'Transaction'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'Transaction'>;

export default function TransactionScreen({ route, navigation }: { route: TransactionScreenRouteProp; navigation: NavigationProp }) {
  const { businessId, passbookId, passbookName } = route.params;
  const { businesses, addTransaction } = useApp();

  // Core Functional States
  const [txModal, setTxModal] = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

  // Input Fields
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [receipt, setReceipt] = useState<string | undefined>(undefined);
  const [selectedContact, setSelectedContact] = useState<string>('');
  
  // Contacts State
  const [contacts, setContacts] = useState<string[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const currentPassbook = businesses.find(b => b.id === businessId)?.passbooks.find(p => p.id === passbookId);

  // Sync System Contacts API
  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name] });
        if (data && data.length > 0) {
          setContacts(data.map(c => c.name).filter(Boolean) as string[]);
        }
      }
    })();
  }, []);

  const handlePickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Media library permissions required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setReceipt(result.assets[0].uri);
  };

  const handleSaveTransaction = () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Validation Error', 'Enter a valid numeric amount.');
      return;
    }
    addTransaction(businessId, passbookId, {
      type,
      amount: parseFloat(amount),
      remark,
      receiptUri: receipt,
      contactName: selectedContact || undefined
    });
    // Reset Form
    setAmount(''); setRemark(''); setReceipt(undefined); setSelectedContact(''); setTxModal(false);
  };

  const filteredTransactions = currentPassbook?.transactions.filter(t => filterType === 'all' || t.type === filterType) || [];

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-5 pt-4">
      {/* Header Controls */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-slate-900 rounded-full border border-slate-800">
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Ledger Node</Text>
            <Text className="text-white text-2xl font-black">{passbookName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setFilterModal(true)} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex-row items-center">
          <SlidersHorizontal size={18} color="#10b981" />
          <Text className="text-emerald-400 text-xs font-bold ml-2 uppercase">Report</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List Render Engine */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl mb-2 flex-row justify-between items-center">
            <div>
              <div className="flex-row items-center space-x-2">
                <Text className="text-white font-bold text-base">{item.remark || 'General Entry'}</Text>
                {item.receiptUri && <FileText size={14} color="#3b82f6" />}
              </div>
              <Text className="text-slate-500 text-xs mt-0.5">{item.date}</Text>
              {item.contactName && (
                <View className="flex-row items-center space-x-1 mt-1 bg-slate-950 px-2 py-0.5 rounded-md self-start">
                  <User size={10} color="#64748b" />
                  <Text className="text-slate-400 text-[10px] font-medium">{item.contactName}</Text>
                </View>
              )}
            </div>
            <Text className={`font-black text-lg ${item.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.type === 'credit' ? '+' : '-'} ₹{item.amount}
            </Text>
          </View>
        )}
      />

      {/* Trigger Add Fab Overlay */}
      <TouchableOpacity onPress={() => setTxModal(true)} className="absolute bottom-6 right-6 bg-emerald-500 p-4 rounded-full shadow-lg">
        <Plus size={28} color="#020617" />
      </TouchableOpacity>

      {/* Filter / Reporting Matrix Dialog Sheet */}
      <Modal visible={filterModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/70 px-6">
          <View className="bg-slate-900 w-full p-6 rounded-3xl border border-slate-800">
            <Text className="text-white text-lg font-bold mb-4">Filter Metrics Report</Text>
            {(['all', 'credit', 'debit'] as const).map((mode) => (
              <TouchableOpacity key={mode} onPress={() => { setFilterType(mode); setFilterModal(false); }} className="flex-row justify-between items-center py-3 border-b border-slate-800">
                <Text className="text-slate-200 capitalize font-medium">{mode} Entries</Text>
                {filterType === mode && <Check size={18} color="#10b981" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Entry Addition Transaction Matrix Sheet */}
      <Modal visible={txModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-900 rounded-t-3xl border-t border-slate-800 max-h-[90%]">
            <ScrollView p-6 className="p-6 space-y-4">
              <Text className="text-white text-xl font-bold mb-2">Record Allocation Entry</Text>
              
              {/* Dual Ledger Switching Mode toggle Component */}
              <View className="flex-row bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <TouchableOpacity onPress={() => setType('credit')} className={`flex-1 py-3 rounded-lg items-center ${type === 'credit' ? 'bg-emerald-500/10 border border-emerald-500/20' : ''}`}>
                  <Text className={`font-bold ${type === 'credit' ? 'text-emerald-400' : 'text-slate-500'}`}>CREDIT (+)</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setType('debit')} className={`flex-1 py-3 rounded-lg items-center ${type === 'debit' ? 'bg-rose-500/10 border border-rose-500/20' : ''}`}>
                  <Text className={`font-bold ${type === 'debit' ? 'text-rose-400' : 'text-slate-500'}`}>DEBIT (-)</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Amount (INR)"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800 font-bold text-lg"
              />

              <TextInput
                placeholder="Remarks / Description"
                placeholderTextColor="#475569"
                value={remark}
                onChangeText={setRemark}
                className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800 font-semibold"
              />

              {/* Native Contact Custom Reactive Lookup Picker */}
              <View className="z-50">
                <TouchableOpacity onPress={() => setShowContactDropdown(!showContactDropdown)} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex-row justify-between items-center">
                  <Text className="text-slate-400 font-medium">{selectedContact || 'Link System Mobile Contact'}</Text>
                  <User size={16} color="#64748b" />
                </TouchableOpacity>
                {showContactDropdown && (
                  <View className="bg-slate-950 border border-slate-800 max-h-32 rounded-xl mt-1 overflow-hidden">
                    <FlatList
                      data={contacts}
                      keyExtractor={(item, index) => index.toString()}
                      nestedScrollEnabled
                      renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => { setSelectedContact(item); setShowContactDropdown(false); }} className="p-3 border-b border-slate-900">
                          <Text className="text-white text-xs">{item}</Text>
                        </TouchableOpacity>
                      )}
