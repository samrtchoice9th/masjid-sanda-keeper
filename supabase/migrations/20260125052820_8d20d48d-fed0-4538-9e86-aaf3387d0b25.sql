-- Add payment frequency column to donors table
ALTER TABLE public.donors 
ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'monthly';

-- Add comment for clarity
COMMENT ON COLUMN public.donors.payment_frequency IS 'Payment frequency: monthly or yearly';