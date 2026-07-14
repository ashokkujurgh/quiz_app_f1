import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { store } from './src/store';
import ApiClientBridge from './src/store/ApiClientBridge';
import RootNavigator from './src/navigation/RootNavigator';
import { fontsToLoad } from './src/theme/typography';
import { colors } from './src/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// expo-status-bar dropped backgroundColor/translucent in SDK 57 (assumes edge-to-edge),
// but Expo Go's own Activity window is still running in classic FORCE_NOT_FULLSCREEN
// mode, which needs the background set via the underlying native API. React Native
// core's StatusBar still exposes it directly, so use that instead of the Expo wrapper.
if (Platform.OS === 'android') {
  StatusBar.setBackgroundColor(colors.background, false);
  StatusBar.setTranslucent(false);
  StatusBar.setBarStyle('dark-content', false);
}

SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);

export default function App() {
  const [fontsLoaded] = useFonts(fontsToLoad);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <ApiClientBridge />
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
          translucent={false}
        />
      </SafeAreaProvider>
    </Provider>
  );
}
