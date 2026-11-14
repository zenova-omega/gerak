"""Decode the flat post fields in Xpoz's compact (TOON) MCP text responses.

Wire-format reference: official XPOZpublic/xpoz-python-sdk,
src/xpoz/_transform/_response_parser.py. No SDK retries/polling are used.
"""
import json
import re


def _scalar(value):
    value = value.strip()
    if value in ("null", "None", ""):
        return None
    if value.startswith('"'):
        return json.loads(value)
    # Keep numeric IDs lossless; metrics are normalized separately.
    return value


def _row_values(line):
    decoder, values = json.JSONDecoder(), []
    remaining = line.strip()
    while remaining:
        if remaining.startswith('"'):
            value, end = decoder.raw_decode(remaining)
            remaining = remaining[end:].lstrip()
        else:
            value, _, remaining = remaining.partition(",")
            values.append(_scalar(value))
            if not remaining:
                break
            remaining = remaining.lstrip()
            continue
        values.append(value)
        if remaining:
            if not remaining.startswith(","):
                raise ValueError("Invalid compact row")
            remaining = remaining[1:].lstrip()
    return values


def parse_tool_text(text):
    try:
        return json.loads(text)
    except ValueError:
        pass
    lines, result = text.splitlines(), {}
    for index, line in enumerate(lines):
        header = re.fullmatch(r"(\s*)(data|results|posts|items)\[(\d+)\](?:\{([^}]+)\})?:\s*", line)
        if header:
            indent, _, size, fields = header.groups()
            prefix = indent + "  "
            rows = []
            if fields is not None:
                keys = [field.strip() for field in fields.split(",")]
                for raw in lines[index + 1:]:
                    if not raw.strip():
                        continue
                    if not raw.startswith(prefix):
                        break
                    values = _row_values(raw[len(prefix):])
                    if len(values) != len(keys):
                        raise ValueError("Invalid compact row width")
                    rows.append(dict(zip(keys, values)))
            else:
                for raw in lines[index + 1:]:
                    if not raw.strip():
                        continue
                    if not raw.startswith(prefix):
                        break
                    content = raw[len(prefix):]
                    if content.startswith("- "):
                        rows.append({})
                        content = content[2:]
                    elif not content.startswith("  "):
                        raise ValueError("Invalid compact list")
                    if not rows or ":" not in content:
                        raise ValueError("Invalid compact list item")
                    key, value = content.strip().split(":", 1)
                    rows[-1][key] = _scalar(value)
            if len(rows) != int(size):
                raise ValueError("Incomplete compact response")
            result["results"] = rows
            return result
        # Only control metadata, never interpret post text as errors or status.
        if not line.startswith(" ") and ":" in line:
            key, value = line.split(":", 1)
            if key in {"operationId", "status", "error", "message", "success"}:
                result[key] = _scalar(value)
    if not result:
        raise ValueError("Unrecognized MCP text format")
    return result
