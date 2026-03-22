import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const billingData = [
  { id: 'INV-001', guest: 'Eleanor Pena', date: 'Oct 15', amount: '$450.00', type: 'Income', status: 'Paid' },
  { id: 'INV-002', guest: 'Supplier Co.', date: 'Oct 14', amount: '$1,200.00', type: 'Expense', status: 'Paid' },
  { id: 'INV-003', guest: 'Albert Flores', date: 'Oct 12', amount: '$1,200.00', type: 'Income', status: 'Pending' },
  { id: 'INV-004', guest: 'Maintenance', date: 'Oct 10', amount: '$350.00', type: 'Expense', status: 'Paid' },
];

export default function BillingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Billing</Text>
          <Text style={styles.subtitle}>Transactions summary</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn}>
          <Feather name="download" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <View style={styles.summaryRow}>
               <Text style={styles.summaryTotal}>$124,500</Text>
               <View style={styles.trendBadge}>
                  <Text style={styles.trendText}>+14%</Text>
               </View>
            </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        <View style={styles.txList}>
          {billingData.map((tx, index) => {
            const isIncome = tx.type === 'Income';
            return (
              <View key={tx.id} style={[styles.txItem, index === billingData.length - 1 && styles.noBorder]}>
                <View style={[styles.iconWrapper, isIncome ? styles.bgEmeraldLt : styles.bgRoseLt]}>
                   <Feather name={isIncome ? 'arrow-down-left' : 'arrow-up-right'} size={20} color={isIncome ? '#10B981' : '#EF4444'} />
                </View>
                <View style={styles.txInfo}>
                   <Text style={styles.txGuest}>{tx.guest}</Text>
                   <Text style={styles.txDate}>{tx.id} • {tx.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                   <Text style={styles.txAmount}>{tx.amount}</Text>
                   <Text style={[styles.txStatus, tx.status === 'Paid' ? styles.textEmerald : styles.textAmber]}>
                     {tx.status}
                   </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  exportBtn: {
    backgroundColor: '#FFFFFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryTotal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  trendBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  trendText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  txList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  bgEmeraldLt: { backgroundColor: '#ECFDF5' },
  bgRoseLt: { backgroundColor: '#FEF2F2' },
  txInfo: {
    flex: 1,
  },
  txGuest: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 13,
    color: '#64748B',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  txStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  textEmerald: { color: '#10B981' },
  textAmber: { color: '#F59E0B' },
});
