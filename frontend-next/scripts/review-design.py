"""Visual checks against a separate local API fixture; never writes CRM data.
Run after npm run build. Requires Python Playwright with Chromium installed.
"""
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'design-review'
OUT.mkdir(parents=True, exist_ok=True)
USER = dict(id=1, first_name='Marina', last_name='Almeida', email='marina@example.test', username='marina', telefone='61999990000', is_administrador=True, is_super_admin=True, tenant_id=1, tenant_nome='Imobiliária Horizonte')
PROPERTY = dict(id=1, nome_imovel='Casa Jardim das Flores', endereco='Rua das Acácias, 120', localizacao='Valparaíso de Goiás', valor_venda=285000, valor_aluguel=1800, quartos=3, banheiro=2, situacao_imovel='disponivel', descricao='Casa com jardim e excelente localização.', imagens=[], tags=[])
CLIENT = dict(id=1, nome='Ana Carolina Souza', email='ana@example.test', cpf='12345678900', telefone='61999990000', status='aguardando_aprovacao', valor_renda='4.500,00', created_at='2026-09-01T12:00:00Z')

class Fixture(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        path = urlsplit(self.path).path.removeprefix('/api')
        data = None
        if path == '/auth/me': data = {'user': USER}
        elif path == '/user/me': data = USER
        elif path == '/tenant-settings/settings': data = {'tenant': {'id': 1, 'nome': 'Imobiliária Horizonte', 'slug': 'horizonte', 'email': 'contato@example.test'}}
        elif path in ['/corretor', '/correspondente/lista']: data = [USER]
        elif path == '/clientes': data = {'clientes': [CLIENT], 'total': 1, 'pagination': {'total': 1, 'totalPages': 1}}
        elif path == '/clientes/1': data = CLIENT
        elif path in ['/imoveis', '/public/imoveis', '/alugueis']: data = [PROPERTY]
        elif path in ['/imoveis/1', '/public/imoveis/1']: data = PROPERTY
        elif path in ['/receitas', '/despesas']: data = [{'id': 1, 'tipo': 'Comissão', 'descricao': 'Contrato residencial', 'valor': 3500, 'data': '2026-09-06T12:00:00Z'}]
        elif path == '/lembretes': data = [{'id': 1, 'titulo': 'Revisar documentação', 'descricao': 'Conferir os documentos do financiamento', 'data': '2026-09-07T12:00:00Z'}]
        elif path == '/contratos/opcoes': data = {'clientes': [], 'imoveis': [], 'inquilinos': [], 'alugueis': []}
        elif path == '/acessos': data = {'acessos': [], 'pagination': {'total': 0}}
        elif path in ['/propostas', '/visitas', '/contratos', '/pagamentos', '/laudos', '/proprietarios', '/clientealuguel', '/tenant/plans']: data = []
        elif path.startswith('/dashboard') or path in ['/super-admin/metrics', '/acessos/stats', '/fluxocaixa/dashboard']: data = {}
        self.send_response(200 if data is not None else 404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data or (data if isinstance(data, list) else {})).encode())

api = ThreadingHTTPServer(('127.0.0.1', 8012), Fixture)
threading.Thread(target=api.serve_forever, daemon=True).start()
env = {**os.environ, 'API_URL': 'http://127.0.0.1:8012/api'}
log = (OUT / 'server.log').open('w')
web = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '-p', '3002'], cwd=ROOT, env=env, stdout=log, stderr=log)
try:
    for _ in range(60):
        try:
            urlopen('http://localhost:3002/login', timeout=1)
            break
        except Exception: time.sleep(.5)
    routes = []
    for file in (ROOT / 'src/app').rglob('page.js'):
        parts = [p for p in file.relative_to(ROOT / 'src/app').parts[:-1] if not p.startswith('(')]
        if '[tipo]' in parts: continue
        routes.append('/' + '/'.join('1' if p == '[id]' else p for p in parts))
    reports = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies([{'name': 'cri_token', 'value': 'isolated-visual-fixture', 'domain': 'localhost', 'path': '/'}])
        page = context.new_page()
        for width in [1440, 390]:
            page.set_viewport_size({'width': width, 'height': 1000})
            for route in sorted(set(routes)):
                if route in ['/login', '/registro']:
                    context.clear_cookies()
                else:
                    context.add_cookies([{'name': 'cri_token', 'value': 'isolated-visual-fixture', 'domain': 'localhost', 'path': '/'}])
                errors = []
                handler = lambda err: errors.append(str(err))
                page.on('pageerror', handler)
                response = page.goto('http://localhost:3002' + route, wait_until='networkidle')
                page.wait_for_timeout(150)
                measure = page.evaluate('''() => ({
                  width: innerWidth, scroll: document.documentElement.scrollWidth,
                  heading: document.querySelector('h1')?.textContent,
                  smallFields: [...document.querySelectorAll('.crm-content input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), .crm-content select, .crm-content textarea')].filter(e => e.getClientRects().length && (parseFloat(getComputedStyle(e).fontSize) < 16 || e.getBoundingClientRect().height < 44)).length,
                  overflow: [...document.querySelectorAll('.crm-content *')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.right>innerWidth+1 && getComputedStyle(e).position!=='absolute'}).slice(0,8).map(e=>e.tagName+'.'+e.className)
                })''')
                reports.append({'route': route, 'viewport': width, 'status': response.status, 'errors': errors, **measure})
                page.remove_listener('pageerror', handler)
                if route in ['/clientes/adicionar','/corretores/adicionar','/financeiro/receitas','/imoveis/adicionar','/configuracoes','/propostas','/alugueis']:
                    page.screenshot(path=str(OUT / (route.strip('/').replace('/', '-') + f'-{width}.png')))
        browser.close()
    (OUT / 'report.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'checks': len(reports), 'issues': [r for r in reports if r['status'] >= 500 or r['scroll'] > r['width'] or r['smallFields'] or r['errors'] or r['overflow']]}, ensure_ascii=False))
finally:
    web.terminate()
    web.wait(timeout=15)
    api.shutdown()
    log.close()
