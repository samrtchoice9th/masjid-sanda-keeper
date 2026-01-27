import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  // Sanda Donation
  sandaMonthlyTotal: number;
  sandaMembersPaid: number;
  sandaMembersPending: number;
  
  // Data Collection
  totalFamilies: number;
  totalIndividuals: number;
  
  // Baithul Zakat
  zakatCollected: number;
  zakatDistributed: number;
  zakatBalance: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    sandaMonthlyTotal: 0,
    sandaMembersPaid: 0,
    sandaMembersPending: 0,
    totalFamilies: 0,
    totalIndividuals: 0,
    zakatCollected: 0,
    zakatDistributed: 0,
    zakatBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Fetch Sanda stats
      const [donorsResult, donationsResult] = await Promise.all([
        supabase.from("donors").select("id", { count: "exact" }),
        supabase.from("donations")
          .select("donor_id, amount, months_paid")
          .eq("year", currentYear),
      ]);

      const totalDonors = donorsResult.count || 0;
      const donations = donationsResult.data || [];

      // Calculate current month stats
      let monthlyTotal = 0;
      const paidDonorIds = new Set<string>();

      donations.forEach(d => {
        if (d.months_paid && d.months_paid.includes(currentMonth)) {
          monthlyTotal += Number(d.amount) / (d.months_paid.length || 1);
          paidDonorIds.add(d.donor_id);
        }
      });

      const membersPaid = paidDonorIds.size;
      const membersPending = totalDonors - membersPaid;

      // Fetch Data Collection stats
      const [familiesResult, membersResult] = await Promise.all([
        supabase.from("families").select("id", { count: "exact" }),
        supabase.from("family_members").select("id", { count: "exact" }),
      ]);

      const totalFamilies = familiesResult.count || 0;
      const totalIndividuals = membersResult.count || 0;

      // Fetch Baithul Zakat stats
      const [collectionsResult, distributionsResult] = await Promise.all([
        supabase.from("zakat_transactions")
          .select("amount")
          .eq("type", "collection"),
        supabase.from("zakat_transactions")
          .select("amount")
          .eq("type", "distribution"),
      ]);

      const zakatCollected = (collectionsResult.data || []).reduce(
        (sum, t) => sum + Number(t.amount), 0
      );
      const zakatDistributed = (distributionsResult.data || []).reduce(
        (sum, t) => sum + Number(t.amount), 0
      );

      setStats({
        sandaMonthlyTotal: monthlyTotal,
        sandaMembersPaid: membersPaid,
        sandaMembersPending: membersPending,
        totalFamilies,
        totalIndividuals,
        zakatCollected,
        zakatDistributed,
        zakatBalance: zakatCollected - zakatDistributed,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
}
