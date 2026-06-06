"""Survey serialization + results aggregation (pure, testable)."""


def question_dict(q) -> dict:
    return {
        "id": q.id, "order": q.order, "type": q.type, "text": q.text,
        "options": q.options, "rating_max": q.rating_max, "required": q.required,
    }


def survey_dict(s, response_count: int = 0, include_questions: bool = True) -> dict:
    d = {
        "id": s.id, "title": s.title, "description": s.description, "status": s.status,
        "mission_id": s.mission_id, "closes_at": s.closes_at, "created_at": s.created_at,
        "response_count": response_count,
    }
    if include_questions:
        d["questions"] = [question_dict(q) for q in sorted(s.questions, key=lambda x: x.order)]
    return d


def _label_of(v) -> str:
    if v is True:
        return "Ya"
    if v is False:
        return "Tidak"
    return str(v)


def aggregate_results(questions, answers_by_q: dict) -> list[dict]:
    """answers_by_q: {question_id: [unwrapped value, ...]}. Returns per-question aggregates."""
    out = []
    for q in sorted(questions, key=lambda x: x.order):
        vals = answers_by_q.get(q.id, [])
        entry = {"id": q.id, "text": q.text, "type": q.type}

        if q.type in ("single", "multiple", "yesno"):
            counts = {}
            base = q.options if q.type != "yesno" else ["Ya", "Tidak"]
            for lbl in (base or []):
                counts[lbl] = 0
            for v in vals:
                items = v if isinstance(v, list) else [v]
                for it in items:
                    key = _label_of(it)
                    counts[key] = counts.get(key, 0) + 1
            total = sum(counts.values()) or 1
            entry["distribution"] = [
                {"label": k, "count": c, "pct": round(c * 100 / total, 1)}
                for k, c in counts.items()
            ]

        elif q.type == "rating":
            nums = [int(v) for v in vals if isinstance(v, (int, float)) and not isinstance(v, bool)]
            entry["average"] = round(sum(nums) / len(nums), 2) if nums else 0
            dist = {str(i): 0 for i in range(1, (q.rating_max or 5) + 1)}
            for n in nums:
                dist[str(n)] = dist.get(str(n), 0) + 1
            entry["distribution"] = [{"label": k, "count": c} for k, c in dist.items()]

        elif q.type == "text":
            entry["texts"] = [str(v) for v in vals if v not in (None, "")]

        out.append(entry)
    return out
