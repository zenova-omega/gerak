from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class LoginRequest(BaseModel):
    nrp: str
    password: str


class RegisterRequest(BaseModel):
    nrp: str
    name: str
    password: str
    role: str = "prajurit"
    account_type: str = "prajurit"
    satuan: str = ""
    kodam_id: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    nrp: str
    name: str
    role: str
    account_type: str
    satuan: str
    rank: int
    xp: int
    tier: str
    avatar_url: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MissionCreate(BaseModel):
    type: str
    title: str
    description: str = ""
    xp_reward: int = 200
    bonus_xp: int = 0
    deadline: datetime | None = None
    status: str = "TERBUKA"
    image_url: str | None = None
    kodam_scope: str | None = None
    type_config: dict | None = None
    template_captions: list[str] | None = None


class MissionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    xp_reward: int | None = None
    bonus_xp: int | None = None
    deadline: datetime | None = None
    status: str | None = None
    type_config: dict | None = None
    template_captions: list[str] | None = None


class SubmissionCreate(BaseModel):
    caption: str = ""
    platform: str | None = None
    post_url: str | None = None


class SubmissionReview(BaseModel):
    status: str  # approved, rejected
    reason: str | None = None


class BroadcastCreate(BaseModel):
    title: str
    message: str
    target_type: str = "all"
    target_kodam: str | None = None
    priority: str = "normal"
    channel: list[str] | None = None


class SettingUpdate(BaseModel):
    key: str
    value: str


class ShopOrderCreate(BaseModel):
    item_id: str
    quantity: int = 1


class FamilyAdd(BaseModel):
    name: str
    relation: str  # suami, istri, anak
    nrp: str | None = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int


class SeedPostInput(BaseModel):
    url: str = Field(max_length=2048)

    @field_validator('url')
    @classmethod
    def validate_url(cls, value):
        from ..services.pulse_seed import normalize_seed_url
        return normalize_seed_url(value)


class WatchTopicCreate(BaseModel):
    label: str
    query: str
    sources: list[str] = ["rss"]
    seed_post: SeedPostInput | None = None
    browserless_targets: list[str] | None = None
    crawl_interval_minutes: int = 60


class WatchTopicUpdate(BaseModel):
    seed_post: SeedPostInput | None = None
    label: str | None = None
    query: str | None = None
    sources: list[str] | None = None
    browserless_targets: list[str] | None = None
    is_active: bool | None = None
    crawl_interval_minutes: int | None = None


class N8nItem(BaseModel):
    topic_id: str
    url: str
    title: str | None = None
    text: str = ""
    author: str | None = None
    platform: str | None = "web"
    published_at: datetime | None = None
    metrics: dict | None = None


class SurveyQuestionIn(BaseModel):
    type: str  # single | multiple | rating | yesno | text
    text: str
    options: list[str] | None = None
    rating_max: int = 5
    required: bool = True
    order: int = 0


class SurveyCreate(BaseModel):
    title: str
    description: str = ""
    closes_at: datetime | None = None
    questions: list[SurveyQuestionIn] = []


class SurveyUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    closes_at: datetime | None = None
    questions: list[SurveyQuestionIn] | None = None


class SurveyAnswerIn(BaseModel):
    question_id: str
    value: object = None  # scalar/list/bool/str depending on question type


class SurveyRespondRequest(BaseModel):
    answers: list[SurveyAnswerIn] = []


class CaptionRequest(BaseModel):
    prompt: str
    tone: str = "netral"  # positif | negatif | netral | custom
    n: int = 4
    custom: str | None = None
    source_issue_id: str | None = None


class MemeRequest(BaseModel):
    prompt: str
    custom: str | None = None


class DraftCreate(BaseModel):
    kind: str  # caption | meme
    prompt: str = ""
    tone: str | None = None
    payload: dict | None = None


class AccountCreate(BaseModel):
    label: str
    platform: str
    handle: str = ""


class ScheduledPostCreate(BaseModel):
    caption: str = ""
    media_url: str | None = None
    platforms: list[str] = []
    scheduled_at: datetime | None = None


class ScheduledPostUpdate(BaseModel):
    caption: str | None = None
    media_url: str | None = None
    platforms: list[str] | None = None
    scheduled_at: datetime | None = None
    status: str | None = None


class RallyCreate(BaseModel):
    title: str
    post_url: str
    talking_points: str = ""
    target: str = "Semua outlet"


class CampaignCreate(BaseModel):
    name: str
    objective: str = ""
    source_issue_id: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    objective: str | None = None
    status: str | None = None
    pipeline: dict | None = None
