'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, Repeat } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const tokens = [
  { id: 'epsn', name: 'EPSN', icon: 'E' },
  { id: 'usdt', name: 'USDT', icon: 'U' },
  { id: 'eth', name: 'ETH', icon: 'Ξ' },
];

export default function SwapPage() {
  const { balance } = useAppContext();
  const { toast } = useToast();
  
  const [fromToken, setFromToken] = useState('epsn');
  const [toToken, setToToken] = useState('usdt');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleAmountChange = (value: string) => {
    setFromAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      // Dummy conversion rate
      const rate = fromToken === 'epsn' ? 0.1 : 10;
      setToAmount((amount * rate).toFixed(2));
    } else {
      setToAmount('');
    }
  };

  const handleSwitchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    // Also switch amounts
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  }

  const handleSwap = () => {
    const amount = parseFloat(fromAmount);
    if (!amount || amount <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter an amount to swap.' });
        return;
    }
    if (fromToken === 'epsn' && amount > balance) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You do not have enough EPSN to make this swap.' });
        return;
    }
    
    setIsSwapping(true);
    // Simulate API call
    setTimeout(() => {
        setIsSwapping(false);
        toast({ title: 'Swap Successful!', description: `You swapped ${fromAmount} ${tokens.find(t => t.id === fromToken)?.name} for ${toAmount} ${tokens.find(t => t.id === toToken)?.name}.`});
        setFromAmount('');
        setToAmount('');
    }, 1500);
  }

  return (
    <div className="space-y-6 px-4">
       <div className="text-center">
        <h1 className="font-headline text-3xl font-bold">Swap Tokens</h1>
        <p className="text-muted-foreground">Exchange your assets seamlessly.</p>
      </div>

      <Card className="w-full max-w-md mx-auto bg-secondary/30 border-primary/10">
        <CardContent className="p-6">
          <div className="relative space-y-2">
            {/* From Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <label htmlFor="from-amount" className="text-muted-foreground">You pay</label>
                <p className="text-muted-foreground">Balance: {fromToken === 'epsn' ? balance.toLocaleString() : '0.00'}</p>
              </div>
              <div className="flex gap-2">
                <Input
                  id="from-amount"
                  type="number"
                  placeholder="0.0"
                  value={fromAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="text-2xl h-14 bg-background/70 focus-visible:ring-offset-0 focus-visible:ring-primary/50"
                />
                <Select value={fromToken} onValueChange={setFromToken}>
                  <SelectTrigger className="w-[120px] h-14 bg-background/70">
                    <SelectValue placeholder="Token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map(token => (
                      <SelectItem key={token.id} value={token.id}>{token.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Switch Button */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center my-2">
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 z-10 bg-secondary hover:bg-muted" onClick={handleSwitchTokens}>
                    <ArrowDown className="h-5 w-5" />
                </Button>
            </div>
            
            {/* To Input */}
            <div className="space-y-2 pt-2">
              <label htmlFor="to-amount" className="text-sm text-muted-foreground">You receive</label>
              <div className="flex gap-2">
                <Input
                  id="to-amount"
                  type="number"
                  placeholder="0.0"
                  value={toAmount}
                  readOnly
                  className="text-2xl h-14 bg-background/70 focus-visible:ring-offset-0 focus-visible:ring-primary/50"
                />
                 <Select value={toToken} onValueChange={setToToken}>
                  <SelectTrigger className="w-[120px] h-14 bg-background/70">
                    <SelectValue placeholder="Token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map(token => (
                      <SelectItem key={token.id} value={token.id}>{token.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSwap} 
            disabled={isSwapping || !fromAmount}
            className="w-full mt-6 h-14 text-lg font-bold"
            size="lg"
          >
            {isSwapping ? 'Swapping...' : 'Swap'}
             <Repeat className="ml-2 h-5 w-5"/>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
