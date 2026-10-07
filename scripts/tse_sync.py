#!/usr/bin/env python3
"""IBFC background TSE importer. Standard library only; runs in GitHub Actions or a VPS.
No downloads or credentials in the browser. Official datasets are discovered, never fabricated.
"""
import csv
import io
import json
import os
import re
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_DOWNLOAD = 4 * 1024**3
MAX_UNCOMPRESSED = 40 * 1024**3


def folded(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.strip().upper()) if not unicodedata.combining(c)).replace('’', "'")


def coverage():
    return json.loads((ROOT / 'lib/electoral/region-data.json').read_text())


def official_url(url):
    p = urllib.parse.urlsplit(url)
    if p.scheme != 'https' or p.hostname not in ('cdn.tse.jus.br', 'dadosabertos.tse.jus.br') or p.username or p.password or p.port not in (None, 443):
        raise ValueError('Endereço fora dos servidores oficiais do TSE')
    return url


class OfficialRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        official_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OFFICIAL = urllib.request.build_opener(OfficialRedirect())


def package(year, kind):
    dataset = ('resultados-' if kind == 'votes' else 'eleitorado-') + str(year)
    url = 'https://dadosabertos.tse.jus.br/api/3/action/package_show?' + urllib.parse.urlencode({'id': dataset})
    try:
        with OFFICIAL.open(url, timeout=90) as response:
            body = json.loads(response.read(12 * 1024**2))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise RuntimeError(f'Catálogo TSE respondeu HTTP {e.code}') from None
    if not body.get('success'):
        if body.get('error', {}).get('__type') == 'Not Found Error':
            return None
        raise RuntimeError('Catálogo TSE não confirmou o conjunto de dados')
    return body['result']['resources']


def plan(year, scopes, fetch=package):
    tasks, missing = [], []
    for kind in ('locations', 'votes'):
        resources = fetch(year, kind)
        if resources is None:
            missing.append(f'{kind}: conjunto {year} ainda não localizado no catálogo')
            continue
        targets = ['LOCATIONS'] if kind == 'locations' else [*scopes, 'BR']
        for target in targets:
            def match(r):
                name = folded(r.get('name', ''))
                path = urllib.parse.urlsplit(r.get('url', '')).path.lower()
                if kind == 'locations':
                    return 'ELEITORADO' in name and 'LOCAL DE VOTACAO' in name and path.endswith('.zip')
                return ('VOTACAO POR SECAO' in name or 'votacao_secao' in path) and (path.endswith(f'_{year}_{target.lower()}.zip') or (path.endswith('.zip') and re.search(r'(^|[^A-Z])'+re.escape(target)+r'([^A-Z]|$)',name) and str(year) in name))
            matches = [r for r in resources if match(r)]
            if len(matches) != 1:
                missing.append(f'{kind}/{target}: '+('recurso de votação por seção não localizado no catálogo oficial' if not matches else f'{len(matches)} recursos correspondentes; seleção ambígua'))
                continue
            url = official_url(matches[0]['url'])
            if urllib.parse.urlsplit(url).hostname != 'cdn.tse.jus.br':
                raise ValueError('Arquivo eleitoral fora do CDN oficial')
            tasks.append({'kind': kind, 'target': target, 'url': url, 'name': matches[0]['name']})
    return tasks, missing



def select_csvs(archive, task, year, scopes):
    """Select disjoint CSV partitions, never BR plus its state copies."""
    files = [i for i in archive.infolist() if not i.is_dir() and i.filename.lower().endswith('.csv') and not i.filename.startswith('__MACOSX/')]
    if not files:
        raise ValueError('ZIP oficial não contém CSV: ' + task['name'])
    if len(files) == 1:
        selected = files
    else:
        prefix = 'votacao_secao' if task['kind'] == 'votes' else 'eleitorado_local_votacao'
        def partition(code):
            pattern = re.compile(r'^' + prefix + '_' + str(year) + '_' + re.escape(code) + r'\.csv$', re.I)
            matches = [i for i in files if pattern.fullmatch(Path(i.filename).name)]
            if len(matches) > 1:
                raise ValueError('ZIP com partição CSV duplicada: ' + code)
            return matches
        if task['kind'] == 'votes':
            target = task.get('target') or Path(urllib.parse.urlsplit(task['url']).path).stem.rsplit('_', 1)[-1].upper()
            selected = partition(target)
        else:
            # Prefer state partitions only when every requested UF is present.
            states = [partition(uf) for uf in scopes]
            selected = [part[0] for part in states] if states and all(states) else partition('BR')
        if not selected:
            names = ', '.join(Path(i.filename).name[:120] for i in files[:5])
            raise ValueError(f'ZIP com {len(files)} CSVs, sem partição inequívoca para a tarefa {task["name"]}. Arquivos: {names}')
    if any(i.flag_bits & 1 for i in selected):
        raise ValueError('CSV oficial criptografado não suportado')
    if sum(i.file_size for i in selected) > MAX_UNCOMPRESSED:
        raise ValueError('CSVs selecionados excedem o limite descompactado de 40 GiB')
    return selected


