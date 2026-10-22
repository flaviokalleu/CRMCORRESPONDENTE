"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  House, Contact, Building2, FileText, CalendarDays, Clock, Pause, Play, Folder, MapPin,
} from "@/components/icons";

// Painel da marca do login, no padrão do Login InnLex: foto em tritom navy,
// um cartão de produto por módulo trocando a cada 7s, abas com barra de
// progresso e botão de pausa. Os dados dos cartões são ilustrativos.
const SLIDE_MS = 7000;

// Tritom navy-900 → #2a4a73 → navy-100 (sombras, meios-tons, luzes).
const DUOTONE = { r: "0.102 0.165 0.859", g: "0.2 0.29 0.918", b: "0.322 0.451 0.996" };

function CardHead({ icon: Icon, title, desc }) {
  return (
    <div className="lg-card-head">
      <span className="lg-card-icon" aria-hidden="true"><Icon /></span>
      <div>
        <div className="lg-card-title">{title}</div>
        <div className="lg-card-desc">{desc}</div>
      </div>
    </div>
  );
}

function Timeline({ items }) {
  return (
    <ul className="lg-tl">
      {items.map(([date, title, desc]) => (
        <li key={date + title}>
          <span className="lg-tl-date">{date}</span>
          <span><span className="lg-tl-title">{title}</span><span className="lg-tl-desc">{desc}</span></span>
        </li>
      ))}
    </ul>
  );
}

