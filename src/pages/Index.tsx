import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Users, Calendar, Shield, Target, Lightbulb, Sparkles,
  Lock, LayoutDashboard, UserCog, ClipboardList, CalendarDays,
  FileSpreadsheet, Palette, ChevronDown
} from "lucide-react";
import ImigrasiLogo from "@/components/ImigrasiLogo";

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

  const features = [
    {
      icon: Lock,
      title: "Autentikasi Admin",
      description: "Menjamin keamanan dan pembatasan akses sistem hanya untuk pengguna yang berwenang."
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard Monitoring",
      description: "Menampilkan ringkasan data cuti dan statistik pegawai secara real-time."
    },
    {
      icon: UserCog,
      title: "Manajemen Data Pegawai",
      description: "Pengelolaan data pegawai secara terpusat dan terstruktur."
    },
    {
      icon: ClipboardList,
      title: "Manajemen & Riwayat Cuti",
      description: "Pencatatan, pengaturan, dan pemantauan riwayat cuti dengan lengkap."
    },
    {
      icon: CalendarDays,
      title: "Manajemen Tahun Data",
      description: "Pengelompokan dan pengelolaan data berdasarkan periode tahun."
    },
    {
      icon: FileSpreadsheet,
      title: "Ekspor Laporan",
      description: "Unduh data cuti untuk kebutuhan administrasi dan pelaporan."
    },
    {
      icon: Palette,
      title: "Mode Tema",
      description: "Pengaturan tampilan terang dan gelap sesuai preferensi."
    }
  ];

  const goals = [
    "Sisa cuti tercatat secara otomatis dan akurat",
    "Data pengajuan terdokumentasi dengan baik",
    "Administrasi lebih tertib dan transparan",
    "Mendukung pengambilan keputusan kepegawaian yang akuntabel"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-golden/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-golden/10 rounded-full blur-3xl" />
        
        <div className="container relative mx-auto px-4 py-16 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-xl">
              <ImigrasiLogo size="lg" />
            </div>
          </div>

          {/* Title */}
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 font-baskerville text-golden drop-shadow-sm">
              MACAN
            </h1>
            <p className="text-xl md:text-2xl font-medium text-foreground max-w-2xl mx-auto mb-3">
              Manajemen Sistem Cuti Keimigrasian
            </p>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-2">
              Kantor Imigrasi Kelas I TPI Palembang
            </p>
          </div>

          {/* Tagline */}
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            Kelola cuti pegawai dengan mudah, efisien, dan terorganisir dalam satu platform terintegrasi
          </p>

          {/* CTA Button */}
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="px-10 py-7 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Shield className="w-5 h-5 mr-2" />
              Masuk sebagai Admin
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-baskerville">Tentang Sistem</h2>
            </div>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                <span className="font-semibold text-foreground">MACAN</span> adalah aplikasi berbasis web yang dikembangkan 
                untuk mendukung pengelolaan cuti pegawai secara digital dan terintegrasi di lingkungan 
                Kantor Imigrasi Kelas I TPI Palembang.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Sistem ini hadir sebagai solusi modern untuk menggantikan proses administrasi manual 
                maupun sistem sebelumnya yang belum optimal. Dengan MACAN, pencatatan cuti kini dapat 
                dilakukan secara lebih tertib, terdokumentasi dengan baik, dan mudah dipantau oleh 
                pihak yang berwenang. Pengelolaan data yang terstruktur memungkinkan pengambilan keputusan 
                kepegawaian menjadi lebih cepat dan akurat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-gradient-to-br from-golden/5 via-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-golden/20">
                    <Lightbulb className="w-6 h-6 text-golden" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold font-baskerville">Filosofi "MACAN"</h2>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  <span className="font-semibold text-foreground">MACAN</span> merupakan singkatan dari 
                  <span className="font-semibold text-primary"> Manajemen Sistem Cuti Keimigrasian</span>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Nama ini melambangkan <span className="font-semibold text-foreground">ketegasan, ketertiban, 
                  dan ketangkasan</span> dalam pengelolaan administrasi. Seperti karakter macan yang sigap 
                  dan waspada, sistem ini dirancang untuk memberikan pengelolaan cuti yang profesional, 
                  terkontrol, dan bertanggung jawab dalam setiap aspek administrasi kepegawaian.
                </p>
              </div>
              
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-64 h-64 rounded-full bg-gradient-to-br from-golden/20 to-primary/20 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-golden/30 to-primary/30 flex items-center justify-center">
                      <span className="text-7xl font-baskerville font-bold text-golden">M</span>
                    </div>
                  </div>
                  <div className="absolute -top-4 -right-4 p-3 rounded-full bg-primary/20 backdrop-blur-sm">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute -bottom-2 -left-2 p-3 rounded-full bg-golden/20 backdrop-blur-sm">
                    <Target className="w-8 h-8 text-golden" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Goals Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-success/20">
                <Target className="w-6 h-6 text-success" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-baskerville">Tujuan Pengembangan</h2>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Pengembangan MACAN bertujuan untuk memastikan pengelolaan cuti dilakukan secara 
              akurat, efisien, dan terkendali. Melalui sistem ini, berbagai aspek administrasi 
              kepegawaian dapat ditingkatkan:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {goals.map((goal, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="text-foreground pt-1">{goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-golden/5">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-baskerville mb-4">Fitur Sistem</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                MACAN dilengkapi dengan berbagai fitur yang dirancang untuk memudahkan 
                pengelolaan cuti pegawai secara menyeluruh
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="border-0 shadow-lg bg-card/80 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-3 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-card border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4 font-baskerville">Siap Mengelola Cuti?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Masuk ke sistem untuk mulai mengelola data cuti pegawai secara efisien
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Shield className="w-5 h-5 mr-2" />
            Masuk sebagai Admin
          </Button>
          
          <Separator className="my-10 max-w-md mx-auto" />
          
          <div className="flex items-center justify-center gap-3 mb-3">
            <ImigrasiLogo size="sm" />
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Kantor Imigrasi Kelas I TPI Palembang
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sistem Manajemen Cuti Keimigrasian
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