def required(row, key):
    value = row.get(key, '').strip()
    if not re.fullmatch(r'[0-9]+', value):
        raise ValueError(f'Campo numérico inválido: {key}')
    return int(value)


def coord(text, low, high):
    try:
        number = float(text.replace(',', '.'))
        return number if low <= number <= high else None
    except (ValueError, AttributeError):
        return None


def normalize(row, kind, year, scopes, names, national=False):
    uf = row.get('SG_UF', '').strip().upper()
    if uf not in scopes or uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'):
        return None
    municipality_name = next((n for n in names.get(uf, []) if folded(n) == folded(row.get('NM_MUNICIPIO', ''))), None)
    if municipality_name is None:
        if national and row.get('NM_MUNICIPIO', '').strip():
            municipality_name = row['NM_MUNICIPIO'].strip()[:500]
        else:
            return None
    value = row.get('ANO_ELEICAO') or row.get('AA_ELEICAO')
    if not value or int(value) != year:
        raise ValueError('Ano do arquivo diverge da tarefa')
    base = dict(uf=uf, municipality_name=municipality_name, year=year,
                municipality=required(row, 'CD_MUNICIPIO'), zone=required(row, 'NR_ZONA'), local=required(row, 'NR_LOCAL_VOTACAO'))
    if kind == 'locations':
        name = row.get('NM_LOCAL_VOTACAO') or row.get('DS_LOCAL_VOTACAO') or row.get('NM_LOCAL')
        if not name:
            raise ValueError('Local de votação sem nome')
        lat = coord(row.get('NR_LATITUDE') or row.get('LATITUDE'), -34 if national else -18.5, 6 if national else -13)
        lon = coord(row.get('NR_LONGITUDE') or row.get('LONGITUDE'), -74 if national else -50.5, -32 if national else -45)
        return dict(base, name=name[:500], address=(row.get('DS_ENDERECO') or row.get('DS_ENDERECO_LOCAL') or '')[:500],
                    latitude=lat if lon is not None else None, longitude=lon if lat is not None else None)
    office, turn = required(row, 'CD_CARGO'), required(row, 'NR_TURNO')
    if office not in (1, 3, 5, 6, 7, 8) or turn not in (1, 2):
        raise ValueError('Cargo ou turno não suportados')
    if not row.get('NM_VOTAVEL') or not row.get('DS_CARGO'):
        raise ValueError('Candidatura/cargo sem descrição')
    return dict(base, election=required(row, 'CD_ELEICAO'), turn=turn, office=office,
                office_name=row['DS_CARGO'][:500], section=required(row, 'NR_SECAO'), number=str(required(row, 'NR_VOTAVEL')),
                name=row['NM_VOTAVEL'][:500], votes=required(row, 'QT_VOTOS'),
                local_name=row.get('NM_LOCAL_VOTACAO', '')[:500], local_address=row.get('DS_LOCAL_VOTACAO_ENDERECO', '')[:500])


