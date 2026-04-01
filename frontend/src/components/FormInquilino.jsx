// src/components/FormInquilino.jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, Mail, CreditCard, Calendar, MapPin, DollarSign,
  Upload, FileText, Shield, ChevronDown, ChevronUp, X, CheckCircle, Loader2,
  Home, Percent, Key
} from 'lucide-react';

const INPUT = `w-full px-4 py-3 rounded-xl text-white placeholder-white/40
  bg-white/5 border border-white/10 focus:outline-none focus:ring-2
  focus:ring-caixa-orange/50 focus:border-caixa-orange/40 transition-all duration-200`;

const LABEL = 'block text-white/70 text-sm font-medium mb-1.5';

const SECTION = 'bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4';

function FileUploadField({ label, name, icon: Icon, file, onChange }) {
  const inputRef = useRef(null);

  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/20
          hover:border-caixa-orange/50 bg-white/5 hover:bg-white/8 cursor-pointer transition-all duration-200 group"
      >
        <Icon className="w-5 h-5 text-white/40 group-hover:text-caixa-orange transition-colors flex-shrink-0" />
        <span className="text-sm text-white/50 group-hover:text-white/70 truncate transition-colors">
          {file ? file.name : 'Clique para selecionar ou arraste o arquivo'}
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="ml-auto flex-shrink-0 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
      {file && (
        <p className="mt-1 text-xs text-white/40 flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-400" />
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      )}
    </div>
  );
}

