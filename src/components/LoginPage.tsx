import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Lock, Eye, EyeOff, Leaf, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await login(username, password, rememberMe);
      if (!result.success) {
        setError(result.error || 'Erro ao efetuar login.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#041410] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00C984]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#09221B] border border-emerald-900/40 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* Brand/Logo Section */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-14 h-14 bg-[#00C984]/15 rounded-2xl flex items-center justify-center border border-emerald-400/20 shadow-lg shadow-[#00C984]/5"
          >
            <Leaf className="w-8 h-8 text-[#00C984]" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black tracking-widest text-[#00C984] uppercase">BIOMATE</h1>
            <p className="text-xs text-emerald-300/50 mt-1 uppercase tracking-widest">Acesso Administrativo</p>
          </div>
        </div>

        {/* Input Forms */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-rose-950/30 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-200"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-xs leading-normal font-medium">{error}</span>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-emerald-400/70 tracking-widest uppercase ml-1">
              Usuário do sistema
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center justify-center pointer-events-none">
                <User className="w-4 h-4 text-emerald-300/40" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: bioadmin"
                disabled={isSubmitting}
                className="w-full bg-[#051612] text-white placeholder-emerald-800/60 pl-11 pr-4 py-3 rounded-xl border border-emerald-950 hover:border-emerald-900 focus:border-[#00C984]/50 focus:outline-none focus:ring-1 focus:ring-[#00C984]/30 transition-all font-sans text-sm"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-emerald-400/70 tracking-widest uppercase ml-1">
              Senha secreta
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center justify-center pointer-events-none">
                <Lock className="w-4 h-4 text-emerald-300/40" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                disabled={isSubmitting}
                className="w-full bg-[#051612] text-white placeholder-emerald-800/60 pl-11 pr-11 py-3 rounded-xl border border-emerald-950 hover:border-emerald-900 focus:border-[#00C984]/50 focus:outline-none focus:ring-1 focus:ring-[#00C984]/30 transition-all font-sans text-sm"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center text-emerald-300/40 hover:text-emerald-300/75 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                rememberMe
                  ? 'bg-[#00C984] border-[#00C984] text-[#041410]'
                  : 'bg-[#051612] border-emerald-950 group-hover:border-emerald-900'
              }`}>
                {rememberMe && (
                  <svg className="w-3 h-3 fill-current font-black" viewBox="0 0 20 20">
                    <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-emerald-300/60 hover:text-emerald-300/95 transition-colors font-medium">
                Lembrar de mim
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 mt-2 bg-[#00C984] hover:bg-[#00e395] active:scale-[0.99] text-[#031d16] font-bold rounded-xl shadow-lg shadow-[#00C984]/10 hover:shadow-[#00C984]/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer font-sans disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#031d16]" />
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar no Painel</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-[9px] text-center text-emerald-300/20 tracking-wider font-mono">
          BIOMATE TECNOLOGIA ECOLÓGICA DE GESTÃO
        </div>
      </motion.div>
    </div>
  );
}
