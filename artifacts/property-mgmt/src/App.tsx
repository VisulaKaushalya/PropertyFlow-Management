import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';
import Dashboard from '@/pages/dashboard';
import Properties from '@/pages/properties';
import PropertyDetail from '@/pages/property-detail';
import Tenants from '@/pages/tenants';
import TenantDetail from '@/pages/tenant-detail';
import Payments from '@/pages/payments';
import Documents from '@/pages/documents';
import Search from '@/pages/search';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/properties" component={Properties} />
        <Route path="/properties/:id" component={PropertyDetail} />
        <Route path="/tenants" component={Tenants} />
        <Route path="/tenants/:id" component={TenantDetail} />
        <Route path="/payments" component={Payments} />
        <Route path="/documents" component={Documents} />
        <Route path="/search" component={Search} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
