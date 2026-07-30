import { useParams, useLocation } from 'wouter';
import { useState } from 'react';
import { useGetProperty, useListRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, getGetPropertyQueryKey, getListRoomsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Home, Edit2, Trash2, User, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function PropertyDetail() {
  const params = useParams();
  const propertyId = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: property, isLoading } = useGetProperty(propertyId);
  const { data: rooms } = useListRooms(propertyId);
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    keyTag: '',
    monthlyRent: '',
    notes: ''
  });

  const openDialog = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        keyTag: room.keyTag,
        monthlyRent: room.monthlyRent.toString(),
        notes: room.notes || ''
      });
    } else {
      setEditingRoom(null);
      setFormData({ name: '', keyTag: '', monthlyRent: '', notes: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      monthlyRent: Number(formData.monthlyRent)
    };

    if (editingRoom) {
      updateRoom.mutate(
        { id: editingRoom.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey(propertyId) });
            queryClient.invalidateQueries({ queryKey: getGetPropertyQueryKey(propertyId) });
            toast({ title: 'Room updated successfully' });
            setDialogOpen(false);
          },
          onError: () => {
            toast({ title: 'Failed to update room', variant: 'destructive' });
          }
        }
      );
    } else {
      createRoom.mutate(
        { propertyId, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey(propertyId) });
            queryClient.invalidateQueries({ queryKey: getGetPropertyQueryKey(propertyId) });
            toast({ title: 'Room created successfully' });
            setDialogOpen(false);
          },
          onError: () => {
            toast({ title: 'Failed to create room', variant: 'destructive' });
          }
        }
      );
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete room "${name}"?`)) {
      deleteRoom.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey(propertyId) });
            queryClient.invalidateQueries({ queryKey: getGetPropertyQueryKey(propertyId) });
            toast({ title: 'Room deleted' });
          },
          onError: () => {
            toast({ title: 'Failed to delete room', variant: 'destructive' });
          }
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-10 w-64 bg-card/50 rounded-2xl animate-shimmer mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-card/50 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <Building2 size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg text-muted-foreground">Property not found</p>
          <Button onClick={() => setLocation('/properties')} className="mt-4 rounded-full">
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  const occupancyRate = property.totalRooms > 0 ? (property.occupiedRooms / property.totalRooms) * 100 : 0;

  return (
    <div className="p-8 space-y-8">
      <div>
        <Link href="/properties" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300 mb-4" data-testid="link-back-properties">
          <ArrowLeft size={18} />
          <span>Back to Properties</span>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">{property.name}</h1>
            <p className="text-muted-foreground mb-4">{property.address}</p>
            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                <span className="text-sm font-semibold text-foreground">{property.totalRooms} Rooms</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30">
                <span className="text-sm font-semibold text-foreground">{occupancyRate.toFixed(0)}% Occupied</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                <span className="text-sm font-semibold text-foreground">£{property.expectedRent.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="rounded-full bg-primary text-primary-foreground" data-testid="button-add-room">
                <Plus size={20} className="mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] bg-card border-card-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-card-foreground">
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-card-foreground">Room Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Room 101"
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-room-name"
                  />
                </div>
                <div>
                  <Label htmlFor="keyTag" className="text-card-foreground">Key Tag</Label>
                  <Input
                    id="keyTag"
                    value={formData.keyTag}
                    onChange={(e) => setFormData({ ...formData, keyTag: e.target.value })}
                    required
                    placeholder="e.g. A1"
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-room-keytag"
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyRent" className="text-card-foreground">Monthly Rent (£)</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    step="0.01"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    required
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground"
                    data-testid="input-room-rent"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-card-foreground">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="rounded-2xl bg-muted/20 border-card-border text-card-foreground min-h-[80px]"
                    data-testid="input-room-notes"
                  />
                </div>
                <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending} className="w-full rounded-full bg-primary text-primary-foreground" data-testid="button-submit-room">
                  {createRoom.isPending || updateRoom.isPending ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {rooms && rooms.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <Home size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground mb-4">No rooms yet</p>
            <Button onClick={() => openDialog()} className="rounded-full bg-primary text-primary-foreground">
              <Plus size={20} className="mr-2" />
              Add Your First Room
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms?.map((room) => (
            <div
              key={room.id}
              className={`group relative bg-card/40 backdrop-blur-sm border rounded-[2rem] p-6 transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] ${
                room.status === 'occupied' 
                  ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' 
                  : 'border-card-border'
              }`}
              data-testid={`card-room-${room.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  room.status === 'occupied' ? 'bg-primary/20' : 'bg-muted/20'
                }`}>
                  <Home size={24} className={room.status === 'occupied' ? 'text-primary' : 'text-muted-foreground'} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDialog(room)}
                    className="rounded-full hover:bg-secondary/20 hover:text-secondary"
                    data-testid={`button-edit-room-${room.id}`}
                  >
                    <Edit2 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(room.id, room.name)}
                    className="rounded-full hover:bg-destructive/20 hover:text-destructive"
                    data-testid={`button-delete-room-${room.id}`}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-1 font-serif">{room.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">Key: {room.keyTag}</p>
              
              {room.status === 'occupied' && room.tenantName ? (
                <div className="mb-4 p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-primary" />
                    <span className="text-xs text-muted-foreground">Current Tenant</span>
                  </div>
                  <Link href={`/tenants/${room.tenantId}`} className="font-semibold text-card-foreground hover:text-primary transition-colors duration-300">
                    {room.tenantName}
                  </Link>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-2xl bg-muted/10 border border-muted/20">
                  <span className="text-sm text-muted-foreground">Vacant</span>
                </div>
              )}
              
              <div className="pt-4 border-t border-card-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Rent</span>
                  <span className="text-lg font-bold text-primary font-mono">£{room.monthlyRent.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
