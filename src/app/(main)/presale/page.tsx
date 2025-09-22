import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { presaleSeeds } from '@/lib/seeds';

export default function PresalePage() {
  const items = [...presaleSeeds]
    .filter((p) => p.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 px-4">
      <div className="text-center">
        <h1 className="font-headline text-3xl font-bold">Presale Links</h1>
        <p className="text-muted-foreground">Kumpulan tautan presale: PSNChain, LumaDex, BRISC, BLC.</p>
      </div>

      <div className="grid gap-4">
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
