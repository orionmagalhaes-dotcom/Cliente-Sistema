
import React, { useState } from 'react';
import { User } from '../types';
import { checkUserStatus, loginWithPassword, registerClientPassword, getTestUser, verifyAdminLogin, getRotationalTestPassword } from '../services/clientService';
import { Loader2, Lock, AlertCircle, UserCheck, Shield, Sparkles, Play, ChevronRight, Star } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User, remember: boolean, isTest?: boolean) => void;
  onAdminClick: () => void;
  onAdminLoginSuccess?: (remember: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onAdminClick, onAdminLoginSuccess }) => {
  const [step, setStep] = useState<'identify' | 'password' | 'create_password'>('identify');
  
  // User Login State
  const [digits, setDigits] = useState('');
  const [fullPhoneFound, setFullPhoneFound] = useState('');
  const [password, setPassword] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  
  // Admin inputs
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- HANDLERS ---
  
  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Aceita apenas números e limita a 4 caracteres
      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
      setDigits(val);
      if (error) setError('');
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Easter egg para admin
    if (digits === '0000') {
        setShowAdmin(true);
        return;
    }

    if (digits.length < 4) {
      setError('Preencha os 4 dígitos finais.');
      return;
    }

    setLoading(true);
    
    try {
        const status = await checkUserStatus(digits);

        if (status.exists && status.phoneMatches.length > 0) {
            setFullPhoneFound(status.phoneMatches[0]);
            if (status.hasPassword) {
                setStep('password');
            } else {
                setStep('create_password');
            }
        } else {
            setError('Conta não encontrada.');
        }
    } catch (err) {
        setError('Erro de conexão.');
    } finally {
        setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password.trim()) {
        setError('Digite a senha.');
        return;
    }

    setLoading(true);
    const { user, error: loginError } = await loginWithPassword(fullPhoneFound, password);
    setLoading(false);

    if (user) {
        onLogin(user, true);
    } else {
        setError(loginError || 'Senha incorreta.');
    }
  };

  const handleRegisterPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (password.length < 4) {
          setError('Mínimo 4 dígitos.');
          return;
      }

      setLoading(true);
      const success = await registerClientPassword(fullPhoneFound, password);
      
      if (success) {
          const { user } = await loginWithPassword(fullPhoneFound, password);
          setLoading(false);
          if (user) onLogin(user, true);
          else setError('Erro ao entrar.');
      } else {
          setLoading(false);
          setError('Erro ao salvar.');
      }
  };

  const handleFreeTest = async () => {
      setLoadingTest(true);
      await new Promise(r => setTimeout(r, 800));
      const { user } = await getTestUser();
      setLoadingTest(false);
      
      if (user) {
          onLogin(user, false, true);
      } else {
          setError('Teste indisponível.');
      }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      const isValid = await verifyAdminLogin(adminUser, adminPass);
      if (isValid) {
          if (onAdminLoginSuccess) onAdminLoginSuccess(false);
          else onAdminClick();
      } else {
          // Check for Test User Code
          const testPass = getRotationalTestPassword();
          if (adminPass.toUpperCase() === testPass) {
               const { user } = await getTestUser();
               if(user) onLogin(user, false, true);
          } else {
              setError('Acesso negado.');
          }
      }
  };

  // --- SCREEN RENDER ---

  if (showAdmin) {
      return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 font-sans">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm animate-fade-in">
                  <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">Admin / Teste</h2>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                      <input type="text" placeholder="User" className="w-full border p-3 rounded-xl bg-gray-50 text-gray-900" value={adminUser} onChange={e => setAdminUser(e.target.value)} />
                      <input type="password" placeholder="Pass/Code" className="w-full border p-3 rounded-xl bg-gray-50 text-gray-900" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                      {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}
                      <div className="flex gap-2">
                          <button type="button" onClick={() => setShowAdmin(false)} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-bold">Voltar</button>
                          <button type="submit" className="flex-1 bg-black text-white py-3 rounded-xl font-bold">Entrar</button>
                      </div>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-sans px-4 relative overflow-hidden bg-gradient-to-br from-pink-900 via-rose-900 to-purple-900">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-pink-600 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[100px] opacity-30 animate-pulse delay-700"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-rose-600 rounded-full blur-[130px] opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2rem] p-6 space-y-6 animate-fade-in-up relative z-10">
        
        {/* LOGO AREA */}
        <div className="text-center pt-1">
            <div className="flex items-center justify-center gap-2 mb-1">
                <div className="bg-gradient-to-tr from-pink-500 to-rose-400 p-2 rounded-xl shadow-lg shadow-pink-900/40 animate-bounce">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tighter drop-shadow-md">
                    Eu<span className="text-pink-200">Dorama</span>
                </h1>
            </div>
            <p className="text-pink-100/80 text-xs font-medium tracking-wide flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-300" /> Clube de Assinantes
            </p>
        </div>

        {step === 'identify' ? (
            <form onSubmit={handleIdentify} className="space-y-5">
                
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-pink-200 uppercase tracking-widest block text-center opacity-80">
                        Confirme seu número
                    </label>
                    
                    {/* INPUT COM MÁSCARA FIXA VISUAL */}
                    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-center relative group focus-within:border-pink-300/50 focus-within:bg-black/30 transition-all">
                        <span className="text-white/30 text-xl font-bold tracking-widest select-none font-mono">
                            (••) ••••• - 
                        </span>
                        <input
                            type="tel"
                            maxLength={4}
                            placeholder="____"
                            className="w-20 bg-transparent text-center text-xl font-bold text-white outline-none placeholder-white/20 tracking-[0.2em] font-mono focus:placeholder-transparent ml-1"
                            value={digits}
                            onChange={handleDigitsChange}
                            autoFocus
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center justify-center gap-2 text-white font-bold text-xs bg-red-500/20 border border-red-500/30 p-2.5 rounded-xl animate-pulse backdrop-blur-md">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <div className="space-y-2">
                    <button
                        type="submit"
                        disabled={loading || digits.length < 4}
                        className="w-full bg-white hover:bg-pink-50 text-pink-900 font-black py-3.5 rounded-xl shadow-lg shadow-pink-900/20 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continuar <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/></>}
                    </button>
                    
                    {/* Botão Teste Grátis */}
                    <button
                        type="button"
                        onClick={handleFreeTest}
                        disabled={loadingTest}
                        className="w-full py-3 font-bold text-xs text-pink-100 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95"
                    >
                         {loadingTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Star className="w-3 h-3 text-yellow-300 fill-yellow-300" /> Quero testar grátis</>}
                    </button>
                </div>

                <div className="text-center">
                     <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest">
                        Exemplo: (88) 99999-<span className="text-white">1234</span>
                     </p>
                </div>

            </form>
        ) : (
            // PASSWORD STEP
            <form onSubmit={step === 'password' ? handleLoginSubmit : handleRegisterPassword} className="space-y-5 animate-slide-up">
                
                <div className="text-center bg-black/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <UserCheck className="w-5 h-5 text-pink-200" />
                    </div>
                    <p className="text-[10px] text-pink-200 font-bold uppercase mb-0.5">Identificado como</p>
                    <p className="font-bold text-lg text-white tracking-widest font-mono">••• •••• {fullPhoneFound.slice(-4)}</p>
                </div>

                <div className="bg-black/20 rounded-xl p-3 border border-white/10 focus-within:border-pink-300/50 focus-within:bg-black/30 transition-all">
                    <label className="block text-[10px] font-bold text-pink-200 uppercase mb-1 ml-1">
                        {step === 'create_password' ? 'Crie sua senha de acesso' : 'Sua senha'}
                    </label>
                    <div className="flex items-center">
                        <Lock className="w-4 h-4 text-pink-200 mr-2 ml-1" />
                        <input
                            type="password"
                            className="w-full bg-transparent font-bold text-xl text-white outline-none placeholder-white/10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            placeholder="******"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/30 p-2.5 rounded-xl backdrop-blur-sm">
                        <p className="text-white font-bold text-center text-xs">{error}</p>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-pink-900 font-black py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (step === 'create_password' ? 'Definir Senha e Entrar' : <>Acessar Painel <UserCheck className="w-4 h-4"/></>)}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => { setStep('identify'); setDigits(''); setPassword(''); setError(''); }}
                        className="text-pink-200/70 font-bold text-xs py-2 hover:text-white transition-colors"
                    >
                        Não sou este número
                    </button>
                </div>
            </form>
        )}

      </div>
      
      {/* Footer Branding & Admin Link */}
      <div className="absolute bottom-4 w-full flex flex-col items-center gap-2 z-10">
          <button 
            onClick={() => setShowAdmin(true)}
            className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 text-white/30 hover:text-white transition-all bg-black/10 hover:bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            <Shield className="w-3 h-3" /> Área Administrativa
          </button>
      </div>
    </div>
  );
};

export default Login;
