import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import { getBillingRecords } from '../services/api';
import { showActionError } from '../utils/errorHandling';
import { formatBookingDateTime } from '../utils/formatBookingDateTime';
import { buildReceiptHtml } from '../utils/receiptPdfHtml';
import { guestPalette } from '../theme/guestPalette';

/** Staff/admin: original light billing UI. Guest: dark shell colors. */
const GUEST_BILLING = {
  bg: guestPalette.bg,
  text: guestPalette.text,
  muted: guestPalette.muted,
  card: guestPalette.card,
  cardBorder: guestPalette.cardBorder,
  rowBorder: guestPalette.cardBorder,
  accent: guestPalette.accent,
  accentSoft: guestPalette.accentSoft,
  success: guestPalette.success,
  successBg: guestPalette.successBg,
  warning: guestPalette.warning,
  warningBg: guestPalette.warningBg,
  overlay: guestPalette.overlay,
  receiptLabel: guestPalette.accent,
  receiptTotal: guestPalette.accent,
  sectionTitle: guestPalette.text,
  txAmt: guestPalette.accent,
  exportIcon: guestPalette.muted,
  spinner: guestPalette.accent,
  listIcon: guestPalette.muted,
  fileIcon: guestPalette.accent,
  modalClose: guestPalette.text,
  paid: guestPalette.success,
  pdfBg: guestPalette.accent,
  pdfBorder: guestPalette.accent,
  pdfText: guestPalette.card,
  pdfIcon: guestPalette.card,
  receiptBtnBg: guestPalette.surface,
};

const STAFF_BILLING = {
  bg: '#F1F5F9',
  text: '#0F172A',
  muted: '#64748B',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  rowBorder: '#F1F5F9',
  accent: '#4F46E5',
  accentSoft: '#EEF2FF',
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  overlay: 'rgba(0,0,0,0.45)',
  receiptLabel: '#0F172A',
  receiptTotal: '#0F172A',
  sectionTitle: '#1E293B',
  txAmt: '#0F172A',
  exportIcon: '#64748B',
  spinner: '#4F46E5',
  listIcon: '#CBD5E1',
  fileIcon: '#4F46E5',
  modalClose: '#0F172A',
  paid: '#10B981',
  pdfBg: '#FFFFFF',
  pdfBorder: '#E2E8F0',
  pdfText: '#64748B',
  pdfIcon: '#64748B',
  receiptBtnBg: '#EEF2FF',
};

function buildBillingStyles(t) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: t.bg },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: '800', color: t.text },
    subtitle: { fontSize: 14, color: t.muted, marginTop: 4 },
    exportBtn: {
      width: 48,
      height: 48,
      backgroundColor: t.card,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 24, paddingTop: 0 },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: t.sectionTitle, marginBottom: 16 },
    txWrap: {
      backgroundColor: t.card,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.cardBorder,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    txItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: t.rowBorder },
    txIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: t.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    txMain: { flex: 1, marginLeft: 16 },
    txGuest: { fontSize: 15, fontWeight: '700', color: t.text },
    txSub: { fontSize: 13, color: t.muted, marginTop: 2 },
    txRight: { alignItems: 'flex-end' },
    txAmt: { fontSize: 15, fontWeight: '800', color: t.txAmt, marginBottom: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    bgPaid: { backgroundColor: t.successBg },
    textPaid: { color: t.success },
    bgPending: { backgroundColor: t.warningBg },
    textPending: { color: t.warning },
    receiptBtn: {
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: t.receiptBtnBg,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    receiptBtnText: { fontSize: 12, fontWeight: '800', color: t.accent },

    emptyBox: { padding: 40, alignItems: 'center' },
    emptyText: { color: t.muted, marginTop: 12, fontWeight: '600' },

    modalOverlay: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: t.card,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center' },
    modalClose: { padding: 8 },
    receiptTitle: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: t.text },
    receiptSubtitle: { textAlign: 'center', marginTop: 4, marginBottom: 14, fontSize: 12, color: t.muted, fontWeight: '700' },
    receiptSection: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.rowBorder },
    receiptLabel: { fontSize: 12, color: t.receiptLabel, fontWeight: '800', textTransform: 'uppercase' },
    receiptValue: { fontSize: 14, color: t.text, fontWeight: '700', marginTop: 4 },
    receiptMuted: { fontSize: 12, color: t.muted, marginTop: 4, fontWeight: '600' },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    receiptDivider: { height: 1, backgroundColor: t.cardBorder, marginTop: 12 },
    receiptTotal: { fontSize: 16, fontWeight: '900', color: t.receiptTotal },
    pdfBtn: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: t.pdfBorder,
      backgroundColor: t.pdfBg,
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pdfBtnText: { color: t.pdfText, fontWeight: '800', fontSize: 12, marginLeft: 8 },
  });
}

