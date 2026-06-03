import { useState } from 'react';
import { useAuthStore } from '../hooks/useAuthStore';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter email and password'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') toast.error('User not found');
      else if (error.code === 'auth/wrong-password') toast.error('Wrong password');
      else if (error.code === 'auth/invalid-credential') toast.error('Invalid email or password');
      else if (error.code === 'auth/too-many-requests') toast.error('Too many attempts. Try later.');
      else toast.error('Login failed: ' + (error.message || 'Unknown error'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MAHALAXMI</h1>
          <p className="text-sm text-gray-500">Agri Commodities Contract Manager</p>
          <p className="text-xs text-rose-600 mt-2 font-medium">Private Access Only</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><>Sign In</><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-800 text-center"><strong>Private App:</strong> Only authorized users can access.</p>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Mahalaxmi Agri Commodities &bull; Rajkot, Gujarat</p>
      </div>
    </div>
  );
}
