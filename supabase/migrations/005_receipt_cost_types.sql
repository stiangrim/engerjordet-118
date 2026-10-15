-- Flere typer på kvitteringer og manuelle kostnader
alter type public.receipt_cost_type add value if not exists 'tools';
alter type public.receipt_cost_type add value if not exists 'equipment_rental';
alter type public.receipt_cost_type add value if not exists 'transport';
alter type public.receipt_cost_type add value if not exists 'subcontractor';
alter type public.receipt_cost_type add value if not exists 'fees';
alter type public.receipt_cost_type add value if not exists 'waste';
