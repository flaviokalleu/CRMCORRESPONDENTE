-- A tabela public."ClienteAluguels" é resíduo do Sequelize e não é referenciada
-- por nenhuma linha de Go. A aplicação grava inquilinos em cliente_aluguels.
-- As 5 FKs abaixo apontavam para a tabela errada, o que fazia qualquer
-- cobrança/repasse/chamado/vistoria de inquilino real violar a constraint.

ALTER TABLE public.chamado_manutencaos
    DROP CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey;
ALTER TABLE public.chamado_manutencaos
    ADD CONSTRAINT chamado_manutencaos_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.cobranca_aluguels
    DROP CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.cobranca_aluguels
    ADD CONSTRAINT cobranca_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.regua_cobrancas
    DROP CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey;
ALTER TABLE public.regua_cobrancas
    ADD CONSTRAINT regua_cobrancas_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.repasse_proprietarios
    DROP CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey;
ALTER TABLE public.repasse_proprietarios
    ADD CONSTRAINT repasse_proprietarios_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.vistoria_aluguels
    DROP CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey;
ALTER TABLE public.vistoria_aluguels
    ADD CONSTRAINT vistoria_aluguels_cliente_aluguel_id_fkey
    FOREIGN KEY (cliente_aluguel_id) REFERENCES public.cliente_aluguels(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

DROP TABLE public."ClienteAluguels";
