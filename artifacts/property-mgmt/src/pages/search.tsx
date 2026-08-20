import { useLocation } from 'wouter';
import { useGlobalSearch } from '@workspace/api-client-react';
import { Building2, Home, Users, Search as SearchIcon } from 'lucide-react';
import { Link } from 'wouter';

export default function Search() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  const query = params.get('q') || '';
  
  const { data: results, isLoading } = useGlobalSearch({ q: query }, {
    query: { queryKey: ['search', query], enabled: !!query }
  });

  if (!query) {
    return (
      <div className="p-8">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <SearchIcon size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground">Enter a search query to begin</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 h-10 w-64 bg-card/50 rounded-2xl animate-shimmer" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-card/50 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const totalResults = (results?.properties.length || 0) + (results?.rooms.length || 0) + (results?.tenants.length || 0);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Search Results</h1>
        <p className="text-muted-foreground">
          {totalResults} results for &quot;{query}&quot;
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <SearchIcon size={64} className="mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-lg text-muted-foreground mb-2">No results found</p>
            <p className="text-sm text-muted-foreground">Try different search terms</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Properties */}
          {results?.properties && results.properties.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4 font-serif flex items-center gap-3">
                <Building2 size={24} className="text-primary" />
                Properties ({results.properties.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.properties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className="block p-6 bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.02]"
                    data-testid={`result-property-${property.id}`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 size={24} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-card-foreground mb-1 font-serif hover:text-primary transition-colors">
                          {property.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-card-border">
                      <span className="text-sm text-muted-foreground">{property.totalRooms} rooms</span>
                      <span className="font-bold text-primary font-mono">£{property.expectedRent.toLocaleString()}/mo</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Rooms */}
          {results?.rooms && results.rooms.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4 font-serif flex items-center gap-3">
                <Home size={24} className="text-secondary" />
                Rooms ({results.rooms.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`p-6 bg-card/40 backdrop-blur-sm border rounded-[2rem] hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.02] ${
                      room.status === 'occupied' 
                        ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' 
                        : 'border-card-border'
                    }`}
                    data-testid={`result-room-${room.id}`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        room.status === 'occupied' ? 'bg-primary/20' : 'bg-muted/20'
                      }`}>
                        <Home size={24} className={room.status === 'occupied' ? 'text-primary' : 'text-muted-foreground'} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-card-foreground mb-1 font-serif">{room.name}</h3>
                        <p className="text-sm text-muted-foreground">Key: {room.keyTag}</p>
                        {room.tenantName && (
                          <p className="text-sm text-primary mt-1">{room.tenantName}</p>
                        )}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-card-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{room.status}</span>
                        <span className="font-bold text-primary font-mono">£{room.monthlyRent.toLocaleString()}/mo</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tenants */}
          {results?.tenants && results.tenants.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4 font-serif flex items-center gap-3">
                <Users size={24} className="text-secondary" />
                Tenants ({results.tenants.length})
              </h2>
              <div className="space-y-3">
                {results.tenants.map((tenant) => (
                  <Link
                    key={tenant.id}
                    href={`/tenants/${tenant.id}`}
                    className="block p-6 bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.01]"
                    data-testid={`result-tenant-${tenant.id}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Tenant</p>
                          <p className="font-bold text-card-foreground group-hover:text-primary transition-colors">{tenant.fullName}</p>
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
                          <p className="text-sm text-muted-foreground mb-1">Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                            tenant.status === 'active' 
                              ? 'bg-primary/10 border-primary/30 text-primary' 
                              : 'bg-muted/10 border-muted/30 text-muted-foreground'
                          }`}>
                            {tenant.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
