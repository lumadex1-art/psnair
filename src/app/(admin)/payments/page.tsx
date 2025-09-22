'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  planId: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  provider: string;
  amountLamports: number;
  currency: string;
  providerRef?: string;
  createdAt: any;
  confirmedAt?: any;
  failedAt?: any;
}

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  pendingCount: number;
  todayRevenue: number;
  popularPlan: string;
}

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Call Firebase Function to get payment data
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const getPaymentsFunction = httpsCallable(functions, 'adminGetPayments');
      
      const result = await getPaymentsFunction({
        limit: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        planId: planFilter !== 'all' ? planFilter : undefined,
      });
      
      const data = result.data as any;
      
      if (data.success) {
        setTransactions(data.transactions);
        setStats(data.stats);
      } else {
        toast({
          title: "Error",
          description: "Failed to load payment data",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error loading payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = () => {
    loadPaymentData();
  };

  const handleVerifyPayment = async (transactionId: string) => {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const verifyFunction = httpsCallable(functions, 'adminVerifyPayment');
      
      const result = await verifyFunction({ transactionId });
      const data = result.data as any;
      
      if (data.success) {
        toast({
          title: "Payment Verified",
          description: "Payment has been manually verified",
        });
        loadPaymentData(); // Refresh data
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Failed to verify payment",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: "Failed to verify payment",
        variant: "destructive",
      });
    }
  };

  const handleRefundPayment = async (transactionId: string) => {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const refundFunction = httpsCallable(functions, 'adminRefundPayment');
      
      const result = await refundFunction({ transactionId });
      const data = result.data as any;
      
      if (data.success) {
        toast({
          title: "Refund Processed",
          description: "User plan has been downgraded and refund recorded",
        });
        loadPaymentData(); // Refresh data
      } else {
        toast({
          title: "Refund Failed",
          description: data.message || "Failed to process refund",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Error",
        description: "Failed to process refund",
        variant: "destructive",
      });
    }
  };

  const exportTransactions = () => {
    const csv = [
      ['Transaction ID', 'User', 'Plan', 'Amount (SOL)', 'Status', 'Date', 'Signature'].join(','),
      ...transactions.map(tx => [
        tx.id,
        tx.userEmail,
        tx.planId,
        (tx.amountLamports / 1000000000).toFixed(4),
        tx.status,
        new Date(tx.createdAt.toDate()).toISOString(),
        tx.providerRef || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    };
    
    const icons = {
      paid: <CheckCircle className="h-3 w-3" />,
      pending: <Clock className="h-3 w-3" />,
      failed: <AlertTriangle className="h-3 w-3" />,
      refunded: <RefreshCw className="h-3 w-3" />
    };
    
    return (
      <Badge className={cn('flex items-center gap-1', variants[status as keyof typeof variants])}>
        {icons[status as keyof typeof icons]}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesPlan = planFilter === 'all' || tx.planId === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-muted-foreground">Loading payment data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Management</h1>
            <p className="text-muted-foreground">Monitor and manage Solana payments</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportTransactions} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{(stats.totalRevenue / 1000000000).toFixed(2)} SOL</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Revenue</p>
                    <p className="text-2xl font-bold">{(stats.todayRevenue / 1000000000).toFixed(3)} SOL</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email, name, or transaction ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Pro">Pro</SelectItem>
                  <SelectItem value="Master">Master</SelectItem>
                  <SelectItem value="Ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{tx.userName || tx.userEmail}</p>
                        <p className="text-sm text-muted-foreground">{tx.userEmail}</p>
                      </div>
                      <Badge variant="outline">{tx.planId}</Badge>
                      {getStatusBadge(tx.status)}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{(tx.amountLamports / 1000000000).toFixed(4)} SOL</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt.toDate()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Transaction ID: {tx.id}</p>
                      {tx.providerRef && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Signature: {tx.providerRef.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {tx.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyPayment(tx.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      )}
                      {tx.status === 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefundPayment(tx.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Refund
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
