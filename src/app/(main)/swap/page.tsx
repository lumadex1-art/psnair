import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Repeat } from 'lucide-react';

export default function SwapPage() {
  return (
    <div className="space-y-8 px-4 flex flex-col items-center justify-center h-full">
        <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Repeat className="h-8 w-8" />
            </div>
            <h1 className="font-headline text-3xl font-bold">Swap</h1>
            <p className="text-muted-foreground">This feature is coming soon!</p>
        </div>
    </div>
  );
}
