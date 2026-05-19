import React, { useState, useEffect, useMemo } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc,
  getDoc,
  where,
  orderBy,
  Timestamp,
  deleteDoc,
  updateDoc,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { handleFirestoreError } from './lib/error-handler';
import { 
  Employee, 
  TipLog, 
  PayPeriod, 
  Settings, 
  OperationType, 
  Role,
  Shift
} from './types';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  CalendarDays, 
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  PieChart,
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'logs' | 'periods' | 'settings'>('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tipLogs, setTipLogs] = useState<TipLog[]>([]);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [settings, setSettings] = useState<Settings>({ kitchenPercent: 15, waitstaffPercent: 85 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Test connection
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (e) {
          console.warn("Connection test failed, might be offline or first run.");
        }

        // Check if Admin
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);
        } else {
          // Automatic first admin check
          if (user.email === 'refigueroah@gmail.com') { 
            await setDoc(doc(db, 'admins', user.uid), { email: user.email, createdAt: Timestamp.now() });
            setIsAdmin(true);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Data
  useEffect(() => {
    if (!user) return;

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employees'));

    const unsubLogs = onSnapshot(collection(db, 'tipLogs'), (snap) => {
      setTipLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as TipLog)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tipLogs'));

    const unsubPeriods = onSnapshot(query(collection(db, 'payPeriods'), orderBy('startDate', 'desc')), (snap) => {
      setPayPeriods(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayPeriod)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'payPeriods'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'distribution'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/distribution'));

    return () => {
      unsubEmployees();
      unsubLogs();
      unsubPeriods();
      unsubSettings();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex bg-stone-50 text-stone-900 font-sans">
      {/* Sidebar */}
      <nav className="w-64 bg-stone-900 text-stone-200 p-6 flex flex-col hidden md:flex">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">SushiTips <span className="text-red-500">Pro</span></h1>
        </div>

        <div className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>Dashboard</NavItem>
          <NavItem icon={<Users size={20} />} active={activeTab === 'employees'} onClick={() => setActiveTab('employees')}>Employees</NavItem>
          <NavItem icon={<ClipboardList size={20} />} active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>Daily logs</NavItem>
          <NavItem icon={<CalendarDays size={20} />} active={activeTab === 'periods'} onClick={() => setActiveTab('periods')}>Pay Periods</NavItem>
          <NavItem icon={<SettingsIcon size={20} />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>Settings</NavItem>
        </div>

        <div className="pt-6 border-t border-stone-800 space-y-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="user" className="w-full h-full object-cover" /> : <UserCircle size={20} />}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.displayName || 'Manager'}</p>
              <p className="text-xs text-stone-400 truncate">{isAdmin ? 'Admin' : 'Staff'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-stone-200 bg-white flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold capitalize text-stone-700">{activeTab}</h2>
          {!isAdmin && activeTab !== 'dashboard' && (
            <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full text-xs font-medium border border-yellow-200">
              <AlertCircle size={14} /> View Only Mode
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard employees={employees} tipLogs={tipLogs} payPeriods={payPeriods} settings={settings} />}
            {activeTab === 'employees' && <Employees employees={employees} isAdmin={isAdmin} />}
            {activeTab === 'logs' && <DailyLogs employees={employees} tipLogs={tipLogs} payPeriods={payPeriods} isAdmin={isAdmin} />}
            {activeTab === 'periods' && <PayPeriods payPeriods={payPeriods} tipLogs={tipLogs} employees={employees} settings={settings} isAdmin={isAdmin} />}
            {activeTab === 'settings' && <DistributionSettings settings={settings} isAdmin={isAdmin} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, children, active, onClick }: { icon: React.ReactNode, children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-red-800 text-white shadow-lg shadow-red-900/20' 
          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-red-900/5 -skew-x-12 transform translate-x-20"></div>
      <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-stone-900/5 skew-x-12 transform -translate-x-10"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl border border-stone-100 relative z-10"
        id="login-card"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-800 rounded-2xl mb-6 shadow-xl shadow-red-900/20 rotate-3">
            <span className="text-white font-bold text-3xl">S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-2">SushiTips Pro</h1>
          <p className="text-stone-500">Intelligent tip management for California restaurants</p>
        </div>

        <button 
          onClick={onLogin}
          className="w-full py-4 px-6 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-4"
          id="google-login-btn"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="google" referrerPolicy="no-referrer" />
          Continue with Google
        </button>

        <p className="mt-8 text-center text-xs text-stone-400">
          Restaurant management portal. Requires authorized credentials.
        </p>
      </motion.div>
    </div>
  );
}

// --- Subviews ---

function Dashboard({ employees, tipLogs, payPeriods, settings }: { employees: Employee[], tipLogs: TipLog[], payPeriods: PayPeriod[], settings: Settings }) {
  const currentPeriod = payPeriods.find(p => !p.isClosed);
  const periodLogs = useMemo(() => {
    if (!currentPeriod) return [];
    return tipLogs.filter(log => log.periodId === currentPeriod.id);
  }, [currentPeriod, tipLogs]);

  const stats = useMemo(() => {
    const totalCash = periodLogs.reduce((sum, log) => sum + (log.cash || 0), 0);
    const totalCard = periodLogs.reduce((sum, log) => sum + (log.card || 0), 0);
    const totalDelivery = periodLogs.reduce((sum, log) => sum + (log.delivery || 0), 0);
    const totalGratuity = periodLogs.reduce((sum, log) => sum + (log.gratuity || 0), 0);
    const total = totalCash + totalCard + totalDelivery + totalGratuity;

    return { total, totalCash, totalCard, totalDelivery, totalGratuity };
  }, [periodLogs]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, Manager</h1>
          <p className="text-stone-500">Here's what's happening this pay period.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Current Period</p>
          <p className="font-medium">{currentPeriod ? `${currentPeriod.startDate} to ${currentPeriod.endDate}` : 'No active period'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Tips" value={formatCurrency(stats.total)} icon={<DollarSign className="text-green-600" />} />
        <StatCard label="Cash (Tax Sep)" value={formatCurrency(stats.totalCash)} icon={<TrendingUp className="text-orange-600" />} />
        <StatCard label="Cards & Platforms" value={formatCurrency(stats.totalCard + stats.totalDelivery)} icon={<CheckCircle2 className="text-blue-600" />} />
        <StatCard label="Active Staff" value={employees.filter(e => e.isActive).length.toString()} icon={<Users className="text-purple-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><ClipboardList size={18} /> Recent Shifts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 font-medium border-b border-stone-100">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Shift</th>
                  <th className="px-4 py-3 text-right">Cash</th>
                  <th className="px-4 py-3 text-right">Card</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {periodLogs.slice(0, 5).map(log => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-4 font-medium">{log.date}</td>
                    <td className="px-4 py-4 capitalize text-stone-500">{log.shift}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(log.cash)}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(log.card)}</td>
                    <td className="px-4 py-4 text-right font-bold">{formatCurrency(log.cash + log.card + log.delivery + log.gratuity)}</td>
                  </tr>
                ))}
                {periodLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-stone-400 italic">No logs registered yet for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><PieChart size={18} /> Rule Summary</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-stone-600">Waitstaff Distribution</span>
                <span className="font-bold text-red-700">{settings.waitstaffPercent}%</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-700" 
                  style={{ width: `${settings.waitstaffPercent}%` }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-stone-500">Shared equally among active waiters per shift.</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-stone-600">Kitchen Distribution</span>
                <span className="font-bold text-stone-900">{settings.kitchenPercent}%</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-stone-900" 
                  style={{ width: `${settings.kitchenPercent}%` }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-stone-500">Split between Cook and Dishwasher.</p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-xs text-orange-800">
              <p className="font-bold mb-1 flex items-center gap-1"><AlertCircle size={12} /> Compliance Reminder</p>
              Cash tips are tracked separately for accurate tax reporting as per CA guidelines.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-stone-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
      </div>
      <div className="p-2 bg-stone-50 rounded-lg">
        {icon}
      </div>
    </div>
  );
}

function Employees({ employees, isAdmin }: { employees: Employee[], isAdmin: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('waiter');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'employees', id), {
        name: newName,
        role: newRole,
        isActive: true
      });
      setNewName('');
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'employees');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'employees', id), { isActive: !currentStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `employees/${id}`);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Restaurant Staff</h1>
          <p className="text-stone-500">Manage your team and their roles.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/10"
          >
            <Plus size={20} /> Add Employee
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm"
        >
          <form onSubmit={handleAdd} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase">Employee Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-red-800 outline-none"
                placeholder="Full name"
                required
              />
            </div>
            <div className="w-48 space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase">Role</label>
              <select 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-red-800 outline-none"
              >
                <option value="waiter">Waiter</option>
                <option value="cook">Cook</option>
                <option value="dishwasher">Dishwasher</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-stone-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-stone-800">Save</button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-500 hover:bg-stone-50 rounded-lg">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map(emp => (
          <div key={emp.id} className={`bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative group overflow-hidden ${!emp.isActive ? 'opacity-60 bg-stone-50' : ''}`}>
            {!emp.isActive && <div className="absolute top-0 right-0 p-1 bg-stone-200 text-[10px] font-bold text-stone-500 uppercase px-3 tracking-tighter">Inactive</div>}
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                emp.role === 'waiter' ? 'bg-blue-50 text-blue-600' :
                emp.role === 'cook' ? 'bg-orange-50 text-orange-600' :
                'bg-stone-100 text-stone-600'
              }`}>
                {emp.name.charAt(0).toUpperCase()}
              </div>
              {isAdmin && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleActive(emp.id, emp.isActive)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600" title={emp.isActive ? 'Deactivate' : 'Activate'}>
                    <CheckCircle2 size={18} className={emp.isActive ? 'text-green-500' : 'text-stone-300'} />
                  </button>
                  <button onClick={() => deleteEmployee(emp.id)} className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
            <h4 className="font-bold text-lg">{emp.name}</h4>
            <p className="text-sm text-stone-500 capitalize mb-4">{emp.role}</p>
            
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                emp.role === 'waiter' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                emp.role === 'cook' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                'bg-stone-100 text-stone-700 border border-stone-200'
              }`}>
                {emp.role}
              </span>
            </div>
          </div>
        ))}
      </div>
      {employees.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
          <p className="text-stone-400">No employees registered. Click "Add Employee" to start.</p>
        </div>
      )}
    </motion.div>
  );
}

function DailyLogs({ employees, tipLogs, payPeriods, isAdmin }: { employees: Employee[], tipLogs: TipLog[], payPeriods: PayPeriod[], isAdmin: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Omit<TipLog, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    shift: 'lunch',
    cash: 0,
    card: 0,
    delivery: 0,
    gratuity: 0,
    activeEmployeeIds: [],
    periodId: payPeriods.find(p => !p.isClosed)?.id || ''
  });

  // Pre-check all active employees when the form opens
  useEffect(() => {
    if (isAdding) {
      const activeIds = employees.filter(e => e.isActive).map(e => e.id);
      setFormData(prev => ({
        ...prev,
        activeEmployeeIds: activeIds
      }));
    }
  }, [isAdding, employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.periodId || formData.activeEmployeeIds.length === 0) {
      alert("Please ensure employees are selected and an active period is set.");
      return;
    }
    try {
      const id = `${formData.date}-${formData.shift}`;
      await setDoc(doc(db, 'tipLogs', id), formData);
      setIsAdding(false);
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        shift: 'lunch',
        cash: 0,
        card: 0,
        delivery: 0,
        gratuity: 0,
        activeEmployeeIds: employees.filter(e => e.isActive).map(e => e.id),
        periodId: payPeriods.find(p => !p.isClosed)?.id || ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tipLogs');
    }
  };

  const deleteLog = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteDoc(doc(db, 'tipLogs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tipLogs/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Daily Tip Logs</h1>
          <p className="text-stone-500">Record daily tips and shift attendance.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg"
          >
            {isAdding ? 'Close Form' : <><Plus size={20} /> Register Tips</>}
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-stone-500">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Date</label>
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-red-800 text-stone-900"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Shift</label>
                <select 
                  value={formData.shift} 
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-red-800 text-stone-900"
                >
                  <option value="lunch">Lunch Shift</option>
                  <option value="dinner">Dinner Shift</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Period</label>
                <select 
                  value={formData.periodId} 
                  onChange={(e) => setFormData({ ...formData, periodId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-red-800 text-stone-900"
                  required
                >
                  <option value="">Select Period</option>
                  {payPeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.startDate} to {p.endDate} {p.isClosed ? '(Closed)' : '(Active)'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-stone-400">Financial Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <InputGroup label="Cash" icon={<DollarSign size={14} />} value={formData.cash} onChange={(val) => setFormData({ ...formData, cash: val })} />
                <InputGroup label="Card" icon={<PieChart size={14} />} value={formData.card} onChange={(val) => setFormData({ ...formData, card: val })} />
                <InputGroup label="DoorDash/Extra" icon={<TrendingUp size={14} />} value={formData.delivery} onChange={(val) => setFormData({ ...formData, delivery: val })} />
                <InputGroup label="Gratuity" icon={<DollarSign size={14} />} value={formData.gratuity} onChange={(val) => setFormData({ ...formData, gratuity: val })} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Shift Attendance (Active Staff)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {employees.filter(e => e.isActive).map(emp => (
                  <label key={emp.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    formData.activeEmployeeIds.includes(emp.id) 
                      ? 'bg-red-50 border-red-200 text-red-900 font-bold' 
                      : 'bg-white border-stone-200 text-stone-600'
                  }`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-stone-300 text-red-800 focus:ring-red-800"
                      checked={formData.activeEmployeeIds.includes(emp.id)}
                      onChange={(e) => {
                        const ids = e.target.checked 
                          ? [...formData.activeEmployeeIds, emp.id] 
                          : formData.activeEmployeeIds.filter(id => id !== emp.id);
                        setFormData({ ...formData, activeEmployeeIds: ids });
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{emp.name}</p>
                      <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider font-mono">{emp.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-stone-100">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-stone-500 font-bold hover:text-stone-700">Cancel</button>
              <button type="submit" className="bg-red-800 text-white px-10 py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all">Save shift log</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-4">
        {tipLogs.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
          <div key={log.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-8">
            <div className="w-24 shrink-0">
              <p className="font-bold text-stone-900">{log.date}</p>
              <p className={`text-[10px] font-bold uppercase tracking-tighter ${log.shift === 'lunch' ? 'text-blue-500' : 'text-orange-500'}`}>{log.shift}</p>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-4 border-l border-stone-100 pl-8">
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Cash</p>
                <p className="font-mono text-stone-700 font-medium">{formatCurrency(log.cash)}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Electronic</p>
                <p className="font-mono text-stone-700 font-medium">{formatCurrency(log.card + log.delivery + log.gratuity)}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Staff Count</p>
                <p className="font-mono text-stone-700 font-medium">{log.activeEmployeeIds.length} active</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Shift Total</p>
                <p className="font-mono text-lg font-bold text-red-800">{formatCurrency(log.cash + log.card + log.delivery + log.gratuity)}</p>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => deleteLog(log.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {tipLogs.length === 0 && (
          <div className="py-20 text-center text-stone-400 italic">No logs found.</div>
        )}
      </div>
    </motion.div>
  );
}

function InputGroup({ label, icon, value, onChange }: { label: string, icon: React.ReactNode, value: number, onChange: (val: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-stone-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
        <input 
          type="number" 
          step="0.01"
          value={value || ''} 
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full pl-7 pr-3 py-2 rounded-lg border border-stone-200 outline-none focus:ring-2 focus:ring-red-800"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function PayPeriods({ payPeriods, tipLogs, employees, settings, isAdmin }: { payPeriods: PayPeriod[], tipLogs: TipLog[], employees: Employee[], settings: Settings, isAdmin: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ startDate: '', endDate: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = `${newPeriod.startDate}_${newPeriod.endDate}`;
      await setDoc(doc(db, 'payPeriods', id), {
        ...newPeriod,
        isClosed: false
      });
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'payPeriods');
    }
  };

  const closePeriod = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Closing this period will lock it and you should process the payouts. Continue?')) return;
    try {
      await updateDoc(doc(db, 'payPeriods', id), { isClosed: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payPeriods/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Biweekly Pay Periods</h1>
          <p className="text-stone-500">Track distribution and historical records.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-900/10"
          >
            <Plus size={20} /> New Period
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm"
        >
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase">Start Date</label>
              <input type="date" value={newPeriod.startDate} onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none" required />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase">End Date</label>
              <input type="date" value={newPeriod.endDate} onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-stone-200 outline-none" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-stone-900 text-white px-6 py-2 rounded-lg font-bold">Start Period</button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-500">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-6">
        {payPeriods.map(period => (
          <PeriodCard key={period.id} period={period} tipLogs={tipLogs} employees={employees} settings={settings} onToggleClose={() => closePeriod(period.id)} isAdmin={isAdmin} />
        ))}
      </div>
    </motion.div>
  );
}

interface PeriodCardProps {
  period: PayPeriod;
  tipLogs: TipLog[];
  employees: Employee[];
  settings: Settings;
  onToggleClose: () => void | Promise<void>;
  isAdmin: boolean;
}

const PeriodCard: React.FC<PeriodCardProps> = ({ 
  period, 
  tipLogs, 
  employees, 
  settings, 
  onToggleClose, 
  isAdmin 
}) => {
  const periodLogs = tipLogs.filter(log => log.periodId === period.id);
  const [expanded, setExpanded] = useState(!period.isClosed);

  const calculateDistributions = () => {
    // Totals per employee
    const distributions: Record<string, { cash: number, electronic: number, total: number }> = {};
    
    periodLogs.forEach(log => {
      const waitstaffIds = log.activeEmployeeIds.filter(id => {
        const emp = employees.find(e => e.id === id);
        return emp?.role === 'waiter';
      });
      const kitchenIds = log.activeEmployeeIds.filter(id => {
        const emp = employees.find(e => e.id === id);
        return emp?.role === 'cook' || emp?.role === 'dishwasher';
      });

      // Split 85% among waitstaff
      const waitstaffCash = (log.cash || 0) * (settings.waitstaffPercent / 100);
      const waitstaffElec = ((log.card || 0) + (log.delivery || 0) + (log.gratuity || 0)) * (settings.waitstaffPercent / 100);
      
      const kitchenCash = (log.cash || 0) * (settings.kitchenPercent / 100);
      const kitchenElec = ((log.card || 0) + (log.delivery || 0) + (log.gratuity || 0)) * (settings.kitchenPercent / 100);

      // Waitstaff split
      if (waitstaffIds.length > 0) {
        waitstaffIds.forEach(id => {
          if (!distributions[id]) distributions[id] = { cash: 0, electronic: 0, total: 0 };
          distributions[id].cash += waitstaffCash / waitstaffIds.length;
          distributions[id].electronic += waitstaffElec / waitstaffIds.length;
          distributions[id].total += (waitstaffCash + waitstaffElec) / waitstaffIds.length;
        });
      }

      // Kitchen split
      if (kitchenIds.length > 0) {
        kitchenIds.forEach(id => {
          if (!distributions[id]) distributions[id] = { cash: 0, electronic: 0, total: 0 };
          distributions[id].cash += kitchenCash / kitchenIds.length;
          distributions[id].electronic += kitchenElec / kitchenIds.length;
          distributions[id].total += (kitchenCash + kitchenElec) / kitchenIds.length;
        });
      }
    });

    return distributions;
  };

  const distributions = calculateDistributions();
  const totalTips = periodLogs.reduce((sum, log) => sum + (log.cash || 0) + (log.card || 0) + (log.delivery || 0) + (log.gratuity || 0), 0);

  return (
    <div className={`bg-white rounded-3xl border transition-all ${period.isClosed ? 'border-stone-200' : 'border-red-200 shadow-lg shadow-red-900/5'}`}>
      <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${period.isClosed ? 'bg-stone-100 text-stone-400' : 'bg-red-800 text-white shadow-lg'}`}>
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{period.startDate} — {period.endDate}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${period.isClosed ? 'bg-stone-100 text-stone-500 border border-stone-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {period.isClosed ? 'Historical Period' : 'Current Active Period'}
              </span>
              <span className="text-stone-400 text-xs">• {periodLogs.length} shifts recorded</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Period Tips</p>
            <p className="text-xl font-bold text-stone-900 font-mono tracking-tighter">{formatCurrency(totalTips)}</p>
          </div>
          {isAdmin && !period.isClosed && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleClose(); }}
              className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-800 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Close & Finalize
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-stone-100"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-lg font-bold flex items-center gap-2"><PieChart size={18} className="text-stone-400" /> Distribution Breakdown</h4>
                <div className="flex gap-4 text-xs font-medium text-stone-500">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-stone-900"></span> Cash (Reportable)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Electronic (Direct)</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(distributions).map(([id, stats]) => {
                  const emp = employees.find(e => e.id === id);
                  if (!emp) return null;
                  return (
                    <div key={id} className="p-5 bg-stone-50 rounded-2xl border border-stone-100 group hover:bg-white hover:shadow-xl hover:shadow-stone-900/5 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-stone-900 mb-0.5">{emp.name}</p>
                          <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                             {emp.role === 'waiter' ? <Users size={10} /> : <AlertCircle size={10} />} {emp.role}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-red-800 font-mono tracking-tighter">{formatCurrency(stats.total)}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Cash Payment</span>
                          <span className="font-bold text-stone-900">{formatCurrency(stats.cash)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Card/Auth Tips</span>
                          <span className="font-bold text-blue-600">{formatCurrency(stats.electronic)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(distributions).length === 0 && (
                  <div className="col-span-full py-10 text-center text-stone-400 italic">
                    No active staff found in the recorded shifts.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DistributionSettings({ settings, isAdmin }: { settings: Settings, isAdmin: boolean }) {
  const [kitchen, setKitchen] = useState(settings.kitchenPercent);
  const [waitstaff, setWaitstaff] = useState(settings.waitstaffPercent);

  const handleUpdate = async () => {
    if (!isAdmin) return;
    if (kitchen + waitstaff !== 100) {
      alert("Percents must total 100%");
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'distribution'), {
        kitchenPercent: kitchen,
        waitstaffPercent: waitstaff
      });
      alert("Settings updated!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/distribution');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="max-w-2xl"
    >
      <div className="mb-10">
        <h1 className="text-2xl font-bold">Distribution Rules</h1>
        <p className="text-stone-500">Configure how tips are shared between front and back of house.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="font-bold text-stone-800">Kitchen Staff Share</label>
              <span className="font-mono text-red-800 font-bold">{kitchen}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={kitchen} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setKitchen(val);
                setWaitstaff(100 - val);
              }}
              disabled={!isAdmin}
              className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-red-800"
            />
            <p className="text-xs text-stone-400 italic">Typically set to 15% in California sushi restaurants.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="font-bold text-stone-800">Waitstaff Share</label>
              <span className="font-mono text-blue-600 font-bold">{waitstaff}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={waitstaff} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setWaitstaff(val);
                setKitchen(100 - val);
              }}
              disabled={!isAdmin}
              className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-red-800"
            />
          </div>

          <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
             <div className="p-4 bg-blue-50 rounded-2xl text-xs text-blue-700 border border-blue-100 flex items-start gap-2 max-w-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                Waitstaff tips are shared equally among all waiters on shift. Kitchen tips are split between cook and dishwasher on shift.
             </div>
             {isAdmin && (
               <button 
                 onClick={handleUpdate}
                 className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg active:scale-95"
                >
                  Save Configuration
                </button>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Helpers ---

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}
