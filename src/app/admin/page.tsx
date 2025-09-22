'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PendingPayment {
  transactionId: string;
  userId: string;
  userEmail: string;
  planId: string;
  amountLamports: number;
  amountSOL: string;
  createdAt: string;
  timeSinceCreated: number;
}

interface Analytics {
  totalUsers: number;
  paidUsers: number;
  conversionRate: number;
  revenueByPlan: Record<string, number>;
  dailyRevenue: Record<string, number>;
  totalRevenue: number;
}

export default function AdminPage() {
  const { user } = useAppContext();
  const router = useRouter();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  // Admin UID check
  const ADMIN_UID = "Gb1ga2KWyEPZbmEJVcrOhCp1ykH2";
  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    if (!isAdmin && !loading) {
      router.push('/');
      return;
    }
  }, [isAdmin, loading, router]);

  const loadPendingPayments = async () => {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const getPendingPayments = httpsCallable(functions, 'adminGetPendingPayments');
      
      const result = await getPendingPayments();
      const data = result.data as any;
      
      if (data.success) {
        setPendingPayments(data.pendingPayments || []);
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const getAnalytics = httpsCallable(functions, 'adminGetAnalytics');
      
      const result = await getAnalytics();
      const data = result.data as any;
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const approvePayment = async (transactionId: string, notes?: string) => {
    setApproving(transactionId);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      const approvePayment = httpsCallable(functions, 'adminApprovePayment');
      
      const result = await approvePayment({
        transactionId,
        notes: notes || `Manual approval by admin at ${new Date().toISOString()}`
      });
      
      const data = result.data as any;
      
      if (data.success) {
        // Reload pending payments
        await loadPendingPayments();
        alert(`✅ Payment approved successfully!\nUser: ${data.userId}\nPlan: ${data.planId}`);
      } else {
        alert(`❌ Failed to approve payment: ${data.message}`);
      }
    } catch (error: any) {
      console.error('Error approving payment:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setApproving(null);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        loadPendingPayments(),
        loadAnalytics()
      ]).finally(() => setLoading(false));
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-red-500">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage payments, users, and system analytics
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending Payments
            {pendingPayments.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingPayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        {/* Pending Payments Tab */}
        <TabsContent value="pending" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pending Payments</h2>
            <Button onClick={loadPendingPayments} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                  <p className="text-muted-foreground">No pending payments to review.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingPayments.map((payment) => (
                <Card key={payment.transactionId} className="border-orange-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {payment.planId} Plan - {payment.amountSOL} SOL
                      </CardTitle>
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {payment.timeSinceCreated}m ago
                      </Badge>
                    </div>
                    <CardDescription>
                      Transaction ID: {payment.transactionId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">User</p>
                        <p className="font-medium">{payment.userEmail}</p>
                        <p className="text-xs text-muted-foreground">{payment.userId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-medium">{payment.amountSOL} SOL</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.amountLamports.toLocaleString()} lamports
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approvePayment(payment.transactionId)}
                        disabled={approving === payment.transactionId}
                        className="flex-1"
                      >
                        {approving === payment.transactionId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Payment
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-xl font-semibold">System Analytics</h2>
          
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.paidUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(analytics.totalRevenue / 1000000000).toFixed(3)} SOL
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Firebase Functions</span>
                    <Badge variant="default">Online</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Solana RPC</span>
                    <Badge variant="default">Online</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Database</span>
                    <Badge variant="default">Online</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Actions</CardTitle>
                <CardDescription>
                  Use these actions carefully. All actions are logged.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  View All Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="w-4 h-4 mr-2" />
                  View All Transactions
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Export Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
