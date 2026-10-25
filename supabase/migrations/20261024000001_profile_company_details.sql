-- Adiciona telefone ao perfil e telefone/endereço à organização
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone text;
