/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  LogIn, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  Menu,
  X,
  Plus,
  LayoutDashboard,
  Image as ImageIcon,
  FileText,
  Phone,
  Mail,
  Facebook,
  Calendar,
  User as UserIcon,
  MapPin,
  Briefcase,
  Droplet,
  Shirt,
  Upload
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Supabase Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

async function handleSupabaseError(error: any, operationType: OperationType, path: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  const errInfo: SupabaseErrorInfo = {
    error: error?.message || String(error),
    authInfo: {
      userId: user?.id,
      email: user?.email,
    },
    operationType,
    path
  }
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Registration {
  id: string;
  name: string;
  fatherName: string;
  address: string;
  gender: string;
  sscBatch: string;
  email: string;
  phone: string;
  facebookLink: string;
  bloodGroup: string;
  occupation: string;
  guests: number;
  tshirtSize: string;
  photoUrl: string;
  fee: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: any;
}

const LOGO_URL = "https://img.icons8.com/color/144/school.png"; // আপাতত একটি ডামি লোগো, আপনি আপনার লোগোর লিঙ্ক এখানে দিতে পারেন

interface AppSettings {
  reunionName: string;
  registrationOpen: boolean;
  guestFeeEnabled: boolean;
  guestFeeAmount: number;
  adminEmails?: string[];
}

const ADMIN_EMAIL = "mdsajib33440@gmail.com";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'home' | 'admin'>('home');
  const [adminTab, setAdminTab] = useState<'registrations' | 'settings'>('registrations');
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    reunionName: "মতিরহাট উচ্চ বিদ্যালয় রি-ইউনিয়ন ২০২৬",
    registrationOpen: true,
    guestFeeEnabled: true,
    guestFeeAmount: 500,
    adminEmails: [ADMIN_EMAIL]
  });

  // Logo Theme Colors
  const theme = {
    blue: "#2b59c3",
    green: "#4caf50",
    red: "#e91e63",
    yellow: "#ffc107"
  };

  const buttonStyle = {
    backgroundColor: theme.blue,
    color: 'white'
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      if (u) {
        const allowedAdmins = settings.adminEmails || [ADMIN_EMAIL];
        if (!allowedAdmins.includes(u.email || '')) {
          supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
          return;
        }
      }
      setUser(u);
      setIsAdmin(!!u && (settings.adminEmails || [ADMIN_EMAIL]).includes(u.email || ''));
    });
    return () => subscription.unsubscribe();
  }, [settings.adminEmails]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 'config')
          .single();
        
        if (error) {
          console.warn("Settings not found, using defaults:", error.message);
        } else if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    const channel = supabase
      .channel('settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.config' }, (payload) => {
        setSettings(payload.new as AppSettings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      setShowLogin(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error: any) {
      console.error("Auth failed:", error);
      setLoginError(error.message || "ব্যর্থ হয়েছে। অনুগ্রহ করে সঠিক তথ্য দিন।");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2b59c3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm overflow-hidden border border-slate-100">
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://img.icons8.com/color/48/school.png";
                }}
              />
            </div>
            <h1 className="font-black text-lg md:text-xl text-[#2b59c3] hidden sm:block">
              {settings.reunionName}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button 
                onClick={() => setView(view === 'admin' ? 'home' : 'admin')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2b59c3]/10 text-[#2b59c3] hover:bg-[#2b59c3]/20 transition-all font-black text-sm shadow-sm"
              >
                {view === 'admin' ? <UserIcon size={18} /> : <LayoutDashboard size={18} />}
                {view === 'admin' ? 'হোম পেজ' : 'এডমিন ড্যাশবোর্ড'}
              </button>
            )}
            
            {!user ? (
              <button 
                onClick={() => setShowLogin(true)}
                className="text-slate-500 hover:text-[#2b59c3] transition-colors text-sm font-black"
              >
                এডমিন লগইন
              </button>
            ) : (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium"
              >
                <LogOut size={18} />
                লগআউট
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HeroSection settings={settings} />
              <RegistrationForm settings={settings} />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <AdminDashboard settings={settings} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative"
            >
              <button 
                onClick={() => setShowLogin(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2b59c3]/10 text-[#2b59c3] mb-4 shadow-inner">
                  <LogIn size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">এডমিন লগইন</h2>
                <p className="text-slate-500 mt-2">শুধুমাত্র এডমিনদের জন্য</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ইমেইল</label>
                  <input 
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">পাসওয়ার্ড</label>
                  <input 
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all"
                    placeholder="••••••••"
                  />
                </div>
                
                {loginError && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14} />
                    {loginError}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#2b59c3] text-white rounded-2xl hover:bg-[#1a237e] transition-all font-bold shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <LogIn size={20} />
                      লগইন করুন
                    </>
                  )}
                </button>
              </form>
              
              <p className="text-center text-xs text-slate-400 mt-8">
                লগইন করার মাধ্যমে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন।
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © ২০২৬ {settings.reunionName} | সর্বস্বত্ব সংরক্ষিত
          </p>
        </div>
      </footer>
    </div>
  );
}

