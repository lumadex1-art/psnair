
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Wrapper component to use Suspense
function ActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resetting'>('loading');
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  useEffect(() => {
    if (!mode || !actionCode) {
      setStatus('error');
      setMessage('Parameter tidak valid. Silakan coba lagi.');
      return;
    }

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            await applyActionCode(auth, actionCode);
            setStatus('success');
            setMessage('Verifikasi email berhasil! Akun Anda kini aktif. Anda akan diarahkan ke halaman login.');
            setTimeout(() => router.push('/'), 5000);
            break;
            
          case 'resetPassword':
            await verifyPasswordResetCode(auth, actionCode);
            setStatus('resetting');
            setMessage('Verifikasi berhasil. Silakan masukkan kata sandi baru Anda.');
            break;
            
          default:
            setStatus('error');
            setMessage('Tindakan tidak didukung.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Terjadi kesalahan. Tautan mungkin telah kedaluwarsa.');
      }
    };

    handleAction();
  }, [mode, actionCode, router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
        setStatus('error');
        setMessage('Kata sandi tidak cocok. Silakan coba lagi.');
        return;
    }
    if (!actionCode) return;

    setStatus('loading');
    try {
        await confirmPasswordReset(auth, actionCode, newPassword);
        setStatus('success');
        setMessage('Kata sandi Anda telah berhasil direset. Silakan login dengan kata sandi baru Anda.');
    } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Gagal mereset kata sandi.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground">Memproses permintaan Anda...</p>
          </div>
        );
      case 'success':
        return (
          <Alert variant="default" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300">Berhasil!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              {message}
            </AlertDescription>
            <div className="mt-4">
                <Link href="/">
                    <Button className="w-full">Ke Halaman Login</Button>
                </Link>
            </div>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {message}
            </AlertDescription>
             <div className="mt-4">
                <Link href="/">
                    <Button variant="destructive" className="w-full">Kembali ke Beranda</Button>
                </Link>
            </div>
          </Alert>
        );
      case 'resetting':
         return (
            <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">Kata Sandi Baru</Label>
                    <Input 
                        id="new-password" 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</Label>
                    <Input 
                        id="confirm-password" 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>
                <Button type="submit" className="w-full">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Kata Sandi
                </Button>
            </form>
         )
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
        <CardHeader className="text-center space-y-4">
           <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                <Image src="/pp.svg" alt='logo' width={36} height={36}/>
            </div>
          <CardTitle className="text-2xl">Pusat Aksi Akun</CardTitle>
          <CardDescription>{message || 'Memvalidasi tindakan Anda...'}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthActionPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ActionHandler />
        </Suspense>
    )
}