function isStaffRole(user) {
  const r = String(user?.role || '').trim().toLowerCase();
  return r === 'admin' || r === 'staff';
}

export default function BillingScreen() {
  const { user } = useAuth();
  const isStaff = isStaffRole(user);
  const theme = isStaff ? STAFF_BILLING : GUEST_BILLING;
  const styles = useMemo(() => buildBillingStyles(theme), [isStaff]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const bookings = await getBillingRecords();
      const formattedTxs = (bookings || []).map((b) => ({
        _raw: b,
        id: String(b?._id || '').slice(-6).toUpperCase(),
        guest: b?.user?.name || 'Unknown Guest',
        email: b?.user?.email || '',
        roomType: b?.room?.type || '—',
        roomNo: b?.room?.roomNumber || '—',
        checkIn: b?.check_in_datetime || b?.checkInDate,
        checkOut: b?.check_out_datetime || b?.checkOutDate,
        amount: Number(b?.totalAmount || 0),
        paymentMethod: b?.paymentMethod || '—',
        paymentStatus: b?.paymentStatus || 'Paid',
      }));
      setTransactions(formattedTxs);
    } catch (error) {
      console.error('Failed to load billing:', error);
      showActionError('Billing Error', error, 'Unable to load billing data right now.');
    } finally {
      setLoading(false);
    }
  };

  const receipt = useMemo(() => {
    if (!selected?._raw) return null;
    const b = selected._raw;
    const guestName = selected.guest || user?.name || 'Guest';
    const email = selected.email || user?.email || '';
    const roomType = selected.roomType || '—';
    const paymentMethod = selected.paymentMethod || '—';
    const issuedAt = b?.paidAt || b?.updatedAt || b?.createdAt || new Date().toISOString();

    const inDt = selected.checkIn ? new Date(selected.checkIn) : null;
    const outDt = selected.checkOut ? new Date(selected.checkOut) : null;
    const nights = (() => {
      if (!inDt || !outDt) return 0;
      const ms = outDt.getTime() - inDt.getTime();
      const n = Math.round(ms / (24 * 60 * 60 * 1000));
      return Math.max(1, n || 0);
    })();
    const pricePerNight = Number(b?.room?.price || 0);
    const totalAmount = Number(b?.totalAmount || (pricePerNight * nights) || 0);

    return {
      guestName,
      email,
      roomType,
      roomNo: selected.roomNo,
      checkInLabel: formatBookingDateTime(selected.checkIn) || '—',
      checkOutLabel: formatBookingDateTime(selected.checkOut) || '—',
      nights,
      pricePerNight,
      totalAmount,
      paymentMethod,
      issuedLabel: formatBookingDateTime(issuedAt) || '—',
    };
  }, [selected, user]);

  const downloadReceiptPdf = async () => {
    try {
      if (!receipt) return;
      const html = buildReceiptHtml({
        hotelName: 'Aurora Grand Hotel',
        ...receipt,
      });
      const result = await Print.printToFileAsync({ html });
      const uri = result?.uri;
      if (!uri) {
        Alert.alert('Receipt', 'Could not generate the PDF. Please try again.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Receipt ready', 'PDF was generated. Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Download Receipt',
      });
    } catch (e) {
      showActionError('Receipt', e, 'Could not download the receipt PDF.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Billing</Text>
          <Text style={styles.subtitle}>Ready for Check-In</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
          <Feather name="download-cloud" size={22} color={theme.exportIcon} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.spinner} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Billing Records</Text>
          
          <View style={styles.txWrap}>
            {transactions.map((tx, idx) => (
              <View key={idx} style={[styles.txItem, idx === transactions.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.txIconBox}>
                   <Feather name="file-text" size={20} color={theme.fileIcon} />
                </View>
                <View style={styles.txMain}>
                  <Text style={styles.txGuest}>{tx.guest}</Text>
                  <Text style={styles.txSub}>
                    {tx.roomType}{tx.roomNo !== '—' ? ` • Room ${tx.roomNo}` : ''}{' '}
                  </Text>
                  <Text style={styles.txSub}>
                    {formatBookingDateTime(tx.checkIn) || '—'} → {formatBookingDateTime(tx.checkOut) || '—'}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmt}>₱{tx.amount.toLocaleString()}</Text>
                  <View style={[styles.badge, styles.bgPaid]}>
                    <Text style={[styles.badgeText, styles.textPaid]}>Ready for Check-In</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.receiptBtn}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelected(tx);
                      setReceiptOpen(true);
                    }}
                  >
                    <Text style={styles.receiptBtnText}>View Receipt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {transactions.length === 0 && (
              <View style={styles.emptyBox}>
                <Feather name="list" size={40} color={theme.listIcon} />
                <Text style={styles.emptyText}>No invoices found.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={receiptOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setReceiptOpen(false)} style={styles.modalClose}>
                <Feather name="x" size={20} color={theme.modalClose} />
              </TouchableOpacity>
            </View>

            <Text style={styles.receiptTitle}>Aurora Grand Hotel</Text>
            <Text style={styles.receiptSubtitle}>Official Receipt</Text>

            <View style={styles.receiptSection}>
              <Text style={styles.receiptLabel}>Guest</Text>
              <Text style={styles.receiptValue}>{receipt?.guestName || '—'}</Text>
              <Text style={styles.receiptMuted}>{receipt?.email || ''}</Text>
            </View>

            <View style={styles.receiptSection}>
              <Text style={styles.receiptLabel}>Stay</Text>
              <Text style={styles.receiptValue}>{receipt?.roomType || '—'}</Text>
              <Text style={styles.receiptMuted}>Check-in: {receipt?.checkInLabel || '—'}</Text>
              <Text style={styles.receiptMuted}>Check-out: {receipt?.checkOutLabel || '—'}</Text>
            </View>

            <View style={styles.receiptSection}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMuted}>Total nights</Text>
                <Text style={styles.receiptValue}>{receipt?.nights ?? 0}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMuted}>Price / night</Text>
                <Text style={styles.receiptValue}>₱{Number(receipt?.pricePerNight || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Total Amount</Text>
                <Text style={styles.receiptTotal}>₱{Number(receipt?.totalAmount || 0).toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.receiptSection}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMuted}>Payment method</Text>
                <Text style={styles.receiptValue}>{receipt?.paymentMethod || '—'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMuted}>Payment status</Text>
                <Text style={[styles.receiptValue, { color: theme.paid }]}>PAID</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptMuted}>Date issued</Text>
                <Text style={styles.receiptValue}>{receipt?.issuedLabel || '—'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.pdfBtn} activeOpacity={0.75} onPress={downloadReceiptPdf}>
              <Feather name="download" size={16} color={theme.pdfIcon} />
              <Text style={styles.pdfBtnText}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
