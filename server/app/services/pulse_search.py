"""Literal keyword groups for stored search. Never contacts a provider."""
import json
from sqlalchemy import or_, and_, func
from ..models.pulse import SourceItem


def parse_groups(value, fallback=''):
    if value is None:
        groups = {'main': [fallback.strip()], 'required': [], 'excluded': []}
    else:
        groups = json.loads(value)
    if not isinstance(groups, dict) or set(groups) - {'main', 'required', 'excluded'}:
        raise ValueError('Kelompok keyword tidak valid.')
    result = {}
    for key in ('main', 'required', 'excluded'):
        values = groups.get(key, [])
        if not isinstance(values, list) or len(values) > 12:
            raise ValueError('Maksimal 12 tag per kelompok.')
        if any(not isinstance(term, str) or not 2 <= len(term.strip()) <= 100 for term in values):
            raise ValueError('Setiap tag harus berisi 2–100 karakter.')
        result[key] = list(dict.fromkeys(term.strip().lower() for term in values))
    if not result['main']:
        raise ValueError('Isi minimal satu keyword utama.')
    return result


def search_expression(groups):
    def term_matches(term):
        return or_(*(func.lower(func.coalesce(column, '')).contains(term, autoescape=True)
                     for column in (SourceItem.title, SourceItem.text, SourceItem.author)))
    return and_(or_(*(term_matches(term) for term in groups['main'])),
                *(term_matches(term) for term in groups['required']),
                *(~term_matches(term) for term in groups['excluded']))
