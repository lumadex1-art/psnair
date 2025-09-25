
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { presaleSeeds } from '@/lib/seeds';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PresalePage() {
  const items = [...presaleSeeds]
    .filter((p) => p.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="relative space-y-6 px-4 pb-8">
       <div className="absolute top-4 left-4 z-20">
        <Link href="/claim">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="text-center pt-16">
        <h1 className="font-headline text-3xl font-bold">Presale Links</h1>
        <p className="text-muted-foreground">Kumpulan tautan presale: PSNChain, LumaDex, BRISC, BLC.</p>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {items.map((p) => (
          <Card key={p.slug} className="bg-secondary/30 border-primary/10">
            <CardHeader>
              <CardTitle>{p.title}</CardTitle>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={p.url} target="_blank" className="text-primary underline">
                Kunjungi presale →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
