import { useState } from 'react';
import { useListPayments, useCreatePayment, useListTenants, getListPaymentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Search, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Payments() {
  const { data: payments, isLoading } = useListPayments();
  const { data: tenants } = useListTenants();
  const createPayment = useCreatePayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    tenantId: '',
    amount: '',
    expectedAmount: '',
    month: '',
    status: 'paid' as 'paid' | 'partial' | 'unpaid',
    paidAt: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPayment.mutate(
      {
        data: {
          tenantId: Number(formData.tenantId),
          amount: Number(formData.amount),
          expectedAmount: Number(formData.expectedAmount),
          month: formData.month,
          status: formData.status,
          paidAt: formData.paidAt || undefined,
          notes: formData.notes || undefined
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          toast({ title: 'Payment recorded successfully' });
          setDialogOpen(false);
          setFormData({ tenantId: '', amount: '', expectedAmount: '', month: '', status: 'paid', paidAt: '', notes: '' });
        },
        onError: () => {
          toast({ title: 'Failed to record payment', variant: 'destructive' });
        }
      }
    );
  };

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      payment.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.month.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = payments?.reduce((acc, payment) => {
    acc.totalCollected += payment.amount;
    acc.totalExpected += payment.expectedAmount;
    if (payment.status === 'paid') acc.paidCount++;
    if (payment.status === 'partial') acc.partialCount++;
    if (payment.status === 'unpaid') acc.unpaidCount++;
    return acc;
  }, { totalCollected: 0, totalExpected: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 });

  const collectionRate = stats && stats.totalExpected > 0 ? (stats.totalCollected / stats.totalExpected) * 100 : 0;

  const statusColors = {
    paid: 'bg-primary/10 border-primary/30 text-primary',
    partial: 'bg-secondary/10 border-secondary/30 text-secondary',
    unpaid: 'bg-destructive/10 border-destructive/30 text-destructive'
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 h-10 w-64 bg-card/50 rounded-2xl animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-card/50 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-card/50 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Payments</h1>
          <p className="text-muted-foreground">{payments?.length || 0} payment records</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary text-primary-foreground" data-testid="button-add-payment">
              <Plus size={20} className="mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] bg-card border-card-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-card-foreground">Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tenantId" className="text-card-foreground">Tenant</Label>
                <Select value={formData.tenantId} onValueChange={(val) => setFormData({ ...formData, tenantId: val })}>
                  <SelectTrigger className="rounded-2xl bg-muted/20 border-card-border text-card-foreground" data-testid="select-tenant">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-card border-card-border">
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id.toString()}>
                        {tenant.fullName} - {tenant.roomName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount" className="text-card-foreground">Amount Paid (£)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-payment-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="expectedAmount" className="text-card-foreground">Expected Amount (£)</Label>
                  <Input
                    id="expectedAmount"
                    type="number"
                    step="0.01"
                    value={formData.expectedAmount}
                    onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                    required
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-payment-expected"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="month" className="text-card-foreground">Month (YYYY-MM)</Label>
                <Input
                  id="month"
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  required
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-payment-month"
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-card-foreground">Status</Label>
                <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="rounded-2xl bg-muted/20 border-card-border text-card-foreground" data-testid="select-payment-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-card border-card-border">
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paidAt" className="text-card-foreground">Payment Date</Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={formData.paidAt}
                  onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-payment-date"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-card-foreground">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground min-h-[80px]"
                  data-testid="input-payment-notes"
                />
              </div>
              <Button type="submit" disabled={createPayment.isPending} className="w-full rounded-full bg-primary text-primary-foreground" data-testid="button-submit-payment">
                {createPayment.isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <TrendingUp size={24} className="text-primary" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-card-foreground mb-1 font-serif">{collectionRate.toFixed(1)}%</h3>
          <p className="text-sm text-muted-foreground">Collection Rate</p>
          <p className="text-xs text-muted-foreground mt-2">£{stats?.totalCollected.toLocaleString()} of £{stats?.totalExpected.toLocaleString()}</p>
        </div>
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
              <DollarSign size={24} className="text-secondary" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-card-foreground mb-1 font-serif">{stats?.paidCount || 0}</h3>
          <p className="text-sm text-muted-foreground">Paid in Full</p>
        </div>
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown size={24} className="text-destructive" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-card-foreground mb-1 font-serif">{stats?.unpaidCount || 0}</h3>
          <p className="text-sm text-muted-foreground">Unpaid</p>
          <p className="text-xs text-muted-foreground mt-2">{stats?.partialCount || 0} partial</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 rounded-full bg-card/40 border-card-border"
            data-testid="input-search-payments"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 rounded-full bg-card/40 border-card-border" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl bg-card border-card-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments List */}
      {filteredPayments && filteredPayments.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <CreditCard size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground mb-4">No payments found</p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setDialogOpen(true)} className="rounded-full bg-primary text-primary-foreground">
                <Plus size={20} className="mr-2" />
                Record First Payment
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments?.map((payment) => (
            <div
              key={payment.id}
              className="p-6 bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] hover:shadow-lg transition-all duration-300 ease-in-out"
              data-testid={`card-payment-${payment.id}`}
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={24} className="text-primary" />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tenant</p>
                    <Link href={`/tenants/${payment.tenantId}`} className="font-semibold text-card-foreground hover:text-primary transition-colors duration-300">
                      {payment.tenantName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{payment.roomName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Month</p>
                    <p className="font-semibold text-card-foreground font-mono">{payment.month}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Amount</p>
                    <p className="font-semibold text-card-foreground">£{payment.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">of £{payment.expectedAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[payment.status]}`}>
                      {payment.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date Paid</p>
                    <p className="text-sm text-card-foreground">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
