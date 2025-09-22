
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, ExternalLink, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Presale tokens with external links
const presaleTokens = [
  {
    id: 'psn',
    name: 'PSN Token',
    symbol: 'PSN',
    description: 'Native token of PSNChain ecosystem with governance and utility features.',
    logo: '/pp.svg',
    gradient: 'from-blue-500 to-purple-600',
    status: 'active',
    features: ['Governance Rights', 'Staking Rewards', 'Fee Discounts', 'Exclusive Access'],
    presaleUrl: 'https://psnchain.com/presale',
    isMainToken: true
  },
  {
    id: 'brics',
    name: 'BRICS Token',
    symbol: 'BRICS',
    description: 'Multi-national economic alliance token for cross-border transactions.',
    logo: '/br.png',
    gradient: 'from-green-500 to-emerald-600',
    status: 'active',
    features: ['Cross-border Payments', 'Trade Finance', 'Yield Farming', 'DAO Voting'],
    presaleUrl: 'https://bricstoken.live'
  },
  {
    id: 'lumadex',
    name: 'LumaDEX',
    symbol: 'LUMA',
    description: 'Decentralized exchange token with automated market making features.',
    logo: '/luma.svg',
    gradient: 'from-yellow-500 to-orange-600',
    status: 'active',
    features: ['LP Rewards', 'Trading Fee Share', 'Governance', 'Yield Optimization'],
    presaleUrl: 'https://lumadex.com/presale'
  },
  {
    id: 'blc',
    name: 'Blocoin',
    symbol: 'BLC',
    description: 'Investment fund token for blockchain and DeFi project funding.',
    logo: '/bb.png',
    gradient: 'from-purple-500 to-pink-600',
    status: 'active',
    features: ['Fund Returns', 'Project Access', 'Premium Analytics', 'Early Investments'],
    presaleUrl: 'https://blocoin.io'
  }
];

export default function LaunchpadPage() {
  const { toast } = useToast();

  const handleVisitPresale = (presaleUrl: string, tokenName: string) => {
    // Open presale link in new tab
    window.open(presaleUrl, '_blank');
    
    toast({
      title: 'Redirecting to Presale',
      description: `Opening ${tokenName} presale page in new tab.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      <div className="absolute top-4 left-4 z-20">
        <Link href="/claim">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(120,119,198,0.1),transparent)] pointer-events-none" />
      
      <div className="relative z-10 space-y-8 px-4 pb-6 max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="text-center space-y-6 pt-16">
          {/* Token Logos Section */}
          <div className="flex items-center justify-center gap-6 mb-6">
            {/* LOBSTER Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-500 p-1 shadow-lg">
                <Image
                  src="/lobster.png"
                  alt="LOBSTER Token"
                  width={52}
                  height={52}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">LOBSTER</span>
            </div>

            {/* PSN Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-1 shadow-lg">
                <Image
                  src="/pp.svg"
                  alt="PSN Token"
                  width={52}
                  height={52}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">PSN</span>
            </div>

            {/* EPSN Token */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 p-1 shadow-lg">
                <Image
                  src="/epsn.png"
                  alt="EPSN Token"
                  width={52}
                  height={52}
                  className="rounded-full object-cover"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">EPSN</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold text-primary">PSNChain Launchpad</span>
          </div>
          
          <div className="space-y-3">
            <h1 className="font-headline text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Token Presales
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Invest early in promising tokens on PSNChain ecosystem
            </p>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center p-3 bg-accent/30 rounded-lg">
              <p className="text-xl font-bold text-primary">4</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Projects</p>
            </div>
            <div className="text-center p-3 bg-accent/30 rounded-lg">
              <p className="text-xl font-bold text-green-500">Live</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Presales</p>
            </div>
            <div className="text-center p-3 bg-accent/30 rounded-lg">
              <p className="text-xl font-bold text-orange-500">Active</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Community</p>
            </div>
          </div>
        </div>

        {/* Featured Token - PSN */}
        {presaleTokens.filter(token => token.isMainToken).map((token) => (
          <Card key={token.id} className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
            <CardHeader className="relative pb-4">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold px-3 py-1 animate-pulse">
                  ⭐ FEATURED PRESALE
                </Badge>
                <Badge variant="secondary" className="font-medium">
                  {token.status === 'active' ? '🟢 LIVE' : '🟡 COMING SOON'}
                </Badge>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/20 rounded-full blur-lg" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-xl overflow-hidden">
                    <Image
                      src={token.logo}
                      alt={`${token.name} Logo`}
                      width={56}
                      height={56}
                      className="rounded-full object-cover"
                    />
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-bold">{token.name}</CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">{token.symbol}</Badge>
                  </div>
                  <CardDescription className="text-base">
                    {token.description}
                  </CardDescription>
                </div>
                
                <div className="text-right space-y-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-sm" />
                    <div className="relative bg-gradient-to-br from-background/80 to-background/60 p-3 rounded-lg border border-border/50">
                      <p className="font-headline text-lg font-bold text-primary">
                        Visit Presale
                      </p>
                      <p className="text-xs text-muted-foreground">External Link</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              {/* Features */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  Key Features
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {token.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-accent/30 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Visit Presale Button */}
              <Button 
                onClick={() => handleVisitPresale(token.presaleUrl, token.name)}
                className="w-full h-14 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-bold text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-6 w-6" />
                  <span>Visit {token.symbol} Presale</span>
                  <div className="ml-2 px-2 py-1 bg-primary-foreground/20 rounded-full">
                    <span className="text-xs font-bold">LIVE</span>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Other Tokens */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Other Presales</h2>
            <p className="text-muted-foreground">Explore more opportunities in PSNChain ecosystem</p>
          </div>
          
          <div className="grid gap-6">
            {presaleTokens.filter(token => !token.isMainToken).map((token) => (
              <Card key={token.id} className="border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge 
                      variant={token.status === 'active' ? 'default' : 'secondary'}
                      className={cn(
                        'font-semibold',
                        token.status === 'active' && 'bg-green-500 text-white',
                        token.status === 'coming-soon' && 'bg-orange-500 text-white'
                      )}
                    >
                      {token.status === 'active' ? '🟢 LIVE' : '🟡 COMING SOON'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className={cn("w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg overflow-hidden", token.gradient)}>
                        <Image
                          src={token.logo}
                          alt={`${token.name} Logo`}
                          width={44}
                          height={44}
                          className="rounded-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold">{token.name}</CardTitle>
                        <Badge variant="outline" className="text-xs font-mono">{token.symbol}</Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {token.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Features Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {token.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Visit Presale Button */}
                  <Button 
                    onClick={() => handleVisitPresale(token.presaleUrl, token.name)}
                    disabled={token.status !== 'active'}
                    className={cn(
                      "w-full h-12 font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]",
                      token.status === 'active' 
                        ? `bg-gradient-to-r ${token.gradient} text-white shadow-lg hover:shadow-xl` 
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {token.status === 'active' ? (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <span>Visit {token.symbol} Presale</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        <span>Coming Soon</span>
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="text-center space-y-4 pt-6">
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm font-medium text-primary mb-2">🚀 Early Investment Opportunity</p>
            <p className="text-xs text-muted-foreground">
              All presales are conducted on external platforms. Click the buttons above to visit each project's official presale page.
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Powered by PSNChain • Secure • Transparent • Decentralized
          </p>
        </div>
      </div>
    </div>
  );
}
