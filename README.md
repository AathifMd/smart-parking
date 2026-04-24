# AI Smart Parking System with Webcam Detection

A full-stack intelligent parking management system that uses AI-powered webcam detection to automatically monitor parking slots and manage reservations in real-time.

## Features

### Core Functionality

- **AI Webcam Detection**: Uses TensorFlow.js COCO-SSD model to detect vehicles in real-time
- **Smart Reservations**: Book parking slots for specific durations (1-12 hours)
- **Auto-Release Logic**: Automatically cancels reservations when no vehicle is detected
- **Real-Time Updates**: Dashboard refreshes every 5 seconds to show current slot status
- **Three Slot States**:
  - Available (Green)
  - Occupied (Red - car detected)
  - Reserved (Yellow - time-based booking)

### Statistics Dashboard

- Available slots count
- Occupancy rate percentage
- Estimated time saved
- Estimated fuel saved

### User Experience

- Clean, modern UI with color-coded slots
- Reservation modal for easy booking
- Live webcam feed with detection visualization
- Countdown timers for reserved slots
- One-click reservation cancellation

## Technology Stack

### Frontend
- React 18 with TypeScript
- TailwindCSS for styling
- TensorFlow.js with COCO-SSD model
- Lucide React icons
- Vite build tool

### Backend
- Supabase Edge Functions (Deno runtime)
- PostgreSQL database
- Row Level Security (RLS) policies

### AI/ML
- TensorFlow.js (@tensorflow/tfjs)
- COCO-SSD object detection model
- Real-time video processing

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── WebcamDetection.tsx    # AI webcam detection component
│   │   ├── ParkingSlot.tsx        # Individual slot display
│   │   ├── ReservationModal.tsx   # Booking interface
│   │   └── StatsPanel.tsx         # Statistics dashboard
│   ├── lib/
│   │   └── supabase.ts            # Supabase client configuration
│   ├── App.tsx                     # Main application component
│   └── main.tsx                    # Application entry point
├── supabase/
│   └── functions/
│       └── parking-slots/
│           └── index.ts            # Edge function API
└── .env                            # Environment variables
```

## Database Schema

### parking_slots Table
- `id`: UUID primary key
- `slot_number`: Unique slot identifier (A1, A2, etc.)
- `status`: Current state (available/occupied/reserved)
- `last_detection`: Timestamp of last webcam update
- `created_at`, `updated_at`: Audit timestamps

### reservations Table
- `id`: UUID primary key
- `slot_id`: Foreign key to parking_slots
- `user_name`: Name of person reserving
- `user_email`: Contact email
- `reserved_at`: Reservation start time
- `reserved_until`: Reservation expiry
- `status`: active/completed/cancelled
- `auto_cancelled`: Whether AI auto-cancelled

## API Endpoints

### GET /parking-slots
Retrieves all parking slots with their current status and active reservations.

### POST /parking-slots/update-status
Updates slot status based on webcam detection.

**Body:**
```json
{
  "slotId": "uuid",
  "carDetected": boolean
}
```

### POST /parking-slots/reserve
Creates a new reservation for a parking slot.

**Body:**
```json
{
  "slotId": "uuid",
  "userName": "string",
  "userEmail": "string",
  "durationHours": number
}
```

### POST /parking-slots/cancel
Cancels an existing reservation.

**Body:**
```json
{
  "reservationId": "uuid"
}
```

## How It Works

### Reservation Flow
1. User selects an available parking slot
2. Fills out reservation form (name, email, duration)
3. System creates reservation and marks slot as "reserved"
4. Webcam automatically activates for monitoring

### Detection Flow
1. Webcam captures video feed every 2-3 seconds
2. TensorFlow.js COCO-SSD model analyzes frames
3. Detects "car" objects with confidence > 60%
4. Updates slot status via API:
   - Car detected → OCCUPIED
   - No car detected + Reserved → AUTO-CANCEL → AVAILABLE

### Auto-Release Logic
- If a slot is reserved but AI detects no vehicle
- System automatically cancels the reservation
- Slot becomes available for others immediately
- Reduces wasted parking space

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account (already configured)
- Modern web browser with webcam access

### Installation

1. Install dependencies:
```bash
npm install
```

2. Environment is already configured in `.env`

3. Database and Edge Functions are already deployed

4. Start development server:
```bash
npm run dev
```

5. Open browser and grant webcam permissions when prompted

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Usage Guide

### Reserving a Slot

1. Find a green (available) slot on the dashboard
2. Click the "Reserve Slot" button
3. Enter your name and email
4. Select duration (1-12 hours)
5. Click "Confirm Reservation"
6. Webcam will activate automatically

### Monitoring Detection

1. Click "Start" button in AI Detection panel
2. Allow webcam access when prompted
3. Position webcam to view parking area
4. Green box = Car detected
5. System updates status every 2-3 seconds

### Canceling Reservations

1. Navigate to your reserved slot (yellow)
2. Click "Cancel Reservation" button
3. Slot returns to available status

## Benefits

### For Drivers
- No more circling for parking
- Guaranteed spot availability
- Flexible reservation times
- Early departure auto-credits

### For Parking Operators
- Maximize space utilization
- Reduce congestion
- Automated management
- Real-time occupancy data

### Environmental Impact
- Reduced fuel consumption from parking searches
- Lower carbon emissions
- Decreased traffic congestion
- More efficient urban planning

## Security Features

- Row Level Security on all database tables
- CORS protection on Edge Functions
- Input validation on all forms
- No exposed secrets in client code

## Performance Optimizations

- TensorFlow.js model loaded once on component mount
- Detection runs every 2-3 seconds (configurable)
- Automatic slot refresh every 5 seconds
- Efficient database queries with proper indexing

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires webcam access
- WebRTC support needed

## Troubleshooting

### Webcam Not Working
- Check browser permissions
- Ensure webcam is not used by another app
- Try refreshing the page

### Detection Not Accurate
- Ensure good lighting
- Position webcam for clear view
- Car should be clearly visible
- Adjust detection threshold if needed

### Slots Not Updating
- Check internet connection
- Verify Supabase is running
- Check browser console for errors

## Future Enhancements

- Multi-camera support for multiple slots
- License plate recognition
- Mobile app integration
- Payment processing
- Analytics dashboard
- Email notifications
- SMS alerts
- Historical data reports

## License

MIT License - Feel free to use for educational or commercial purposes.

## Support

For issues or questions, check the browser console for error messages and ensure all environment variables are correctly set.