function FiadorSection({ dados, onChange, onFileChange, files }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Nome completo *</label>
          <input className={INPUT} placeholder="Nome do fiador" value={dados.fiador_nome}
            onChange={(e) => onChange('fiador_nome', e.target.value)} required />
        </div>
        <div>
          <label className={LABEL}>Telefone / WhatsApp *</label>
          <input className={INPUT} placeholder="(61) 9 0000-0000" value={dados.fiador_telefone}
            onChange={(e) => onChange('fiador_telefone', e.target.value)} required />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input className={INPUT} type="email" placeholder="email@exemplo.com" value={dados.fiador_email}
            onChange={(e) => onChange('fiador_email', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>CPF *</label>
          <input className={INPUT} placeholder="000.000.000-00" value={dados.fiador_cpf} maxLength={14}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
              onChange('fiador_cpf', v);
            }} required />
        </div>
        <div>
          <label className={LABEL}>Data de nascimento</label>
          <input className={INPUT} type="date" value={dados.fiador_data_nascimento}
            onChange={(e) => onChange('fiador_data_nascimento', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Onde nasceu (cidade/estado)</label>
          <input className={INPUT} placeholder="Ex: Brasília / DF" value={dados.fiador_cidade_nascimento}
            onChange={(e) => onChange('fiador_cidade_nascimento', e.target.value)} />
        </div>
      </div>
      <FileUploadField
        label="Documento de identificação (RG / CNH)"
        name="fiador_documento_id"
        icon={Upload}
        file={files.fiador_documento_id}
        onChange={(f) => onFileChange('fiador_documento_id', f)}
      />
    </div>
  );
}

const EMPTY_FORM = {
  nome: '', telefone: '', email: '', cpf: '',
  data_nascimento: '', cidade_nascimento: '',
  valor_aluguel: '', dia_vencimento: '',
  proprietario_nome: '', proprietario_telefone: '', proprietario_pix: '',
  taxa_administracao: '10',
  corretor_nome: '', corretor_pix: '', corretor_percentual: '0',
  fiador_nome: '', fiador_telefone: '', fiador_email: '', fiador_cpf: '',
  fiador_data_nascimento: '', fiador_cidade_nascimento: '',
};

export default function FormInquilino({ onSuccess, onBack, clienteId, initialData, isEditing }) {
  const [form, setForm] = useState(() => ({
    nome:             initialData?.nome              || '',
    telefone:         initialData?.telefone          || '',
    email:            initialData?.email             || '',
    cpf:              initialData?.cpf               || '',
    data_nascimento:  initialData?.data_nascimento   || '',
    cidade_nascimento: initialData?.cidade_nascimento || '',
    valor_aluguel:    initialData?.valor_aluguel != null ? String(initialData.valor_aluguel) : '',
    dia_vencimento:   initialData?.dia_vencimento != null ? String(initialData.dia_vencimento) : '',
    proprietario_nome:     initialData?.proprietario_nome     || '',
    proprietario_telefone: initialData?.proprietario_telefone || '',
    proprietario_pix:      initialData?.proprietario_pix      || '',
    taxa_administracao:    initialData?.taxa_administracao != null ? String(initialData.taxa_administracao) : '10',
    corretor_nome:       initialData?.corretor_nome       || '',
    corretor_pix:        initialData?.corretor_pix        || '',
    corretor_percentual: initialData?.corretor_percentual != null ? String(initialData.corretor_percentual) : '0',
    fiador_nome:      initialData?.fiador_nome        || '',
    fiador_telefone:  initialData?.fiador_telefone    || '',
    fiador_email:     initialData?.fiador_email       || '',
    fiador_cpf:       initialData?.fiador_cpf         || '',
    fiador_data_nascimento:  initialData?.fiador_data_nascimento  || '',
    fiador_cidade_nascimento: initialData?.fiador_cidade_nascimento || '',
  }));
  const [temFiador, setTemFiador] = useState(isEditing ? !!initialData?.tem_fiador : false);
  const [files, setFiles] = useState({ documento_id: null, contrato: null, fiador_documento_id: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleFile = (field, file) => setFiles(prev => ({ ...prev, [field]: file }));

  const formatCpf = (v) =>
    v.replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const fd = new FormData();

      Object.entries(form).forEach(([key, val]) => {
        if (val) fd.append(key, val);
      });
      fd.append('tem_fiador', String(temFiador));
      if (files.documento_id)      fd.append('documento_id',       files.documento_id);
      if (files.contrato)          fd.append('contrato',            files.contrato);
      if (files.fiador_documento_id) fd.append('fiador_documento_id', files.fiador_documento_id);

      const url = isEditing
        ? `${process.env.REACT_APP_API_URL}/clientealuguel/${clienteId}`
        : `${process.env.REACT_APP_API_URL}/clientealuguel`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.details)
          ? data.details.join('; ')
          : data.details || data.error || (isEditing ? 'Erro ao atualizar inquilino' : 'Erro ao cadastrar inquilino');
        throw new Error(msg);
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl border border-white/10 hover:border-white/30 text-white/50 hover:text-white transition-all"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">{isEditing ? 'Editar Inquilino' : 'Cadastrar Inquilino'}</h2>
          <p className="text-white/50 text-sm mt-0.5">{isEditing ? 'Atualize os dados do locatário' : 'Preencha os dados do locatário'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados pessoais */}
        <section className={SECTION}>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-caixa-orange" />
            <h3 className="text-white font-semibold">Dados Pessoais</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LABEL}>Nome completo *</label>
              <input className={INPUT} placeholder="Nome do inquilino" value={form.nome}
                onChange={(e) => set('nome', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}><Phone className="inline w-3.5 h-3.5 mr-1" />Telefone / WhatsApp *</label>
              <input className={INPUT} placeholder="(61) 9 0000-0000" value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}><Mail className="inline w-3.5 h-3.5 mr-1" />Email *</label>
              <input className={INPUT} type="email" placeholder="email@exemplo.com" value={form.email}
                onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}><CreditCard className="inline w-3.5 h-3.5 mr-1" />CPF *</label>
              <input className={INPUT} placeholder="000.000.000-00" value={form.cpf} maxLength={14}
                onChange={(e) => set('cpf', formatCpf(e.target.value))} required />
            </div>
            <div>
              <label className={LABEL}><Calendar className="inline w-3.5 h-3.5 mr-1" />Data de nascimento</label>
              <input className={INPUT} type="date" value={form.data_nascimento}
                onChange={(e) => set('data_nascimento', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}><MapPin className="inline w-3.5 h-3.5 mr-1" />Onde nasceu (cidade / estado)</label>
              <input className={INPUT} placeholder="Ex: Goiânia / GO" value={form.cidade_nascimento}
                onChange={(e) => set('cidade_nascimento', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}><DollarSign className="inline w-3.5 h-3.5 mr-1" />Valor do aluguel (R$) *</label>
              <input className={INPUT} type="number" min="0" step="0.01" placeholder="0,00"
                value={form.valor_aluguel} onChange={(e) => set('valor_aluguel', e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}><Calendar className="inline w-3.5 h-3.5 mr-1" />Dia de vencimento *</label>
              <input className={INPUT} type="number" min="1" max="31" placeholder="Ex: 5"
                value={form.dia_vencimento} onChange={(e) => set('dia_vencimento', e.target.value)} required />
            </div>
          </div>
        </section>

        {/* Documentos */}
        <section className={SECTION}>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-caixa-orange" />
            <h3 className="text-white font-semibold">Documentos</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileUploadField
              label="Documento de identificação (RG / CNH)"
              name="documento_id"
              icon={Upload}
              file={files.documento_id}
              onChange={(f) => handleFile('documento_id', f)}
            />
            <FileUploadField
              label="Contrato (opcional)"
              name="contrato"
              icon={FileText}
              file={files.contrato}
              onChange={(f) => handleFile('contrato', f)}
            />
          </div>
        </section>

        {/* Proprietário do imóvel */}
        <section className={SECTION}>
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-5 h-5 text-caixa-orange" />
            <h3 className="text-white font-semibold">Proprietário do Imóvel</h3>
            <span className="text-white/30 text-xs ml-1">(para repasse automático via PIX)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LABEL}><User className="inline w-3.5 h-3.5 mr-1" />Nome do proprietário</label>
              <input className={INPUT} placeholder="Nome completo" value={form.proprietario_nome}
                onChange={(e) => set('proprietario_nome', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}><Phone className="inline w-3.5 h-3.5 mr-1" />Telefone do proprietário</label>
              <input className={INPUT} placeholder="(61) 9 0000-0000" value={form.proprietario_telefone}
                onChange={(e) => set('proprietario_telefone', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}><Key className="inline w-3.5 h-3.5 mr-1" />Chave PIX do proprietário *</label>
              <input className={INPUT} placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={form.proprietario_pix}
                onChange={(e) => set('proprietario_pix', e.target.value)} />
              <p className="mt-1 text-xs text-white/30">O repasse será enviado automaticamente para esta chave após cada pagamento confirmado.</p>
            </div>
            <div>
              <label className={LABEL}><Percent className="inline w-3.5 h-3.5 mr-1" />Taxa de administração (%)</label>
              <input className={INPUT} type="number" min="0" max="100" step="0.01" placeholder="10"
                value={form.taxa_administracao}
                onChange={(e) => set('taxa_administracao', e.target.value)} />
              <p className="mt-1 text-xs text-white/30">Percentual retido sobre o aluguel (ex: 10%). O restante vai ao proprietário.</p>
            </div>
          </div>
        </section>

        {/* Corretor */}
        <section className={SECTION}>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">Comissão do Corretor</h3>
            <span className="text-white/30 text-xs ml-1">(opcional)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Nome do corretor</label>
              <input className={INPUT} placeholder="Nome" value={form.corretor_nome}
                onChange={(e) => set('corretor_nome', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}><Percent className="inline w-3.5 h-3.5 mr-1" />Comissão do corretor (%)</label>
              <input className={INPUT} type="number" min="0" max="100" step="0.01" placeholder="0"
                value={form.corretor_percentual}
                onChange={(e) => set('corretor_percentual', e.target.value)} />
              <p className="mt-1 text-xs text-white/30">% do valor do aluguel registrado como comissão do corretor.</p>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}><Key className="inline w-3.5 h-3.5 mr-1" />Chave PIX do corretor</label>
              <input className={INPUT} placeholder="CPF, e-mail ou chave aleatória"
                value={form.corretor_pix}
                onChange={(e) => set('corretor_pix', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Fiador toggle */}
        <section className={SECTION}>
          <button
            type="button"
            onClick={() => setTemFiador(v => !v)}
            className="w-full flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                ${temFiador ? 'bg-caixa-orange/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                <Shield className={`w-5 h-5 transition-colors ${temFiador ? 'text-caixa-orange' : 'text-white/40'}`} />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">Tem fiador?</p>
                <p className="text-white/40 text-sm">
                  {temFiador ? 'Sim — preencha os dados abaixo' : 'Não — clique para adicionar'}
                </p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5
              ${temFiador ? 'bg-caixa-orange' : 'bg-white/20'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform
                ${temFiador ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>

          <AnimatePresence>
            {temFiador && (
              <motion.div
                key="fiador"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-4 border-t border-white/10"
              >
                <FiadorSection
                  dados={form}
                  onChange={set}
                  onFileChange={handleFile}
                  files={files}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <X className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 font-semibold transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-caixa-orange to-orange-600
              hover:from-orange-500 hover:to-orange-700 text-white font-bold transition-all
              disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {isEditing ? 'Salvando...' : 'Cadastrando...'}</>
            ) : (
              isEditing ? 'Salvar Alterações' : 'Cadastrar Inquilino'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
