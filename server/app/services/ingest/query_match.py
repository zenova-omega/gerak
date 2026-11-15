"""Does a text match a project's keyword query? Checked on our side, for sources we read without searching.

The grammar is the one projects store: words and "quoted phrases", AND, OR, NOT, brackets. AND binds tighter than OR,
words side by side mean AND, matching ignores case and looks for the word or phrase anywhere in the text (so `sadap`
matches "disadap", as it does in a hashtag). A query that cannot be read matches nothing.
"""
import re

_TOKEN = re.compile(r'\s*(?:(\()|(\))|"([^"]*)"|([^\s()"]+))')


def _tokens(query):
    position, out = 0, []
    while position < len(query):
        if query[position:].strip() == '':
            break
        found = _TOKEN.match(query, position)
        if not found:
            raise ValueError('unreadable query')
        opening, closing, phrase, word = found.groups()
        out.append(('(', None) if opening else (')', None) if closing else ('term', phrase.lower()) if phrase is not None
                   else (word.upper(), None) if word.upper() in ('AND', 'OR', 'NOT') else ('term', word.lower()))
        position = found.end()
    return out


def matches_query(query, text):
    lowered = (text or '').lower()
    try:
        tokens = _tokens(query or '')
    except ValueError:
        return False
    index = 0

    def peek():
        return tokens[index][0] if index < len(tokens) else None

    def atom():
        nonlocal index
        kind, value = tokens[index] if index < len(tokens) else (None, None)
        index += 1
        if kind == 'NOT':
            return not atom()
        if kind == '(':
            value = either()
            if peek() != ')':
                raise ValueError('bracket left open')
            index += 1
            return value
        if kind == 'term':
            return bool(value) and value in lowered
        raise ValueError('a word was expected')

    def both():
        nonlocal index
        value = atom()
        while peek() in ('AND', 'term', '(', 'NOT'):
            if peek() == 'AND':
                index += 1
            value = atom() and value      # read the right side even when the left is false: the position must advance
        return value

    def either():
        nonlocal index
        value = both()
        while peek() == 'OR':
            index += 1
            value = both() or value
        return value
    try:
        if not tokens or not lowered:
            return False
        result = either()
        return bool(result) and index == len(tokens)
    except ValueError:
        return False


def search_words(query):
    """The words and phrases a one-word-at-a-time search has to be asked for, so the query's posts can be found.

    A search that takes a single word cannot be given the whole query. Of alternatives joined by OR, every one is
    asked for. Of parts joined by AND (or written side by side), only the first that can be searched is: a matching
    text contains it, and the rest of the query is checked on our side with `matches_query`. An exclusion (NOT) cannot
    be searched for. A query that cannot be read gives nothing."""
    try:
        tokens = _tokens(query or '')
    except ValueError:
        return []
    index = 0

    def peek():
        return tokens[index][0] if index < len(tokens) else None

    def atom():
        nonlocal index
        kind, value = tokens[index] if index < len(tokens) else (None, None)
        index += 1
        if kind == 'NOT':
            atom()
            return None
        if kind == '(':
            words = either()
            if peek() != ')':
                raise ValueError('bracket left open')
            index += 1
            return words
        if kind == 'term':
            return [value] if value else None
        raise ValueError('a word was expected')

    def both():
        nonlocal index
        words = atom()
        while peek() in ('AND', 'term', '(', 'NOT'):
            if peek() == 'AND':
                index += 1
            more = atom()
            words = words or more
        return words

    def either():
        nonlocal index
        words = both()
        while peek() == 'OR':
            index += 1
            words = (words or []) + (both() or [])
        return words or None
    try:
        if not tokens:
            return []
        words = either() or []
        return list(dict.fromkeys(words)) if index == len(tokens) else []
    except ValueError:
        return []
