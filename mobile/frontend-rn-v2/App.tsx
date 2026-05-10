import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Training } from './src/api';
import TrainingListScreen from './src/screens/TrainingListScreen';
import TrainingPlayerScreen from './src/screens/TrainingPlayerScreen';

interface Selection { training: Training; assignmentId: string; isReview: boolean; initialSlide: number }

export default function App() {
  const [selected, setSelected] = useState<Selection | null>(null);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {selected ? (
        <TrainingPlayerScreen
          training={selected.training}
          assignmentId={selected.assignmentId}
          isReview={selected.isReview}
          initialSlide={selected.initialSlide}
          onBack={() => setSelected(null)}
        />
      ) : (
        <TrainingListScreen
          onSelect={(t, assignmentId, isReview, initialSlide) => setSelected({ training: t, assignmentId, isReview, initialSlide })}
        />
      )}
    </SafeAreaProvider>
  );
}
