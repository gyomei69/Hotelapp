import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, SafeAreaView, Platform,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { getStats, getBookings } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#F5F5F7' }]}>
        <ActivityIndicator size="large" color="#4A5BCC" />
      </View>
    );
  }

  const totalRevenue = stats?.revenue || 0;
  const newBookings = stats?.newBookings || 0;
  const occRate = stats?.totalRooms ? Math.round(((stats.totalRooms - stats.availableRooms) / stats.totalRooms) * 100) : 0;

  // Demo chart data
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ data: [20, 45, 28, 80, 99, 43], color: (opacity = 1) => `rgba(74, 91, 204, ${opacity})`, strokeWidth: 2 }]
  };

  const metrics = [
    { id: '1', title: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: 'cash-outline', color: '#34C759', bg: '#E8FFF0', trend: '+12%', isUp: true },
    { id: '2', title: 'New Bookings', value: newBookings, icon: 'calendar-outline', color: '#4A5BCC', bg: '#EEF0FF', trend: '+5%', isUp: true },
    { id: '3', title: 'Occupancy', value: `${occRate}%`, icon: 'bed-outline', color: '#FF9500', bg: '#FFF5E5', trend: '-2%', isUp: false },
    { id: '4', title: 'Avg. Stay', value: '3.2 N', icon: 'time-outline', color: '#AF52DE', bg: '#F8E8FF', trend: '+1%', isUp: true },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F5F5F7' }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: '#1B2036' }]}>Analytics overview</Text>
        <Text style={styles.subtitle}>Performance metrics for your property.</Text>

        {/* Metrics Grid */}
        <View style={styles.grid}>
          {metrics.map(m => (
            <View key={m.id} style={[styles.metricCard, { backgroundColor: '#FFFFFF' }]}>
              <View style={styles.metricTop}>
                <View style={[styles.iconBox, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <View style={[styles.trendBadge, m.isUp ? styles.trendUp : styles.trendDown]}>
                  <Ionicons name={m.isUp ? 'trending-up' : 'trending-down'} size={12} color={m.isUp ? '#34C759' : '#EF4444'} />
                  <Text style={[styles.trendText, { color: m.isUp ? '#34C759' : '#EF4444' }]}>{m.trend}</Text>
                </View>
              </View>
              <Text style={[styles.metricValue, { color: '#1B2036' }]}>{m.value}</Text>
              <Text style={[styles.metricLabel, { color: '#8E8E93' }]}>{m.title}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Chart */}
        <View style={[styles.chartCard, { backgroundColor: '#FFFFFF' }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: '#1B2036' }]}>Revenue Overview</Text>
            <Text style={[styles.chartPeriod, { color: '#8E8E93' }]}>Last 6 months</Text>
          </View>
          <LineChart
            data={chartData}
            width={screenWidth - 72}
            height={200}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              color: (opacity = 1) => `rgba(74, 91, 204, ${opacity})`,
              labelColor: () => '#8E8E93',
              propsForDots: { r: '5', strokeWidth: '2', stroke: '#4A5BCC' },
              decimalPlaces: 0,
              strokeWidth: 2,
            }}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: {
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2036',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
  },
  metricCard: {
    width: (screenWidth - 62) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendUp: {},
  trendDown: {},
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B2036',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B2036',
  },
  chartPeriod: {
    fontSize: 12,
    color: '#8E8E93',
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },
});
