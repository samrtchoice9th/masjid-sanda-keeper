-- Add public read policy for family_members table
CREATE POLICY "Public can view family members by family_id"
ON public.family_members
FOR SELECT
USING (true);

-- Add public read policy for zakat_transactions table  
CREATE POLICY "Public can view zakat transactions by family_id"
ON public.zakat_transactions
FOR SELECT
USING (true);