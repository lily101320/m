import { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { Shop } from './components/Shop';
import { Pet } from './components/Pet';
import { History } from './components/History';
import { Navigation } from './components/Navigation';
import { createClient } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';

export type MoodType = 'happy' | 'sad' | 'angry' | 'calm' | 'excited' | 'anxious';

export interface MoodRecord {
  id: string;
  mood: MoodType;
  timestamp: Date;
  coinsEarned: number;
}

export interface PetState {
  appearance: string;
  personality: string;
  happiness: number;
  hunger: number;
}

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  effect: {
    happiness?: number;
    hunger?: number;
  };
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'shop' | 'pet' | 'history'>('home');
  const [coins, setCoins] = useState(100);
  const [moodRecords, setMoodRecords] = useState<MoodRecord[]>([]);
  const [petName, setPetName] = useState('WindSong');
  const [petState, setPetState] = useState<PetState>({
    appearance: 'neutral',
    personality: 'balanced',
    happiness: 50,
    hunger: 50,
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          setAccessToken(session.access_token);
          await loadUserData(session.access_token);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Load user data from backend
  const loadUserData = async (token: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-383a7eab/user-data`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCoins(data.coins);
        setPetName(data.petName);
        setPetState(data.petState);
        setMoodRecords(data.moodRecords.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })));
        setUserEmail(data.user.email);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Save user data to backend
  const saveUserData = async () => {
    if (!accessToken) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-383a7eab/save-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            coins,
            petName,
            petState,
            moodRecords,
          }),
        }
      );
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  // Save data whenever state changes (if logged in)
  useEffect(() => {
    if (accessToken && !loading) {
      saveUserData();
    }
  }, [coins, petName, petState, moodRecords]);

  const handleLogin = async (token: string) => {
    setAccessToken(token);
    await loadUserData(token);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAccessToken(null);
    setUserEmail(null);
    setCoins(100);
    setPetName('WindSong');
    setPetState({
      appearance: 'neutral',
      personality: 'balanced',
      happiness: 50,
      hunger: 50,
    });
    setMoodRecords([]);
  };

  const addMoodRecord = (mood: MoodType) => {
    const coinsEarned = 10;
    const newRecord: MoodRecord = {
      id: Date.now().toString(),
      mood,
      timestamp: new Date(),
      coinsEarned,
    };
    
    setMoodRecords([newRecord, ...moodRecords]);
    setCoins(coins + coinsEarned);
    
    // Update pet based on mood
    updatePetFromMood(mood);
  };

  const updatePetFromMood = (mood: MoodType) => {
    let happinessChange = 0;
    let newAppearance = petState.appearance;
    let newPersonality = petState.personality;

    switch (mood) {
      case 'happy':
        happinessChange = 15;
        newAppearance = 'joyful';
        newPersonality = 'cheerful';
        break;
      case 'sad':
        happinessChange = -10;
        newAppearance = 'melancholic';
        newPersonality = 'sensitive';
        break;
      case 'angry':
        happinessChange = -5;
        newAppearance = 'fiery';
        newPersonality = 'passionate';
        break;
      case 'calm':
        happinessChange = 10;
        newAppearance = 'serene';
        newPersonality = 'peaceful';
        break;
      case 'excited':
        happinessChange = 12;
        newAppearance = 'energetic';
        newPersonality = 'playful';
        break;
      case 'anxious':
        happinessChange = -8;
        newAppearance = 'nervous';
        newPersonality = 'cautious';
        break;
    }

    setPetState(prev => ({
      ...prev,
      appearance: newAppearance,
      personality: newPersonality,
      happiness: Math.max(0, Math.min(100, prev.happiness + happinessChange)),
      hunger: Math.max(0, prev.hunger - 2),
    }));
  };

  const buyItem = (item: ShopItem) => {
    if (coins >= item.price) {
      setCoins(coins - item.price);
      
      setPetState(prev => ({
        ...prev,
        happiness: Math.min(100, prev.happiness + (item.effect.happiness || 0)),
        hunger: Math.min(100, prev.hunger + (item.effect.hunger || 0)),
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-[#FFD700] flex items-center justify-center">
        <div className="text-2xl" style={{ fontFamily: 'monospace' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#FFD700] flex flex-col">
      <div className="flex-1 overflow-auto">
        {currentTab === 'home' && (
          <Home 
            coins={coins} 
            onAddMood={addMoodRecord} 
            isLoggedIn={!!accessToken}
            userEmail={userEmail}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}
        {currentTab === 'shop' && (
          <Shop coins={coins} onBuyItem={buyItem} />
        )}
        {currentTab === 'pet' && (
          <Pet petState={petState} petName={petName} onNameChange={setPetName} />
        )}
        {currentTab === 'history' && (
          <History records={moodRecords} />
        )}
      </div>
      
      <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
}
