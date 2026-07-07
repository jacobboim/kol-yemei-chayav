import React from 'react';
import DailyReader from './components/DailyReader';
import { useAuth } from './useAuth';
import './index.css';

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  if (loading) return null;
  return <DailyReader user={user} onSignIn={signIn} onSignUp={signUp} onSignOut={signOut} />;
}
