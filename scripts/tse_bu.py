"""Official Boletim de Urna CSV adapter; no inference from zone totals."""
import re
import urllib.parse
from tse_sync import official_url, normalize, required


def discover_bu(year, scopes, fetch):
    resources = fetch(year, 'bu') or []
    tasks = []
    for uf in scopes:
        matches = []
        for resource in resources:
            url = resource.get('url', '')
            match = re.search(r'/bweb_([12])t_' + re.escape(uf) + r'_(\d{12,14})\.zip$', urllib.parse.urlsplit(url).path, re.I)
            if match:
                official_url(url)
                stamp = match[2]
                chronological = stamp[4:8] + stamp[2:4] + stamp[:2] + stamp[8:]
                matches.append((int(match[1]), chronological, resource))
        for turn in (1, 2):
            found = sorted((m for m in matches if m[0] == turn), key=lambda m: m[1])
            if not found:
                continue
            # Latest timestamp published by TSE for each UF and turn.
            resource = found[-1][2]
            if len([m for m in found if m[1] == found[-1][1]]) != 1:
                raise ValueError('Catálogo BU ambíguo para ' + uf)
            tasks.append(dict(kind='votes', format='bu', target=uf, turn=turn,
                              url=official_url(resource['url']), name=f'Boletins de Urna {year} · {uf} · {turn}º turno'))
    return tasks


def normalize_bu(row, year, scopes, names, national=False):
    office = required(row, 'CD_CARGO_PERGUNTA')
    if office not in (1, 3, 5, 6, 7, 8):
        return None
    # Annulled/non-installed urnas do not become valid vote observations.
    if required(row, 'CD_TIPO_URNA') != 1:
        return None
    vote_type = required(row, 'CD_TIPO_VOTAVEL')
    if vote_type not in (1, 2, 3, 4):
        raise ValueError('Tipo de votável BU não suportado; conferir documentação oficial')
    adapted = dict(row, CD_CARGO=str(office), DS_CARGO=row.get('DS_CARGO_PERGUNTA', ''))
    result = normalize(adapted, 'votes', year, scopes, names, national)
    if result is None:
        return None
    if (vote_type == 2 and result['number'] != '95') or (vote_type == 3 and result['number'] != '96'):
        raise ValueError('Código de branco/nulo divergente no BU')
    if vote_type in (1, 4) and result['number'] in ('95','96','97','98','99'):
        raise ValueError('Voto nominal/legenda com código reservado')
    metadata = {key: required(row, column) for key, column in (
        ('aptos', 'QT_APTOS'), ('comparecimento', 'QT_COMPARECIMENTO'),
        ('abstencoes', 'QT_ABSTENCOES'), ('urna', 'NR_URNA_EFETIVADA'))}
    if metadata['aptos'] != metadata['comparecimento'] + metadata['abstencoes']:
        raise ValueError('Eleitorado BU inconsistente')
    for key, column in (('status','DS_TIPO_URNA'), ('agregadas','DS_SECOES_AGREGADAS'),
                        ('abertura','DT_ABERTURA'), ('encerramento','DT_ENCERRAMENTO'),
                        ('emissao','DT_EMISSAO_BU'), ('recebido','DT_BU_RECEBIDO')):
        value = row.get(column, '').strip()
        metadata[key] = None if value in ('', '#NULO#', '#NE#') else value[:500]
    result['bu_metadata'] = metadata
    return result
