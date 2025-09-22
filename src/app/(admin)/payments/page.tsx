'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLAN_CONFIG } from '@/lib/config';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; 

interface Transaction {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  planId: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  planUpgraded: boolean;
  provider: string;
  amountLamports: number;
  currency: string;
  providerRef?: string;
  createdAt: string;
  confirmedAt?: string;
  failedAt?: string;
}

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successRate: number;
  pendingCount: number;
  todayRevenue: number;
  popularPlan: string;
}

const ADMIN_UID = "Gb1ga2KWyEPZbmEJVcrOhCp1ykH2";

const GET_PAYMENTS_URL = 'https://getadminpayments-ivtinaswgq-uc.a.run.app';
const APPROVE_PAYMENT_URL = 'https://approveadminpayment-ivtinaswgq-uc.a.run.app';


export default function AdminPaymentsPage() {
  const { user, isLoading: isAppLoading } = useAppContext();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const { toast } = useToast();
  
  useEffect(() => {
    if (!isAppLoading && (!user || user.uid !== ADMIN_UID)) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to view this page.",
        variant: "destructive",
      });
      router.replace('/');
    }
  }, [user, isAppLoading, router, toast]);

  const authenticatedFetch = async (url: string, body: object) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Admin not authenticated.");
    }
    const token = await currentUser.getIdToken();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body) 
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return await response.json();
  };

  const loadPaymentData = async () => {
    if (!user || user.uid !== ADMIN_UID) {
      setLoading(false);
      return;
    };

    setLoading(true);
    try {
      const data = await authenticatedFetch(GET_PAYMENTS_URL, {
        limit: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        planId: planFilter !== 'all' ? planFilter : undefined,
      });
      
      if (data.success) {
        setTransactions(data.transactions);
        setStats(data.stats);
      } else {
        toast({
          title: "Error Loading Data",
          description: data.error || "Failed to load payment data from the server.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Function Call Error",
        description: error.message || "An unexpected error occurred. Check browser console for details.",
        variant: "destructive",
      });
      console.error("Authenticated fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!isAppLoading && user && user.uid === ADMIN_UID) {
      loadPaymentData();
    }
  }, [statusFilter, planFilter, user, isAppLoading]);

  const handleApprovePayment = async (transactionId: string) => {
    try {
      const data = await authenticatedFetch(APPROVE_PAYMENT_URL, { 
        transactionId, 
        notes: 'Manual approval from admin panel' 
      });
      
      if (data.success) {
        toast({
          title: "Payment Approved",
          description: "User plan has been successfully upgraded.",
        });
        loadPaymentData(); // Refresh data
      } else {
        toast({
          title: "Approval Failed",
          description: data.error || "Failed to approve payment. The transaction might have issues.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error Approving Payment",
        description: error.message || "Failed to call the approve function.",
        variant: "destructive",
      });
    }
  };

  const exportTransactions = () => {
     if (filteredTransactions.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no transactions matching the current filters.",
        variant: "destructive"
      });
      return;
    }

    const csvHeader = ['Transaction ID', 'User Email', 'User Name', 'Plan', 'Amount (SOL)', 'Status', 'Plan Upgraded', 'Date', 'Signature'].join(',');
    const csvRows = filteredTransactions.map(tx => [
      tx.id,
      tx.userEmail,
      tx.userName,
      tx.planId,
      (tx.amountLamports / 1000000000).toFixed(4),
      tx.status,
      tx.planUpgraded ? 'Yes' : 'No',
      new Date(tx.createdAt).toISOString(),
      tx.providerRef || ''
    ].join(','));
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusBadge = (status: string, planUpgraded: boolean) => {
    if (status === 'paid' && !planUpgraded) {
        return (
          <Badge className={cn('flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400')}>
            <Clock className="h-3 w-3" />
            PENDING APPROVAL
          </Badge>
        );
    }

    const variants: Record<string, string> = {
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    };
    
    const icons: Record<string, React.ReactElement> = {
      paid: <CheckCircle className="h-3 w-3" />,
      pending: <Clock className="h-3 w-3" />,
      failed: <AlertTriangle className="h-3 w-3" />,
      refunded: <RefreshCw className="h-3 w-3" />
    };
    
    return (
      <Badge className={cn('flex items-center gap-1', variants[status])}>
        {icons[status]}
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter(tx => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = tx.userEmail.toLowerCase().includes(searchLower) ||
                         tx.userName.toLowerCase().includes(searchLower) ||
                         tx.id.toLowerCase().includes(searchLower);
                         
    return matchesSearch;
  });

  if (isAppLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }
  
  if (user.uid !== ADMIN_UID) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <p className="mt-4 text-destructive-foreground">Access Denied.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Monitor and approve plan upgrades</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadPaymentData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh Data
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
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Transactions</p>
                    <p className="text-2xl font-bold">{stats.pendingCount}</p>
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

        {/* Filters and Transactions */}
        <Card>
           <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
                Filter and manage all user payment transactions. Transactions with "PENDING APPROVAL" status need manual action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email, name, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {Object.keys(PLAN_CONFIG.PRICES).map((plan) => (
                    plan !== 'Free' && <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transactions Table */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{tx.userName || tx.userEmail}</p>
                          <p className="text-sm text-muted-foreground">{tx.userEmail}</p>
                        </div>
                        <Badge variant="outline">{tx.planId}</Badge>
                        {getStatusBadge(tx.status, tx.planUpgraded)}
                      </div>
                      <div className="text-left md:text-right mt-2 md:mt-0">
                        <p className="font-semibold">{(tx.amountLamports / 1000000000).toFixed(4)} SOL</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tx ID: {tx.id}</p>
                        {tx.providerRef && (
                           <a href={`https://explorer.solana.com/tx/${tx.providerRef}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            Signature: {tx.providerRef.slice(0, 20)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-2 md:mt-0">
                        {tx.status === 'paid' && !tx.planUpgraded && (
                          <Button
                            size="sm"
                            onClick={() => handleApprovePayment(tx.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                         {tx.status === 'paid' && tx.planUpgraded && (
                          <Button size="sm" variant="ghost" disabled className="text-green-600">
                             <CheckCircle className="h-4 w-4 mr-1" />
                            Approved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found for the selected filters.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
