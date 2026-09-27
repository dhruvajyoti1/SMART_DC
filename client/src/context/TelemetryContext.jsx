import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/apiClient.js';
import { calculateAlarmState } from '../pages/LivePage.jsx';

const TelemetryContext = createContext(null);

const POLL_INTERVAL_MS = 3000;
const TICK_BUFFER_SIZE = 50;
const BASELINE_TARGET_KWH = 9707.71;

export function TelemetryProvider({ children }) {
  const [ticks, setTicks] = useState([]);
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(true); // Continuous by default in SCADA
  const [isExhausted, setIsExhausted] = useState(false);
  const [historyLog, setHistoryLog] = useState([]);
  const [latestTick, setLatestTick] = useState(null);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [histErr, setHistErr] = useState(null);

  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);

  /* ── Status & History Retrieval ─────────────────────────────────────── */
  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/live/status');
      setStatus(data);
      if (data.is_exhausted) {
        setIsExhausted(true);
        setIsRunning(false);
      }
    } catch (err) {
      setError(err.uiMessage || 'Cannot establish link with SCADA ingestion service.');
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/live/history');
      setHistoryLog(data);
    } catch {
      setHistErr('Historical sequence of events (SOE) log unavailable.');
    }
  }, []);

  /* ── Continuous Single Tick Ingestion ───────────────────────────────── */
  const fetchTick = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data } = await apiClient.get('/live/tick');

      const kwh = data.forecasted_total_power_kwh;
      const prob = data.anomaly_probability;
      const rawStatus = data.anomaly_status;
      const computedAlarm = calculateAlarmState(kwh, rawStatus, prob);

      const point = {
        time: new Date(data.timestamp).toLocaleTimeString('en-GB', { hour12: false }),
        kwh: kwh,
        delta: kwh - BASELINE_TARGET_KWH,
        anomalyStatus: rawStatus,
        alarmState: computedAlarm,
        anomalyProb: prob,
        position: data.position,
        isFailure: computedAlarm === 'CRITICAL TRIP',
        isWarning: computedAlarm === 'WARNING',
      };

      setLatestTick(point);
      setTicks((prev) => [...prev, point].slice(-TICK_BUFFER_SIZE));
      setStatus((prev) => ({ ...prev, position: data.position }));

    } catch (err) {
      if (err.response?.status === 410) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRunning(false);
        setIsExhausted(true);
      } else {
        setError(err.uiMessage || 'SCADA telemetry stream interrupted.');
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  /* ── Polling Controls ───────────────────────────────────────────────── */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    setError(null);
    fetchTick();
    intervalRef.current = setInterval(fetchTick, POLL_INTERVAL_MS);
  }, [fetchTick]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(async () => {
    stopPolling();
    setResetting(true);
    setError(null);
    try {
      await apiClient.post('/live/reset');
      setTicks([]);
      setLatestTick(null);
      setIsExhausted(false);
      setStatus((prev) => ({ ...prev, position: 0, is_exhausted: false }));
      setTimeout(() => {
        setResetting(false);
        startPolling();
      }, 600);
    } catch (err) {
      setError(err.uiMessage || 'Failed to command simulation engine reset.');
      setResetting(false);
    }
  }, [stopPolling, startPolling]);

  /* ── Initialize Global Telemetry on Mount ───────────────────────────── */
  useEffect(() => {
    fetchStatus();
    fetchHistory();
    // Auto-start continuous background SCADA ingestion
    startPolling();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchStatus, fetchHistory, startPolling]);

  const value = {
    ticks,
    status,
    isRunning,
    isExhausted,
    historyLog,
    latestTick,
    error,
    resetting,
    histErr,
    startPolling,
    stopPolling,
    handleReset,
    fetchHistory,
    baselineAnchor: BASELINE_TARGET_KWH,
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}
