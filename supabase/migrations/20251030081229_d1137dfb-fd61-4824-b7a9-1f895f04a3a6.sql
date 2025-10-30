-- Drop the existing check constraint
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_method_check;

-- Add updated check constraint to include 'sanda' as a valid method
ALTER TABLE public.donations ADD CONSTRAINT donations_method_check 
CHECK (method IN ('cash', 'bank', 'sanda'));