class Worker:
    def __init__(self, job, url, key):
        self.job, self.token, self.url, self.key = job, None, url.rstrip('/'), key
        if urllib.parse.urlsplit(self.url).scheme != 'https':
            raise ValueError('Supabase deve usar HTTPS')
        self.rows, self.downloaded, self.last = 0, 0, 0

    def rpc(self, action, data=None):
        body = json.dumps({'p_action': action, 'p_job': self.job, 'p_token': self.token, 'p_data': data or {}}, ensure_ascii=False).encode()
        req = urllib.request.Request(self.url + '/rest/v1/rpc/ibfc_electoral_sync_worker', data=body,
                                     headers={'apikey': self.key, 'Authorization': 'Bearer ' + self.key, 'Content-Type': 'application/json'})
        # Never log headers, token or raw error bodies. Retry only idempotent actions.
        attempts = 3 if action in ('progress', 'batch', 'ready') else 1
        for attempt in range(attempts):
            try:
                with urllib.request.urlopen(req, timeout=180) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                if e.code in (429, 502, 503, 504) and attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f'Supabase recusou operação {action} (HTTP {e.code})') from None
            except (TimeoutError, urllib.error.URLError):
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f'Supabase indisponível na operação {action}') from None

    def progress(self, message, force=False, **extra):
        if force or time.monotonic() - self.last >= 20:
            self.rpc('progress', dict(message=message, rows_processed=self.rows, bytes_downloaded=self.downloaded, **extra))
            self.last = time.monotonic()

    def download(self, task, dest):
        official_url(task['url'])
        req = urllib.request.Request(task['url'], headers={'User-Agent': 'IBFC-Public-Electoral-Observatory/1.0'})
        with OFFICIAL.open(req, timeout=120) as r, open(dest, 'wb') as f:
            official_url(r.url)
            total = int(r.headers.get('Content-Length') or 0)
            if total > MAX_DOWNLOAD:
                raise ValueError('Arquivo excede o limite de 4 GiB; use worker com capacidade maior')
            received = 0
            while True:
                chunk = r.read(1024**2)
                if not chunk:
                    break
                received += len(chunk)
                if received > MAX_DOWNLOAD:
                    raise ValueError('Download excede o limite de 4 GiB')
                f.write(chunk)
                self.downloaded += len(chunk)
                self.progress('Baixando ' + task['name'], phase='download', current_file=task['name'], phase_done=received, phase_total=total)
            if total and received != total:
                raise ValueError('Download incompleto')

    def import_file(self, task):
        self.progress('Baixando ' + task['name'], True, phase='download', current_file=task['name'], phase_done=0, phase_total=0)
        with tempfile.TemporaryDirectory(prefix='ibfc-tse-') as folder:
            archive = Path(folder) / 'official.zip'
            self.download(task, archive)
            with zipfile.ZipFile(archive) as z:
                files = select_csvs(z, task, self.year, self.scopes)
                print(f'{task["name"]}: {len(z.infolist())} itens no ZIP; {len(files)} CSV(s) selecionado(s)')
                imp = self.rpc('start_import', dict(kind=task['kind'], filename=Path(urllib.parse.urlsplit(task['url']).path).name, source_url=task['url']))['import_id']
                batch, accepted, completed_bytes = [], 0, 0
                parse_total = sum(info.file_size for info in files)
                for info in files:
                    print('Lendo CSV: ' + Path(info.filename).name)
                    with z.open(info) as stream, io.TextIOWrapper(stream, encoding='utf-8-sig' if self.encoding(z, info) == 'utf8' else 'cp1252', newline='') as text:
                        reader = csv.DictReader(text, delimiter=';')
                        required_headers = {'SG_UF', 'NM_MUNICIPIO', 'CD_MUNICIPIO', 'NR_ZONA', 'NR_LOCAL_VOTACAO'}
                        if not reader.fieldnames or not required_headers.issubset(reader.fieldnames):
                            raise ValueError('CSV oficial com cabeçalho incompatível: ' + Path(info.filename).name)
                        for row in reader:
                            if None in row or any(v is None for v in row.values()):
                                raise ValueError('CSV com colunas inconsistentes: ' + Path(info.filename).name)
                            n = normalize(row, task['kind'], self.year, self.scopes, self.names, self.national)
                            if n:
                                batch.append(n)
                                accepted += 1
                            if len(batch) == 500:
                                self.rpc('batch', dict(import_id=imp, rows=batch))
                                self.rows += len(batch)
                                batch = []
                            self.progress('Processando ' + task['name'], phase='parse', current_file=Path(info.filename).name, phase_done=completed_bytes + stream.tell(), phase_total=parse_total)
                    completed_bytes += info.file_size
                if batch:
                    self.rpc('batch', dict(import_id=imp, rows=batch))
                    self.rows += len(batch)
                if not accepted:
                    raise ValueError('Nenhum registro da cobertura escolhido foi encontrado')
                self.rpc('ready', dict(import_id=imp))
                self.progress('Arquivo preparado: ' + task['name'], True, phase='prepared', current_file='', phase_done=0, phase_total=0)

    @staticmethod
    def encoding(z, info):
        with z.open(info) as f:
            prefix = f.read(4096)
        if prefix.startswith(b'\xef\xbb\xbf'):
            return 'utf8'
        # TSE legacy CSV defaults to Windows-1252; unmarked UTF-8 with non-ASCII header/data is recognized.
        try:
            prefix.decode('utf-8')
            if any(b >= 128 for b in prefix):
                return 'utf8'
        except UnicodeDecodeError:
            pass
        return 'cp1252'

    def run(self):
        claim = self.rpc('claim')
        if not claim:
            print('Tarefa já iniciada ou encerrada; nenhuma alteração.')
            return
        self.token, self.year, self.scopes = claim['token'], claim['year'], claim['scopes']
        self.national = bool(claim.get('national', False))
        self.names = coverage()
        try:
            tasks, missing = plan(self.year, self.scopes)
            self.progress('Recursos oficiais localizados', True, files_total=len(tasks))
            if self.year==2026 and any(m.startswith('votes/') for m in missing):
                from tse_results import discover, import_task
                absent=[uf for uf in self.scopes if not any(t['kind']=='votes' and t['target']==uf for t in tasks)]
                extra=discover(self.year,absent,self.names,self.national) if absent else []
                tasks.extend(extra)
                covered={t['target'] for t in extra}
                missing=[m for m in missing if not any(m.startswith('votes/'+uf+':') for uf in covered) and not (covered and m.startswith('votes/BR:'))]
                self.progress('ZIPs e resultados JSON oficiais localizados',True,files_total=len(tasks))
            for task in tasks:
                if task['kind']=='zone_results':
                    import_task(self,task)
                else:
                    self.import_file(task)
            msg = 'Sincronização concluída. Resultados JSON por zona não fornecem votos individuais por seção; confira a granularidade no relatório.' if any(t['kind']=='zone_results' for t in tasks) and not missing else 'Sincronização concluída.' if not missing else 'Carga parcial/aguardando publicação: ' + '; '.join(missing)
            self.rpc('finish', dict(partial=bool(missing), message=msg))
            print(msg)
        except Exception as e:
            message = str(e) if isinstance(e, (ValueError, RuntimeError)) else 'Falha de conexão, leitura ou processamento do arquivo oficial'
            try:
                self.rpc('fail', dict(message=message))
            except Exception:
                pass  # Task expires safely if the database or worker connection is interrupted.
            print(message)
            raise SystemExit(1) from None


