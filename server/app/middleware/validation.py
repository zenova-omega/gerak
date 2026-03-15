"""Input validation utilities for SINAR API."""
import re
from fastapi import HTTPException


def validate_password(password: str) -> str:
    """Validate password meets minimum requirements for military system."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password minimal 8 karakter")
    if not re.search(r'[A-Za-z]', password):
        raise HTTPException(status_code=400, detail="Password harus mengandung huruf")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Password harus mengandung angka")
    return password


def validate_nrp(nrp: str) -> str:
    """Validate NRP format."""
    if not nrp or len(nrp) < 3:
        raise HTTPException(status_code=400, detail="NRP tidak valid")
    # Allow alphanumeric + hyphens (for family accounts: FAM-xxxxxxxx)
    if not re.match(r'^[A-Za-z0-9\-]+$', nrp):
        raise HTTPException(status_code=400, detail="NRP hanya boleh mengandung huruf, angka, dan tanda hubung")
    return nrp.upper()


def sanitize_text(text: str, max_length: int = 1000) -> str:
    """Basic text sanitization."""
    if not text:
        return ""
    # Strip whitespace and limit length
    text = text.strip()[:max_length]
    # Remove null bytes
    text = text.replace('\x00', '')
    return text
