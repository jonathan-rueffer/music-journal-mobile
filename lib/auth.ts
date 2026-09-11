import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL('auth-callback');

export async function createSessionFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;

  if (typeof code !== 'string') {
    return null;
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data.session;
}

export async function signInWithSpotify() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'spotify',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Supabase did not return an OAuth URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success') {
    return createSessionFromUrl(result.url);
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return null;
  }

  throw new Error(`Spotify sign-in did not complete (${result.type}).`);
}

export function signOut() {
  return supabase.auth.signOut();
}