function HeroSection({ settings }: { settings: AppSettings }) {
  return (
    <div className="text-center mb-12 relative overflow-hidden py-10 rounded-[2.5rem] bg-gradient-to-br from-[#2b59c3] via-[#3f51b5] to-[#1a237e] text-white shadow-2xl">
      {/* Decorative fireworks-like elements */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-[#ffc107]/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#e91e63]/20 rounded-full blur-3xl animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#4caf50]/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="relative z-10"
      >
        <div className="h-40 w-40 mx-auto mb-8 bg-white p-4 rounded-[2rem] shadow-2xl ring-4 ring-white/20 flex items-center justify-center overflow-hidden">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="h-full w-full object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://img.icons8.com/color/144/school.png";
            }}
          />
        </div>
      </motion.div>
      
      <motion.h2 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-5xl md:text-7xl font-black mb-8 tracking-tight drop-shadow-2xl"
      >
        মতিরহাট উচ্চ বিদ্যালয় <br className="md:hidden" /> রি-ইউনিয়ন ২০২৬
      </motion.h2>
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-blue-50 text-xl md:text-2xl max-w-3xl mx-auto px-6 font-medium leading-relaxed"
      >
        পুরানো বন্ধুদের সাথে আবার দেখা করার এক অনন্য উৎসব। <br className="hidden md:block" /> আজই আপনার রেজিস্ট্রেশন সম্পন্ন করুন!
      </motion.p>
    </div>
  );
}

