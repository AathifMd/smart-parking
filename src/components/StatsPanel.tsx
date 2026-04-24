import { TrendingUp, Clock, Fuel } from 'lucide-react';

interface StatsPanelProps {
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  totalSlots: number;
}

export function StatsPanel({
  availableSlots,
  occupiedSlots,
  reservedSlots,
  totalSlots,
}: StatsPanelProps) {
  const occupancyRate = totalSlots > 0 ? ((occupiedSlots + reservedSlots) / totalSlots) * 100 : 0;

  const estimatedTimeSaved = reservedSlots * 15;
  const estimatedFuelSaved = reservedSlots * 0.5;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">Available Slots</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{availableSlots}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0}% of total
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">Occupancy Rate</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {Math.round(occupancyRate)}%
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {occupiedSlots + reservedSlots} of {totalSlots} slots in use
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">Time Saved</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {estimatedTimeSaved}m
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Est. from smart reservations</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">Fuel Saved</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {estimatedFuelSaved.toFixed(1)}L
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <Fuel className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Reduced search time</p>
      </div>
    </div>
  );
}
