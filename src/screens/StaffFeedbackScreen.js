import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteFeedback, getFeedbackAdmin, respondToFeedback } from '../services/api';
import { showActionError } from '../utils/errorHandling';
import { formatBookingDateTime } from '../utils/formatBookingDateTime';

export default function StaffFeedbackScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyId, setReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async ({ isPull = false } = {}) => {
    try {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      const data = await getFeedbackAdmin();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showActionError('Feedback', e, 'Could not load guest feedback.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async () => {
    if (!replyId || !replyText.trim()) return;
    try {
      setSending(true);
      await respondToFeedback(replyId, replyText.trim());
      setReplyId(null);
      setReplyText('');
      await load({ isPull: false });
      Alert.alert('Sent', 'Your reply was saved. The guest will be notified.');
    } catch (e) {
      showActionError('Reply', e, 'Could not save your reply.');
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = (item) => {
    const id = String(item?._id || '');
    if (!id) return;
    Alert.alert(
      'Delete feedback?',
      'This will permanently remove this message.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFeedback(id);
              if (replyId === id) {
                setReplyId(null);
                setReplyText('');
              }
              await load({ isPull: false });
              Alert.alert('Deleted', 'Feedback removed. The guest will be notified.');
            } catch (e) {
              showActionError('Delete failed', e, 'Could not delete this feedback.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Guest feedback</Text>
          <Text style={styles.sub}>Read guest messages and reply (guests are notified).</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4A5BCC" />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item._id)}
            contentContainerStyle={styles.listPad}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load({ isPull: true })} tintColor="#4A5BCC" />
            }
            ListEmptyComponent={<Text style={styles.empty}>No feedback yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.guestName}>{item.user?.name || 'Guest'}</Text>
                  <Text style={styles.date}>{formatBookingDateTime(item.createdAt) || '—'}</Text>
                </View>
                {item.user?.email ? <Text style={styles.email}>{item.user.email}</Text> : null}
                <Text style={styles.message}>{item.message}</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
                {item.response ? (
                  <View style={styles.replyBlock}>
                    <Text style={styles.replyLabel}>Response</Text>
                    <Text style={styles.replyText}>{item.response}</Text>
                    {item.respondedBy?.name ? (
                      <Text style={styles.replyMeta}>— {item.respondedBy.name}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={styles.editReplyBtn}
                      onPress={() => {
                        setReplyId(String(item._id));
                        setReplyText(item.response || '');
                      }}
                    >
                      <Text style={styles.editReplyText}>Update reply</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.respondBtn}
                    onPress={() => {
                      setReplyId(String(item._id));
                      setReplyText('');
                    }}
                  >
                    <Text style={styles.respondBtnText}>Respond</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListFooterComponent={
              replyId ? (
                <View style={styles.replyComposer}>
                  <Text style={styles.composerLabel}>Your reply</Text>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Write a response to the guest..."
                    placeholderTextColor="#94A3B8"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <View style={styles.composerRow}>
                    <TouchableOpacity style={styles.cancelComposer} onPress={() => { setReplyId(null); setReplyText(''); }}>
                      <Text style={styles.cancelComposerText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendComposer, sending && { opacity: 0.7 }]}
                      onPress={sendReply}
                      disabled={sending}
                    >
                      {sending ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.sendComposerText}>Send</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#1B2036' },
  sub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPad: { padding: 16, paddingBottom: 120 },
  empty: { textAlign: 'center', color: '#8E8E93', marginTop: 32, fontSize: 15 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8EC',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  guestName: { fontSize: 16, fontWeight: '700', color: '#1B2036', flex: 1, marginRight: 8 },
  date: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  email: { fontSize: 13, color: '#64748B', marginTop: 4 },
  message: { fontSize: 15, color: '#334155', marginTop: 10, lineHeight: 22 },
  replyBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  replyLabel: { fontSize: 11, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  replyText: { fontSize: 14, color: '#0F172A', marginTop: 6, lineHeight: 20 },
  replyMeta: { fontSize: 12, color: '#64748B', marginTop: 6, fontStyle: 'italic' },
  respondBtn: { marginTop: 12, alignSelf: 'flex-start' },
  respondBtnText: { color: '#4A5BCC', fontWeight: '700', fontSize: 15 },
  editReplyBtn: { marginTop: 10, alignSelf: 'flex-start' },
  editReplyText: { color: '#4A5BCC', fontWeight: '600', fontSize: 14 },
  deleteBtn: { marginTop: 12, alignSelf: 'flex-start' },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  replyComposer: {
    marginTop: 8,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  composerLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  composerInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  composerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 },
  cancelComposer: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 8 },
  cancelComposerText: { color: '#64748B', fontWeight: '600' },
  sendComposer: {
    backgroundColor: '#1B2036',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  sendComposerText: { color: '#FFFFFF', fontWeight: '700' },
});
