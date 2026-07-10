import { useState } from 'react';
import { Smartphone, CalendarCheck, FileText, Heart, Bell, Settings, LogOut, ChevronRight, Clock } from 'lucide-react';

type Page = 'home' | 'appointments' | 'records' | 'surveys' | 'notifications';

export default function PatientMobileAppPage() {
  const [page, setPage] = useState<Page>('home');
  const [mobileNum, setMobileNum] = useState('');
  const [otp, setOtp] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [patientName, setPatientName] = useState('Patient');

  const handleLogin = () => {
    if (!mobileNum) return;
    // Simulate login
    setPatientName('Ahmed Mohamed');
    setLoggedIn(true);
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
          <Smartphone className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-center mb-6">Vision Healthcare</h1>
          <input className="w-full p-3 border rounded-lg mb-3 text-lg" placeholder="Mobile Number" value={mobileNum} onChange={e => setMobileNum(e.target.value)} />
          <input className="w-full p-3 border rounded-lg mb-4 text-lg" placeholder="OTP Code" value={otp} onChange={e => setOtp(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700">
            Login
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">Enter OTP sent to your phone</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Phone Frame */}
      <div className="w-full max-w-sm mx-auto bg-white shadow-2xl flex flex-col" style={{ height: '100vh', maxHeight: '800px' }}>
        {/* Status Bar */}
        <div className="bg-blue-600 text-white p-4 pt-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm opacity-75">Vision Healthcare</p>
            <Bell className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">Hello, {patientName}</h2>
          <p className="text-sm opacity-75">What can we help you with?</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {page === 'home' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: CalendarCheck, label: 'Appointments', page: 'appointments' as Page },
                  { icon: FileText, label: 'Records', page: 'records' as Page },
                  { icon: Heart, label: 'Surveys', page: 'surveys' as Page },
                  { icon: Bell, label: 'Notifications', page: 'notifications' as Page },
                ].map(item => (
                  <button key={item.label} onClick={() => setPage(item.page)}
                    className="bg-blue-50 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-blue-100 transition-colors min-h-[80px]">
                    <item.icon className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
                <h3 className="font-semibold">Upcoming Appointment</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm">Tomorrow at 10:00 AM with Dr. Ali</p>
                </div>
              </div>
            </>
          )}

          {page === 'appointments' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">My Appointments</h3>
              {['Tomorrow 10:00 AM - Dr. Ali (Follow-up)', 'Next Monday 2:00 PM - Dr. Sara (Lab Review)', 'Completed - Dr. Omar (Consultation)'].map((apt, i) => (
                <div key={i} className="bg-white border rounded-xl p-4 flex justify-between items-center">
                  <div><p className="font-medium text-sm">{apt}</p></div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}

          {page === 'records' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Medical Records</h3>
              {['Blood Test - July 5, 2026', 'X-Ray Report - June 28, 2026', 'Consultation Notes - June 20, 2026'].map((rec, i) => (
                <div key={i} className="bg-white border rounded-xl p-4 flex justify-between items-center">
                  <div><p className="font-medium text-sm">{rec}</p></div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}

          {page === 'surveys' && (
            <div className="text-center py-8 text-gray-400">
              <Heart className="w-12 h-12 mx-auto mb-2" />
              <p className="font-medium">No surveys available</p>
            </div>
          )}

          {page === 'notifications' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Notifications</h3>
              {['Appointment reminder for tomorrow', 'Lab results are ready', 'Prescription refill due'].map((n, i) => (
                <div key={i} className="bg-white border rounded-xl p-4">
                  <p className="text-sm font-medium">{n}</p>
                  <p className="text-xs text-gray-400 mt-1">{i + 1} hour ago</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <div className="border-t bg-white p-2 flex justify-around">
          <button onClick={() => setPage('home')} className="p-2 text-center">
            <span className="text-xs">Home</span>
          </button>
          <button onClick={() => setPage('appointments')} className="p-2 text-center">
            <span className="text-xs">Appointments</span>
          </button>
          <button onClick={() => setPage('records')} className="p-2 text-center">
            <span className="text-xs">Records</span>
          </button>
          <button onClick={() => setPage('surveys')} className="p-2 text-center">
            <span className="text-xs">Feedback</span>
          </button>
          <button onClick={() => setPage('notifications')} className="p-2 text-center">
            <span className="text-xs">Alerts</span>
          </button>
        </div>
      </div>
    </div>
  );
}
