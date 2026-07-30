import { useState } from 'react';
import { useListProperties, useCreateProperty, useDeleteProperty, getListPropertiesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Trash2, Home, MapPin } from 'lucide-react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function Properties() {
  const { data: properties, isLoading } = useListProperties();
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postcode: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProperty.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
          toast({ title: 'Property created successfully' });
          setDialogOpen(false);
          setFormData({ name: '', address: '', city: '', postcode: '', notes: '' });
        },
        onError: () => {
          toast({ title: 'Failed to create property', variant: 'destructive' });
        }
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete property "${name}"?`)) {
      deleteProperty.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
            toast({ title: 'Property deleted' });
          },
          onError: () => {
            toast({ title: 'Failed to delete property', variant: 'destructive' });
          }
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 h-10 w-64 bg-card/50 rounded-2xl animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-card/50 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Properties</h1>
          <p className="text-muted-foreground">{properties?.length || 0} properties in your portfolio</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl" data-testid="button-add-property">
              <Plus size={20} className="mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] bg-card border-card-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-card-foreground">Add New Property</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-card-foreground">Property Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-property-name"
                />
              </div>
              <div>
                <Label htmlFor="address" className="text-card-foreground">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                  data-testid="input-property-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-card-foreground">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-property-city"
                  />
                </div>
                <div>
                  <Label htmlFor="postcode" className="text-card-foreground">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-property-postcode"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-card-foreground">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="rounded-2xl bg-muted/20 border-card-border text-card-foreground min-h-[100px]"
                  data-testid="input-property-notes"
                />
              </div>
              <Button type="submit" disabled={createProperty.isPending} className="w-full rounded-full bg-primary text-primary-foreground" data-testid="button-submit-property">
                {createProperty.isPending ? 'Creating...' : 'Create Property'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {properties && properties.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <Building2 size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground mb-4">No properties yet</p>
            <Button onClick={() => setDialogOpen(true)} className="rounded-full bg-primary text-primary-foreground">
              <Plus size={20} className="mr-2" />
              Add Your First Property
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties?.map((property) => {
            const occupancyRate = property.totalRooms > 0 ? (property.occupiedRooms / property.totalRooms) * 100 : 0;
            return (
              <div
                key={property.id}
                className="group bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6 hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.02]"
                data-testid={`card-property-${property.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Building2 size={24} className="text-primary" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(property.id, property.name)}
                    className="rounded-full hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-300"
                    data-testid={`button-delete-property-${property.id}`}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
                <Link href={`/properties/${property.id}`} className="block mb-4">
                  <h3 className="text-xl font-bold text-card-foreground mb-2 font-serif hover:text-primary transition-colors duration-300">
                    {property.name}
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{property.address}</span>
                    </div>
                    {property.city && (
                      <div className="ml-6">
                        {property.city}{property.postcode ? `, ${property.postcode}` : ''}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-muted/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Home size={16} className="text-secondary" />
                      <span className="text-xs text-muted-foreground">Rooms</span>
                    </div>
                    <p className="text-lg font-bold text-card-foreground font-mono">{property.totalRooms}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">Occupancy</span>
                    </div>
                    <p className="text-lg font-bold text-card-foreground font-mono">{occupancyRate.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-card-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Rent</span>
                    <span className="font-bold text-primary font-mono">£{property.expectedRent.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
