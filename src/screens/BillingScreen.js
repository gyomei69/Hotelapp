import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getBookings } from '../services/api';
import { showActionError } from '../utils/errorHandling';

const { width } = Dimensions.get('window');

export default function BillingScreen() {
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, paid: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const bookings = await getBookings();
      
      let total = 0;
      let pending = 0;
      let paid = 0;

      const formattedTxs = bookings.reverse().map(b => {
        const isPaid = b.status === 'Confirmed' || b.status === 'Completed';
        const amt = b.totalAmount || 0;
        
        total += amt;
        if (isPaid) paid += amt;
        else pending += amt;

        return {
          id: b._id.slice(-6).toUpperCase(),
          guest: b.guest?.name || 'Unknown Guest',
          date: new Date(b.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: amt,
          status: isPaid ? 'Paid' : 'Pending',
          room: b.room?.roomNumber || '??'
        };
      });

      setMetrics({ total, pending, paid });
      setTransactions(formattedTxs);
    } catch (error) {
      console.error('Failed to load billing:', error);
      showActionError('Billing Error', error, 'Unable to load billing data right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Billing</Text>
          <Text style={styles.subtitle}>Revenue & Invoices</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn}>
          <Feather name="download-cloud" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.revenueCard}>
            <View style={styles.revHeader}>
              <Text style={styles.revLabel}>Total Estimated Revenue</Text>
              <Text style={styles.revValue}>₱{metrics.total.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.revFooter}>
              <View style={styles.revStat}>
                <Text style={styles.statLabel}>RECEIVED</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>₱{metrics.paid.toLocaleString()}</Text>
              </View>
              <View style={styles.vertDivider} />
              <View style={styles.revStat}>
                <Text style={styles.statLabel}>PENDING</Text>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>₱{metrics.pending.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Invoice History</Text>
          
          <View style={styles.txWrap}>
            {transactions.map((tx, idx) => (
              <TouchableOpacity key={idx} style={[styles.txItem, idx === transactions.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.txIconBox}>
                   <Feather name="file-text" size={20} color="#4F46E5" />
                </View>
                <View style={styles.txMain}>
                  <Text style={styles.txGuest}>{tx.guest}</Text>
                  <Text style={styles.txSub}>Inv #{tx.id} • Room {tx.room}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmt}>₱{tx.amount.toLocaleString()}</Text>
                  <View style={[styles.badge, tx.status === 'Paid' ? styles.bgPaid : styles.bgPending]}>
                    <Text style={[styles.badgeText, tx.status === 'Paid' ? styles.textPaid : styles.textPending]}>{tx.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            {transactions.length === 0 && (
              <View style={styles.emptyBox}>
                <Feather name="list" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>No invoices found.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  exportBtn: { width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingTop: 0 },
  
  revenueCard: { backgroundColor: '#4F46E5', borderRadius: 24, padding: 24, marginBottom: 32, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  revLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  revValue: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginTop: 8 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  revFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  revStat: { flex: 1 },
  vertDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  txWrap: { backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  txIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  txMain: { flex: 1, marginLeft: 16 },
  txGuest: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  txSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmt: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  bgPaid: { backgroundColor: '#ECFDF5' }, textPaid: { color: '#10B981' },
  bgPending: { backgroundColor: '#FFFBEB' }, textPending: { color: '#F59E0B' },

  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', marginTop: 12, fontWeight: '600' },
});
