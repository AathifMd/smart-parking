import { Clock, Car, CheckCircle } from 'lucide-react';

interface Reservation {
  id: string;
  user_name: string;
  user_email: string;
  reserved_until: string;
  auto_cancelled: boolean;
}

interface ParkingSlotProps {
  id: string;
  slotNumber: string;
  status: 'available' | 'occupied' | 'reserved';
  reservation: Reservation | null;
  onReserve: (slotId: string) => void;
  onCancel: (reservationId: string) => void;
}

export function ParkingSlot({
  id,
  slotNumber,
  status,
  reservation,
  onReserve,
  onCancel,
}: ParkingSlotProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'available':
        return 'bg-green-50 border-green-500 text-green-700';
      case 'occupied':
        return 'bg-red-50 border-red-500 text-red-700';
      case 'reserved':
        return 'bg-yellow-50 border-yellow-500 text-yellow-700';
      default:
        return 'bg-gray-50 border-gray-500 text-gray-700';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-6 h-6" />;
      case 'occupied':
        return <Car className="w-6 h-6" />;
      case 'reserved':
        return <Clock className="w-6 h-6" />;
    }
  };

  const getTimeRemaining = () => {
    if (!reservation) return '';
    const now = new Date();
    const until = new Date(reservation.reserved_until);
    const diff = until.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div
      className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xl font-bold">{slotNumber}</span>
        </div>
        <span className="text-xs font-semibold uppercase px-2 py-1 rounded-full bg-white bg-opacity-50">
          {status}
        </span>
      </div>

      {reservation && status === 'reserved' && (
        <div className="mt-3 p-3 bg-white bg-opacity-70 rounded text-xs space-y-1">
          <p className="font-semibold">{reservation.user_name}</p>
          <p className="text-gray-600">{reservation.user_email}</p>
          <p className="font-medium text-orange-600">{getTimeRemaining()}</p>
          <button
            onClick={() => onCancel(reservation.id)}
            className="mt-2 w-full bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 transition-colors text-xs font-medium"
          >
            Cancel Reservation
          </button>
        </div>
      )}

      {status === 'available' && (
        <button
          onClick={() => onReserve(id)}
          className="mt-3 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          Reserve Slot
        </button>
      )}

      {status === 'occupied' && (
        <div className="mt-3 p-2 bg-white bg-opacity-70 rounded text-xs text-center">
          <p className="font-medium">Vehicle Present</p>
        </div>
      )}
    </div>
  );
}
