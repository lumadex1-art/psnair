'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, HelpCircle, Users, Gift, Clock, Share2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// QnA Data
const qnaData = [
  {
    id: 1,
    question: "Apa itu Airdrop e-PSN?",
    answer: "Airdrop e-PSN adalah program distribusi token gratis dari ekosistem PSNChain. Peserta dapat mengklaim token EPSN (Epsilon PSN) secara gratis setiap hari melalui platform ini. Token EPSN merupakan reward token yang dapat ditukar dengan PSN atau dikonversi ke nilai IDR.",
    icon: <Gift className="h-5 w-5" />,
    category: "Dasar"
  },
  {
    id: 2,
    question: "Bagaimana cara mendapatkan Airdrop e-PSN?",
    answer: "Untuk mendapatkan Airdrop e-PSN: 1) Daftar akun melalui Google atau email, 2) Verifikasi akun Anda, 3) Mulai klaim harian token EPSN, 4) Upgrade ke plan premium untuk lebih banyak klaim per hari, 5) Undang teman melalui sistem referral untuk bonus tambahan.",
    icon: <CheckCircle className="h-5 w-5" />,
    category: "Cara Kerja"
  },
  {
    id: 3,
    question: "Bagaimana cara klaim Airdrop e-PSN?",
    answer: "Proses klaim sangat mudah: 1) Login ke akun Anda, 2) Kunjungi halaman 'Claim', 3) Klik tombol 'Claim 10 EPSN Now', 4) Token akan langsung masuk ke balance Anda. Plan Free dapat klaim 1x per hari, sedangkan plan Premium bisa lebih sering sesuai tier yang dipilih.",
    icon: <HelpCircle className="h-5 w-5" />,
    category: "Cara Kerja"
  },
  {
    id: 4,
    question: "Apa saja tugas peserta Airdrop?",
    answer: "Tugas peserta meliputi: 1) Klaim harian token EPSN secara konsisten, 2) Mengundang teman melalui kode referral, 3) Berpartisipasi dalam komunitas PSNChain, 4) Mengikuti update dan pengumuman resmi, 5) Menjaga akun tetap aktif selama program berlangsung.",
    icon: <Users className="h-5 w-5" />,
    category: "Persyaratan"
  },
  {
    id: 5,
    question: "Siapa saja yang bisa mendapatkan Airdrop e-PSN?",
    answer: "Semua orang dapat berpartisipasi dalam Airdrop e-PSN tanpa batasan geografis. Syarat utama: 1) Memiliki akun yang terverifikasi, 2) Berusia minimal 18 tahun, 3) Tidak melakukan aktivitas spam atau bot, 4) Mematuhi terms of service platform, 5) Memiliki wallet yang kompatibel untuk withdrawal.",
    icon: <Users className="h-5 w-5" />,
    category: "Persyaratan"
  },
  {
    id: 6,
    question: "Sampai kapan program Airdrop e-PSN berlangsung?",
    answer: "Program Airdrop e-PSN berjalan dalam fase yang berkelanjutan. Fase pertama berlangsung hingga mencapai target distribusi tertentu. Tim akan mengumumkan perpanjangan atau fase berikutnya melalui channel resmi. Peserta yang sudah terdaftar akan mendapat prioritas untuk fase selanjutnya.",
    icon: <Clock className="h-5 w-5" />,
    category: "Timeline"
  },
  {
    id: 7,
    question: "Apa itu Referral dalam Airdrop?",
    answer: "Sistem Referral memungkinkan Anda mengundang teman dan mendapat bonus. Ketika teman mendaftar dengan kode referral Anda: 1) Anda mendapat bonus EPSN, 2) Teman juga mendapat bonus selamat datang, 3) Bonus bertambah setiap teman yang aktif klaim, 4) Tidak ada batas maksimal referral.",
    icon: <Share2 className="h-5 w-5" />,
    category: "Referral"
  },
  {
    id: 8,
    question: "Siapa saja yang berhak mendapatkan kode referral?",
    answer: "Semua peserta yang sudah terdaftar dan terverifikasi otomatis mendapat kode referral unik. Kode ini dapat ditemukan di halaman 'Referral' setelah login. Kode referral dapat dibagikan melalui media sosial, chat, atau cara lainnya. Semakin aktif Anda mengundang, semakin besar reward yang didapat.",
    icon: <Share2 className="h-5 w-5" />,
    category: "Referral"
  }
];

const categories = ["Semua", "Dasar", "Cara Kerja", "Persyaratan", "Timeline", "Referral"];

export default function QnAPage() {
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const filteredQnA = selectedCategory === "Semua" 
    ? qnaData 
    : qnaData.filter(item => item.category === selectedCategory);

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="relative z-10 space-y-8 px-4 pb-6">
        {/* Header Section */}
        <div className="text-center space-y-6 pt-6">
          {/* Token Logos Section */}
          <div className="flex items-center justify-center gap-6 mb-6">
            {/* EPSN Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 p-1 shadow-lg">
                <Image
                  src="/epsn.png"
                  alt="EPSN Token"
                  width={60}
                  height={60}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">EPSN</span>
            </div>

            {/* PSN Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-1 shadow-lg">
                <Image
                  src="/pp.svg"
                  alt="PSN Token"
                  width={60}
                  height={60}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">PSN</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
            <HelpCircle className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold text-primary">Frequently Asked Questions</span>
          </div>
          
          <div className="space-y-3">
            <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              QnA Airdrop e-PSN
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Temukan jawaban untuk pertanyaan umum seputar program Airdrop e-PSN
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "transition-all duration-200",
                selectedCategory === category 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "hover:bg-primary/10"
              )}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="text-center p-3 bg-accent/30 rounded-lg">
            <p className="text-xl font-bold text-primary">{qnaData.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pertanyaan</p>
          </div>
          <div className="text-center p-3 bg-accent/30 rounded-lg">
            <p className="text-xl font-bold text-green-500">Live</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Support</p>
          </div>
          <div className="text-center p-3 bg-accent/30 rounded-lg">
            <p className="text-xl font-bold text-orange-500">24/7</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p>
          </div>
        </div>

        {/* QnA List */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {filteredQnA.map((item) => {
            const isExpanded = expandedItems.includes(item.id);
            
            return (
              <Card 
                key={item.id} 
                className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <CardHeader 
                  className="cursor-pointer hover:bg-accent/30 transition-colors duration-200"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                        {item.icon}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">#{item.id}</span>
                        </div>
                        <CardTitle className="text-lg font-semibold text-left">
                          {item.question}
                        </CardTitle>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 ml-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}>
                        <ChevronDown className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0 pb-6 px-6">
                    <div className="ml-14 space-y-4">
                      <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
                      <div className="bg-gradient-to-br from-muted/30 to-muted/20 p-4 rounded-lg">
                        <p className="text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Contact Support */}
        <div className="text-center space-y-4 pt-6">
          <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-foreground mb-2">Masih ada pertanyaan?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tim support kami siap membantu Anda 24/7 melalui berbagai channel komunikasi.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm" className="bg-background/50">
                <Users className="h-4 w-4 mr-2" />
                Join Community
              </Button>
              <Button variant="outline" size="sm" className="bg-background/50">
                <HelpCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Powered by PSNChain • Updated Daily • Community Driven
          </p>
        </div>
      </div>
    </div>
  );
}
