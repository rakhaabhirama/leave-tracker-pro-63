import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Shield } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Sistem Manajemen Cuti
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Kelola cuti pegawai dengan mudah, efisien, dan terorganisir
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Data Pegawai</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Kelola data pegawai lengkap dengan NIP, departemen, dan jabatan
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Manajemen Cuti</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Tambah dan kurangi cuti dengan riwayat lengkap setiap perubahan
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-2">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Keamanan</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Hanya admin yang dapat mengakses dan mengelola data cuti
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="px-8 py-6 text-lg font-semibold"
          >
            Masuk sebagai Admin
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
