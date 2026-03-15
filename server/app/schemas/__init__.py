from pydantic import BaseModel
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