def scheduled_job(url, key, owner, scopes):
    """Service-only enqueue; an active job is left untouched."""
    uuid.UUID(owner)
    if not scopes or any(s not in ('DF', 'GO', 'MG') for s in scopes):
        raise ValueError('Cobertura inválida')
    if urllib.parse.urlsplit(url).scheme != 'https':
        raise ValueError('Supabase deve usar HTTPS')
    body = json.dumps({'p_owner': owner, 'p_scopes': scopes}).encode()
    req = urllib.request.Request(url.rstrip('/') + '/rest/v1/rpc/ibfc_electoral_sync_schedule', data=body,
        headers={'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=90) as response:
        return json.load(response)


if __name__ == '__main__':
    job = os.environ.get('IBFC_TSE_JOB_ID', '')
    try:
        url, key = os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY']
        if not key:
            raise ValueError()
        if not job:
            owner = os.environ.get('IBFC_TSE_AUTO_OWNER_ID', '')
            scopes = [s.strip().upper() for s in (os.environ.get('IBFC_TSE_AUTO_SCOPES') or 'DF,GO').split(',')]
            result = scheduled_job(url, key, owner, scopes)
            if result.get('existing'):
                print('Há uma tarefa ativa; agendamento não inicia outra.')
                raise SystemExit(0)
            job = result['id']
        uuid.UUID(job)
    except (ValueError, KeyError, urllib.error.URLError, TimeoutError):
        raise SystemExit('Confira o ID da tarefa ou UUID do administrador, a migração e os Secrets do worker.')
    Worker(job, url, key).run()