const SLIDES = [
  {
    key: "clientes", label: "Clientes", icon: Contact,
    pop: "12 novos clientes este mês",
    card: (
      <>
        <CardHead icon={Contact} title="Clientes" desc="Funil, documentos e aprovação de crédito." />
        <div className="lg-strong">Mariana Alves</div>
        <div className="lg-meta">Apartamento 2 quartos · Valparaíso de Goiás</div>
        <div className="lg-tags"><span className="lg-tag">MCMV</span><span className="lg-tag lg-tag-success"><i />Em atendimento</span></div>
        <Timeline items={[["28/06", "Documentos conferidos", "RG, CPF e comprovante de renda."], ["25/06", "Simulação enviada", "Parcela estimada de R$ 1.180."]]} />
        <div className="lg-foot"><span className="lg-foot-item lg-foot-alert"><Clock /> Aprovação · 12 jul</span></div>
      </>
    ),
  },
  {
    key: "imoveis", label: "Imóveis", icon: Building2,
    pop: "34 imóveis disponíveis",
    card: (
      <>
        <CardHead icon={Building2} title="Imóveis" desc="Catálogo, fotos e situação de cada unidade." />
        <div className="lg-strong">Casa 3 quartos com quintal</div>
        <div className="lg-meta"><MapPin className="lg-inline-icon" /> Jardim Ingá · Luziânia</div>
        <div className="lg-tags"><span className="lg-tag">Venda</span><span className="lg-tag lg-tag-success"><i />Disponível</span></div>
        <Timeline items={[["Valor", "R$ 245.000", "Aceita financiamento Caixa."], ["Área", "180 m² de terreno", "2 vagas de garagem."]]} />
        <div className="lg-foot"><span className="lg-foot-item">3 visitas agendadas</span></div>
      </>
    ),
  },
  {
    key: "propostas", label: "Propostas", icon: FileText,
    pop: "5 propostas em negociação",
    card: (
      <>
        <CardHead icon={FileText} title="Propostas" desc="Da proposta ao contrato assinado." />
        <div className="lg-strong">Proposta de compra</div>
        <div className="lg-meta">Carlos Menezes · Apartamento 204, Cidade Ocidental</div>
        <div className="lg-tags"><span className="lg-tag lg-tag-warning"><i />Em negociação</span></div>
        <Timeline items={[["30/06", "Contraproposta recebida", "R$ 212.000 com entrada de 10%."], ["27/06", "Proposta enviada", "Documento gerado a partir do modelo."]]} />
        <div className="lg-foot"><span className="lg-foot-item">Resposta até 05 jul</span></div>
      </>
    ),
  },
  {
    key: "agenda", label: "Agenda", icon: CalendarDays,
    pop: "4 compromissos hoje",
    card: (
      <>
        <CardHead icon={CalendarDays} title="Agenda" desc="Visitas, tarefas e retornos da equipe." />
        <div className="lg-day">Hoje</div>
        <ul className="lg-events">
          {[["09:00", "Visita — Casa Jardim Ingá", "Com Mariana Alves", "var(--innlex-navy-500)", "Visita"],
            ["11:30", "Assinatura de contrato", "Escritório central", "#198900", "Evento"],
            ["15:00", "Retorno de documentação", "Carlos Menezes", "#c40000", "Prazo"]].map(([t, title, where, color, type]) => (
            <li key={t} className="lg-ev">
              <span className="lg-ev-time">{t}</span>
              <span>
                <span className="lg-ev-title">{title}</span>
                <span className="lg-ev-where">{where}</span>
                <span className="lg-ev-type"><span className="lg-ev-dot" style={{ "--ev": color }} />{type}</span>
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
];

export function LoginBrandPanel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    const frame = window.requestAnimationFrame(sync);
    mq.addEventListener("change", sync);
    return () => { window.cancelAnimationFrame(frame); mq.removeEventListener("change", sync); };
  }, []);

  const next = useCallback(() => setActive((i) => (i + 1) % SLIDES.length), []);

  useEffect(() => {
    if (paused || reduced) return undefined;
    timer.current = window.setTimeout(next, SLIDE_MS);
    return () => window.clearTimeout(timer.current);
  }, [active, paused, reduced, next]);

  return (
    <section className={`lg-brand${paused ? " is-paused" : ""}${reduced ? " is-stopped" : ""}`} aria-label="Webba CRM" style={{ "--slide-ms": `${SLIDE_MS}ms` }}>
      <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="lg-duotone" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={DUOTONE.r} />
            <feFuncG type="table" tableValues={DUOTONE.g} />
            <feFuncB type="table" tableValues={DUOTONE.b} />
          </feComponentTransfer>
        </filter>
      </svg>
      <div className="lg-media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lg-photo" src="/login-house.png" alt="" />
        <div className="lg-shade" />
      </div>

      <div className="lg-top">
        <Link href="/" className="lg-logo-link"><House className="lg-logo-mark" /><span>Webba <span>CRM</span></span></Link>
        <span className="lg-chip"><Folder /> Gestão imobiliária para corretores e correspondentes</span>
      </div>

      <div className="lg-stage">
        <div className="lg-deck" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <span className="lg-plate lg-plate-2" aria-hidden="true" />
          <span className="lg-plate lg-plate-1" aria-hidden="true" />
          <div className="lg-slides">
            {SLIDES.map((s, i) => (
              <div key={s.key} id={`lg-slide-${s.key}`} role="tabpanel" aria-hidden={i !== active} className={`lg-slide${i === active ? " is-active" : ""}`}>
                <div className="lg-card">
                  {s.card}
                  <span className="lg-pop"><span className="lg-pop-icon"><s.icon /></span>{s.pop}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg-copy">
        <h1 className="lg-headline">Do primeiro contato <em>à chave na mão.</em></h1>
        <p className="lg-sub">Gerencie clientes, imóveis, propostas e a agenda da sua equipe em um só lugar.</p>
      </div>

      <div className="lg-tabs">
        <div className="lg-tablist" role="tablist" aria-label="Módulos">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls={`lg-slide-${s.key}`}
              className={`lg-tab${i === active ? " is-active" : ""}${i < active ? " is-done" : ""}`}
              onClick={() => setActive(i)}
            >
              <span className="lg-tab-track"><span key={`${s.key}-${active}`} className="lg-tab-fill" /></span>
              <span className="lg-tab-label"><s.icon />{s.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="lg-play" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Retomar apresentação" : "Pausar apresentação"}>
          {paused ? <Play /> : <Pause />}
        </button>
      </div>
    </section>
  );
}
