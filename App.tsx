import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '@expo-google-fonts/raleway';
import {
  Raleway_600SemiBold,
  Raleway_700Bold,
} from '@expo-google-fonts/raleway';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { createSessionFromUrl, signInWithSpotify, signOut } from './lib/auth';
import type { SongMemory } from './lib/songMemories';
import CaptureScreen from './screens/CaptureScreen';
import HomeScreen, { type ViewMode } from './screens/HomeScreen';
import EventDetailScreen from './screens/EventDetailScreen';
import SongDetailScreen from './screens/SongDetailScreen';
import PrimaryButton from './components/PrimaryButton';
import { colors, fonts, spacing } from './theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// The three "list" screens double as edit-flow return destinations —
// reopenMemory lets a screen auto-reopen a memory's detail view after
// coming back from editing it. Carrying the actual memory object (not just
// its id) matters: each of these screens remounts fresh on the way back
// and has to re-fetch its own list over the network, which — if the return
// path only had an id to look up — meant a visible lag before the detail
// view could even appear. Passing the object lets it show instantly, while
// the screen's own fetch still runs normally underneath (and, once it
// resolves, lets the screen upgrade to a real measured origin so a later
// close still flips back into the actual card instead of just fading).
// homeViewMode similarly preserves which of Home's two tabs was active —
// otherwise every return trip resets to the default "By event" tab.
type ListScreen =
  | { type: 'home'; reopenMemory?: SongMemory; homeViewMode?: ViewMode }
  | { type: 'eventDetail'; eventId: string; eventName: string; reopenMemory?: SongMemory }
  | { type: 'songDetail'; songId: string; reopenMemory?: SongMemory };

type Screen = ListScreen | { type: 'capture'; editingMemory?: SongMemory; returnTo?: ListScreen };

export default function App() {
  const [fontsLoaded] = useFonts({
    Raleway_600SemiBold,
    Raleway_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlayfairDisplay_400Regular,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const [view, setView] = useState<Screen>({ type: 'home' });
  const [refreshKey, setRefreshKey] = useState(0);

  // Handles the case where the OAuth redirect opens the app directly
  // (e.g. after the app was backgrounded) rather than resolving through
  // WebBrowser.openAuthSessionAsync's returned promise in lib/auth.ts.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
    createSessionFromUrl(url).catch((err) => {
      setSignInError(err instanceof Error ? err.message : String(err));
    });
  }, [url]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !sessionLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, sessionLoading]);

  async function handleSignIn() {
    setSigningIn(true);
    setSignInError(null);
    try {
      await signInWithSpotify();
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : String(err));
    } finally {
      setSigningIn(false);
    }
  }

  // Tapping "Edit" from a memory's detail view doesn't just go to capture —
  // it remembers which list screen that detail view was opened from, so
  // saving (or canceling) can come back to that same screen and reopen the
  // now-current memory there, rather than always landing back on home.
  function handleEditMemory(memory: SongMemory, homeViewMode?: ViewMode) {
    setView((current): Screen => {
      let returnTo: ListScreen = current.type === 'capture' ? { type: 'home' } : current;
      if (returnTo.type === 'home' && homeViewMode) {
        returnTo = { ...returnTo, homeViewMode };
      }
      return { type: 'capture', editingMemory: memory, returnTo };
    });
  }

  function handleMemorySaved(saved: SongMemory) {
    setRefreshKey((k) => k + 1);
    setView((current) => {
      if (current.type === 'capture' && current.returnTo) {
        return { ...current.returnTo, reopenMemory: saved };
      }
      return { type: 'home' };
    });
  }

  function handleCaptureCancel() {
    setView((current) => {
      if (current.type === 'capture' && current.returnTo) {
        return { ...current.returnTo, reopenMemory: current.editingMemory };
      }
      return { type: 'home' };
    });
  }

  if (!fontsLoaded || sessionLoading) {
    return null;
  }

  if (!session) {
    return (
      <View style={styles.root} onLayout={onLayoutRootView}>
        <StatusBar style="dark" />
        {/* Plain cream background, not a gradient wash — the coral/mustard
            sunset gradient is reserved for the sign-in button itself, the
            one accent-filled action on this screen (DESIGN_2.md). */}
        <View style={styles.loginGradient}>
          <View style={styles.loginHero}>
            <Text style={styles.loginEyebrow}>♪ your songs, your stories</Text>
            <Text style={styles.loginTitle}>Music Journal</Text>
            <Text style={styles.loginTagline}>
              Tag the songs that mark your life's moments — where you were, how it felt,
              what chapter it belongs to.
            </Text>
          </View>

          <View style={styles.loginCard}>
            <PrimaryButton
              title={signingIn ? 'Signing in…' : 'Sign in with Spotify'}
              onPress={handleSignIn}
              loading={signingIn}
              style={styles.loginButton}
            />
            {signInError && <Text style={styles.errorText}>{signInError}</Text>}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.appContainer} onLayout={onLayoutRootView}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        {view.type === 'home' && (
          <HomeScreen
            refreshKey={refreshKey}
            reopenMemory={view.reopenMemory}
            initialViewMode={view.homeViewMode}
            onAddPress={() => setView({ type: 'capture' })}
            onOpenSong={(songId) => setView({ type: 'songDetail', songId })}
            onOpenEvent={(eventId, eventName) => setView({ type: 'eventDetail', eventId, eventName })}
            onEditMemory={handleEditMemory}
            onSignOut={() => signOut()}
          />
        )}

        {view.type === 'capture' && (
          <CaptureScreen
            userId={session.user.id}
            editingMemory={view.editingMemory}
            onCancel={handleCaptureCancel}
            onSaved={handleMemorySaved}
          />
        )}

        {view.type === 'eventDetail' && (
          <EventDetailScreen
            eventId={view.eventId}
            eventName={view.eventName}
            reopenMemory={view.reopenMemory}
            onBack={() => setView({ type: 'home' })}
            onOpenSong={(songId) => setView({ type: 'songDetail', songId })}
            onOpenEvent={(eventId, eventName) => setView({ type: 'eventDetail', eventId, eventName })}
            onEditMemory={handleEditMemory}
          />
        )}

        {view.type === 'songDetail' && (
          <SongDetailScreen
            songId={view.songId}
            reopenMemory={view.reopenMemory}
            onBack={() => setView({ type: 'home' })}
            onOpenEvent={(eventId, eventName) => setView({ type: 'eventDetail', eventId, eventName })}
            onEditMemory={handleEditMemory}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loginGradient: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: spacing.xxl,
  },
  loginHero: {
    alignItems: 'center',
  },
  loginEyebrow: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  loginTitle: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  loginTagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  loginCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  loginButton: {
    width: '100%',
    maxWidth: 320,
  },
  appContainer: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
