import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import ImigrasiLogo from '@/components/ImigrasiLogo';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Format email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" })
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signOut, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (isAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }

    toast({
      title: "Akses Ditolak",
      description: `Akun ${user.email ?? ''} tidak memiliki akses admin.`,
      variant: "destructive",
    });
    signOut();
  }, [user, isAdmin, loading, navigate, toast, signOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Error",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Login Gagal",
          description: error.message === "Invalid login credentials"
            ? "Email atau password salah"
            : error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Login Berhasil",
          description: "Memverifikasi akses..."
        });
        // Redirect akan dilakukan oleh useEffect setelah status admin terverifikasi.
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto">
            <ImigrasiLogo size="md" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Sistem Manajemen Cuti</CardTitle>
            <CardDescription className="mt-2">
              Kementerian Imigrasi dan Pemasyarakatan RI
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Hubungi administrator untuk mendapatkan akun
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
