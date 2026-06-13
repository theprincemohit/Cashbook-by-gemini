import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { ShieldCheck, LogIn } from 'lucide-react-native';

export default function AuthScreen() {
  const { login } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    login(email, name || 'User');
  };

  const handleGoogleLogin = () => {
    // Placeholder integration for expo-auth-session / google-sign-in
    login('googleuser@gmail.com', 'Google User');
    Alert.alert('Success', 'Logged in via Google');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-center px-6">
      <View className="items-center mb-8">
        <View className="bg-emerald-500 p-4 rounded-3xl mb-4">
          <ShieldCheck size={40} color="#fff" />
        </View>
        <Text className="text-white text-3xl font-extrabold tracking-tight">LedgerPro</Text>
        <Text className="text-slate-400 text-sm mt-1">Smart Cash Management Ecosystem</Text>
      </View>

      <View className="space-y-4 bg-slate-800 p-6 rounded-3xl border border-slate-700">
        <Text className="text-white text-xl font-bold mb-2">{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
        
        {isRegister && (
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
            className="bg-slate-950 text-white px-4 py-3.5 rounded-xl border border-slate-700 font-medium"
          />
        )}

        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-slate-950 text-white px-4 py-3.5 rounded-xl border border-slate-700 font-medium"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="bg-slate-950 text-white px-4 py-3.5 rounded-xl border border-slate-700 font-medium"
        />

        <TouchableOpacity onPress={handleAuth} className="bg-emerald-500 py-4 rounded-xl items-center flex-row justify-center mt-2">
          <Text className="text-slate-950 font-bold text-base mr-2">{isRegister ? 'Sign Up' : 'Sign In'}</Text>
          <LogIn size={18} color="#020617" />
        </TouchableOpacity>
      </View>

      <View className="items-center mt-6 space-y-4">
        <Text className="text-slate-500 font-medium">OR CONTINUING WITH</Text>
        
        <TouchableOpacity onPress={handleGoogleLogin} className="bg-white w-full py-3.5 rounded-xl items-center justify-center flex-row border border-slate-200">
          <Text className="text-slate-900 font-bold text-base">Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)} className="mt-4">
          <Text className="text-emerald-400 font-semibold text-sm">
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
