import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Training } from './src/api';
import TrainingListScreen from './src/screens/TrainingListScreen';
import TrainingPlayerScreen from './src/screens/TrainingPlayerScreen';

export default function App() {
  const [selected, setSelected] = useState<Training | null>(null);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {selected ? (
        <TrainingPlayerScreen training={selected} onBack={() => setSelected(null)} />
      ) : (
        <TrainingListScreen onSelect={setSelected} />
      )}
    </SafeAreaProvider>
  );
}
