"""Official EA16/EA20 discovery. Zone results are never converted to fictional sections."""
from datetime import datetime, timezone
import hashlib
import json
import re
import time
import urllib.request
from urllib.parse import urlsplit

BASE = 'https://resultados.tse.jus.br/oficial/'
LIMIT = 24 * 1024**2


def read_json(url):
    p = urlsplit(url)
    if p.scheme != 'https' or p.hostname != 'resultados.tse.jus.br' or not p.path.startswith('/oficial/') or p.query or p.fragment or p.username or p.password:
        raise ValueError('Endereço de resultados fora do ambiente oficial')
    time.sleep(.15)  # Deliberately below the official request limit.
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'IBFC-Electoral-Observatory/2.1'}), timeout=90) as r:
        if urlsplit(r.url).hostname != p.hostname:
            raise ValueError('Redirecionamento de resultados inválido')
        raw = r.read(LIMIT + 1)
    if len(raw) > LIMIT:
        raise ValueError('JSON eleitoral excede 24 MiB')
    return json.loads(raw), len(raw), hashlib.sha256(raw).hexdigest()


def integer(value):
    if not re.fullmatch(r'[0-9]+', str(value)):
        raise ValueError('Contagem oficial ausente ou inválida')
    return int(value)


def discover(year, scopes, names, national=False, fetch=read_json):
    config, _, _ = fetch(BASE + 'comum/config/ele-c.json')
    if config.get('f') != 'o':
        raise ValueError('Configuração de simulado não aceita')
    tasks = []
    for pleito in config.get('pl', []):
        if datetime.strptime(pleito.get('dt','01/01/1900'),'%d/%m/%Y').date() > datetime.now(timezone.utc).date():
            continue
        if pleito.get('c') != 'ele'+str(year) or not pleito.get('dt', '').endswith('/'+str(year)):
            continue
        elections = [e for e in pleito.get('e', []) if e.get('tp') in ('1', '8') and e.get('t') in ('1', '2')]
        if not elections:
            continue
        for uf in scopes:
            sec_url = BASE + f'ele{year}/arquivo-urna/{integer(pleito["cd"])}/config/{uf.lower()}/{uf.lower()}-p{integer(pleito["cd"]):06d}-cs.json'
            sections, _, _ = fetch(sec_url)
            if sections.get('f') != 'o' or integer(sections.get('cdp')) != integer(pleito['cd']):
                raise ValueError('Configuração de seções diverge do pleito oficial')
            files = []
            for abr in sections.get('abr', []):
                if abr.get('cd', '').upper() != uf:
                    continue
                for municipality in abr.get('mu', []):
                    # Compare accents/case independently of spelling normalization in ZIP files.
                    import unicodedata
                    fold = lambda s: ''.join(c for c in unicodedata.normalize('NFD', s.upper()) if not unicodedata.combining(c))
                    if not national and fold(municipality['nm']) not in [fold(n) for n in names.get(uf, [])]:
                        continue
                    for zone in municipality.get('zon', []):
                        for election in elections:
                            offices = {integer(c['cd']) for a in election.get('abr', []) if a['cd'].upper() in ('BR', uf) for c in a.get('cp', [])}
                            offices &= {1,3,5,6,8 if uf=='DF' else 7}
                            for office in sorted(offices):
                                mu, zn, ele = integer(municipality['cd']), integer(zone['cd']), integer(election['cd'])
                                url = BASE + f'ele{year}/{ele}/dados/{uf.lower()}/{uf.lower()}{mu:05d}-z{zn:04d}-c{office:04d}-e{ele:06d}-u.json'
                                files.append(dict(url=url, year=year, uf=uf, municipality=mu, municipality_name=municipality['nm'], zone=zn, election=ele, turn=integer(election['t']), office=office, pleito=integer(pleito['cd'])))
            if files:
                tasks.append(dict(kind='zone_results', target=uf, url=sec_url, name=f'{uf} resultados por zona / pleito {pleito["cd"]}', files=files))
    return tasks


def normalize(document, task, size=0, digest=''):
    if document.get('f') != 'o' or document.get('tpabr') != 'zona' or document.get('dv') != 's' or document.get('and') not in ('p','f'):
        raise ValueError('Resultado não é oficial, divulgado e iniciado por zona')
    if (integer(document.get('ele')), integer(document.get('t')), integer(document.get('cdabr'))) != (task['election'],task['turn'],task['zone']):
        raise ValueError('Eleição, turno ou zona diverge da URL')
    cargo = [c for c in document.get('carg', []) if integer(c['cd']) == task['office']]
    if len(cargo) != 1:
        raise ValueError('Cargo oficial ausente ou ambíguo')
    candidates, parties = [], []
    for agr in cargo[0].get('agr', []):
        for party in agr.get('par', []):
            nominal = integer(party.get('tvtn'))
            legenda = integer(party.get('tvtl', '0')) if task['office'] in (6,7,8) else 0
            parties.append(dict(number=str(integer(party['n'])), name=party['sg'], votes=nominal+legenda, nominal=nominal, legenda=legenda))
            for c in party.get('cand', []):
                candidates.append(dict(number=str(integer(c['n'])), candidate_id=str(integer(c['sqcand'])), name=c['nmu'], party=party['sg'], votes=integer(c['vap']), destination=c.get('dvt',''), status=c.get('st','')))
    if len({x['candidate_id'] for x in candidates}) != len(candidates) or len({x['number'] for x in parties}) != len(parties):
        raise ValueError('Identificador oficial repetido no resultado')
    if not candidates:
        raise ValueError('Arquivo sem candidaturas')
    valid = integer(document['v'].get('vv'))
    if sum(x['votes'] for x in parties) != valid:
        raise ValueError('Votos válidos dos partidos divergem do total da zona')
    return {**{k:task[k] for k in ('year','uf','municipality','municipality_name','zone','election','turn','office','pleito')}, 'office_name':cargo[0]['nmn'], 'valid':valid, 'sections':integer(document['s']['st']), 'total_sections':integer(document['s']['ts']), 'final':document.get('tf')=='s', 'generated_at':document['dg']+' '+document['hg'], 'generation_id':str(integer(document['idg'])), 'source_url':task['url'], 'source_sha256':digest, 'candidates':candidates, 'parties':parties}


def import_task(worker, task):
    imp = worker.rpc('start_zone', {'filename':task['name'], 'source_url':task['url']})['import_id']
    for index, file in enumerate(task['files']):
        worker.progress('Consultando resultado por zona '+str(file['zone'])+' / '+file['municipality_name'], True, phase='parse', current_file=task['name'], phase_done=index, phase_total=len(task['files']))
        doc, size, digest = read_json(file['url'])
        row = normalize(doc, file, size, digest)
        worker.rpc('zone_batch', {'import_id':imp,'rows':[row]})
        worker.downloaded += size
        worker.rows += len(row['candidates'])+len(row['parties'])
    worker.rpc('ready_zone', {'import_id':imp,'expected_files':len(task['files'])})
    worker.progress('Resultados por zona preparados', True, phase='prepared', current_file='', phase_done=0, phase_total=0)