function RegistrationForm({ settings }: { settings: AppSettings }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
  
  const selectedBatch = watch('sscBatch');
  const guests = watch('guests') || 0;

  const calculatedFee = useMemo(() => {
    if (!selectedBatch) return 0;
    const batch = parseInt(selectedBatch);
    let baseFee = 0;
    if (batch >= 1993 && batch <= 2014) baseFee = 2000;
    else if (batch >= 2015 && batch <= 2019) baseFee = 1500;
    else if (batch >= 2020 && batch <= 2023) baseFee = 1000;
    else if (batch >= 2024 && batch <= 2030) baseFee = 700;
    
    // Add guest fee if enabled
    const guestFee = settings.guestFeeEnabled ? (guests * settings.guestFeeAmount) : 0;
    return baseFee + guestFee;
  }, [selectedBatch, guests, settings.guestFeeEnabled, settings.guestFeeAmount]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const registrationData = {
        ...data,
        guests: Number(data.guests || 0),
        fee: calculatedFee,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        photoUrl: data.photoUrl || 'https://picsum.photos/seed/avatar/200/200'
      };
      
      const { data: insertedData, error } = await supabase
        .from('registrations')
        .insert([registrationData])
        .select()
        .single();

      if (error) throw error;
      
      setSubmittedData(insertedData);
      
      // Sync to Google Sheets
      try {
        await fetch('/api/sync-to-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            registration: insertedData
          })
        });
      } catch (sheetError) {
        console.error("Google Sheets sync failed:", sheetError);
      }

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'registrations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadReceipt = () => {
    if (!submittedData) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(43, 89, 195); // #2b59c3
    doc.text(settings.reunionName, 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text("Registration Receipt", 105, 30, { align: 'center' });
    
    // Content
    doc.setFontSize(12);
    doc.setTextColor(0);
    
    const startY = 50;
    const lineHeight = 10;
    
    doc.text(`Name: ${submittedData.name}`, 20, startY);
    doc.text(`Email: ${submittedData.email}`, 20, startY + lineHeight);
    doc.text(`Phone: ${submittedData.phone}`, 20, startY + lineHeight * 2);
    doc.text(`SSC Batch: ${submittedData.sscBatch}`, 20, startY + lineHeight * 3);
    doc.text(`Guests: ${submittedData.guests || 0}`, 20, startY + lineHeight * 4);
    doc.text(`Total Fee: ${submittedData.fee} BDT`, 20, startY + lineHeight * 5);
    doc.text(`Status: Pending (Awaiting Verification)`, 20, startY + lineHeight * 6);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for registering! We look forward to seeing you.", 105, 150, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 160, { align: 'center' });
    
    doc.save(`receipt_${submittedData.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-xl p-12 text-center"
      >
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">রেজিস্ট্রেশন সফল হয়েছে!</h2>
        <p className="text-slate-600 text-lg mb-8">
          আপনার তথ্য সফলভাবে জমা দেওয়া হয়েছে। পেমেন্ট যাচাইয়ের পর আপনাকে SMS এর মাধ্যমে নিশ্চিত করা হবে।
        </p>
        <div className="flex justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-10 py-4 bg-[#2b59c3] text-white rounded-2xl font-black text-lg hover:bg-[#1a237e] hover:shadow-2xl hover:scale-105 transition-all shadow-xl shadow-blue-100"
          >
            নতুন রেজিস্ট্রেশন করুন
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="h-12 w-12 object-contain bg-white p-1 rounded-xl shadow-sm border border-slate-100"
              referrerPolicy="no-referrer"
            />
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-[#2b59c3]" />
              রেজিস্ট্রেশন ফর্ম
            </h3>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="নাম" icon={<UserIcon size={18} className="text-[#2b59c3]" />}>
              <input 
                {...register('name', { required: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all"
                placeholder="আপনার পূর্ণ নাম"
              />
              {errors.name && <span className="text-[#e91e63] text-xs mt-1">নাম আবশ্যক</span>}
            </FormField>

            <FormField label="পিতার নাম" icon={<UserIcon size={18} className="text-[#2b59c3]" />}>
              <input 
                {...register('fatherName', { required: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all"
                placeholder="পিতার নাম লিখুন"
              />
            </FormField>

            <FormField label="বর্তমান ঠিকানা" icon={<MapPin size={18} className="text-[#2b59c3]" />} className="md:col-span-2">
              <textarea 
                {...register('address', { required: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all min-h-[100px]"
                placeholder="আপনার বর্তমান ঠিকানা"
              />
            </FormField>

            <FormField label="লিঙ্গ" icon={<UserIcon size={18} className="text-[#2b59c3]" />}>
              <select 
                {...register('gender', { required: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">নির্বাচন করুন</option>
                <option value="Male">পুরুষ</option>
                <option value="Female">মহিলা</option>
                <option value="Other">অন্যান্য</option>
              </select>
            </FormField>

            <FormField label="এসএসসি ব্যাচ" icon={<Calendar size={18} className="text-[#2b59c3]" />}>
              <select 
                {...register('sscBatch', { required: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">ব্যাচ নির্বাচন করুন</option>
                {Array.from({ length: 2030 - 1993 + 1 }, (_, i) => 1993 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </FormField>

            <FormField label="ইমেইল" icon={<Mail size={18} className="text-[#2b59c3]" />}>
              <input 
                {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all"
                placeholder="example@mail.com"
              />
            </FormField>

            <FormField label="ফোন নম্বর" icon={<Phone size={18} className="text-[#2b59c3]" />}>
              <input 
                {...register('phone', { required: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all"
                placeholder="০১XXXXXXXXX"
              />
            </FormField>

            <FormField label="ফেসবুক প্রোফাইল লিংক" icon={<Facebook size={18} className="text-[#2b59c3]" />}>
              <input 
                {...register('facebookLink')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all"
                placeholder="https://facebook.com/username"
              />
            </FormField>

            <FormField label="রক্তের গ্রুপ" icon={<Droplet size={18} className="text-[#e91e63]" />}>
              <select 
                {...register('bloodGroup')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#e91e63] focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">নির্বাচন করুন</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </FormField>

            <FormField label="বর্তমান পেশা" icon={<Briefcase size={18} className="text-[#2b59c3]" />}>
              <input 
                {...register('occupation')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all"
                placeholder="আপনার পেশা"
              />
            </FormField>

            <FormField label="অতিথির সংখ্যা" icon={<Users size={18} className="text-[#2b59c3]" />}>
              <input 
                {...register('guests', { min: 0 })}
                type="number"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all"
                placeholder="০"
              />
            </FormField>

            <FormField label="টি-শার্ট সাইজ" icon={<Shirt size={18} className="text-[#2b59c3]" />}>
              <select 
                {...register('tshirtSize', { required: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#2b59c3] focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">সাইজ নির্বাচন করুন</option>
                {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </FormField>

            <FormField label="ছবি আপলোড" icon={<Upload size={18} className="text-[#2b59c3]" />}>
              <input 
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 1024 * 1024) {
                      alert("ইমেজ সাইজ ১MB এর নিচে হতে হবে।");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setValue('photoUrl', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#2b59c3] hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">* সর্বোচ্চ ১ মেগাবাইট</p>
            </FormField>
          </div>

          {/* Fee Display */}
          <div className="bg-[#2b59c3]/5 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-[#2b59c3]/10">
            <div>
              <h4 className="text-[#2b59c3] font-black text-2xl">রেজিস্ট্রেশন ফি</h4>
              <p className="text-slate-500 text-sm mt-1">আপনার ব্যাচ ও অতিথির সংখ্যা অনুযায়ী নির্ধারিত ফি</p>
            </div>
            <div className="text-4xl font-black text-[#2b59c3] bg-white px-8 py-3 rounded-2xl shadow-sm border border-[#2b59c3]/5">
              ৳ {calculatedFee}
            </div>
          </div>

          <button 
            disabled={isSubmitting}
            type="submit"
            className="w-full py-5 bg-gradient-to-r from-[#2b59c3] to-[#4caf50] text-white rounded-2xl font-black text-2xl shadow-xl shadow-blue-200 hover:shadow-2xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'রেজিস্ট্রেশন সম্পন্ন করুন'}
          </button>
        </form>

        {/* Instructions */}
        <div className="bg-slate-50 p-8 border-t border-slate-100">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" />
            গুরুত্বপূর্ণ নির্দেশনা:
          </h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              সকল তথ্য সঠিকভাবে প্রদান করতে হবে।
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              ভুল তথ্য দিলে রেজিস্ট্রেশন বাতিল হতে পারে।
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              ফি প্রদান বাধ্যতামূলক।
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              পেমেন্ট শেষে সাবমিট করুন।
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              সফল হলে SMS এর মাধ্যমে নিশ্চিত করা হবে।
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, icon, children, className }: { label: string, icon: React.ReactNode, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-black text-slate-700 flex items-center gap-2 ml-1">
        <span className="text-[#2b59c3]">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function ManualAddModal({ onClose, settings }: { onClose: () => void, settings: AppSettings }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
  
  const selectedBatch = watch('sscBatch');
  const guests = watch('guests') || 0;

  const calculatedFee = useMemo(() => {
    if (!selectedBatch) return 0;
    const batch = parseInt(selectedBatch);
    let baseFee = 0;
    if (batch >= 1993 && batch <= 2014) baseFee = 2000;
    else if (batch >= 2015 && batch <= 2019) baseFee = 1500;
    else if (batch >= 2020 && batch <= 2024) baseFee = 1000;
    else if (batch >= 2025) baseFee = 500;

    let total = baseFee;
    if (settings.guestFeeEnabled && guests > 0) {
      total += (guests * settings.guestFeeAmount);
    }
    return total;
  }, [selectedBatch, guests, settings]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const registrationData = {
        ...data,
        guests: Number(data.guests),
        fee: calculatedFee,
        status: 'Confirmed', // Manually added by admin, assume confirmed
        createdAt: new Date().toISOString(),
        photoUrl: data.photoUrl || 'https://picsum.photos/seed/avatar/200/200'
      };

      const { data: insertedData, error } = await supabase
        .from('registrations')
        .insert([registrationData])
        .select()
        .single();

      if (error) throw error;
      
      // Sync to Google Sheets
      try {
        await fetch('/api/sync-to-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            registration: insertedData
          })
        });
      } catch (sheetError) {
        console.error("Google Sheets sync failed:", sheetError);
      }

      alert("মেম্বার সফলভাবে অ্যাড করা হয়েছে!");
      onClose();
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'registrations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert("ইমেজ সাইজ ৫০০KB এর নিচে হতে হবে।");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('photoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800">নতুন মেম্বার অ্যাড করুন</h2>
            <p className="text-slate-500 font-medium">ম্যানুয়ালি মেম্বার ইনফরমেশন দিন</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <form id="manual-add-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="পূর্ণ নাম" icon={<UserIcon size={18} />}>
                <input 
                  {...register('name', { required: "নাম আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.name ? "border-red-500" : "border-slate-200")}
                  placeholder="যেমন: মোঃ আব্দুল করিম"
                />
              </FormField>

              <FormField label="পিতার নাম" icon={<UserIcon size={18} />}>
                <input 
                  {...register('fatherName', { required: "পিতার নাম আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.fatherName ? "border-red-500" : "border-slate-200")}
                  placeholder="যেমন: মোঃ রহিম উদ্দিন"
                />
              </FormField>

              <FormField label="বর্তমান ঠিকানা" icon={<MapPin size={18} />}>
                <input 
                  {...register('address', { required: "ঠিকানা আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.address ? "border-red-500" : "border-slate-200")}
                  placeholder="যেমন: ঢাকা, বাংলাদেশ"
                />
              </FormField>

              <FormField label="লিঙ্গ" icon={<Users size={18} />}>
                <select 
                  {...register('gender', { required: "লিঙ্গ নির্বাচন করুন" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.gender ? "border-red-500" : "border-slate-200")}
                >
                  <option value="">নির্বাচন করুন</option>
                  <option value="Male">পুরুষ</option>
                  <option value="Female">মহিলা</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </FormField>

              <FormField label="এসএসসি ব্যাচ" icon={<Calendar size={18} />}>
                <select 
                  {...register('sscBatch', { required: "ব্যাচ আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.sscBatch ? "border-red-500" : "border-slate-200")}
                >
                  <option value="">ব্যাচ নির্বাচন করুন</option>
                  {Array.from({ length: 2030 - 1993 + 1 }, (_, i) => 1993 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="ইমেইল" icon={<Mail size={18} />}>
                <input 
                  {...register('email', { required: "ইমেইল আবশ্যক", pattern: { value: /^\S+@\S+$/i, message: "সঠিক ইমেইল দিন" } })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.email ? "border-red-500" : "border-slate-200")}
                  placeholder="example@mail.com"
                />
              </FormField>

              <FormField label="ফোন নম্বর" icon={<Phone size={18} />}>
                <input 
                  {...register('phone', { required: "ফোন নম্বর আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.phone ? "border-red-500" : "border-slate-200")}
                  placeholder="01XXXXXXXXX"
                />
              </FormField>

              <FormField label="রক্তের গ্রুপ" icon={<Droplet size={18} />}>
                <select 
                  {...register('bloodGroup', { required: "রক্তের গ্রুপ আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.bloodGroup ? "border-red-500" : "border-slate-200")}
                >
                  <option value="">নির্বাচন করুন</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="পেশা" icon={<Briefcase size={18} />}>
                <input 
                  {...register('occupation', { required: "পেশা আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.occupation ? "border-red-500" : "border-slate-200")}
                  placeholder="যেমন: ইঞ্জিনিয়ার"
                />
              </FormField>

              <FormField label="টি-শার্ট সাইজ" icon={<Shirt size={18} />}>
                <select 
                  {...register('tshirtSize', { required: "সাইজ আবশ্যক" })}
                  className={cn("w-full px-5 py-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold", errors.tshirtSize ? "border-red-500" : "border-slate-200")}
                >
                  <option value="">নির্বাচন করুন</option>
                  {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="অতিথি সংখ্যা" icon={<Users size={18} />}>
                <input 
                  type="number"
                  {...register('guests', { min: 0 })}
                  defaultValue={0}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold"
                />
              </FormField>

              <FormField label="ছবি আপলোড" icon={<Upload size={18} />}>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </FormField>
            </div>
          </form>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">মোট ফি</p>
            <p className="text-3xl font-black text-[#2b59c3]">৳ {calculatedFee}</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 md:flex-none px-8 py-4 rounded-2xl border border-slate-200 font-black text-slate-600 hover:bg-slate-100 transition-all"
            >
              বাতিল
            </button>
            <button 
              form="manual-add-form"
              type="submit"
              disabled={isSubmitting}
              className="flex-1 md:flex-none px-12 py-4 bg-green-600 text-white rounded-2xl font-black text-lg hover:bg-green-700 hover:shadow-2xl hover:scale-105 transition-all shadow-xl shadow-green-100 disabled:opacity-50"
            >
              {isSubmitting ? "অ্যাড হচ্ছে..." : "অ্যাড করুন"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AdminDashboard({ settings }: { settings: AppSettings }) {
  const [activeTab, setActiveTab] = useState<'registrations' | 'settings'>('registrations');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [selectedRegistrant, setSelectedRegistrant] = useState<Registration | null>(null);

  // Settings form state
  const [newName, setNewName] = useState(settings.reunionName);
  const [guestFeeEnabled, setGuestFeeEnabled] = useState(settings.guestFeeEnabled);
  const [guestFeeAmount, setGuestFeeAmount] = useState(settings.guestFeeAmount);
  const [adminEmails, setAdminEmails] = useState<string[]>(settings.adminEmails || [ADMIN_EMAIL]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    setNewName(settings.reunionName);
    setGuestFeeEnabled(settings.guestFeeEnabled);
    setGuestFeeAmount(settings.guestFeeAmount);
    setAdminEmails(settings.adminEmails || [ADMIN_EMAIL]);
  }, [settings]);


  useEffect(() => {
    const fetchRegistrations = async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (data) {
        setRegistrations(data);
      }
      setLoading(false);
    };

    fetchRegistrations();

    const channel = supabase
      .channel('registrations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRegistrations(prev => [payload.new as Registration, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setRegistrations(prev => prev.map(reg => reg.id === payload.new.id ? payload.new as Registration : reg));
        } else if (payload.eventType === 'DELETE') {
          setRegistrations(prev => prev.filter(reg => reg.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredData = useMemo(() => {
    return registrations.filter(reg => {
      const matchesSearch = reg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           reg.phone.includes(searchTerm);
      const matchesBatch = batchFilter === '' || reg.sscBatch === batchFilter;
      return matchesSearch && matchesBatch;
    });
  }, [registrations, searchTerm, batchFilter]);

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      confirmed: registrations.filter(r => r.status === 'Confirmed').length,
      totalFee: registrations.reduce((acc, curr) => acc + (curr.fee || 0), 0)
    };
  }, [registrations]);

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    const title = "Motirhat High School Reunion Registration List";
    const batchInfo = batchFilter ? `Batch: ${batchFilter}` : "All Batches";
    
    const sortedData = [...filteredData].sort((a, b) => parseInt(a.sscBatch) - parseInt(b.sscBatch));

    const tableData = sortedData.map((reg, index) => [
      index + 1,
      reg.name,
      reg.sscBatch,
      reg.phone,
      reg.bloodGroup || "N/A",
      reg.occupation || "N/A",
      reg.guests || 0,
      `${reg.fee} BDT`,
      reg.status
    ]);

    autoTable(doc, {
      head: [['SL', 'Name', 'Batch', 'Phone', 'Blood', 'Occupation', 'Guests', 'Fee', 'Status']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [43, 89, 195], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didDrawPage: (data: any) => {
        doc.setFontSize(16);
        doc.setTextColor(43, 89, 195);
        doc.text(title, data.settings.margin.left, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${batchInfo} | Date: ${new Date().toLocaleDateString()}`, data.settings.margin.left, 22);
        
        const str = "Page " + doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    const fileName = batchFilter ? `registration_list_batch_${batchFilter}.pdf` : `registration_list_all.pdf`;
    doc.save(fileName);
  };

  const downloadSinglePDF = (reg: Registration) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(43, 89, 195);
    // Using a fallback if reunionName contains Bengali
    const headerText = "School Reunion 2026";
    doc.text(headerText, 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text("Registration Details", 105, 30, { align: 'center' });
    
    // Content
    doc.setFontSize(12);
    doc.setTextColor(0);
    
    const startY = 50;
    const lineHeight = 10;
    
    doc.text(`Name: ${reg.name}`, 20, startY);
    doc.text(`Email: ${reg.email}`, 20, startY + lineHeight);
    doc.text(`Phone: ${reg.phone}`, 20, startY + lineHeight * 2);
    doc.text(`SSC Batch: ${reg.sscBatch}`, 20, startY + lineHeight * 3);
    doc.text(`Guests: ${reg.guests || 0}`, 20, startY + lineHeight * 4);
    doc.text(`Total Fee: ${reg.fee} BDT`, 20, startY + lineHeight * 5);
    doc.text(`Status: ${reg.status}`, 20, startY + lineHeight * 6);
    doc.text(`Date: ${reg.createdAt ? new Date(reg.createdAt.seconds * 1000).toLocaleString() : 'N/A'}`, 20, startY + lineHeight * 7);
    
    doc.save(`registration_${reg.name.replace(/[^\x00-\x7F]/g, "") || 'user'}.pdf`);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const deleteRegistration = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই রেজিস্ট্রেশনটি ডিলিট করতে চান?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `registrations/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          id: 'config',
          reunionName: newName,
          guestFeeEnabled,
          guestFeeAmount: Number(guestFeeAmount),
          adminEmails
        });
      
      if (error) throw error;
      alert("সেটিংস সফলভাবে আপডেট করা হয়েছে!");
    } catch (error) {
      handleSupabaseError(error, OperationType.WRITE, 'settings/config');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSecurity = async () => {
    if (!newEmail && !newPassword) return;
    setIsUpdatingSecurity(true);
    try {
      const updates: any = {};
      if (newEmail) updates.email = newEmail;
      if (newPassword) updates.password = newPassword;

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      alert("সিকিউরিটি সেটিংস সফলভাবে আপডেট করা হয়েছে!");
      setNewEmail('');
      setNewPassword('');
    } catch (error: any) {
      alert("আপডেট করতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('registrations')}
          className={cn(
            "px-6 py-3 font-black text-sm transition-all border-b-4",
            activeTab === 'registrations' ? "border-[#2b59c3] text-[#2b59c3]" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          রেজিস্ট্রেশন তালিকা
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "px-6 py-3 font-black text-sm transition-all border-b-4",
            activeTab === 'settings' ? "border-[#2b59c3] text-[#2b59c3]" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          সেটিংস
        </button>
      </div>

      {activeTab === 'registrations' ? (
        <>
          {showManualAdd && (
            <ManualAddModal 
              onClose={() => setShowManualAdd(false)} 
              settings={settings}
            />
          )}
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="মোট রেজিস্ট্রেশন" value={stats.total} icon={<Users />} color="#2b59c3" />
            <StatCard title="নিশ্চিত হয়েছে" value={stats.confirmed} icon={<CheckCircle />} color="#4caf50" />
            <StatCard title="মোট সংগৃহীত ফি" value={`৳ ${stats.totalFee}`} icon={<Droplet />} color="#e91e63" />
          </div>

          {/* Controls */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#2b59c3] w-full md:w-72 transition-all"
                />
              </div>
              <select 
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#2b59c3] bg-white transition-all"
              >
                <option value="">সকল ব্যাচ</option>
                {Array.from({ length: 2030 - 1993 + 1 }, (_, i) => 1993 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => window.print()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-600 font-bold"
              >
                <Printer size={18} />
                প্রিন্ট
              </button>
              <button 
                onClick={() => setShowManualAdd(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-100"
              >
                <Plus size={18} />
                ম্যানুয়াল অ্যাড
              </button>
              <button 
                onClick={exportPDF}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#2b59c3] text-white hover:bg-[#1a237e] transition-all font-bold shadow-lg shadow-blue-100"
              >
                <Download size={18} />
                PDF ডাউনলোড
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-sm font-black text-slate-500 uppercase tracking-wider">নাম</th>
                    <th className="px-8 py-5 text-sm font-black text-slate-500 uppercase tracking-wider">ব্যাচ</th>
                    <th className="px-8 py-5 text-sm font-black text-slate-500 uppercase tracking-wider">ফোন</th>
                    <th className="px-8 py-5 text-sm font-black text-slate-500 uppercase tracking-wider">ফি</th>
                    <th className="px-8 py-5 text-sm font-black text-slate-500 uppercase tracking-wider">অতিথি</th>
                    <th className="px-8 py-5 text-sm font-black text-slate-500 uppercase tracking-wider">স্ট্যাটাস</th>
                    <th className="px-8 py-5 text-sm font-black text-slate-500 uppercase tracking-wider">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-16 text-center text-slate-400">লোড হচ্ছে...</td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-16 text-center text-slate-400 font-medium">কোন তথ্য পাওয়া যায়নি</td>
                    </tr>
                  ) : (
                    filteredData.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setSelectedRegistrant(reg)}
                              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#2b59c3]/10 hover:text-[#2b59c3] transition-all overflow-hidden border border-slate-200"
                            >
                              {reg.photoUrl ? (
                                <img src={reg.photoUrl} alt={reg.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <UserIcon size={20} />
                              )}
                            </button>
                            <div>
                              <div className="font-black text-slate-800 group-hover:text-[#2b59c3] transition-colors cursor-pointer" onClick={() => setSelectedRegistrant(reg)}>{reg.name}</div>
                              <div className="text-xs text-slate-400 font-medium">{reg.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-600 font-bold">{reg.sscBatch}</td>
                        <td className="px-8 py-5 text-sm text-slate-600 font-medium">{reg.phone}</td>
                        <td className="px-8 py-5 text-sm font-black text-[#2b59c3]">৳ {reg.fee}</td>
                        <td className="px-8 py-5 text-sm text-slate-600 font-bold">{reg.guests}</td>
                        <td className="px-8 py-5">
                          <select 
                            value={reg.status}
                            onChange={(e) => updateStatus(reg.id, e.target.value)}
                            className={cn(
                              "text-xs font-black px-4 py-1.5 rounded-full border-none outline-none cursor-pointer shadow-sm transition-all",
                              reg.status === 'Confirmed' ? "bg-[#4caf50]/10 text-[#4caf50] hover:bg-[#4caf50]/20" : 
                              reg.status === 'Cancelled' ? "bg-[#e91e63]/10 text-[#e91e63] hover:bg-[#e91e63]/20" : 
                              "bg-[#ffc107]/10 text-[#ffc107] hover:bg-[#ffc107]/20"
                            )}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => downloadSinglePDF(reg)}
                              className="p-2.5 text-slate-300 hover:text-[#2b59c3] hover:bg-[#2b59c3]/5 rounded-xl transition-all"
                              title="PDF ডাউনলোড"
                            >
                              <Download size={20} />
                            </button>
                            {deletingId === reg.id ? (
                              <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-200">
                                <button 
                                  onClick={() => deleteRegistration(reg.id)}
                                  className="px-3 py-1 bg-[#e91e63] text-white text-[10px] font-black rounded-lg hover:bg-red-600 transition-all shadow-sm"
                                >
                                  ডিলিট
                                </button>
                                <button 
                                  onClick={() => setDeletingId(null)}
                                  className="px-3 py-1 bg-white text-slate-400 text-[10px] font-black rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
                                >
                                  বাতিল
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setDeletingId(reg.id)}
                                className="p-2.5 text-slate-300 hover:text-[#e91e63] hover:bg-[#e91e63]/5 rounded-xl transition-all"
                                title="ডিলিট করুন"
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AnimatePresence>
            {selectedRegistrant && (
              <RegistrantDetailsModal 
                registrant={selectedRegistrant} 
                onClose={() => setSelectedRegistrant(null)} 
              />
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="max-w-2xl bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
          <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-[#2b59c3]">
              <SettingsIcon size={24} />
            </div>
            অ্যাপ সেটিংস
          </h3>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700 ml-1">রি-ইউনিয়ন নাম</label>
              <input 
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold"
                placeholder="রি-ইউনিয়ন নাম লিখুন"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 ml-1">গেস্ট ফি সিস্টেম</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setGuestFeeEnabled(!guestFeeEnabled)}
                    className={cn(
                      "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none",
                      guestFeeEnabled ? "bg-[#4caf50]" : "bg-slate-200"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-6 w-6 transform rounded-full bg-white transition-transform",
                      guestFeeEnabled ? "translate-x-7" : "translate-x-1"
                    )} />
                  </button>
                  <span className="text-sm font-bold text-slate-600">
                    {guestFeeEnabled ? "চালু আছে" : "বন্ধ আছে"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 ml-1">প্রতি গেস্ট ফি (৳)</label>
                <input 
                  type="number"
                  value={guestFeeAmount}
                  onChange={(e) => setGuestFeeAmount(Number(e.target.value))}
                  disabled={!guestFeeEnabled}
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold disabled:opacity-50"
                  placeholder="৫০০"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700 ml-1">এডমিন ইমেইলসমূহ</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input 
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#2b59c3] transition-all font-bold text-sm"
                    placeholder="নতুন এডমিন ইমেইল লিখুন"
                  />
                  <button 
                    onClick={() => {
                      if (newAdminEmail && !adminEmails.includes(newAdminEmail)) {
                        setAdminEmails([...adminEmails, newAdminEmail]);
                        setNewAdminEmail('');
                      }
                    }}
                    className="px-6 py-3 bg-[#2b59c3] text-white rounded-2xl font-black text-sm hover:bg-[#1a237e] transition-all"
                  >
                    যোগ করুন
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {adminEmails.map(email => (
                    <div key={email} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">{email}</span>
                      {email !== ADMIN_EMAIL && (
                        <button 
                          onClick={() => setAdminEmails(adminEmails.filter(e => e !== email))}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-8" />

            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-50 text-red-600">
                <AlertCircle size={20} />
              </div>
              সিকিউরিটি সেটিংস
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 ml-1">লগইন ইমেইল পরিবর্তন</label>
                <input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm"
                  placeholder="নতুন লগইন ইমেইল"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-700 ml-1">পাসওয়ার্ড পরিবর্তন</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm"
                  placeholder="নতুন পাসওয়ার্ড"
                />
              </div>
            </div>

            <button 
              onClick={updateSecurity}
              disabled={isUpdatingSecurity || (!newEmail && !newPassword)}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
            >
              {isUpdatingSecurity ? "আপডেট হচ্ছে..." : "লগইন তথ্য আপডেট করুন"}
            </button>

            <div className="h-px bg-slate-100 my-8" />
            
            <button 
              onClick={saveSettings}
              disabled={isSaving}
              className="w-full py-5 bg-gradient-to-r from-[#2b59c3] to-[#1a237e] text-white rounded-2xl font-black text-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 disabled:scale-100"
            >
              {isSaving ? "সেভ হচ্ছে..." : "অ্যাপ সেটিংস সেভ করুন"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6 group hover:scale-[1.02] transition-all">
      <div className="p-5 rounded-3xl shadow-inner" style={{ backgroundColor: `${color}15`, color }}>
        {React.cloneElement(icon as React.ReactElement, { size: 32 })}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-black uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function RegistrantDetailsModal({ registrant, onClose }: { registrant: Registration, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2b59c3] flex items-center justify-center overflow-hidden border-2 border-white shadow-lg">
              {registrant.photoUrl ? (
                <img src={registrant.photoUrl} alt={registrant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={32} />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">{registrant.name}</h2>
              <p className="text-[#2b59c3] font-black text-sm uppercase tracking-widest">ব্যাচ: {registrant.sscBatch}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-200 rounded-2xl transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DetailItem label="পিতার নাম" value={registrant.fatherName} icon={<UserIcon size={18} />} />
            <DetailItem label="ফোন নম্বর" value={registrant.phone} icon={<Phone size={18} />} />
            <DetailItem label="ইমেইল" value={registrant.email} icon={<Mail size={18} />} />
            <DetailItem label="রক্তের গ্রুপ" value={registrant.bloodGroup} icon={<Droplet size={18} />} />
            <DetailItem label="পেশা" value={registrant.occupation} icon={<Briefcase size={18} />} />
            <DetailItem label="লিঙ্গ" value={registrant.gender} icon={<Users size={18} />} />
            <DetailItem label="টি-শার্ট সাইজ" value={registrant.tshirtSize} icon={<Shirt size={18} />} />
            <DetailItem label="অতিথি সংখ্যা" value={registrant.guests} icon={<Users size={18} />} />
            <DetailItem label="ঠিকানা" value={registrant.address} icon={<MapPin size={18} />} className="md:col-span-2" />
            <DetailItem label="ফেসবুক লিঙ্ক" value={registrant.facebookLink} icon={<Facebook size={18} />} className="md:col-span-2" />
            
            <div className="md:col-span-2 p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">মোট ফি</p>
                <p className="text-2xl font-black text-[#2b59c3]">৳ {registrant.fee}</p>
              </div>
              <div className={cn(
                "px-6 py-2 rounded-2xl font-black text-sm uppercase tracking-widest shadow-sm",
                registrant.status === 'Confirmed' ? "bg-green-100 text-green-600" : 
                registrant.status === 'Cancelled' ? "bg-red-100 text-red-600" : 
                "bg-amber-100 text-amber-600"
              )}>
                {registrant.status}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
          >
            বন্ধ করুন
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailItem({ label, value, icon, className }: { label: string, value: string | number, icon: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
        <span className="text-[#2b59c3]">{icon}</span>
        {label}
      </p>
      <p className="text-slate-800 font-bold text-lg">{value || "N/A"}</p>
    </div>
  );
}


