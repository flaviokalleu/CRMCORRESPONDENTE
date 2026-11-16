-- O seed apontava a foto do admin para "admin.jpg", arquivo que não existe
-- numa instalação nova (gerava 404 em toda tela com avatar). Fotos enviadas
-- de verdade são gravadas como usuario_<id>.<ext>, então só o seed é afetado.
UPDATE users SET photo = NULL WHERE photo = 'admin.jpg';
