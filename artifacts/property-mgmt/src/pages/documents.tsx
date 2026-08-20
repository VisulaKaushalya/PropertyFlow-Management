import { useState } from 'react';
import { useListDocuments, useCreateDocument, useDeleteDocument, useListTenants, getListDocumentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2, Search, Upload } from 'lucide-react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFileUpload } from '@/hooks/use-file-upload';

export default function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const { data: tenants } = useListTenants();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { uploadFile, uploading } = useFileUpload();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    tenantId: '',
    fileName: '',
    fileType: '',
    notes: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const ext = file.name.split('.').pop()?.toUpperCase() || file.type.split('/')[1]?.toUpperCase() || 'FILE';
      setFormData({ ...formData, fileName: file.name, fileType: ext });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let filePath: string | undefined;
    if (selectedFile) {
      const url = await uploadFile(selectedFile);
      if (!url) {
        toast({ title: 'Failed to upload file', variant: 'destructive' });
        return;
      }
      filePath = url;
    }

    createDocument.mutate(
      {
        data: {
          tenantId: Number(formData.tenantId),
          fileName: formData.fileName,
          fileType: formData.fileType,
          filePath: filePath || undefined,
          notes: formData.notes || undefined
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          toast({ title: 'Document added successfully' });
          setDialogOpen(false);
          setFormData({ tenantId: '', fileName: '', fileType: '', notes: '' });
          setSelectedFile(null);
        },
        onError: () => {
          toast({ title: 'Failed to add document', variant: 'destructive' });
        }
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete document "${name}"?`)) {
      deleteDocument.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
            toast({ title: 'Document deleted' });
          },
          onError: () => {
            toast({ title: 'Failed to delete document', variant: 'destructive' });
          }
        }
      );
    }
  };

  const filteredDocuments = documents?.filter(doc =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.fileType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by tenant
  const groupedDocuments = filteredDocuments?.reduce((acc, doc) => {
    if (!acc[doc.tenantId]) {
      acc[doc.tenantId] = { tenantName: doc.tenantName, documents: [] };
    }
    acc[doc.tenantId].documents.push(doc);
    return acc;
  }, {} as Record<number, { tenantName: string; documents: NonNullable<typeof documents> }>);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 h-10 w-64 bg-card/50 rounded-2xl animate-shimmer" />
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-card/50 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Documents</h1>
          <p className="text-muted-foreground">{documents?.length || 0} documents stored</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary text-primary-foreground" data-testid="button-add-document">
              <Plus size={20} className="mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] bg-card border-card-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-card-foreground">Add Document</DialogTitle>
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
                        {tenant.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-card-foreground">Upload File</Label>
                <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-card-border bg-muted/10 hover:bg-muted/20 cursor-pointer transition-all duration-300">
                  <Upload size={20} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {selectedFile ? (
                      <p className="text-sm text-card-foreground font-medium truncate">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Click to choose a file</p>
                    )}
                  </div>
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              <div>
                <Label htmlFor="fileName" className="text-card-foreground">File Name</Label>
                <Input
                  id="fileName"
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
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
                  value={formData.fileType}
                  onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                  required
                  placeholder="e.g. PDF, DOCX"
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-document-type"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-card-foreground">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground min-h-[80px]"
                  data-testid="input-document-notes"
                />
              </div>
              <Button type="submit" disabled={createDocument.isPending || uploading} className="w-full rounded-full bg-primary text-primary-foreground" data-testid="button-submit-document">
                {uploading ? 'Uploading...' : createDocument.isPending ? 'Adding...' : 'Add Document'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 rounded-full bg-card/40 border-card-border"
          data-testid="input-search-documents"
        />
      </div>

      {filteredDocuments && filteredDocuments.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <FileText size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground mb-4">No documents found</p>
            {!searchQuery && (
              <Button onClick={() => setDialogOpen(true)} className="rounded-full bg-primary text-primary-foreground">
                <Plus size={20} className="mr-2" />
                Add Your First Document
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedDocuments && Object.entries(groupedDocuments).map(([tenantId, group]) => (
            <div key={tenantId} className="bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6" data-testid={`group-tenant-${tenantId}`}>
              <div className="flex items-center justify-between mb-4">
                <Link href={`/tenants/${tenantId}`} className="text-xl font-bold text-card-foreground hover:text-primary transition-colors duration-300 font-serif">
                  {group.tenantName}
                </Link>
                <span className="text-sm text-muted-foreground">{group.documents.length} documents</span>
              </div>
              <div className="space-y-3">
                {group.documents.map((document) => (
                  <div
                    key={document.id}
                    className="group flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-card-border hover:bg-muted/20 transition-all duration-300 ease-in-out"
                    data-testid={`card-document-${document.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={20} className="text-secondary" />
                      </div>
                      <div>
                        <p className="font-semibold text-card-foreground">{document.fileName}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{document.fileType}</span>
                          <span className="text-xs">•</span>
                          <span className="text-xs">{new Date(document.createdAt).toLocaleDateString()}</span>
                        </div>
                        {document.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{document.notes}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(document.id, document.fileName)}
                      className="rounded-full hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-300"
                      data-testid={`button-delete-document-${document.id}`}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
