"""Mount with prefix /admin/pulse (or /api/admin/pulse in GERAK).

The spikes of a series, by the one rule in services/pulse_spikes.py. The caller sends the numbers it has drawn (the
trend chart sends posts and interactions per day, week or month) and gets back which buckets are spikes and the rule
that found them. The answer is counted from the request alone: no project data is read and nothing is stored.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from ..services.pulse_identity import require_pulse_access
from ..services.pulse_spikes import FLOORS, MAX_BUCKETS, RULE, keyed_spikes

router = APIRouter(dependencies=[Depends(require_pulse_access)])


class Bucket(BaseModel):
    model_config = ConfigDict(extra='forbid')
    key: str = Field(min_length=1, max_length=40)
    # A count or a sum: a finite number, never below zero. Strict, so text and true/false are refused instead of read as numbers.
    value: Annotated[int, Field(ge=0, strict=True)] | Annotated[float, Field(ge=0, allow_inf_nan=False, strict=True)]


class SpikesRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    series: dict[str, list[Bucket]] = Field(min_length=1)

    @field_validator('series')
    @classmethod
    def known_and_bounded(cls, series):
        for name, buckets in series.items():
            if name not in FLOORS:
                raise ValueError('series must be one of: ' + ', '.join(FLOORS))
            if len(buckets) > MAX_BUCKETS:
                raise ValueError(f'a series holds at most {MAX_BUCKETS} buckets')
        return series


@router.post('/spikes')
async def spikes(request: Request):
    """Which buckets of each series are spikes. `spikes` has one list per series that was sent, oldest first, and
    `rule` says what a spike is, so an answer can be read without this code.

    The body is checked here instead of by the framework: its refusal repeats the value it refused, and a value that
    is not a number JSON can carry (NaN, an infinity) cannot be written into that answer. Ours names the place and the
    reason only."""
    try:
        req = SpikesRequest.model_validate_json(await request.body())
    except ValidationError as error:
        raise HTTPException(422, error.errors(include_url=False, include_context=False, include_input=False)) from None
    return {'rule': RULE, 'spikes': {name: keyed_spikes([(bucket.key, bucket.value) for bucket in buckets], FLOORS[name])
                                     for name, buckets in req.series.items()}}
