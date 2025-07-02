import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated, ScrollView, ToastAndroid, RefreshControl } from 'react-native';
import colors from '../constants/colors';
import { searchSpotify, addSongRequest, getSessionQueue, upvoteRequest, downvoteRequest, getVoteUsage, getAddUsage, removeSongRequest } from '../utils/api';
import { useAuth } from '../AuthContext';
import homeIcon from '../assets/homebutton.png';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

const BUTTON_RADIUS = 18; // Match Create/Join Session buttons

export default function SessionScreen({ route, navigation }) {
  const session = route.params?.session;
  const { user, logout } = useAuth();
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voteUsage, setVoteUsage] = useState({ upvotes_left: 3, downvotes_left: 1, upvote_reset_seconds: 0, downvote_reset_seconds: 0 });
  const [addUsage, setAddUsage] = useState({ adds_left: 3, add_reset_seconds: 0 });
  const timerRef = useRef();
  const addTimerRef = useRef();
  const [showQueueFade, setShowQueueFade] = useState(false);
  const queueListRef = useRef();
  const [liveSession, setLiveSession] = useState(session);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  const fetchQueue = async () => {
    if (!session) return;
    setQueueLoading(true);
    try {
      const data = await getSessionQueue(session.session_code);
      setQueue(data);
    } catch (err) {}
    setQueueLoading(false);
  };

  const fetchVoteUsage = async () => {
    if (!session || !user?.id) return;
    try {
      const usage = await getVoteUsage(session.session_code, user.id);
      setVoteUsage(usage);
    } catch (err) {
      setVoteUsage({ upvotes_left: 3, downvotes_left: 1, upvote_reset_seconds: 0, downvote_reset_seconds: 0 });
    }
  };

  const fetchAddUsage = async () => {
    if (!session || !user?.id) return;
    try {
      const usage = await getAddUsage(session.session_code, user.id);
      setAddUsage(usage);
    } catch (err) {
      setAddUsage({ adds_left: 3, add_reset_seconds: 0 });
    }
  };

  useEffect(() => {
    let interval;
    let unsubscribe;

    const refreshData = async (showLoader = false) => {
      if (!session?.session_code) return;
      if (showLoader) setIsRefreshing(true);
      try {
        // Refresh session info
        const sessionResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://amiable-upliftment-production.up.railway.app'}/sessions/${session.session_code}`);
        if (sessionResponse.ok) {
          const updatedSession = await sessionResponse.json();
          setLiveSession(updatedSession);
        }
        // Refresh queue
        await fetchQueue();
        // Refresh usage data
        if (user?.id) {
          await fetchVoteUsage();
          await fetchAddUsage();
        }
        setLastUpdateTime(Date.now());
        if (showLoader) console.log('Pull to refresh completed');
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        if (showLoader) setIsRefreshing(false);
      }
    };

    // Initial load
    refreshData();

    // Auto-refresh every 15 seconds (mobile-friendly)
    interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshData();
    }, 15000);

    // Refresh on focus
    unsubscribe = navigation.addListener('focus', () => {
      refreshData(true);
    });

    // Page visibility change handler (mobile optimization)
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshData();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (unsubscribe) unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [navigation, session?.session_code, user?.id]);

  // Timer for vote cooldowns
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      (voteUsage.upvotes_left === 0 && voteUsage.upvote_reset_seconds > 0) ||
      (voteUsage.downvotes_left === 0 && voteUsage.downvote_reset_seconds > 0)
    ) {
      timerRef.current = setInterval(() => {
        fetchVoteUsage();
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
      clearInterval(timerRef.current);
        timerRef.current = null;
    }
    };
  }, [voteUsage.upvotes_left, voteUsage.downvotes_left, voteUsage.upvote_reset_seconds, voteUsage.downvote_reset_seconds]);

  // Timer for add cooldowns
  useEffect(() => {
    if (addTimerRef.current) {
      clearInterval(addTimerRef.current);
      addTimerRef.current = null;
    }
    if (addUsage.adds_left === 0 && addUsage.add_reset_seconds > 0) {
      addTimerRef.current = setInterval(() => {
        fetchAddUsage();
      }, 1000);
    }
    return () => {
      if (addTimerRef.current) {
      clearInterval(addTimerRef.current);
        addTimerRef.current = null;
      }
    };
  }, [addUsage.adds_left, addUsage.add_reset_seconds]);

  // Toast for new song added
  const previousQueueLength = useRef(queue.length);
  useEffect(() => {
    if (queue.length > previousQueueLength.current && previousQueueLength.current > 0) {
      if (Platform.OS === 'android') {
        ToastAndroid.show('New song added!', ToastAndroid.SHORT);
      }
    }
    previousQueueLength.current = queue.length;
  }, [queue.length]);

  const handleSearch = async (text) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchSpotify(text);
      setResults(data.tracks ? data.tracks.items : []);
    } catch (err) {
      setError('Search failed');
    }
    setLoading(false);
  };

  const handleAdd = async (track) => {
    console.log('=== DEBUG ADD SONG ===');
    console.log('Session:', session);
    console.log('User:', user);
    console.log('Session DJ ID:', session?.dj_id);
    console.log('Current User ID:', user?.id);
    console.log('Are they the same?', session?.dj_id === user?.id);
    if (!session) {
      Alert.alert('Error', 'No session found');
      return;
    }
    if (!user?.id) {
      navigation.navigate('PhoneLogin');
      return;
    }
    // Prevent adding duplicate songs (by title and artist)
    const alreadyInQueue = queue.some(
      item =>
        item.song_title.toLowerCase() === track.name.toLowerCase() &&
        item.artist.toLowerCase() === track.artists.map(a => a.name).join(', ').toLowerCase()
    );
    if (alreadyInQueue) {
      Alert.alert('Already in Queue', 'This song is already in the queue.');
      return;
    }
    if (addUsage.adds_left === 0) {
      Alert.alert('Out of Adds', 'You are out of adds. Please wait for your adds to reset.');
      return;
    }
    try {
      await addSongRequest({
        session_id: session.session_code,
        song_title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        user_id: user.id,
      });
      fetchQueue();
      fetchAddUsage();
    } catch (err) {
      Alert.alert('Error', err.message);
      fetchAddUsage();
    }
  };

  const handleUpvote = async (request_id) => {
    if (!user?.id) {
      navigation.navigate('PhoneLogin');
      return;
    }
    if (voteUsage.upvotes_left === 0) {
      Alert.alert('Out of Upvotes', 'You are out of upvotes. Please wait for your upvotes to reset.');
      return;
    }
    try {
      await upvoteRequest(request_id, user.id);
      fetchQueue();
      fetchVoteUsage();
    } catch (err) {
      Alert.alert('Vote Error', err.message);
    }
  };

  const handleDownvote = async (request_id) => {
    if (!user?.id) {
      navigation.navigate('PhoneLogin');
      return;
    }
    if (voteUsage.downvotes_left === 0) {
      Alert.alert('Out of Downvotes', 'You are out of downvotes. Please wait for your downvotes to reset.');
      return;
    }
    try {
      await downvoteRequest(request_id, user.id);
      fetchQueue();
      fetchVoteUsage();
    } catch (err) {
      Alert.alert('Vote Error', err.message);
    }
  };

  const handleRemove = async (request_id) => {
    try {
      await removeSongRequest({ session_id: session.session_code, request_id, user_id: user.id });
      fetchQueue();
      fetchVoteUsage();
      fetchAddUsage();
    } catch (err) {
      Alert.alert('Remove Error', err.message);
    }
  };

  // Helper for queue fade indicator
  const handleQueueScroll = (e) => {
    if (!queueListRef.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 2;
    setShowQueueFade(!atBottom && queue.length > 4);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('CreateOrJoin');
            }
          }}
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={28} color="#222" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        user ? (
          <TouchableOpacity
            onPress={async () => { await logout(); }}
            style={styles.logoutButton}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('PhoneLogin')}
            style={styles.logoutButton}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutButtonText}>Login</Text>
          </TouchableOpacity>
        )
      ),
    });
  }, [navigation, logout, user]);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>No session data found.</Text>
      </View>
    );
  }

  // Debug: log session object and route params
  console.log('Route params:', route.params);
  console.log('Session from params:', session);

  // Main FlatList data: just the queue, but use header/footer for all other content
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'position' : undefined}
      keyboardVerticalOffset={60}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refreshAllSessionData(true)}
            title="Updating session..."
          />
        }
      >
        <View>
          {/* Session Code Card - prominent at the top */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <View style={[styles.sessionInfoRow, { justifyContent: 'center', marginBottom: 8 }]}> 
                <Text style={[styles.sessionIdLabel, { fontSize: 20 }]}>ID:</Text>
                <Text style={[styles.sessionCode, { fontSize: 28, marginLeft: 10 }]}> 
                  {session?.session_code || session?.session_id || session?.code || session?.id || 'NO CODE'}
                </Text>
                <View style={styles.statusDot} />
              </View>
            </View>
          </View>
          {/* Stats Card - improved layout and shorter labels */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <View style={styles.limitsCardRowFixed}> 
                <View style={styles.limitItemFixed}>
                  <Text style={styles.limitLabel} numberOfLines={1} ellipsizeMode="tail">Add</Text>
                  <Text style={styles.limitValue}>{user ? addUsage.adds_left : '-'}</Text>
                  <View style={styles.limitBadgeArea}>
                    {user && addUsage.adds_left === 0 && addUsage.add_reset_seconds > 0 ? (
                      <View style={styles.limitBadge}>
                        <Text style={styles.limitBadgeText}>{Math.floor(addUsage.add_reset_seconds/60)}:{String(addUsage.add_reset_seconds%60).padStart(2,'0')}</Text>
                      </View>
                    ) : (
                      <View style={{ height: 22 }} />
                    )}
                  </View>
                </View>
                <View style={styles.limitItemFixed}>
                  <Text style={styles.limitLabel} numberOfLines={1} ellipsizeMode="tail">Up</Text>
                  <Text style={styles.limitValue}>{user ? voteUsage.upvotes_left : '-'}</Text>
                  <View style={styles.limitBadgeArea}>
                    {user && voteUsage.upvotes_left === 0 && voteUsage.upvote_reset_seconds > 0 ? (
                      <View style={styles.limitBadge}>
                        <Text style={styles.limitBadgeText}>{Math.floor(voteUsage.upvote_reset_seconds/60)}:{String(voteUsage.upvote_reset_seconds%60).padStart(2,'0')}</Text>
                      </View>
                    ) : (
                      <View style={{ height: 22 }} />
                    )}
                  </View>
                </View>
                <View style={styles.limitItemFixed}>
                  <Text style={styles.limitLabel} numberOfLines={1} ellipsizeMode="tail">Down</Text>
                  <Text style={styles.limitValue}>{user ? voteUsage.downvotes_left : '-'}</Text>
                  <View style={styles.limitBadgeArea}>
                    {user && voteUsage.downvotes_left === 0 && voteUsage.downvote_reset_seconds > 0 ? (
                      <View style={styles.limitBadge}>
                        <Text style={styles.limitBadgeText}>{Math.floor(voteUsage.downvote_reset_seconds/60)}:{String(voteUsage.downvote_reset_seconds%60).padStart(2,'0')}</Text>
                      </View>
                    ) : (
                      <View style={{ height: 22 }} />
                    )}
                  </View>
                </View>
                <View style={styles.limitItemFixed}>
                  <Text style={styles.limitLabel} numberOfLines={1} ellipsizeMode="tail">Songs</Text>
                  <Text style={styles.limitValue}>{queue.length}</Text>
                  <View style={{ height: 22 }} />
                </View>
                <View style={styles.limitItemFixed}>
                  <Text style={styles.limitLabel} numberOfLines={1} ellipsizeMode="tail">Crowd</Text>
                  <Text style={styles.limitValue}>{liveSession?.crowd ?? 1}</Text>
                  <View style={{ height: 22 }} />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitleLeft}>Queue</Text>
            <View style={styles.sectionDivider} />
          </View>
          {/* Black card for queue, with FlatList inside */}
          <View style={styles.cardContainer}>
            <View style={styles.queueCardFullBlack}>
              <FlatList
                data={queue}
                keyExtractor={item => item.request_id?.toString()}
                renderItem={({ item }) => {
                  const isOwnRequest = user && item.user_id === user.id;
                  if (user && user.id === session.dj_id) {
                    // DJ view with swipe to remove
                    return (
                      <Swipeable
                        renderRightActions={(_, dragX) => (
                          <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%' }}>
                            <View style={{ width: 32 }} />
                            <TouchableOpacity
                              style={[styles.voteCircleColored, styles.downvoteCircleColored, { marginRight: 16 }]}
                              onPress={() => handleRemove(item.request_id)}
                            >
                              <Ionicons name="remove" size={28} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                        overshootRight={false}
                        rightThreshold={64}
                      >
                        <View style={styles.queueRowBlack}>
                          <View style={styles.songInfo}>
                            <Text style={styles.songTitleWhite}>{item.song_title}</Text>
                            <Text style={styles.songArtistWhite}>{item.artist}</Text>
                          </View>
                          <View style={styles.voteCountBadgeYellow}>
                            <Text style={styles.voteCountTextBlack}>{item.vote_count}</Text>
                          </View>
                          {isOwnRequest ? (
                            <View style={styles.ownRequestLabelContainer}>
                              <Text style={styles.ownRequestLabel}>Your Request</Text>
                            </View>
                          ) : (
                            <View style={styles.voteArrowGroupBlack}>
                              <TouchableOpacity
                                style={[styles.voteCircleColored, styles.upvoteCircleColored, voteUsage.upvotes_left === 0 && styles.voteCircleDisabledBlack]}
                                onPress={() => handleUpvote(item.request_id)}
                                disabled={voteUsage.upvotes_left === 0}
                              >
                                <Text style={styles.voteArrowWhite}>▲</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.voteCircleColored, styles.downvoteCircleColored, voteUsage.downvotes_left === 0 && styles.voteCircleDisabledBlack]}
                                onPress={() => handleDownvote(item.request_id)}
                                disabled={voteUsage.downvotes_left === 0}
                              >
                                <Text style={styles.voteArrowWhite}>▼</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </Swipeable>
                    );
                  } else {
                    // Regular user view
                    return (
                      <View style={styles.queueRowBlack}>
                        <View style={styles.songInfo}>
                          <Text style={styles.songTitleWhite}>{item.song_title}</Text>
                          <Text style={styles.songArtistWhite}>{item.artist}</Text>
                        </View>
                        <View style={styles.voteCountBadgeYellow}>
                          <Text style={styles.voteCountTextBlack}>{item.vote_count}</Text>
                        </View>
                        {isOwnRequest ? (
                          <View style={styles.ownRequestLabelContainer}>
                            <Text style={styles.ownRequestLabel}>Your Request</Text>
                          </View>
                        ) : (
                          <View style={styles.voteArrowGroupBlack}>
                            <TouchableOpacity
                              style={[styles.voteCircleColored, styles.upvoteCircleColored, voteUsage.upvotes_left === 0 && styles.voteCircleDisabledBlack]}
                              onPress={() => handleUpvote(item.request_id)}
                              disabled={voteUsage.upvotes_left === 0}
                            >
                              <Text style={styles.voteArrowWhite}>▲</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.voteCircleColored, styles.downvoteCircleColored, voteUsage.downvotes_left === 0 && styles.voteCircleDisabledBlack]}
                              onPress={() => handleDownvote(item.request_id)}
                              disabled={voteUsage.downvotes_left === 0}
                            >
                              <Text style={styles.voteArrowWhite}>▼</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  }
                }}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                bounces={false}
                persistentScrollbar={true}
                style={{ flex: 1 }}
                ListEmptyComponent={queueLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : <Text style={styles.emptyQueue}>No songs in queue yet. Add the first one!</Text>}
              />
            </View>
          </View>
          {/* Add Songs Section */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Songs</Text>
              <View style={styles.cooldownRow}>
                <Text style={styles.voteInfo}>Adds left: {user ? addUsage.adds_left : '-'}</Text>
                {user && addUsage.adds_left === 0 && addUsage.add_reset_seconds > 0 && (
                  <View style={styles.cooldownBadge}>
                    <Text style={styles.cooldownText}>{Math.floor(addUsage.add_reset_seconds/60)}:{String(addUsage.add_reset_seconds%60).padStart(2,'0')}</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={styles.searchBar}
                placeholder="Search songs, artists"
                placeholderTextColor={colors.gray}
                value={query}
                onChangeText={handleSearch}
                returnKeyType="search"
                editable={addUsage.adds_left > 0}
              />
              {loading && <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <FlatList
                data={results}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const isInQueue = queue.some(
                    q =>
                      q.song_title.toLowerCase() === item.name.toLowerCase() &&
                      q.artist.toLowerCase() === item.artists.map(a => a.name).join(', ').toLowerCase()
                  );
                  const addDisabled = isInQueue || addUsage.adds_left === 0;
                  return (
                    <View style={styles.queueRow}>
                      <Image source={{ uri: item.album?.images?.[2]?.url || item.album?.images?.[0]?.url }} style={styles.artwork} />
                      <View style={styles.songInfo}>
                        <Text style={styles.songTitle}>{item.name}</Text>
                        <Text style={styles.songArtist}>{item.artists.map(a => a.name).join(', ')}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addButton, addDisabled && { backgroundColor: colors.gray, opacity: 0.35 }]}
                        onPress={() => handleAdd(item)}
                        disabled={addDisabled}
                      >
                        <Text style={styles.addButtonText}>{isInQueue ? 'In Queue' : addUsage.adds_left === 0 ? 'Wait' : 'Add'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
                ListEmptyComponent={!loading && query.length > 1 ? <Text style={styles.noResults}>No results</Text> : null}
                style={{ width: '100%', marginTop: 8 }}
                scrollEnabled={false}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingBottom: 48,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginTop: 32,
    marginBottom: 16,
    alignSelf: 'center',
    letterSpacing: 1,
  },
  cardContainer: {
    width: '94%',
    alignSelf: 'center',
    marginBottom: 0,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  sessionIdLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginRight: 6,
  },
  sessionCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 4,
    marginRight: 12,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#27c93f',
    marginLeft: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  limitsCardRowFixed: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 0,
    marginTop: 0,
    paddingHorizontal: 0,
  },
  limitItemFixed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  limitLabel: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  limitBadgeArea: {
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  limitBadgeText: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sectionDivider: {
    width: '80%',
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.18,
    alignSelf: 'center',
    marginVertical: 2,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    width: '100%',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  songArtist: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
  },
  voteCountBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  voteCountText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  voteArrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  voteCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  upvoteCircle: {
    backgroundColor: '#27c93f',
  },
  downvoteCircle: {
    backgroundColor: '#e74c3c',
  },
  voteCircleDisabled: {
    backgroundColor: colors.gray,
    opacity: 0.35,
  },
  voteArrow: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: -2,
  },
  queueFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
    backgroundColor: 'transparent',
    zIndex: 10,
    // Fade effect
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  cooldownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  voteInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cooldownBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 4,
  },
  cooldownText: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    color: 'red',
    marginTop: 8,
    alignSelf: 'center',
    fontSize: 16,
  },
  noResults: {
    color: colors.text,
    opacity: 0.6,
    alignSelf: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  searchBar: {
    width: '100%',
    backgroundColor: colors.gray,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    padding: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.gray,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 1,
  },
  addButtonText: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyQueue: {
    color: '#fff',
    opacity: 0.8,
    fontSize: 16,
    alignSelf: 'center',
    marginVertical: 16,
  },
  queueCardFullBlack: {
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 0,
    marginBottom: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
    height: 4 * 68,
    overflow: 'hidden',
  },
  queueRowBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginBottom: 0,
    padding: 16,
    width: '100%',
    minHeight: 68,
  },
  songTitleWhite: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  songArtistWhite: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  voteCountTextBlack: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
    marginHorizontal: 0,
    textAlign: 'center',
    minWidth: 18,
  },
  voteArrowGroupBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  voteCircleColored: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  upvoteCircleColored: {
    backgroundColor: '#27c93f',
  },
  downvoteCircleColored: {
    backgroundColor: '#e74c3c',
  },
  voteCircleDisabledBlack: {
    opacity: 0.35,
  },
  voteArrowWhite: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: -2,
  },
  voteCountBadgeYellow: {
    minWidth: 40,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitleLeft: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  logoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    minWidth: 88,
    marginLeft: 8,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  logoutButtonText: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  removeAction: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderRadius: BUTTON_RADIUS,
    marginVertical: 4,
    paddingHorizontal: 28,
    marginRight: 8,
    height: 68,
  },
  removeActionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  ownRequestLabelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    minWidth: 60,
    height: 36,
  },
  ownRequestLabel: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
}); 