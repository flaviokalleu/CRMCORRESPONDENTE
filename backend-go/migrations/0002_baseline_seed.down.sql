-- Reverte 0002_baseline_seed: remove os dados essenciais (ordem inversa de FKs).
DELETE FROM public.subscriptions;
DELETE FROM public.users;
DELETE FROM public.plans;
DELETE FROM public.tenants;
DELETE FROM public.municipios;
DELETE FROM public.estados;
