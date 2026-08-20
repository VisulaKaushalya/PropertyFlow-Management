import { useParams, useLocation, Link } from 'wouter';
import { useState } from 'react';
import { useGetTenant, useCreatePayment, useCreateDocument, useDeleteDocument, getGetTenantQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, ArrowLeft, Plus, CreditCard, FileText, Trash2, Mail, Phone, Calendar, Home, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { nextRentMonth, suggestedRentDate } from '@/lib/payment-defaults';

export default function TenantDetail() {
  const params = useParams();
  const tenantId = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: tenant, isLoading } = useGetTenant(tenantId);
  const createPayment = useCreatePayment();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    expectedAmount: '',
    month: '',
    status: 'paid' as 'paid' | 'partial' | 'unpaid',
    paidAt: '',
    notes: ''
  });

  const getPaymentDefaults = () => {
    const month = nextRentMonth(tenant?.leaseStart, tenant?.payments ?? []);
    return {
      amount: tenant?.monthlyRent?.toString() ?? '',
      expectedAmount: tenant?.monthlyRent?.toString() ?? '',
      month,
      status: 'paid' as 'paid' | 'partial' | 'unpaid',
      paidAt: suggestedRentDate(month, tenant?.leaseStart),
      notes: '',
    };
  };
  const [documentFormData, setDocumentFormData] = useState({
    fileName: '',
    fileType: '',
    filePath: '',
    notes: ''
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPayment.mutate(
      {
        data: {
          tenantId,
          amount: Number(paymentFormData.amount),
          expectedAmount: Number(paymentFormData.expectedAmount),
          month: paymentFormData.month,
          status: paymentFormData.status,
          paidAt: paymentFormData.paidAt || undefined,
          notes: paymentFormData.notes || undefined
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTenantQueryKey(tenantId) });
          toast({ title: 'Payment recorded successfully' });
          setPaymentDialogOpen(false);
           setPaymentFormData(getPaymentDefaults());
        },
        onError: () => {
          toast({ title: 'Failed to record payment', variant: 'destructive' });
        }
      }
    );
  };

  const handleDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDocument.mutate(
      {
        data: {
          tenantId,
          fileName: documentFormData.fileName,
          fileType: documentFormData.fileType,
          filePath: documentFormData.filePath || undefined,
          notes: documentFormData.notes || undefined
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTenantQueryKey(tenantId) });
          toast({ title: 'Document added successfully' });
          setDocumentDialogOpen(false);
          setDocumentFormData({ fileName: '', fileType: '', filePath: '', notes: '' });
        },
        onError: () => {
          toast({ title: 'Failed to add document', variant: 'destructive' });
        }
      }
    );
  };

  const handleDeleteDocument = (id: number, name: string) => {
    if (confirm(`Delete document "${name}"?`)) {
      deleteDocument.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetTenantQueryKey(tenantId) });
            toast({ title: 'Document deleted' });
          },
          onError: () => {
            toast({ title: 'Failed to delete document', variant: 'destructive' });
          }
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-10 w-64 bg-card/50 rounded-2xl animate-shimmer mb-8" />
        <div className="space-y-6">
          <div className="h-48 bg-card/50 rounded-[2rem] animate-shimmer" />
          <div className="h-64 bg-card/50 rounded-[2rem] animate-shimmer" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <Users size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg text-muted-foreground">Tenant not found</p>
          <Button onClick={() => setLocation('/tenants')} className="mt-4 rounded-full">
            Back to Tenants
          </Button>
        </div>
      </div>
    );
  }

  const statusColors = {
    paid: 'bg-primary/10 border-primary/30 text-primary',
    partial: 'bg-secondary/10 border-secondary/30 text-secondary',
    unpaid: 'bg-destructive/10 border-destructive/30 text-destructive'
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <Link href="/tenants" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300 mb-4" data-testid="link-back-tenants">
          <ArrowLeft size={18} />
          <span>Back to Tenants</span>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">{tenant.fullName}</h1>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <a href={`mailto:${tenant.email}`} className="hover:text-primary transition-colors duration-300">{tenant.email}</a>
              </div>
              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <a href={`tel:${tenant.phone}`} className="hover:text-primary transition-colors duration-300">{tenant.phone}</a>
                </div>
              )}
            </div>
          </div>
          <div className={`px-5 py-2 rounded-full border font-semibold ${
            tenant.status === 'active' 
              ? 'bg-primary/10 border-primary/30 text-primary' 
              : 'bg-muted/10 border-muted/30 text-muted-foreground'
          }`}>
            {tenant.status}
          </div>
        </div>
      </div>

      {/* Tenant Info Card */}
      <div className="bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6">
        <h2 className="text-xl font-bold text-card-foreground mb-6 font-serif">Tenancy Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={18} className="text-secondary" />
              <span className="text-sm text-muted-foreground">Property</span>
            </div>
            <p className="font-semibold text-card-foreground">{tenant.propertyName}</p>
            <p className="text-sm text-muted-foreground">{tenant.roomName}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={18} className="text-primary" />
              <span className="text-sm text-muted-foreground">Monthly Rent</span>
            </div>
            <p className="text-2xl font-bold text-primary font-mono">£{tenant.monthlyRent.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-secondary" />
              <span className="text-sm text-muted-foreground">Lease Period</span>
            </div>
            <p className="text-sm text-card-foreground">{new Date(tenant.leaseStart).toLocaleDateString()}</p>
            {tenant.leaseEnd && (
              <p className="text-sm text-muted-foreground">to {new Date(tenant.leaseEnd).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-card-foreground font-serif">Payment History</h2>
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
             <DialogTrigger asChild>
               <Button
                 onClick={() => setPaymentFormData(getPaymentDefaults())}
                 className="rounded-full bg-primary text-primary-foreground"
                 size="sm"
                 data-testid="button-add-payment"
               >
                <Plus size={18} className="mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] bg-card border-card-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-card-foreground">Record Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount" className="text-card-foreground">Amount Paid (£)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
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
                      value={paymentFormData.expectedAmount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, expectedAmount: e.target.value })}
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
                    value={paymentFormData.month}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, month: e.target.value })}
                    required
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-payment-month"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-card-foreground">Status</Label>
                  <Select value={paymentFormData.status} onValueChange={(val: any) => setPaymentFormData({ ...paymentFormData, status: val })}>
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
                    value={paymentFormData.paidAt}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paidAt: e.target.value })}
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-payment-date"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentNotes" className="text-card-foreground">Notes</Label>
                  <Textarea
                    id="paymentNotes"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
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
        {tenant.payments && tenant.payments.length > 0 ? (
          <div className="space-y-3">
            {tenant.payments.map((payment) => (
              <div key={payment.id} className="p-4 rounded-2xl bg-muted/10 border border-card-border" data-testid={`card-payment-${payment.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Month</p>
                        <p className="font-semibold text-card-foreground font-mono">{payment.month}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Amount</p>
                        <p className="font-semibold text-card-foreground">£{payment.amount.toLocaleString()} / £{payment.expectedAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[payment.status]}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Date Paid</p>
                        <p className="text-sm text-card-foreground">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
            <p>No payment history yet</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-card-foreground font-serif">Documents</h2>
          <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground" size="sm" data-testid="button-add-document">
                <Plus size={18} className="mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] bg-card border-card-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-card-foreground">Add Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDocumentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fileName" className="text-card-foreground">File Name</Label>
                  <Input
                    id="fileName"
                    value={documentFormData.fileName}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, fileName: e.target.value })}
                    required
                    placeholder="e.g. Lease Agreement.pdf"
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-document-name"
                  />
                </div>
                <div>
                  <Label htmlFor="fileType" className="text-card-foreground">File Type</Label>
                  <Input
                    id="fileType"
                    value={documentFormData.fileType}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, fileType: e.target.value })}
                    required
                    placeholder="e.g. PDF, DOCX"
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-document-type"
                  />
                </div>
                <div>
                  <Label htmlFor="filePath" className="text-card-foreground">File Path (Optional)</Label>
                  <Input
                    id="filePath"
                    value={documentFormData.filePath}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, filePath: e.target.value })}
                    placeholder="e.g. /uploads/lease.pdf"
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-document-path"
                  />
                </div>
                <div>
                  <Label htmlFor="documentNotes" className="text-card-foreground">Notes</Label>
                  <Textarea
                    id="documentNotes"
                    value={documentFormData.notes}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, notes: e.target.value })}
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground min-h-[80px]"
                    data-testid="input-document-notes"
                  />
                </div>
                <Button type="submit" disabled={createDocument.isPending} className="w-full rounded-full bg-primary text-primary-foreground" data-testid="button-submit-document">
                  {createDocument.isPending ? 'Adding...' : 'Add Document'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {tenant.documents && tenant.documents.length > 0 ? (
          <div className="space-y-3">
            {tenant.documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-card-border group" data-testid={`card-document-${document.id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground">{document.fileName}</p>
                    <p className="text-sm text-muted-foreground">{document.fileType}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteDocument(document.id, document.fileName)}
                  className="rounded-full hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-300"
                  data-testid={`button-delete-document-${document.id}`}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>No documents uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
