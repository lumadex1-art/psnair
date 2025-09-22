'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Gift, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferralInputProps {
  onReferralProcessed?: (result: any) => void;
  disabled?: boolean;
  className?: string;
}

export function ReferralInput({ onReferralProcessed, disabled = false, className }: ReferralInputProps) {
  const [referralCode, setReferralCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const validateCode = async () => {
    if (!referralCode.trim()) {
      setError('Please enter a referral code');
      return;
    }

    if (referralCode.trim().length !== 6) {
      setError('Referral code must be 6 characters');
      return;
    }

    setIsValidating(true);
    setError('');
    setValidationResult(null);

    try {
      // Call Firebase Function to validate referral code
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const validateFunction = httpsCallable(functions, 'referralValidate');
      
      const result = await validateFunction({ referralCode: referralCode.trim().toUpperCase() });
      const data = result.data as any;

      if (data.valid) {
        setValidationResult(data);
        toast({
          title: "Valid referral code!",
          description: `From ${data.referrer.name}. You'll get ${data.rewards.youWillReceive} EPSN bonus!`,
        });
      } else {
        setError(data.error || 'Invalid referral code');
        setValidationResult(null);
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      setError('Failed to validate referral code');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const processReferral = async () => {
    if (!validationResult) return;

    setIsProcessing(true);

    try {
      // Call Firebase Function to process referral
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const processFunction = httpsCallable(functions, 'referralProcess');
      
      const result = await processFunction({ referralCode: referralCode.trim().toUpperCase() });
      const data = result.data as any;

      if (data.success) {
        toast({
          title: "Referral processed!",
          description: data.message,
        });

        // Reset form
        setReferralCode('');
        setValidationResult(null);
        setError('');

        // Callback to parent component
        if (onReferralProcessed) {
          onReferralProcessed(data);
        }
      } else {
        setError(data.message || 'Failed to process referral');
      }
    } catch (error: any) {
      console.error('Process referral error:', error);
      setError(error.message || 'Failed to process referral');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (value: string) => {
    // Only allow alphanumeric characters and convert to uppercase
    const cleanValue = value.replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setReferralCode(cleanValue);
    
    // Reset validation when input changes
    if (validationResult || error) {
      setValidationResult(null);
      setError('');
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5 text-primary" />
          Enter Referral Code
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Have a referral code? Enter it to get bonus EPSN tokens!
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-2">
          <Label htmlFor="referral-code">Referral Code</Label>
          <div className="flex gap-2">
            <Input
              id="referral-code"
              value={referralCode}
              onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="text-center text-lg font-mono font-bold tracking-wider"
              maxLength={6}
              disabled={disabled || isValidating || isProcessing}
            />
            <Button
              onClick={validateCode}
              disabled={!referralCode.trim() || referralCode.length !== 6 || isValidating || disabled}
              variant="outline"
              className="px-4"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Validate'
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Validation Success */}
        {validationResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Valid referral code from <strong>{validationResult.referrer.name}</strong>
              </span>
            </div>

            {/* Reward Preview */}
            <div className="bg-background/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                Bonus Preview
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>You will receive:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    +{validationResult.rewards.youWillReceive} EPSN
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>{validationResult.referrer.name} will receive:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    +{validationResult.rewards.referrerWillReceive} EPSN
                  </Badge>
                </div>
              </div>
            </div>

            {/* Process Button */}
            <Button
              onClick={processReferral}
              disabled={isProcessing || disabled}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Claim Referral Bonus
                </>
              )}
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Referral codes are 6 characters long</p>
          <p>• You can only use one referral code per account</p>
          <p>• Both you and the referrer will receive bonus tokens</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReferralInput;
