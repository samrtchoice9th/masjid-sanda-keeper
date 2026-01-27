import { Users, Home, Wallet, TrendingUp, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function Dashboard() {
  const { stats, loading } = useDashboardStats();
  const currentMonth = monthNames[new Date().getMonth()];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Sanda Donation Card */}
      <Card className="shadow-card border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sanda Donation
          </CardTitle>
          <Wallet className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            Rs. {stats.sandaMonthlyTotal.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{currentMonth} Collection</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-700">{stats.sandaMembersPaid} Paid</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700">{stats.sandaMembersPending} Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Collection Card */}
      <Card className="shadow-card border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Data Collection
          </CardTitle>
          <Home className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalFamilies}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Families Registered</p>
          <div className="mt-3 flex items-center gap-1 text-sm">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">{stats.totalIndividuals} Total Individuals</span>
          </div>
        </CardContent>
      </Card>

      {/* Baithul Zakat Card */}
      <Card className="shadow-card border-l-4 border-l-emerald-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Baithul Zakat
          </CardTitle>
          <Wallet className="h-5 w-5 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            Rs. {stats.zakatBalance.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Current Balance</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-700">Rs. {stats.zakatCollected.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span className="text-red-700">Rs. {stats.zakatDistributed.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
