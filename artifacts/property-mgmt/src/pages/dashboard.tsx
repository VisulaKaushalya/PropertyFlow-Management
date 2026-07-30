import { useGetDashboardSummary, useGetOccupancyBreakdown, useGetArrearsReport, useGetRevenueTrend } from '@workspace/api-client-react';
import { Building2, Users, TrendingUp, AlertCircle, Home } from 'lucide-react';
import { Link } from 'wouter';

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  accentColor = 'primary',
  trend 
}: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  icon: any; 
  accentColor?: 'primary' | 'secondary' | 'destructive';
  trend?: string;
}) {
  const colors = {
    primary: 'from-primary/20 to-primary/5 border-primary/30',
    secondary: 'from-secondary/20 to-secondary/5 border-secondary/30',
    destructive: 'from-destructive/20 to-destructive/5 border-destructive/30'
  };

  return (
    <div className={`p-6 rounded-[2rem] bg-gradient-to-br ${colors[accentColor]} border backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg`} data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-${accentColor}/10 flex items-center justify-center`}>
          <Icon size={24} className={`text-${accentColor}`} />
        </div>
        {trend && (
          <span className="text-xs font-mono text-muted-foreground">{trend}</span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-card-foreground mb-1 font-serif">{value}</h3>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground/70">{subtitle}</p>
    </div>
  );
}

function OccupancyDot({ occupied }: { occupied: boolean }) {
  return (
    <div 
      className={`w-3 h-3 rounded-full transition-all duration-300 ease-in-out ${
        occupied 
          ? 'bg-primary shadow-lg shadow-primary/50' 
          : 'bg-muted/30 hover:bg-muted/50'
      }`}
    />
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: occupancy, isLoading: occupancyLoading } = useGetOccupancyBreakdown();
  const { data: arrears, isLoading: arrearsLoading } = useGetArrearsReport();
  const { data: revenue, isLoading: revenueLoading } = useGetRevenueTrend();

  if (summaryLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 space-y-4">
          <div className="h-10 w-64 bg-card/50 rounded-2xl animate-shimmer" />
          <div className="h-6 w-96 bg-card/50 rounded-2xl animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-card/50 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 font-serif">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your entire rental portfolio at a glance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Collection Rate"
          value={`${summary?.collectionRate.toFixed(1)}%`}
          subtitle={`£${summary?.collectedThisMonth.toLocaleString()} of £${summary?.expectedMonthlyRent.toLocaleString()}`}
          icon={TrendingUp}
          accentColor="primary"
        />
        <MetricCard
          title="Occupancy"
          value={`${summary?.occupancyRate.toFixed(1)}%`}
          subtitle={`${summary?.occupiedRooms} of ${summary?.totalRooms} rooms occupied`}
          icon={Home}
          accentColor="secondary"
        />
        <MetricCard
          title="Total Properties"
          value={summary?.totalProperties || 0}
          subtitle={`${summary?.totalRooms} total rooms`}
          icon={Building2}
          accentColor="primary"
        />
        <MetricCard
          title="Arrears"
          value={`£${summary?.arrearsTotal.toLocaleString()}`}
          subtitle={`${arrears?.length || 0} tenants behind`}
          icon={AlertCircle}
          accentColor="destructive"
        />
      </div>

      {/* Revenue Trend */}
      <div className="bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6" data-testid="card-revenue-trend">
        <h2 className="text-xl font-bold text-card-foreground mb-6 font-serif">Revenue Trend (Last 6 Months)</h2>
        {revenueLoading ? (
          <div className="h-48 bg-muted/20 rounded-2xl animate-shimmer" />
        ) : (
          <div className="space-y-3">
            {revenue?.map((item, idx) => {
              const percentage = (item.collected / item.expected) * 100;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-card-foreground">{item.month}</span>
                    <span className="font-semibold text-muted-foreground">
                      £{item.collected.toLocaleString()} / £{item.expected.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-8 bg-muted/20 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out shadow-lg"
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-card-foreground mix-blend-difference">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Matrix */}
        <div className="bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6" data-testid="card-occupancy-matrix">
          <h2 className="text-xl font-bold text-card-foreground mb-6 font-serif">Occupancy Breakdown</h2>
          {occupancyLoading ? (
            <div className="h-64 bg-muted/20 rounded-2xl animate-shimmer" />
          ) : (
            <div className="space-y-6">
              {occupancy?.map((property) => (
                <div key={property.propertyId}>
                  <div className="flex items-center justify-between mb-3">
                    <Link href={`/properties/${property.propertyId}`} className="font-semibold text-card-foreground hover:text-primary transition-colors duration-300 ease-in-out">
                      {property.propertyName}
                    </Link>
                    <span className="text-sm font-mono text-muted-foreground">
                      {property.occupiedRooms}/{property.totalRooms}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...Array(property.totalRooms)].map((_, idx) => (
                      <OccupancyDot key={idx} occupied={idx < property.occupiedRooms} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Arrears Alert */}
        <div className="bg-card/40 backdrop-blur-sm border border-card-border rounded-[2rem] p-6" data-testid="card-arrears-list">
          <h2 className="text-xl font-bold text-card-foreground mb-6 font-serif">Payment Arrears</h2>
          {arrearsLoading ? (
            <div className="h-64 bg-muted/20 rounded-2xl animate-shimmer" />
          ) : arrears && arrears.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {arrears.map((item) => (
                <Link
                  key={item.tenantId}
                  href={`/tenants/${item.tenantId}`}
                  className="block p-4 rounded-2xl bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-all duration-300 ease-in-out"
                  data-testid={`link-arrears-tenant-${item.tenantId}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-card-foreground">{item.tenantName}</p>
                      <p className="text-xs text-muted-foreground">{item.propertyName} - {item.roomName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">£{item.arrears.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{item.monthsUnpaid} months</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <AlertCircle size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No payment arrears</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
