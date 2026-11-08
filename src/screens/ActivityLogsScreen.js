import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getActivityLogs } from '../services/api';
import { showActionError } from '../utils/errorHandling';
import { formatRelativeTime } from '../utils/formatRelativeTime';

const ROLE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'admin', label: 'Admin' },
  { key: 'staff', label: 'Staff' },
  { key: 'guest', label: 'Guest' },
];

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString()} · ${formatRelativeTime(iso)}`;
}

export default function ActivityLogsScreen({ onGoBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (roleFilter) params.role = roleFilter;
      const data = await getActivityLogs(params);
      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.logs)
          ? data.logs
          : [];
      // Hard clamp to 10 for UX safety even if backend misbehaves.
      setLogs(rows.slice(0, 10));
      setTotalPages(Number(data?.totalPages) || 1);
    } catch (e) {
      showActionError('Activity logs', e, 'Could not load activity logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleFilter, page]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const header = (
    <View style={styles.panelHeader}>
      {onGoBack ? (
        <TouchableOpacity onPress={onGoBack} style={styles.backHit} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#1B2036" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 32 }} />
      )}
      <Text style={styles.panelTitle}>Activity logs</Text>
      <View style={{ width: 32 }} />
    </View>
  );

  const filterRow = (
    <View style={styles.filterRow}>
      {ROLE_FILTERS.map((f) => {
        const active = roleFilter === f.key;
        return (
          <TouchableOpacity
            key={f.key || 'all'}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => {
              setRoleFilter(f.key);
              setPage(1);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const paginationRow = (
    <View style={styles.paginationRow}>
      <TouchableOpacity
        style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
        onPress={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page <= 1}
        activeOpacity={0.7}
      >
        <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Previous</Text>
      </TouchableOpacity>
      <Text style={styles.pageText}>Page {page} of {totalPages}</Text>
      <TouchableOpacity
        style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
        onPress={() => setPage((p) => p + 1)}
        disabled={page >= totalPages}
        activeOpacity={0.7}
      >
        <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color="#4A5BCC" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {header}
      <FlatList
        data={logs}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.listPad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A5BCC']} />}
        ListHeaderComponent={filterRow}
        ListEmptyComponent={
          <Text style={styles.empty}>No activity entries yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.roleBadge}>{item.role}</Text>
              <Text style={styles.actionText}>{item.action}</Text>
            </View>
            <Text style={styles.actorName}>{item.actorName}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
          </View>
        )}
        ListFooterComponent={paginationRow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 8,
    paddingBottom: 12,
    backgroundColor: '#F5F5F7',
  },
  backHit: { padding: 4 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#1B2036' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPad: { paddingHorizontal: 16, paddingBottom: 40 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1B2036',
    borderColor: '#1B2036',
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5BCC',
    textTransform: 'uppercase',
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  actionText: { fontSize: 13, fontWeight: '600', color: '#1B2036', flex: 1 },
  actorName: { fontSize: 12, color: '#8E8E93', marginTop: 6 },
  desc: { fontSize: 14, color: '#334155', marginTop: 8, lineHeight: 20 },
  when: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
  empty: { textAlign: 'center', color: '#8E8E93', marginTop: 24, paddingHorizontal: 24 },

  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 6,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 13, fontWeight: '700', color: '#1B2036' },
  pageBtnTextDisabled: { color: '#8E8E93' },
  pageText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
});
