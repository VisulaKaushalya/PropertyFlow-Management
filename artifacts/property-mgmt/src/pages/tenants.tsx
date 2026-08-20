import { useState } from 'react';
import { useListTenants, useListRooms, useCreateTenant, useDeleteTenant, getListTenantsQueryKey, useCreatePayment, useListPayments } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Trash2, CreditCard, Search } from 'lucide-react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useListProperties } from '@workspace/api-client-react';
import { useFileUpload } from '@/hooks/use-file-upload';
import { nextRentMonth, suggestedRentDate, currentMonth, todayDate } from '@/lib/payment-defaults';

interface QuickPayFormData {
  tenantId: number;
  tenantName: string;
  monthlyRent: number;
  amountPaid: string;
  month: string;
  status: string;
  datePaid: string;
  evidenceFile: File | null;
  notes: string;
}

export default function Tenants() {
  const { data: tenants, isLoading } = useListTenants();
  const { data: properties } = useListProperties();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();
  const createPayment = useCreatePayment();
  const { uploadFile, uploading } = useFileUpload();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const { data: rooms } = useListRooms(selectedProperty ? Number(selectedProperty) : 0, {
    query: { queryKey: ['properties', selectedProperty, 'rooms'], enabled: !!selectedProperty }
  });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    roomId: '',
    leaseStart: '',
    leaseEnd: '',
    notes: ''
  });

  const { data: payments } = useListPayments();
  const todayStr = todayDate();

  const [quickPayData, setQuickPayData] = useState<QuickPayFormData>({
    tenantId: 0,
    tenantName: '',
    monthlyRent: 0,
    amountPaid: '',
    month: currentMonth(),
    status: 'paid',
    datePaid: todayStr,
    evidenceFile: null,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTenant.mutate(
      { 
        data: {
          ...formData,
          roomId: Number(formData.roomId),
          leaseStart: formData.leaseStart,
          leaseEnd: formData.leaseEnd || undefined,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
          toast({ title: 'Tenant created successfully' });
          setDialogOpen(false);
          setFormData({ fullName: '', email: '', phone: '', roomId: '', leaseStart: '', leaseEnd: '', notes: '' });
          setSelectedProperty('');
        },
        onError: () => {
          toast({ title: 'Failed to create tenant', variant: 'destructive' });
        }
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete tenant "${name}"?`)) {
      deleteTenant.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
            toast({ title: 'Tenant deleted' });
          },
          onError: () => {
            toast({ title: 'Failed to delete tenant', variant: 'destructive' });
          }
        }
      );
    }
  };

  const openQuickPay = (tenant: any) => {
    const tenantPayments = payments?.filter((payment) => payment.tenantId === tenant.id) ?? [];
    const month = nextRentMonth(tenant.leaseStart, tenantPayments);
    setQuickPayData({
      tenantId: tenant.id,
      tenantName: tenant.fullName,
      monthlyRent: tenant.monthlyRent,
      amountPaid: tenant.monthlyRent.toString(),
      month,
      status: 'paid',
      datePaid: suggestedRentDate(month, tenant.leaseStart),
      evidenceFile: null,
      notes: ''
    });
    setQuickPayOpen(true);
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let evidenceUrl: string | undefined;
    if (quickPayData.evidenceFile) {
      const url = await uploadFile(quickPayData.evidenceFile);
      if (!url) {
        toast({ title: 'Failed to upload evidence', variant: 'destructive' });
        return;
      }
      evidenceUrl = url;
    }

    createPayment.mutate(
      {
        data: {
          tenantId: quickPayData.tenantId,
          month: quickPayData.month,
          amount: Number(quickPayData.amountPaid),
          expectedAmount: quickPayData.monthlyRent,
          status: quickPayData.status as 'paid' | 'partial' | 'unpaid',
          paidAt: quickPayData.datePaid,
          evidenceUrl: evidenceUrl || undefined,
          notes: quickPayData.notes || undefined
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() });
          toast({ title: 'Payment recorded successfully' });
          setQuickPayOpen(false);
        },
        onError: () => {
          toast({ title: 'Failed to record payment', variant: 'destructive' });
        }
      }
    );
  };

  const filteredTenants = tenants?.filter(tenant =>
    tenant.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.roomName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 h-10 w-64 bg-card/50 rounded-2xl animate-shimmer" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
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
          <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Tenants</h1>
          <p className="text-muted-foreground">{tenants?.length || 0} active tenants</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary text-primary-foreground" data-testid="button-add-tenant">
              <Plus size={20} className="mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] bg-card border-card-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-card-foreground">Add New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName" className="text-card-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-tenant-name"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-card-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-tenant-email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone" className="text-card-foreground">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-tenant-phone"
                />
              </div>
              <div>
                <Label htmlFor="property" className="text-card-foreground">Property</Label>
                <Select value={selectedProperty} onValueChange={(val) => { setSelectedProperty(val); setFormData({ ...formData, roomId: '' }); }}>
                  <SelectTrigger className="rounded-2xl bg-muted/20 border-card-border text-card-foreground" data-testid="select-property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-card border-card-border">
                    {properties?.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="roomId" className="text-card-foreground">Room</Label>
                <Select value={formData.roomId} onValueChange={(val) => setFormData({ ...formData, roomId: val })} disabled={!selectedProperty}>
                  <SelectTrigger className="rounded-2xl bg-muted/20 border-card-border text-card-foreground" data-testid="select-room">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-card border-card-border">
                    {rooms?.filter(r => r.status === 'vacant').map((room) => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        {room.name} - £{room.monthlyRent}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaseStart" className="text-card-foreground">Lease Start</Label>
                  <Input
                    id="leaseStart"
                    type="date"
                    value={formData.leaseStart}
                    onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
                    required
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-lease-start"
                  />
                </div>
                <div>
                  <Label htmlFor="leaseEnd" className="text-card-foreground">Lease End (Optional)</Label>
                  <Input
                    id="leaseEnd"
                    type="date"
                    value={formData.leaseEnd}
                    onChange={(e) => setFormData({ ...formData, leaseEnd: e.target.value })}
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-lease-end"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-card-foreground">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground min-h-[80px]"
                  data-testid="input-tenant-notes"
                />
              </div>
              <Button type="submit" disabled={createTenant.isPending} className="w-full rounded-full bg-primary text-primary-foreground" data-testid="button-submit-tenant">
                {createTenant.isPending ? 'Creating...' : 'Create Tenant'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 rounded-full bg-card/40 border-card-border"
          data-testid="input-search-tenants"
        />
      </div>

      {filteredTenants && filteredTenants.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <Users size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground mb-4">No tenants found</p>
            {!searchQuery && (
              <Button onClick={() => setDialogOpen(true)} className="rounded-full bg-primary text-primary-foreground">
                <Plus size={20} className="mr-2" />
                Add Your First Tenant
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTenants?.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/tenants/${tenant.id}`}
              className="group block p-6 bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.01]"
              data-testid={`card-tenant-${tenant.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tenant</p>
                      <p className="font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">{tenant.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Property & Room</p>
                      <p className="text-sm text-card-foreground">{tenant.propertyName}</p>
                      <p className="text-xs text-muted-foreground">{tenant.roomName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Monthly Rent</p>
                      <p className="text-lg font-bold text-primary font-mono">£{tenant.monthlyRent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Lease</p>
                      <p className="text-sm text-card-foreground">{new Date(tenant.leaseStart).toLocaleDateString()}</p>
                      {tenant.leaseEnd && (
                        <p className="text-xs text-muted-foreground">to {new Date(tenant.leaseEnd).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      openQuickPay(tenant);
                    }}
                    className="rounded-full bg-primary/10 hover:bg-primary/30 text-primary"
                    title="Quick Pay"
                    data-testid={`button-quick-pay-${tenant.id}`}
                  >
                    <CreditCard size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(tenant.id, tenant.fullName);
                    }}
                    className="rounded-full hover:bg-destructive/20 hover:text-destructive"
                    data-testid={`button-delete-tenant-${tenant.id}`}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Pay Dialog */}
      <Dialog open={quickPayOpen} onOpenChange={setQuickPayOpen}>
        <DialogContent className="rounded-[2rem] bg-card border-card-border max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-card-foreground">Quick Payment</DialogTitle>
            <p className="text-muted-foreground">{quickPayData.tenantName}</p>
          </DialogHeader>
          <form onSubmit={handleQuickPaySubmit} className="space-y-4">
            <div>
              <Label htmlFor="amountPaid" className="text-card-foreground">Amount Paid (£)</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                value={quickPayData.amountPaid}
                onChange={(e) => setQuickPayData({ ...quickPayData, amountPaid: e.target.value })}
                required
                className="rounded-2xl bg-muted/20 border-card-border text-card-foreground font-mono"
                data-testid="input-quick-pay-amount"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month" className="text-card-foreground">Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={quickPayData.month}
                  onChange={(e) => setQuickPayData({ ...quickPayData, month: e.target.value })}
                  required
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-quick-pay-month"
                />
              </div>
              <div>
                <Label htmlFor="datePaid" className="text-card-foreground">Date Paid</Label>
                <Input
                  id="datePaid"
                  type="date"
                  value={quickPayData.datePaid}
                  onChange={(e) => setQuickPayData({ ...quickPayData, datePaid: e.target.value })}
                  required
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-quick-pay-date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status" className="text-card-foreground">Status</Label>
              <Select value={quickPayData.status} onValueChange={(val) => setQuickPayData({ ...quickPayData, status: val })}>
                <SelectTrigger className="rounded-2xl bg-muted/20 border-card-border text-card-foreground" data-testid="select-quick-pay-status">
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
              <Label className="text-card-foreground">Photo Evidence (Optional)</Label>
              <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-card-border bg-muted/10 hover:bg-muted/20 cursor-pointer transition-all duration-300">
                <CreditCard size={20} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {quickPayData.evidenceFile ? (
                    <p className="text-sm text-card-foreground font-medium truncate">{quickPayData.evidenceFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to upload image evidence</p>
                  )}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setQuickPayData({ ...quickPayData, evidenceFile: file });
                  }}
                />
              </label>
            </div>
            <div>
              <Label htmlFor="notes" className="text-card-foreground">Notes</Label>
              <Textarea
                id="notes"
                value={quickPayData.notes}
                onChange={(e) => setQuickPayData({ ...quickPayData, notes: e.target.value })}
                className="rounded-2xl bg-muted/20 border-card-border text-card-foreground min-h-[60px]"
                data-testid="input-quick-pay-notes"
              />
            </div>
            <Button 
              type="submit" 
              disabled={createPayment.isPending || uploading} 
              className="w-full rounded-full bg-primary text-primary-foreground"
              data-testid="button-submit-quick-pay"
            >
              {uploading ? 'Uploading...' : createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
