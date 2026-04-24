import { useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { WebcamDetection } from './components/WebcamDetection';
import { ParkingSlot } from './components/ParkingSlot';
import { ReservationModal } from './components/ReservationModal';
import { StatsPanel } from './components/StatsPanel';
import { apiUrl, supabaseConfigured } from './lib/supabase';

interface Reservation {
  id: string;
  user_name: string;
  user_email: string;
  reserved_until: string;
  auto_cancelled: boolean;
}

interface ParkingSlotData {
  id: string;
  slot_number: string;
  status: 'available' | 'occupied' | 'reserved';
  reservation: Reservation | null;
}

// ── Default 6 local slots used when Supabase is not configured ──────────────
function makeLocalSlots(): ParkingSlotData[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `local-${i + 1}`,
    slot_number: `A${i + 1}`,
    status: 'available',
    reservation: null,
  }));
}

function App() {
  const [slots, setSlots] = useState<ParkingSlotData[]>(makeLocalSlots());
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlotData | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch from Supabase (only when configured) ──────────────────────────────
  const fetchSlots = useCallback(async () => {
    if (!supabaseConfigured || !apiUrl) return; // local mode — skip
    try {
      const response = await fetch(apiUrl, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSlots(data.slots.slice(0, 6));
    } catch (error) {
      console.warn('Supabase fetch failed, running in local mode:', error);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
    if (!supabaseConfigured) return;
    const interval = setInterval(fetchSlots, 5000);
    return () => clearInterval(interval);
  }, [fetchSlots]);

  // ── AI detection → update slot states ──────────────────────────────────────
  const handleDetectionChange = useCallback(
    (detectedSlots: { id: number; isOccupied: boolean }[]) => {
      setSlots(prevSlots => {
        const newSlots = prevSlots.map(slot => ({ ...slot }));
        let changed = false;

        detectedSlots.forEach((ds, index) => {
          if (index >= newSlots.length) return;
          const current = newSlots[index];
          let nextStatus = current.status;

          if (ds.isOccupied) {
            nextStatus = 'occupied';
          } else if (current.status === 'occupied') {
            nextStatus = 'available';
          }

          if (nextStatus !== current.status) {
            current.status = nextStatus;
            changed = true;

            // Push to Supabase if configured
            if (supabaseConfigured && apiUrl) {
              fetch(`${apiUrl}/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotId: current.id, carDetected: ds.isOccupied }),
              }).catch(e => console.warn('Status sync error:', e));
            }
          }
        });

        return changed ? newSlots : prevSlots;
      });
    },
    []
  );

  // ── Reserve ────────────────────────────────────────────────────────────────
  const handleReserveSlot = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
      setSelectedSlot(slot);
      setShowReservationModal(true);
    }
  };

  const handleConfirmReservation = async (
    userName: string,
    userEmail: string,
    duration: number
  ) => {
    if (!selectedSlot) return;
    setIsLoading(true);

    try {
      if (supabaseConfigured && apiUrl) {
        // ── Online mode ──
        const response = await fetch(`${apiUrl}/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotId: selectedSlot.id,
            userName,
            userEmail,
            durationHours: duration,
          }),
        });
        if (response.ok) await fetchSlots();
      } else {
        // ── Local mode — update state directly ──
        const reservedUntil = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
        setSlots(prev =>
          prev.map(s =>
            s.id === selectedSlot.id
              ? {
                  ...s,
                  status: 'reserved',
                  reservation: {
                    id: `res-${Date.now()}`,
                    user_name: userName,
                    user_email: userEmail,
                    reserved_until: reservedUntil,
                    auto_cancelled: false,
                  },
                }
              : s
          )
        );
      }

      setShowReservationModal(false);
      setSelectedSlot(null);
      setWebcamActive(true);
    } catch (error) {
      console.error('Error creating reservation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const handleCancelReservation = async (reservationId: string) => {
    setIsLoading(true);
    try {
      if (supabaseConfigured && apiUrl) {
        await fetch(`${apiUrl}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId }),
        });
        await fetchSlots();
      } else {
        // Local mode
        setSlots(prev =>
          prev.map(s =>
            s.reservation?.id === reservationId
              ? { ...s, status: 'available', reservation: null }
              : s
          )
        );
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const availableSlots = slots.filter(s => s.status === 'available').length;
  const occupiedSlots  = slots.filter(s => s.status === 'occupied').length;
  const reservedSlots  = slots.filter(s => s.status === 'reserved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-1">
              🅿️ Smart Parking System
            </h1>
            <p className="text-gray-500 text-sm">
              Real-time AI-powered parking detection · Phone camera supported
            </p>
          </div>

          {/* Online/Offline badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              supabaseConfigured
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {supabaseConfigured ? (
              <><Wifi className="w-3.5 h-3.5" /> Connected to Supabase</>
            ) : (
              <><WifiOff className="w-3.5 h-3.5" /> Local Mode (no Supabase)</>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <StatsPanel
          availableSlots={availableSlots}
          occupiedSlots={occupiedSlots}
          reservedSlots={reservedSlots}
          totalSlots={slots.length}
        />

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

          {/* Slots panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Parking Slots</h2>
                <button
                  onClick={fetchSlots}
                  disabled={isLoading || !supabaseConfigured}
                  title={supabaseConfigured ? 'Refresh from Supabase' : 'Local mode — no refresh needed'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {slots.map(slot => (
                  <ParkingSlot
                    key={slot.id}
                    id={slot.id}
                    slotNumber={slot.slot_number}
                    status={slot.status}
                    reservation={slot.reservation}
                    onReserve={handleReserveSlot}
                    onCancel={handleCancelReservation}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Camera panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-800">AI Camera</h2>
                <button
                  onClick={() => setWebcamActive(!webcamActive)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                    webcamActive
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  {webcamActive ? 'Stop' : 'Start'}
                </button>
              </div>

              {!webcamActive && (
                <div className="text-center py-10">
                  <Camera className="w-14 h-14 mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">
                    Press <strong>Start</strong> to enable AI detection
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports PC webcam or phone IP camera
                  </p>
                </div>
              )}
            </div>

            <WebcamDetection
              onDetectionChange={handleDetectionChange}
              isActive={webcamActive}
            />
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', color: 'blue', title: 'Point Camera', desc: 'Open DroidCam on your phone, note the IP, enter it in the app. Make sure both are on the same Wi-Fi.' },
              { step: '2', color: 'purple', title: 'AI Detects', desc: 'TensorFlow COCO-SSD model detects cars, trucks & buses in real-time every 1.5 seconds.' },
              { step: '3', color: 'green', title: 'Reserve a Slot', desc: 'Choose an available slot and reserve it with your name, email, and duration.' },
              { step: '4', color: 'orange', title: 'Auto Release', desc: 'When your vehicle leaves, the AI detects the empty slot and releases it automatically.' },
            ].map(({ step, color, title, desc }) => (
              <div key={step} className="text-center">
                <div className={`w-12 h-12 bg-${color}-100 rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <span className={`text-xl font-bold text-${color}-600`}>{step}</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Reservation Modal ── */}
      {showReservationModal && selectedSlot && (
        <ReservationModal
          slotNumber={selectedSlot.slot_number}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedSlot(null);
          }}
          onConfirm={handleConfirmReservation}
        />
      )}
    </div>
  );
}

export default App;
